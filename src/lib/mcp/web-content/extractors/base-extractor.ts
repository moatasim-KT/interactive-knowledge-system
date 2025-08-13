import type { WebContent, WebContentMetadata } from '../types';
import type { createLogger } from '../../../../utils/logger';

export interface ExtractionOptions {
	/** Whether to extract the main content only */
	main_content_only?: boolean;

	/** Whether to extract and include images */
	include_images?: boolean;

	/** Whether to extract and include links */
	include_links?: boolean;

	/** Whether to extract and include metadata */
	include_metadata?: boolean;

	/** Whether to extract and include structured data */
	include_structured_data?: boolean;

	/** Content type of the input */
	content_type?: string;

	/** Custom headers for the request */
	headers?: Record<string, string>;

	/** Timeout for the extraction in milliseconds */
	timeout?: number;
}

export interface ExtractionResult {
	/** The extracted content */
	content: string;

	/** The extracted HTML content */
	html: string;

	/** The extracted metadata */
	metadata: WebContentMetadata;

	/** Any errors that occurred during extraction */
	error?: Error;

	/** Whether the extraction was successful */
	success: boolean;

	/** The URL of the extracted content */
	url: string;
}

/**
 * Base interface for all content extractors
 */
export interface ContentExtractor {
	/**
	 * The name of the extractor
	 */
	readonly name: string;

	/**
	 * The domains this extractor can handle
	 */
	readonly domains: string[];

	/**
	 * The content types this extractor can handle
	 */
	readonly content_types: string[];

	/**
	 * The logger instance to use
	 */
	logger: ReturnType<typeof createLogger>;

	/**
	 * Check if this extractor can handle the given URL and content type
	 * @param url The URL to check
	 * @param content_type The content type to check
	 * @returns Whether this extractor can handle the URL and content type
	 */
	can_handle(url: string, content_type?: string): boolean;

	/**
	 * Extract content from the given HTML and URL
	 * @param html The HTML to extract content from
	 * @param url The URL the HTML was fetched from
	 * @param options Extraction options
	 * @returns A promise that resolves to the extraction result
	 */
	extract(html: string, url: string, options?: ExtractionOptions): Promise<ExtractionResult>;

	/**
	 * Extract metadata from the given HTML and URL
	 * @param html The HTML to extract metadata from
	 * @param url The URL the HTML was fetched from
	 * @returns A promise that resolves to the extracted metadata
	 */
	extract_metadata(html: string, url: string): Promise<WebContentMetadata>;

	/**
	 * Extract the main content from the given HTML and URL
	 * @param html The HTML to extract content from
	 * @param url The URL the HTML was fetched from
	 * @returns A promise that resolves to the extracted content
	 */
	extract_content(html: string, url: string): Promise<string>;

	/**
	 * Extract structured data from the given HTML and URL
	 * @param html The HTML to extract structured data from
	 * @param url The URL the HTML was fetched from
	 * @returns A promise that resolves to the extracted structured data
	 */
	extract_structured_data(html: string, url: string): Promise<Record<string, unknown>>;

	/**
	 * Sanitize the extracted content
	 * @param content The content to sanitize
	 * @returns The sanitized content
	 */
	sanitize(content: string): string;
}

/**
 * Base class for content extractors
 */
export abstract class BaseContentExtractor implements ContentExtractor {
	abstract readonly name: string;
	abstract readonly domains: string[];
	abstract readonly content_types: string[];

	logger: ReturnType<typeof createLogger>;

	constructor(logger: ReturnType<typeof createLogger>) {
		this.logger = logger;
	}

	can_handle(url: string, content_type: string = 'text/html'): boolean {
		// Check if the content type is supported
		if (!this.content_types.includes('*') && !this.content_types.includes(content_type)) {
			return false;
		}

		// Check if the domain is supported
		try {
			const domain = new URL(url).hostname;
			return this.domains.some(
				(d) =>
					domain === d ||
					domain.endsWith(`.${d}`) ||
					(d.startsWith('*') && domain.endsWith(d.slice(1)))
			);
		} catch (e) {
			this.logger.error(`Invalid URL: ${url}`, e);
			return false;
		}
	}

	abstract extract(
		html: string,
		url: string,
		options?: ExtractionOptions
	): Promise<ExtractionResult>;

