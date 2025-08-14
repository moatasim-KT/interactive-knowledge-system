import { BaseContentExtractor } from './base-extractor';
import type { ExtractionOptions, ExtractionResult } from './base-extractor';
import type {
	ContentBlock,
	JsonLd as JsonLdType,
	OpenGraphData as OpenGraphDataType,
	TwitterCardData as TwitterCardDataType,
	StructuredData as StructuredDataType
} from '../types';
import { createLogger } from '../../../utils/logger.js';

// Define a type for the logger to avoid importing it multiple times
type Logger = ReturnType<typeof createLogger>;

interface ExtractedContent {
	text: string;
	html: string;
	title?: string;
	language?: string;
}

/**
 * A generic web content extractor that works with any webpage
 */
export class WebExtractor extends BaseContentExtractor {
	public readonly name = 'web-extractor';
	public readonly domains = ['*'];
	public readonly content_types = ['text/html'];
	public readonly priority = 1; // Default priority

	constructor(logger: Logger) {
		super(logger);
	}

	async extract(
		html: string,
		url: string,
		options: ExtractionOptions = {}
	): Promise<ExtractionResult> {
		const start_time = Date.now();
		const fetched_at = new Date().toISOString();

		try {
			// Parse HTML
			const doc = new DOMParser().parseFromString(html, 'text/html');

			// Extract main content
			const content = await this.extract_content(html, url);

			// Extract metadata
			const metadata = await this.extract_metadata(html, url);

			// Ensure all required fields have values
			const full_metadata = {
				title: metadata.title || '',
				description: metadata.description || '',
				author: metadata.author || '',
				url: metadata.url || url,
				published_date: metadata.published_date || new Date().toISOString(),
				modified_date: metadata.modified_date || new Date().toISOString(),
				language: metadata.language || 'en',
				site_name: metadata.site_name || '',
				image: metadata.image || '',
				type: metadata.type || 'article',
				keywords: metadata.keywords || [],
				fetched_at: metadata.fetched_at || fetched_at,
				created: new Date(metadata.created || new Date()),
				modified: new Date(metadata.modified || new Date()),
				version: metadata.version || 1
			};

			// Process and clean the content
			const cleaned_content = this.clean_content(content, {
				includeComments: false // Not using comments option for now
			});

			// Return the extraction result
			return {
				content: cleaned_content,
				html: content,
				metadata: full_metadata,
				success: true,
				url,
				error: undefined
			};
		} catch (error) {
			this.logger.error('Error extracting web content:', error);
			throw error;
		}
	}

	/**
	 * Clean and process the extracted content
	 */
	private clean_content(
		content: string,
		options: { includeComments: boolean } = { includeComments: false }
	): string {
		// Remove extra whitespace and normalize newlines
		let cleaned = content
			.replace(/\s+/g, ' ')
			.replace(/\n{3,}/g, '\n\n')
			.trim();

		// Remove common unwanted elements if not explicitly requested
		if (!options.includeComments) {
			// Remove HTML comments
			cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
		}

		return cleaned;
	}

	/**
	 * Extract structured data from the document
	 */
	public async extract_structured_data(
		html: string,
		_url: string
	): Promise<Record<string, unknown>> {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const result = this.extract_structured_data_from_doc(doc);
		return result as unknown as Record<string, unknown>;
	}

