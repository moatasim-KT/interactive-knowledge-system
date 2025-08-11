// Simple logger implementation that can be replaced with a more robust solution
const create_logger = (name: string) => {
	// In a real implementation, this would use a proper logging library
	// that can be configured based on environment (browser/Node.js)
	const prefix = `[${name}]`;

	// Check if we're in a production environment
	const is_prod = (() => {
		// Check for Vite's import.meta.env first
		if (typeof import.meta !== 'undefined' && (import.meta as any).env?.PROD) {
			return true;
		}

		// For Node.js environments, we'll assume development to avoid process usage
		// In a real app, you'd want to configure this properly with environment variables
		return false;
	})();

	// Return a no-op logger in production to avoid console pollution
	if (is_prod) {
		return {
			debug: () => {
				/* noop */
			},
			info: () => {
				/* noop */
			},
			warn: () => {
				/* noop */
			},
			error: () => {
				/* noop */
			}
		};
	}

	// Development logger with proper error handling
	return {
		debug: (...args: unknown[]) => {
			try {
				// eslint-disable-next-line no-console
				console.debug(prefix, ...args);
			} catch (e) {
				// Ignore logging errors
			}
		},
		info: (...args: unknown[]) => {
			try {
				// eslint-disable-next-line no-console
				console.info(prefix, ...args);
			} catch (e) {
				// Ignore logging errors
			}
		},
		warn: (...args: unknown[]) => {
			try {
				// eslint-disable-next-line no-console
				console.warn(prefix, ...args);
			} catch (e) {
				// Ignore logging errors
			}
		},
		error: (...args: unknown[]) => {
			try {
				// eslint-disable-next-line no-console
				console.error(prefix, ...args);
			} catch (e) {
				// Ignore logging errors
			}
		}
	};
};

import type {
	WebContentFetchOptions,
	WebContentExtractOptions,
	WebContent,
	WebContentMetadata,
	WebContentError
} from './types';

// Temporary ContentBlock type - should be imported from the correct location
type ContentBlock = {
	id: string;
	type: 'text' | 'image' | 'video' | 'code' | 'quiz' | 'flashcard' | 'diagram';
	content: unknown;
	metadata: {
		created: Date;
		modified: Date;
		version: number;
	};
};

export type WebContentFetcherOptions = {
	/** Default fetch options */
	fetchOptions?: WebContentFetchOptions;

	/** Default extraction options */
	extractOptions?: WebContentExtractOptions;

	/** Cache configuration */
	cache?: {
		/** Whether to enable caching */
		enabled?: boolean;

		/** Cache TTL in milliseconds */
		ttl?: number;

		/** Cache directory path */
		directory?: string;
	};
};

export class WebContentFetcher {
	private logger: ReturnType<typeof create_logger>;

	constructor(private options: WebContentFetcherOptions = {}) {
		// Initialize logger first
		this.logger = create_logger('mcp:web-content:fetcher');

		// Initialize with default options
		this.options = {
			fetchOptions: {
				useHeadlessBrowser: false,
				timeout: 30000, // 30 seconds
				userAgent:
					'Mozilla/5.0 (compatible; WebContentFetcher/1.0; +https://github.com/your-org/interactive-knowledge-system)',
				followRedirects: true,
				maxRedirects: 5,
				...options.fetchOptions
			},
			extractOptions: {
				mainContentOnly: true,
				includeImages: true,
				includeLinks: true,
				includeMetadata: true,
				includeStructuredData: true,
				...options.extractOptions
			},
			cache: {
				enabled: true,
				ttl: 1000 * 60 * 60 * 24 * 7, // 1 week
				directory: './.cache/web-content',
				...options.cache
			}
		};

		// Initialize cache directory if enabled
		// This is done asynchronously and errors are caught and logged
		if (this.options.cache?.enabled && typeof window === 'undefined') {
			this.ensure_cache_directory().catch((error: Error) => {
				this.logger.warn('Failed to initialize cache directory:', error);
			});
		}
	}

