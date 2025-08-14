import type { Logger } from '../../../utils/logger.js';
import type { ContentExtractor, ExtractionOptions, ExtractionResult } from './base-extractor';

/**
 * Registry for managing content extractors
 */
export class ExtractorRegistry {
	private extractors: Map<string, ContentExtractor> = new Map();
	private logger: Logger;

	constructor(logger: Logger) {
		this.logger = logger;
	}

	/**
	 * Register a content extractor
	 * @param extractor The extractor to register
	 */
	register(extractor: ContentExtractor): void {
		if (this.extractors.has(extractor.name)) {
			this.logger.warn(`Extractor with name '${extractor.name}' is already registered`);
			return;
		}

		this.extractors.set(extractor.name, extractor);
		this.logger.debug(`Registered extractor: ${extractor.name}`);
	}

	/**
	 * Unregister a content extractor
	 * @param name The name of the extractor to unregister
	 */
	unregister(name: string): void {
		if (!this.extractors.has(name)) {
			this.logger.warn(`Extractor with name '${name}' is not registered`);
			return;
		}

		this.extractors.delete(name);
		this.logger.debug(`Unregistered extractor: ${name}`);
	}

	/**
	 * Get an extractor by name
	 * @param name The name of the extractor to get
	 * @returns The extractor, or undefined if not found
	 */
	get(name: string): ContentExtractor | undefined {
		return this.extractors.get(name);
	}

	/**
	 * Get all registered extractors
	 * @returns An array of all registered extractors
	 */
	getAll(): ContentExtractor[] {
		return Array.from(this.extractors.values());
	}

	/**
	 * Find an extractor that can handle the given URL and content type
	 * @param url The URL to check
	 * @param content_type The content type to check
	 * @returns The first matching extractor, or undefined if none found
	 */
	find_extractor(url: string, content_type: string = 'text/html'): ContentExtractor | undefined {
		for (const extractor of this.extractors.values()) {
			if (extractor.can_handle(url, content_type)) {
				return extractor;
			}
		}
		return undefined;
	}

	/**
	 * Extract content using the most appropriate extractor
	 * @param html The HTML to extract content from
	 * @param url The URL the HTML was fetched from
	 * @param options Extraction options
	 * @returns A promise that resolves to the extraction result
	 */
	async extract(
		html: string,
		url: string,
		options: ExtractionOptions = {}
	): Promise<ExtractionResult> {
		const content_type = options.content_type || 'text/html';
		const extractor = this.find_extractor(url, content_type);

		if (!extractor) {
			const error = new Error(`No extractor found for URL: ${url} (content type: ${content_type})`);
			this.logger.error(error.message);
			return {
				content: '',
				html: '',
				metadata: {
					url,
					fetched_at: new Date().toISOString()
				},
				error,
				success: false,
				url
			};
		}

		this.logger.debug(`Using extractor: ${extractor.name} for URL: ${url}`);

		try {
			const result = await extractor.extract(html, url, options);
			return {
				...result,
				success: true,
				error: undefined
			};
		} catch (error) {
			const error_message = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error(`Extraction failed for ${url}: ${error_message}`, error);

			return {
				content: '',
				html: '',
				metadata: {
					url,
					domain: new URL(url).hostname,
					contentType: 'unknown',
					language: 'en',
					readingTime: 0,
					wordCount: 0,
					keywords: [],
					description: '',
					attribution: url,
					tags: [],
					category: 'general',
					fetched_at: new Date().toISOString()
				},
				error: error instanceof Error ? error : new Error(error_message),
				success: false,
				url
			};
		}
	}
}

/**
 * Create and configure a new extractor registry with default extractors
 * @param logger The logger to use
 * @returns A configured extractor registry
 */
export function create_extractor_registry(logger: Logger): ExtractorRegistry {
	const registry = new ExtractorRegistry(logger);

	// Register default extractors here
	// Example:
	// registry.register(new MediumExtractor(logger));
	// registry.register(new GitHubExtractor(logger));
	// registry.register(new WikipediaExtractor(logger));

	return registry;
}

export default ExtractorRegistry;