	abstract extract_metadata(html: string, url: string): Promise<WebContentMetadata>;

	abstract extract_content(html: string, url: string): Promise<string>;

	async extract_structured_data(html: string, _url: string): Promise<Record<string, unknown>> {
		try {
			// Default implementation looks for JSON-LD, Microdata, or RDFa
			const doc = new DOMParser().parseFromString(html, 'text/html');

			// Try to parse JSON-LD
			const json_ld_scripts = Array.from(
				doc.querySelectorAll('script[type="application/ld+json"]')
			);
			for (const script of json_ld_scripts) {
				try {
					// Add a small delay to prevent blocking the event loop
					await new Promise((resolve) => setTimeout(resolve, 0));
					const data = JSON.parse(script.textContent || '{}');
					if (data && typeof data === 'object' && Object.keys(data).length > 0) {
						return { 'json-ld': data };
					}
				} catch (e) {
					// Ignore invalid JSON
				}
			}

			// Try to extract microdata
			const microdata: Record<string, unknown> = {};
			const items = doc.querySelectorAll('[itemscope]');

			if (items.length > 0) {
				items.forEach((item, index) => {
					const item_type = item.getAttribute('itemtype') || `item${index}`;
					const item_props: Record<string, unknown> = {};

					item.querySelectorAll('[itemprop]').forEach((prop) => {
						const prop_name = prop.getAttribute('itemprop') || '';
						if (prop_name) {
							const content =
								prop.getAttribute('content') ||
								prop.getAttribute('value') ||
								prop.textContent ||
								'';
							item_props[prop_name] = content.trim();
						}
					});

					if (Object.keys(item_props).length > 0) {
						microdata[item_type] = item_props;
					}
				});

				if (Object.keys(microdata).length > 0) {
					return { microdata };
				}
			}

			// Fall back to Open Graph and other meta tags
			const meta: Record<string, string> = {};
			doc.querySelectorAll('meta[property^="og:"], meta[name^="twitter:"]').forEach((tag) => {
				const name = tag.getAttribute('property') || tag.getAttribute('name') || '';
				const content = tag.getAttribute('content') || '';
				if (name && content) {
					meta[name] = content;
				}
			});

			if (Object.keys(meta).length > 0) {
				return { meta };
			}

			return {};
		} catch (error) {
			this.logger.error('Error extracting structured data:', error);
			return {};
		}
	}

