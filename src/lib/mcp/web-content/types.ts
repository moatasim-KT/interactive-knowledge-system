/**
 * Web Content Sourcing Types
 * Defines the data structures and interfaces for the web content sourcing MCP server
 */

import type { ContentBlock } from '../../types/content.js';

export type { ContentBlock }; // Re-export ContentBlock

/**
 * Structured data types for metadata extraction
 */
export interface JsonLd {
	'@context'?: string | object;
	'@type'?: string | string[];
	[key: string]: any;
}

export interface OpenGraphData {
	title?: string;
	type?: string;
	url?: string;
	description?: string;
	site_name?: string;
	image?: string | { url: string; width?: number; height?: number; type?: string };
	[key: `og:${string}`]: any;
}

export interface TwitterCardData {
	card?: string;
	site?: string;
	creator?: string;
	title?: string;
	description?: string;
	image?: string;
	[key: `twitter:${string}`]: any;
}

export interface StructuredData {
	jsonLd?: JsonLd[];
	microdata?: any[];
	opengraph?: OpenGraphData;
	twitter?: TwitterCardData;
	schemaOrg?: any;
	[key: string]: any;
}

/**
 * Web content fetching options
 */
export interface WebContentFetchOptions {
	/** Whether to use a headless browser for JavaScript-heavy sites */
	useHeadlessBrowser?: boolean;

	/** Timeout for the request in milliseconds */
	timeout?: number;

	/** Custom user agent string */
	userAgent?: string;

	/** Whether to follow redirects */
	followRedirects?: boolean;

	/** Maximum number of redirects to follow */
	maxRedirects?: number;
}

/**
 * Content extraction options
 */
export interface WebContentExtractOptions {
	/** Whether to extract the main content only */
	mainContentOnly?: boolean;

	/** Whether to extract and include images */
	includeImages?: boolean;

	/** Whether to extract and include links */
	includeLinks?: boolean;

	/** Whether to extract and include metadata */
	includeMetadata?: boolean;

	/** Whether to extract and include structured data (JSON-LD, Microdata, etc.) */
	includeStructuredData?: boolean;

	/** Content type of the input (e.g., 'text/html', 'application/json') */
	content_type?: string;

	/** Whether to follow links in the content */
	followLinks?: boolean;

	/** Maximum depth for link following */
	maxDepth?: number;

	/** Whether to extract and include embedded content (videos, tweets, etc.) */
	includeEmbeds?: boolean;

	/** Whether to extract and include comments */
	includeComments?: boolean;

	/** Custom headers to include in requests */
	headers?: Record<string, string>;

	/** Timeout for requests in milliseconds */
	timeout?: number;
}

/**
 * Web content metadata
 */
export interface WebContentMetadata {
	/** The title of the web content */
	title?: string;

	/** A short description or summary */
	description?: string;

	/** The author of the content */
	author?:
		| string
		| {
				name: string;
				url?: string;
				image?: string;
				[key: string]: any;
		  }
		| null;

	/** The date the content was published (ISO 8601 format) */
	published_date?: string;

	/** The date the content was last modified (ISO 8601 format) */
	modified_date?: string;

	/** The primary language of the content (BCP 47 language tag) */
	language?: string;

	/** The MIME type of the content */
	content_type?: string;

	/** Estimated word count */
	word_count?: number;

	/** Estimated reading time in minutes */
	reading_time?: number;

	/** The canonical URL of the content */
	url: string;

	/** The canonical URL if different from the requested URL */
	canonical_url?: string;

	/** The name of the website or publisher */
	site_name?: string;

	/** Categories or sections the content belongs to */
	categories?: string[];

	/** Tags or keywords associated with the content */
	tags?: string[];

	/** Primary image URL or object with image details */
	image?:
		| string
		| {
				url: string;
				width?: number;
				height?: number;
				alt?: string;
				type?: string;
				[key: string]: any;
		  };

	/** Content license information */
	license?:
		| string
		| {
				type: string;
				url?: string;
				[key: string]: any;
		  };

	/** When the content was fetched (ISO 8601 format) */
	fetched_at: string;

	/** Structured data extracted from the page */
	structured_data?: StructuredData;

	/** Open Graph metadata */
	opengraph?: OpenGraphData;

	/** Twitter Card metadata */
	twitter?: TwitterCardData;

	/** Any additional metadata */
	[key: string]: any;
}

/**
 * Error information for failed fetches
 */
export interface WebContentError {
	/** Error message */
	message: string;

	/** Error code, if available */
	code?: string;

	/** Additional error details */
	details?: unknown;
}

/**
 * Extracted web content
 */
export interface WebContent {
	/** Unique identifier for the content */
	id: string;

	/** Content metadata */
	metadata: WebContentMetadata;

	/** Extracted text content */
	text: string;

	/** Extracted HTML content */
	html: string;

	/** Extracted content as ContentBlock array */
	blocks: ContentBlock[];

	/** Raw response headers */
	headers?: Record<string, string>;

	/** HTTP status code */
	status_code?: number;

	/** Error information if the fetch failed */
	error?: WebContentError;

	/** When the content was fetched (ISO timestamp) */
	fetched_at: string;

	/** Processing time in milliseconds */
	processing_time: number;
}

/**
 * MCP tool definition for web content fetching
 */
export interface WebContentTool {
	/** Tool name */
	name: string;

	/** Tool description */
	description: string;

	/** Input parameters */
	parameters: Record<
		string,
		{
			type: string;
			description: string;
			required?: boolean;
			default?: unknown;
			properties?: Record<string, unknown>;
		}
	>;

	/** Output schema */
	output: {
		type: string;
		properties?: Record<string, unknown>;
	};
}