	private extract_structured_data_from_doc(doc: Document): StructuredDataType {
		const result: StructuredDataType = {
			jsonLd: [],
			opengraph: {} as any, // Use 'any' to allow dynamic property assignment
			twitter: {},
			schemaOrg: []
		};

		// Extract JSON-LD data
		const json_ld_scripts = doc.querySelectorAll('script[type="application/ld+json"]');
		json_ld_scripts.forEach((script) => {
			try {
				const data = JSON.parse(script.textContent || '{}');
				if (data['@context']) {
					result.json_ld.push(data);
				}
			} catch (e) {
				this.logger.warn('Failed to parse JSON-LD data', e);
			}
		});

		// Extract Open Graph data
		const og_tags = doc.querySelectorAll('meta[property^="og:"]');
		og_tags.forEach((tag) => {
			const property = tag.getAttribute('property')?.replace('og:', '') || '';
			const content = tag.getAttribute('content') || '';

			if (property && content) {
				if (property.includes('image')) {
					if (!result.opengraph) {
						result.opengraph = {};
					}

					if (!result.opengraph.image) {
						result.opengraph.image = { url: content };
					} else if (typeof result.opengraph.image === 'string') {
						result.opengraph.image = { url: result.opengraph.image };
					}

					const img_prop = property.replace('image:', '');
					if (
						img_prop &&
						img_prop !== 'image' &&
						result.opengraph.image &&
						typeof result.opengraph.image === 'object'
					) {
						// Convert numeric values to strings for the Record<string, string> type
						const image_obj = result.opengraph.image as any;
						if (img_prop === 'width' || img_prop === 'height') {
							image_obj[img_prop] = parseInt(content, 10) || 0;
						} else if (img_prop === 'type') {
							image_obj[img_prop] = content;
						}
					} else if (result.opengraph) {
						(result.opengraph as any)[property] = content;
					}
				} else if (result.opengraph) {
					(result.opengraph as Record<string, string>)[property] = content;
				}
			}
		});

		// Extract Twitter Card data
		const twitter_tags = doc.querySelectorAll('meta[name^="twitter:"]');
		twitter_tags.forEach((tag) => {
			const name = tag.getAttribute('name')?.replace('twitter:', '') || '';
			const content = tag.getAttribute('content') || '';

			if (name && content) {
				if (result.twitter) {
					(result.twitter as any)[name] = content;
				}
			}
		});

		// Extract Schema.org microdata
		// This is a simplified example - a full implementation would be more complex
		const microdata_items = doc.querySelectorAll('[itemscope]');
		microdata_items.forEach((item) => {
			// Simplified microdata extraction
			const item_data: Record<string, any> = {};
			const item_type = item.getAttribute('itemtype');

			if (item_type) {
				item_data['@type'] = item_type;
			}

			const props = item.querySelectorAll('[itemprop]');
			props.forEach((prop) => {
				const prop_name = prop.getAttribute('itemprop') || '';
				let prop_value: any = prop.getAttribute('content') || prop.textContent || '';

				// Handle nested properties
				if (prop.hasAttribute('itemscope')) {
					// Skip nested items for now
					return;
				}

				// Handle URLs
				if (prop.tagName === 'A' || prop.tagName === 'LINK') {
					prop_value = prop.getAttribute('href') || prop_value;
				} else if (prop.tagName === 'IMG' || prop.tagName === 'SOURCE') {
					prop_value = prop.getAttribute('src') || prop_value;
				} else if (prop.tagName === 'META') {
					prop_value = prop.getAttribute('content') || prop_value;
				}

				if (prop_name && prop_value) {
					item_data[prop_name] = prop_value;
				}
			});

			if (Object.keys(item_data).length > 0) {
				result.schema_org.push(item_data);
			}
		});

		return result;
	}

	/**
	 * Extract metadata from HTML content
	 */
	async extract_metadata(html: string, url: string): Promise<any> {
		const doc = new DOMParser().parseFromString(html, 'text/html');
		const now = new Date().toISOString();

		// Basic metadata extraction
		const title = doc.querySelector('title')?.textContent || '';
		const description =
			doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
		const author = doc.querySelector('meta[name="author"]')?.getAttribute('content') || '';
		const image =
			doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
			doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
			'';

		// Create base metadata
		const metadata: any = {
			title,
			description,
			author,
			url,
			published_date: now,
			modified_date: now,
			language: doc.documentElement.lang || 'en',
			site_name: doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || '',
			image,
			type: doc.querySelector('meta[property="og:type"]')?.getAttribute('content') || 'article',
			keywords:
				doc
					.querySelector('meta[name="keywords"]')
					?.getAttribute('content')
					?.split(',')
					.map((k) => k.trim()) || [],
			fetched_at: now,
			created: new Date(),
			modified: new Date(),
			version: 1
		};

		// Extract additional metadata from structured data
		const structured_data = await this.extract_structured_data(html, url);
		if (structured_data.opengraph) {
			const og = structured_data.opengraph as Record<string, any>;
			if (og.title) { metadata.title = og.title; }
			if (og.description) { metadata.description = og.description; }
			if (og.site_name) { metadata.site_name = og.site_name; }
			if (og.image) {
				if (typeof og.image === 'string') {
					metadata.image = og.image;
				} else if (og.image.url) {
					metadata.image = og.image.url;
				}
			}
			if (og.article_published_time) { metadata.published_date = og.article_published_time; }
			if (og.article_modified_time) { metadata.modified_date = og.article_modified_time; }
			if (og.locale) { metadata.language = og.locale; }
		}

		return metadata;
	}