	/**
	 * Fetch and extract content from a URL
	 */
	async fetch(
		url: string,
		options: Partial<WebContentFetchOptions & WebContentExtractOptions> = {}
	): Promise<WebContent> {
		const fetch_options = { ...this.options.fetchOptions, ...options } as WebContentFetchOptions;
		const extract_options = {
			...this.options.extractOptions,
			...options
		} as WebContentExtractOptions;
		const fetched_at = new Date().toISOString();

		// Generate a unique ID for this content based on the URL
		const content_id = this.generate_content_id(url);

		// Check cache first if enabled
		if (this.options.cache?.enabled) {
			const cached = await this.get_cached_content(content_id);
			if (cached) {
				this.logger.debug('Returning cached content for:', url);
				return cached;
			}
		}

		this.logger.debug(`Fetching content from: ${url}`);

		try {
			const start_time = Date.now();

			// Fetch the content
			const response = await this.fetch_with_retry(url, fetch_options);

			// Extract content from the response
			const { metadata, text, html, blocks } = await this.extract_content(
				response,
				url,
				extract_options
			);

			const end_time = Date.now();
			const processing_time = end_time - start_time;

			// Create the content object with proper metadata
			const content: WebContent = {
				id: content_id,
				metadata: {
					...metadata,
					url,
					fetched_at: new Date(fetched_at).toISOString()
				},
				text,
				html,
				blocks,
				fetched_at: new Date(fetched_at).toISOString(),
				processing_time
			};

			// Cache the content if enabled
			if (this.options.cache?.enabled) {
				await this.cache_content(content_id, content);
			}

			return content;
		} catch (error) {
			this.logger.error(`Failed to fetch content from ${url}:`, error);

			// Return an error response
			const error_message = error instanceof Error ? error.message : 'Unknown error';
			return {
				id: content_id,
				metadata: {
					url,
					title: 'Error fetching content',
					description: error_message,
					fetched_at: new Date().toISOString()
				},
				text: `Error: ${error_message}`,
				html: `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error</h1><p>${error_message}</p></body></html>`,
				blocks: [],
				error: {
					message: error_message,
					code: 'FETCH_ERROR',
					details: error
				},
				fetched_at: new Date().toISOString(),
				processing_time: 0
			};
		}
	}