	/**
	 * Sanitize HTML content by removing potentially dangerous elements and normalizing the output
	 * @param content The HTML content to sanitize
	 * @param options Sanitization options
	 * @returns Sanitized content
	 */
	sanitize(
		content: string,
		options: {
			/** Whether to preserve basic formatting (bold, italics, etc.) */
			preserve_formatting?: boolean;
			/** Whether to preserve links */
			preserve_links?: boolean;
			/** Whether to preserve images */
			preserve_images?: boolean;
			/** Maximum length of the output (0 for no limit) */
			max_length?: number;
		} = {}
	): string {
		const {
			preserve_formatting = true,
			preserve_links = true,
			preserve_images = false,
			max_length = 0
		} = options;

		try {
			// Create a temporary div to parse the HTML
			const div = document.createElement('div');
			div.innerHTML = content;

			// Remove unwanted elements
			const unwanted_selectors = [
				'script',
				'style',
				'noscript',
				'iframe',
				'object',
				'embed',
				'applet',
				'canvas',
				'audio',
				'video',
				'source',
				'track',
				'svg',
				'math',
				'input',
				'textarea',
				'button',
				'select',
				'option',
				'optgroup',
				'label',
				'fieldset',
				'datalist',
				'output',
				'progress',
				'meter',
				'template',
				'dialog',
				'menu',
				'menuitem'
			];

			// Add conditional elements
			if (!preserve_links) {unwanted_selectors.push('a');}
			if (!preserve_images) {unwanted_selectors.push('img', 'picture', 'figure');}
			if (!preserve_formatting) {
				unwanted_selectors.push(
					'b',
					'strong',
					'i',
					'em',
					'u',
					's',
					'del',
					'ins',
					'mark',
					'small',
					'sub',
					'sup',
					'code',
					'pre',
					'kbd',
					'samp',
					'var',
					'time',
					'data',
					'abbr',
					'bdi',
					'bdo',
					'ruby',
					'rt',
					'rp',
					'wbr',
					'span',
					'div',
					'p',
					'h1',
					'h2',
					'h3',
					'h4',
					'h5',
					'h6',
					'blockquote',
					'q',
					'cite',
					'dfn',
					'address',
					'dl',
					'dt',
					'dd',
					'ol',
					'ul',
					'li',
					'figure',
					'figcaption',
					'main',
					'article',
					'aside',
					'details',
					'summary',
					'header',
					'footer',
					'nav',
					'section',
					'table',
					'caption',
					'colgroup',
					'col',
					'tbody',
					'thead',
					'tfoot',
					'tr',
					'td',
					'th'
				);
			}

			// Remove unwanted elements
			unwanted_selectors.forEach((selector) => {
				const elements = div.querySelectorAll(selector);
				elements.forEach((el) => el.remove());
			});

			// Clean up attributes
			const allowed_attributes = new Set(['href', 'src', 'alt', 'title', 'class', 'id']);
			const elements = div.getElementsByTagName('*');

			for (let i = 0; i < elements.length; i++) {
				const el = elements[i];
				const attributes = Array.from(el.attributes);

				for (const attr of attributes) {
					// Remove all attributes except those in the allowed list
					if (!allowed_attributes.has(attr.name.toLowerCase())) {
						el.removeAttribute(attr.name);
					}

					// Clean up href/src to prevent XSS
					if (['href', 'src'].includes(attr.name.toLowerCase())) {
						const value = attr.value.trim().toLowerCase();
						if (value.startsWith('javascript:') || value.startsWith('data:')) {
							el.removeAttribute(attr.name);
						}
					}
				}

				// Remove empty elements
				if (!el.textContent?.trim() && !el.querySelector('img, iframe, object, embed')) {
					el.remove();
				}
			}

			// Get the sanitized HTML
			let sanitized = div.innerHTML;

			// Normalize whitespace and clean up HTML
			sanitized = sanitized
				.replace(/\s+/g, ' ')
				.replace(
					/\s*<\/?(p|div|span|br|hr|li|ul|ol|h[1-6]|blockquote|pre|code|table|tr|td|th|tbody|thead|tfoot)>\s*/gi,
					'\n'
				)
				.replace(/\n{3,}/g, '\n\n')
				.trim();

			// Apply length limit if specified
			if (max_length > 0 && sanitized.length > max_length) {
				// Truncate to the nearest word boundary
				const truncated = sanitized.substring(0, max_length);
				const last_space = truncated.lastIndexOf(' ');
				sanitized = truncated.substring(0, last_space > 0 ? last_space : max_length) + '...';
			}

			return sanitized;
		} catch (error) {
			this.logger.error('Error sanitizing content:', error);
			// Fallback to basic sanitization if something goes wrong
			return content
				.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
				.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim();
		}
	}

	/**
	 * Extract text from HTML
	 * @param html The HTML to extract text from
	 * @returns The extracted text
	 */
	protected html_to_text(html: string): string {
		// Create a temporary DOM element to parse the HTML
		const div = document.createElement('div');
		div.innerHTML = html;

		// Remove script and style elements
		const scripts = div.getElementsByTagName('script');
		const styles = div.getElementsByTagName('style');

		Array.from(scripts).forEach((script) => script.remove());
		Array.from(styles).forEach((style) => style.remove());

		// Get the text content
		return div.textContent || div.innerText || '';
	}

	/**
	 * Extract meta tags from HTML
	 * @param html The HTML to extract meta tags from
	 * @returns A record of meta tags
	 */
	protected extract_meta_tags(html: string): Record<string, string> {
		const meta: Record<string, string> = {};
		const doc = new DOMParser().parseFromString(html, 'text/html');

		// Get meta tags
		const meta_tags = doc.querySelectorAll('meta');
		meta_tags.forEach((tag) => {
			const name =
				tag.getAttribute('name') || tag.getAttribute('property') || tag.getAttribute('itemprop');
			const content = tag.getAttribute('content');

			if (name && content) {
				meta[name.toLowerCase()] = content;
			}
		});

		// Get title
		const title = doc.querySelector('title');
		if (title?.textContent) {
			meta.title = title.textContent;
		}

		return meta;
	}
}