	/**
	 * Extract the main content from HTML
	 */
	public async extract_content(html: string, _url: string): Promise<string> {
		try {
			const doc = new DOMParser().parseFromString(html, 'text/html');

			// Try to find the main content element
			const content_areas = [
				'article',
				'main',
				'.article',
				'.content',
				'.post',
				'.entry',
				'.story',
				'.article-body',
				'.post-content',
				'.entry-content'
			];

			let content_element: HTMLElement | null = null;

			// Find the largest content area
			for (const selector of content_areas) {
				const elements = Array.from(doc.querySelectorAll(selector));
				if (elements.length > 0) {
					// Find the largest element by text content size
					let largest_element = elements[0] as HTMLElement;
					let largest_size = this.calculate_element_size(largest_element);

					for (let i = 1; i < elements.length; i++) {
						const size = this.calculate_element_size(elements[i] as HTMLElement);
						if (size > largest_size) {
							largest_element = elements[i] as HTMLElement;
							largest_size = size;
						}
					}

					if (largest_size > 0) {
						content_element = largest_element;
						break;
					}
				}
			}

			// If no main content found, use the body
			if (!content_element) {
				content_element = doc.body;
			}

			// Remove unwanted elements
			const unwanted_selectors = [
				'nav',
				'header',
				'footer',
				'aside',
				'form',
				'iframe',
				'script',
				'style',
				'.nav',
				'.header',
				'.footer',
				'.sidebar',
				'.ad',
				'.ads',
				'.advertisement',
				'.social',
				'.share',
				'.comments',
				'.related',
				'.popular',
				'.trending'
			];

			unwanted_selectors.forEach((selector) => {
				const elements = content_element?.querySelectorAll(selector) || [];
				elements.forEach((el) => el.remove());
			});

			// Clean and return the content
			return this.clean_content(content_element.innerHTML);
		} catch (error) {
			this.logger.error('Error extracting main content:', error);
			// Fallback to the whole page if something goes wrong
			return this.sanitize(html);
		}
	}

	/**
	 * Calculate the size of an element based on its text content and dimensions
	 */
	private calculate_element_size(element: HTMLElement): number {
		// Get the text content length (weighted more heavily)
		const text_length = element.textContent?.trim().length || 0;

		// Get the number of child elements (weighted less heavily)
		const child_count = element.children.length;

		// Calculate a score based on both factors
		return text_length * 2 + child_count;
	}

	/**
	 * Check if a URL points to a valid image
	 */
	private is_valid_image_url(url: string): boolean {
		if (!url) { return false; }

		try {
			const url_obj = new URL(url);
			const path = url_obj.pathname.toLowerCase();

			// Check for common image file extensions
			const image_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'];
			const is_image = image_extensions.some((ext) => path.endsWith(ext));

			// Check for common image paths
			const image_path_indicators = ['/images/', '/img/', '/media/', '/uploads/', '/assets/'];
			const has_image_path = image_path_indicators.some((indicator) => path.includes(indicator));

			// Check for common non-image paths
			const non_image_indicators = ['/css/', '/js/', '/fonts/', '/icons/'];
			const has_non_image_path = non_image_indicators.some((indicator) => path.includes(indicator));

			return is_image || (has_image_path && !has_non_image_path);
		} catch (e) {
			return false;
		}
	}
}