	/**
	 * Fetch content with retry logic
	 */
	private async fetch_with_retry(
		url: string,
		options: WebContentFetchOptions,
		retries = 3,
		delay = 1000
	): Promise<Response> {
		try {
			// TODO: Implement actual fetch with retry logic
			// This is a placeholder that needs to be replaced with real implementation
			const response = await fetch(url, {
				headers: {
					'User-Agent': options.userAgent || ''
				},
				redirect: options.followRedirects ? 'follow' : 'manual'
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			return response;
		} catch (error) {
			if (retries > 0) {
				this.logger.debug(`Retrying fetch (${retries} attempts remaining)...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
				return this.fetch_with_retry(url, options, retries - 1, delay * 2);
			}
			throw error;
		}
	}

	/**
	 * Extract content from the response
	 */
	private async extract_content(
		response: Response,
		url: string,
		options: WebContentExtractOptions
	): Promise<{
		metadata: WebContentMetadata;
		text: string;
		html: string;
		blocks: ContentBlock[];
	}> {
		const content_type = response.headers.get('content-type') || '';
		const now = new Date();
		const default_metadata: WebContentMetadata = {
			url,
			title: '',
			description: '',
			fetched_at: now.toISOString()
		};

		try {
			if (content_type.includes('text/html')) {
				const html_content = await response.text();
				// TODO: Use a proper HTML parser and Readability-like library
				// This is a simplified example
				const title_match = html_content.match(/<title>(.*?)<\/title>/i);
				const title = title_match ? title_match[1] : 'Untitled Document';

				// Extract text content (simplified)
				const text_content = html_content
					.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
					.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
					.replace(/<[^>]+>/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();

				return {
					metadata: {
						...default_metadata,
						title,
						description: text_content.substring(0, 200) + (text_content.length > 200 ? '...' : '')
					},
					text: text_content,
					html: `<div>${html_content}</div>`,
					blocks: [
						{
							id: 'content',
							type: 'text',
							content: text_content,
							metadata: {
								created: now,
								modified: now,
								version: 1
							}
						}
					]
				};
			}

			if (content_type.includes('application/json')) {
				const data = await response.json();
				const json_string = JSON.stringify(data, null, 2);

				return {
					metadata: {
						...default_metadata,
						title: 'JSON Data',
						description: 'Extracted JSON content'
					},
					text: json_string,
					html: `<pre>${json_string}</pre>`,
					blocks: [
						{
							id: 'json-content',
							type: 'code',
							content: {
								language: 'json',
								code: json_string
							},
							metadata: {
								created: now,
								modified: now,
								version: 1
							}
						}
					]
				};
			}

			// Fallback for other content types
			const text_content = await response.text();
			return {
				metadata: {
					...default_metadata,
					title: 'Text Content',
					description: 'Extracted text content'
				},
				text: text_content,
				html: `<pre>${text_content}</pre>`,
				blocks: [
					{
						id: 'text-content',
						type: 'text',
						content: text_content,
						metadata: {
							created: now,
							modified: now,
							version: 1
						}
					}
				]
			};
		} catch (error) {
			const error_message = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Error extracting content:', error_message);

			// Return a minimal error response
			return {
				metadata: {
					...default_metadata,
					title: 'Error Extracting Content',
					description: error_message
				},
				text: `Error: ${error_message}`,
				html: `<!DOCTYPE html><html><head><title>Error</title></head><body><h1>Error</h1><p>${error_message}</p></body></html>`,
				blocks: []
			};
		}
	}

	/**
	 * Extract text content
	 */
	/**
	 * Extract text content from various content types
	 * @param content - The content to extract text from (string, HTML string, or JSON object)
	 * @param options - Extraction options
	 * @returns Extracted plain text
	 */
	private extract_text(content: unknown, options: WebContentExtractOptions): string {
		try {
			// Handle null or undefined content
			if (content === null || content === undefined) {
				return '';
			}

			// If content is already a string
			if (typeof content === 'string') {
				// Check if it's HTML content
				if (options.content_type?.includes('html') || /<[a-z][\s\S]*>/i.test(content)) {
					// Convert HTML to plain text
					return this.html_to_text(content);
				}
				// If it's plain text, return as is
				return content;
			}

			// Handle JSON content
			if (typeof content === 'object' && content !== null) {
				// If it's a JSON object, extract text from common fields
				const json = content as Record<string, unknown>;

				// Try common text fields
				const text_fields = ['text', 'content', 'body', 'description', 'summary'];
				for (const field of text_fields) {
					if (typeof json[field] === 'string') {
						return json[field] as string;
					}
				}

				// If no text fields found, stringify the JSON
				return JSON.stringify(content, null, 2);
			}

			// For any other type, convert to string
			return String(content);
		} catch (error) {
			const error_message = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Error extracting text:', error_message);
			return `Error extracting text: ${error_message}`;
		}
	}

	/**
	 * Convert HTML to plain text
	 * @param html - HTML content to convert
	 * @param _options - Extraction options (unused in this method but required for signature consistency)
	 * @returns Plain text representation of the HTML
	 */
	private html_to_text(html: string, _options?: WebContentExtractOptions): string {
		try {
			// Simple HTML to text conversion
			// This is a basic implementation that can be enhanced with a proper HTML parser
			return html
				.replace(/<style[^>]*>.*<\/style>/gms, '') // Remove style tags
				.replace(/<script[^>]*>.*<\/script>/gms, '') // Remove script tags
				.replace(/<[^>]+>/g, ' ') // Remove HTML tags
				.replace(/\s+/g, ' ') // Collapse whitespace
				.replace(/\s+([.,!?;:])/g, '$1') // Remove space before punctuation
				.replace(/([^\n])\n+([^\n])/g, '$1 $2') // Replace newlines between text with space
				.replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines to 2
				.trim();
		} catch (error) {
			this.logger.error('Error converting HTML to text:', error);
			return html
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		}
	}

	/**
	 * Extract HTML content from various content types
	 * @param content - The content to extract HTML from (HTML string, JSON object, or other types)
	 * @param options - Extraction options
	 * @returns Extracted HTML content
	 */
	private extract_html(content: unknown, options: WebContentExtractOptions): string {
		try {
			// Handle null or undefined content
			if (content === null || content === undefined) {
				return '';
			}

			// If content is already a string
			if (typeof content === 'string') {
				// If it's already HTML, return as is
				if (options.content_type?.includes('html') || /<[a-z][\s\S]*>/i.test(content)) {
					return this.clean_html(content, options);
				}

				// If it's plain text, wrap in a paragraph
				return `<p>${this.escape_html(content)}</p>`;
			}

			// Handle JSON content
			if (typeof content === 'object' && content !== null) {
				const json = content as Record<string, unknown>;

				// Try common HTML fields
				const html_fields = ['html', 'content_html', 'body_html', 'description_html'];
				for (const field of html_fields) {
					if (typeof json[field] === 'string') {
						return this.clean_html(json[field] as string, options);
					}
				}

				// Try to find any HTML content in string fields
				for (const [key, value] of Object.entries(json)) {
					if (typeof value === 'string' && /<[a-z][\s\S]*>/i.test(value)) {
						return this.clean_html(value, options);
					}
				}

				// If no HTML found, convert to pretty-printed JSON in a pre tag
				return `<pre>${this.escape_html(JSON.stringify(content, null, 2))}</pre>`;
			}

			// For any other type, convert to string and escape HTML
			return `<pre>${this.escape_html(String(content))}</pre>`;
		} catch (error) {
			const error_message = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Error extracting HTML:', error_message);
			return `<div class="error">Error extracting HTML: ${this.escape_html(error_message)}</div>`;
		}
	}

	/**
	 * Clean and sanitize HTML content
	 * @param html - Raw HTML content
	 * @param options - Extraction options
	 * @returns Sanitized HTML
	 */
	private clean_html(html: string, options: WebContentExtractOptions): string {
		try {
			// Basic HTML cleaning - in a real implementation, you might want to use DOMPurify or similar
			let cleaned = html
				// Remove potentially dangerous tags and attributes
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
				.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
				.replace(/<link[^>]*>/gi, '')
				.replace(/<meta[^>]*>/gi, '')
				.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
				.replace(/on\w+=\s*"[^"]*"/gi, '')
				.replace(/on\w+=\s*'[^']*'/gi, '')
				.replace(/on\w+=\s*[^\s>]+/gi, '');

			// If main content only is requested, try to extract just the main content
			// This is a simple implementation - a more robust solution would use a proper HTML parser
			if (options.mainContentOnly) {
				const main_match =
					cleaned.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
					cleaned.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
					cleaned.match(
						/<div[^>]*(class|id)=["'](main|content|article|post)["'][^>]*>([\s\S]*?)<\/div>/i
					);

				if (main_match && main_match[1]) {
					cleaned = main_match[1];
				}
			}

			return cleaned;
		} catch (error) {
			this.logger.error('Error cleaning HTML:', error);
			// Return the original HTML if cleaning fails
			return html;
		}
	}

	/**
	 * Escape HTML special characters to prevent XSS
	 * @param text - Text to escape
	 * @returns Escaped text
	 */
	private escape_html(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	/**
	 * Convert content to an array of ContentBlock objects
	 * @param content - The content to convert (HTML string, plain text, or structured data)
	 * @param options - Extraction options
	 * @returns Array of ContentBlock objects
	 */
	private convert_to_content_blocks(
		content: unknown,
		options: WebContentExtractOptions
	): ContentBlock[] {
		const blocks: ContentBlock[] = [];
		const now = new Date();

		try {
			// Handle null or undefined content
			if (content === null || content === undefined) {
				return [];
			}

			// If content is a string, parse it based on content type
			if (typeof content === 'string') {
				// If it's HTML, parse it into blocks
				if (options.content_type?.includes('html') || /<[a-z][\s\S]*>/i.test(content)) {
					return this.html_to_blocks(content, options);
				}

				// If it's plain text, split into paragraphs
				return this.text_to_blocks(content, options);
			}

			// If content is an object, try to extract meaningful blocks
			if (typeof content === 'object' && content !== null) {
				const content_obj = content as Record<string, unknown>;

				// If it's an array, process each item
				if (Array.isArray(content_obj)) {
					return content_obj
						.flatMap((item) => this.convert_to_content_blocks(item, options))
						.filter(Boolean) as ContentBlock[];
				}

				// Try to extract blocks from common content fields
				const content_fields = ['content', 'body', 'text', 'html', 'data'];
				for (const field of content_fields) {
					if (content_obj[field] !== undefined) {
						return this.convert_to_content_blocks(content_obj[field], options);
					}
				}

				// If no specific content field found, try to convert the object to blocks
				return this.object_to_blocks(content_obj, options);
			}

			// For any other type, convert to text and create a single text block
			return [
				{
					id: this.generate_block_id('text'),
					type: 'text',
					content: String(content),
					metadata: {
						created: now,
						modified: now,
						version: 1
					}
				}
			];
		} catch (error) {
			const error_message = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error('Error converting content to blocks:', error_message);

			// Return an error block if conversion fails
			return [
				{
					id: this.generate_block_id('error'),
					type: 'text',
					content: `Error processing content: ${error_message}`,
					metadata: {
						created: now,
						modified: now,
						version: 1
					}
				}
			];
		}
	}

	/**
	 * Convert HTML content to content blocks
	 */
	private html_to_blocks(html: string, options: WebContentExtractOptions): ContentBlock[] {
		const blocks: ContentBlock[] = [];
		const now = new Date();

		try {
			// This is a simplified implementation that uses regex to parse HTML
			// In a real application, you'd want to use a proper HTML parser like parse5 or jsdom

			// Split HTML into sections based on heading levels
			const sections = html.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)/is);
			let current_heading: string | null = null;

			for (const section of sections) {
				if (!section.trim()) continue;

				// Check if this is a heading
				const heading_match = section.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/is);
				if (heading_match) {
					current_heading = heading_match[2].replace(/<[^>]*>/g, '').trim();
					continue;
				}

				// Process content section
				const content = section.trim();
				if (!content) continue;

				// Create a text block for this section
				blocks.push({
					id: this.generate_block_id('text'),
					type: 'text',
					content: this.html_to_text(content, options),
					metadata: {
						created: now,
						modified: now,
						version: 1,
						// Add heading as a custom property (using type assertion to bypass TypeScript error)
						...(current_heading ? ({ heading: current_heading } as Record<string, unknown>) : {})
					}
				});
			}

			// If no blocks were created (e.g., no headings), create a single block with all content
			if (blocks.length === 0) {
				blocks.push({
					id: this.generate_block_id('text'),
					type: 'text',
					content: this.html_to_text(html, options),
					metadata: {
						created: now,
						modified: now,
						version: 1
					}
				});
			}

			return blocks;
		} catch (error) {
			this.logger.error('Error converting HTML to blocks:', error);
			return [
				{
					id: this.generate_block_id('error'),
					type: 'text',
					content: 'Error processing HTML content',
					metadata: {
						created: now,
						modified: now,
						version: 1
					}
				}
			];
		}
	}

	/**
	 * Convert plain text to content blocks
	 */
	private text_to_blocks(text: string, _options: WebContentExtractOptions): ContentBlock[] {
		const blocks: ContentBlock[] = [];
		const now = new Date();

		try {
			// Split text into paragraphs (double newline)
			const paragraphs = text.split(/\n\s*\n+/);

			for (const paragraph of paragraphs) {
				const trimmed = paragraph.trim();
				if (!trimmed) continue;

				blocks.push({
					id: this.generate_block_id('text'),
					type: 'text',
					content: trimmed,
					metadata: {
						created: now,
						modified: now,
						version: 1
					}
				});
			}

			return blocks;
		} catch (error) {
			this.logger.error('Error converting text to blocks:', error);
			return [
				{
					id: this.generate_block_id('error'),
					type: 'text',
					content: 'Error processing text content',
					metadata: {
						created: now,
						modified: now,
						version: 1
					}
				}
			];
		}
	}

	/**
	 * Convert an object to content blocks
	 */
	private object_to_blocks(
		obj: Record<string, unknown>,
		options: WebContentExtractOptions
	): ContentBlock[] {
		const blocks: ContentBlock[] = [];
		const now = new Date();

		try {
			// Convert each property to a block
			for (const [key, value] of Object.entries(obj)) {
				if (value === null || value === undefined) continue;

				// Skip metadata and system fields
				if (['id', '_id', 'metadata', 'createdAt', 'updatedAt', 'version'].includes(key)) {
					continue;
				}

				// Handle different value types
				if (typeof value === 'string') {
					// If it's a URL, create a link block
					if (this.is_url(value)) {
						blocks.push({
							id: this.generate_block_id('link'),
							type: 'text',
							content: `[${key}](${value})`,
							metadata: {
								created: now,
								modified: now,
								version: 1,
								// Add link as a custom property (using type assertion to bypass TypeScript error)
								...(value ? ({ link: value } as Record<string, unknown>) : {})
							}
						});
					} else {
						// Otherwise, create a text block
						blocks.push({
							id: this.generate_block_id('text'),
							type: 'text',
							content: `**${key}**: ${value}`,
							metadata: {
								created: now,
								modified: now,
								version: 1
							}
						});
					}
				} else if (typeof value === 'object') {
					// For nested objects, recursively convert to blocks
					const nested_blocks = this.convert_to_content_blocks(value, options);
					blocks.push(...nested_blocks);
				} else {
					// For other types, convert to string
					blocks.push({
						id: this.generate_block_id('text'),
						type: 'text',
						content: `**${key}**: ${String(value)}`,
						metadata: {
							created: now,
							modified: now,
							version: 1
						}
					});
				}
			}

			return blocks;
		} catch (error) {
			this.logger.error('Error converting object to blocks:', error);
			return [
				{
					id: this.generate_block_id('error'),
					type: 'text',
					content: 'Error processing object content',
					metadata: {
						created: now,
						modified: now,
						version: 1
					}
				}
			];
		}
	}

	/**
	 * Generate a unique ID for a content block
	 */
	private generate_block_id(prefix: string): string {
		return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000).toString(16)}`;
	}

	/**
	 * Check if a string is a URL
	 */
	private is_url(str: string): boolean {
		try {
			new URL(str);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Extract headers from the response
	 */
	private extract_headers(response: Response): Record<string, string> {
		const headers: Record<string, string> = {};
		response.headers.forEach((value, key) => {
			headers[key] = value;
		});
		return headers;
	}

	/**
	 * Extract status code from the response
	 */
	private extract_status_code(response: Response): number {
		return response.status;
	}

	/**
	 * Generate a unique ID for the content based on the URL
	 */
	private generate_content_id(url: string): string {
		// Simple hash function to generate a consistent ID from the URL
		let hash = 0;
		for (let i = 0; i < url.length; i++) {
			const char = url.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs(hash).toString(36);
	}

	/**
	 * Ensure the cache directory exists
	 */
	private async ensure_cache_directory(): Promise<void> {
		if (typeof window !== 'undefined') {
			// Skip in browser environment
			return;
		}

		const fs = await import('node:fs/promises');
		const path = await import('node:path');

		try {
			await fs.mkdir(this.options.cache?.directory || './.cache/web-content', {
				recursive: true
			});
		} catch (error) {
			this.logger.warn('Failed to create cache directory:', error);
			throw error;
		}
	}

	/**
	 * Get cached content by ID
	 */
	private async get_cached_content(id: string): Promise<WebContent | null> {
		if (!this.options.cache?.enabled) {
			return null;
		}

		const fs = await import('node:fs/promises');
		const path = await import('node:path');

		const cache_dir = this.options.cache?.directory || './.cache/web-content';
		const cache_file = path.join(cache_dir, `${id}.json`);

		try {
			// Check if file exists first
			try {
				await fs.access(cache_file);
			} catch {
				return null; // File doesn't exist
			}

			const data = await fs.readFile(cache_file, 'utf-8');
			const cached = JSON.parse(data) as { expiresAt: number; data: WebContent };

			// Check if the cache has expired
			if (cached.expiresAt < Date.now()) {
				return null;
			}

			return cached.data;
		} catch (error) {
			// Cache miss or error reading cache
			return null;
		}
	}

	/**
	 * Cache content by ID
	 */
	private async cache_content(id: string, content: WebContent): Promise<void> {
		if (!this.options.cache?.enabled) {
			return;
		}

		const fs = await import('node:fs/promises');
		const path = await import('node:path');

		const cache_dir = this.options.cache?.directory || './.cache/web-content';
		const cache_file = path.join(cache_dir, `${id}.json`);

		// Create cache directory if it doesn't exist
		await fs.mkdir(path.dirname(cache_file), { recursive: true });

		const cache_data = {
			data: content,
			expiresAt: Date.now() + (this.options.cache?.ttl || 24 * 60 * 60 * 1000) // Default 24h
		};

		try {
			await fs.writeFile(cache_file, JSON.stringify(cache_data, null, 2), 'utf-8');
		} catch (error) {
			this.logger.warn('Failed to write to cache:', error);
			throw error;
		}
	}
}
