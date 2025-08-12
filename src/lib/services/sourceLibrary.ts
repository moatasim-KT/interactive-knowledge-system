/**
 * Source Library Service
 * Provides comprehensive search, filtering, and categorization capabilities for web content sources
 */

import type { WebContentSource, WebContentMetadata } from '../types/web-content.js';
import { sourceManager } from './sourceManager.js';
import { createLogger } from '../utils/logger.js';

/**
 * Sort options for search results
 */
export type SortBy = 'relevance' | 'date' | 'usage' | 'quality' | 'title';

/**
 * Filters used for searching sources
 */
export interface SourceFilters {
    domain?: string;
    category?: string;
    status?: WebContentSource['status'];
    tags?: string[];
    dateRange?: { start: Date; end: Date };
}

/**
 * Search result with relevance scoring
 */
export interface SearchResult {
    source: WebContentSource;
    relevanceScore: number;
    matchedFields: string[];
    highlights: Record<string, string>;
}

/**
 * Advanced search configuration
 */
export interface AdvancedSearchConfig {
    query: string;
    filters: SourceFilters;
    sortBy: SortBy;
    sortOrder: 'asc' | 'desc';
    limit?: number;
    offset?: number;
}

/**
 * Categorization result
 */
export interface CategorizationResult {
    categories: {
        [category: string]: {
            count: number;
            sources: WebContentSource[];
            subcategories?: { [key: string]: number };
        };
    };
    uncategorized: WebContentSource[];
    totalSources: number;
}

/**
 * Tag analysis result
 */
export interface TagAnalysis {
    tags: Record<string, {
        count: number;
        sources: string[]; // source IDs
        relatedTags: string[];
        category?: string;
    }>;
    tagClusters: Record<string, string[]>;
    totalTags: number;
}

/**
 * Source Library class
 */
export class SourceLibrary {
	private static instance: SourceLibrary;
	private searchIndex: Map<string, Set<string>> = new Map(); // word -> source IDs
	private categoryIndex: Map<string, Set<string>> = new Map(); // category -> source IDs
	private tagIndex: Map<string, Set<string>> = new Map(); // tag -> source IDs
	private domainIndex: Map<string, Set<string>> = new Map(); // domain -> source IDs
	private isIndexed = false;
    private logger = createLogger('source-library');

	private constructor() {}

	static getInstance(): SourceLibrary {
		if (!SourceLibrary.instance) {
			SourceLibrary.instance = new SourceLibrary();
		}
		return SourceLibrary.instance;
	}

    /**
     * Build search indices for fast searching
     */
    async buildIndices(): Promise<void> {
        if (this.isIndexed) return;

        this.logger.info('Building search indices...');

        try {
            // Clear existing indices
            this.searchIndex.clear();
            this.categoryIndex.clear();
            this.tagIndex.clear();
            this.domainIndex.clear();

            // Fetch all sources
            const { sources } = await sourceManager.listSources();

            // Index each source
            sources.forEach((s) => this.indexSource(s));

            this.isIndexed = true;
            this.logger.info(`Search indices built with ${sources.length} sources`);
        } catch (error) {
            this.logger.error('Failed to build search indices:', error);
            throw error;
        }
    }

	private indexSource(source: WebContentSource): void {
		if (!source?.id) return;

		const metadata: WebContentMetadata = source.metadata || {
			domain: source.domain,
			contentType: 'text/html',
			language: 'en',
			readingTime: 0,
			wordCount: 0,
			keywords: [],
			description: source.title || '',
			tags: [],
			category: 'uncategorized',
			attribution: ''
		};

		const searchableText = [
			source.title,
			metadata.description,
			source.url,
			metadata.category,
			metadata.tags?.join(' '),
			Object.entries(metadata)
				.filter(([key]) => !['description', 'category', 'tags'].includes(key))
				.map(([key, value]) => `${key}:${value}`)
				.join(' ')
		]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();

		// Index words
		const words = searchableText.split(/\s+/);
		words.forEach((word) => {
			if (!this.searchIndex.has(word)) {
				this.searchIndex.set(word, new Set());
			}
			this.searchIndex.get(word)?.add(source.id);
		});

		// Index categories
		if (metadata.category) {
			const category = metadata.category.toLowerCase();
			if (!this.categoryIndex.has(category)) {
				this.categoryIndex.set(category, new Set());
			}
			this.categoryIndex.get(category)?.add(source.id);
		}

		// Index tags
		if (metadata.tags?.length) {
			metadata.tags.forEach((tag) => {
				const normalizedTag = tag.toLowerCase();
				if (!this.tagIndex.has(normalizedTag)) {
					this.tagIndex.set(normalizedTag, new Set());
				}
				this.tagIndex.get(normalizedTag)?.add(source.id);
			});
		}

		// Index domain
		if (source.url) {
			try {
				const domain = new URL(source.url).hostname;
				if (!this.domainIndex.has(domain)) {
					this.domainIndex.set(domain, new Set());
				}
				this.domainIndex.get(domain)?.add(source.id);
			} catch (e) {
				// Invalid URL, skip domain indexing
			}
		}
	}

	/**
	 * Perform advanced search
	 */
	async search(config: AdvancedSearchConfig): Promise<{
		results: SearchResult[];
		totalCount: number;
		facets: {
			categories: { [key: string]: number };
			tags: { [key: string]: number };
			domains: { [key: string]: number };
		};
	}> {
		if (!this.isIndexed) {
			await this.buildIndices();
		}

		// Get candidate source IDs based on query
		let candidateIds: Set<string>;

		if (config.query.trim()) {
			candidateIds = this.searchByQuery(config.query);
		} else {
			// No query - get all sources
			const { sources } = await sourceManager.listSources();
			candidateIds = new Set(sources.map((s) => s.id));
		}

		// Apply filters
		candidateIds = await this.applyFilters(candidateIds, config.filters);

		// Get source objects and calculate relevance scores
		const { sources } = await sourceManager.listSources();
		const sourceById = new Map<string, WebContentSource>(sources.map((s) => [s.id, s] as const));
		const validSources: WebContentSource[] = Array.from(candidateIds)
			.map((id) => sourceById.get(id))
			.filter((s): s is WebContentSource => Boolean(s));

		const searchResults = validSources.map((source) => ({
			source,
			relevanceScore: this.calculateRelevanceScore(source, config.query),
			matchedFields: this.getMatchedFields(source, config.query),
			highlights: this.generateHighlights(source, config.query)
		}));

		// Sort results
		this.sortResults(searchResults, config.sortBy, config.sortOrder);

		// Apply pagination
		const totalCount = searchResults.length;
		const offset = config.offset || 0;
		const limit = config.limit || totalCount;
		const paginatedResults = searchResults.slice(offset, offset + limit);

		// Generate facets
		const facets = this.generateFacets(validSources);

		return {
			results: paginatedResults,
			totalCount,
			facets
		};
	}

	/**
	 * Search by text query
	 */
	private searchByQuery(query: string): Set<string> {
		const queryWords = this.tokenizeText(query.toLowerCase());
		const result = new Set<string>();

		queryWords.forEach((word) => {
			const sources = this.searchIndex.get(word) || new Set<string>();
			sources.forEach((sourceId) => result.add(sourceId));
		});

		return result;
	}

	/**
	 * Apply filters to candidate source IDs
	 */
	private async applyFilters(
		candidateIds: Set<string>,
		filters: SourceFilters
	): Promise<Set<string>> {
		let filteredIds = new Set<string>(candidateIds);

		// Domain filter
		if (filters.domain) {
			const domainIds = this.domainIndex.get(filters.domain) || new Set<string>();
			filteredIds = new Set(Array.from(filteredIds).filter((id) => domainIds.has(id)));
		}

		// Category filter
		if (filters.category) {
			const categoryIds = this.categoryIndex.get(filters.category) || new Set<string>();
			filteredIds = new Set(Array.from(filteredIds).filter((id) => categoryIds.has(id)));
		}

		// Tags filter
		if (filters.tags && filters.tags.length > 0) {
			const tagIds = new Set<string>();
			filters.tags.forEach((tag) => {
				const ids = this.tagIndex.get(tag) || new Set<string>();
				ids.forEach((id) => tagIds.add(id));
			});
			filteredIds = new Set(Array.from(filteredIds).filter((id) => tagIds.has(id)));
		}

		// Status filter
		if (filters.status) {
			const { sources } = await sourceManager.listSources();
			const statusFilteredIds = sources
				.filter((s) => filteredIds.has(s.id) && s.status === filters.status)
				.map((s) => s.id);
			filteredIds = new Set(statusFilteredIds);
		}

		// Date range filter
		if (filters.dateRange) {
			const { sources } = await sourceManager.listSources();
			const dateFilteredIds = sources
				.filter(
					(s) =>
						filteredIds.has(s.id) &&
						s.importDate >= filters.dateRange!.start &&
						s.importDate <= filters.dateRange!.end
				)
				.map((s) => s.id);
			filteredIds = new Set(dateFilteredIds);
		}

		return filteredIds;
	}

	/**
	 * Calculate relevance score for a source
	 */
	private calculateRelevanceScore(source: WebContentSource, query: string): number {
		// Simple implementation - can be enhanced with more sophisticated scoring
		const queryWords = this.tokenizeText(query.toLowerCase());
		const title = source.title.toLowerCase();
		const description = source.metadata.description.toLowerCase();
		const keywords = source.metadata.keywords.join(' ').toLowerCase();

		let score = 0;

		// Check title matches
		queryWords.forEach((word) => {
			if (title.includes(word)) score += 10;
			if (description.includes(word)) score += 5;
			if (keywords.includes(word)) score += 3;
		});

		// Boost score for exact matches
		if (title.includes(query.toLowerCase())) score += 20;
		if (description.includes(query.toLowerCase())) score += 10;

		return score;
	}

	/**
	 * Get matched fields for a source
	 */
	private getMatchedFields(source: WebContentSource, query: string): string[] {
		const queryWords = this.tokenizeText(query.toLowerCase());
		const fields: string[] = [];

		const title = source.title.toLowerCase();
		const description = source.metadata.description.toLowerCase();
		const keywords = source.metadata.keywords.join(' ').toLowerCase();
		const tags = (source.metadata.tags || []).join(' ').toLowerCase();

		queryWords.forEach((word) => {
			if (title.includes(word) && !fields.includes('title')) fields.push('title');
			if (description.includes(word) && !fields.includes('description')) fields.push('description');
			if (keywords.includes(word) && !fields.includes('keywords')) fields.push('keywords');
			if (tags.includes(word) && !fields.includes('tags')) fields.push('tags');
		});

		return fields;
	}

	/**
	 * Generate highlights for search results
	 */
	private generateHighlights(source: WebContentSource, query: string): { [field: string]: string } {
		if (!query.trim()) return {};

		const highlights: { [field: string]: string } = {};
		const query_words = this.tokenizeText(query.toLowerCase());

		// Highlight title
		highlights.title = this.highlightText(source.title, query_words);

		// Highlight description
		highlights.description = this.highlightText(source.metadata.description, query_words);

		return highlights;
	}

	/**
	 * Highlight matching words in text
	 */
	private highlightText(text: string, queryWords: string[]): string {
		let highlighted = text;

		queryWords.forEach((word) => {
			const regex = new RegExp(`\\b${word}\\b`, 'gi');
			highlighted = highlighted.replace(regex, `<mark>$&</mark>`);
		});

		return highlighted;
	}

	/**
	 * Sort search results
	 */
	private sortResults(results: SearchResult[], sortBy: SortBy, sortOrder: 'asc' | 'desc'): void {
		const multiplier = sortOrder === 'asc' ? 1 : -1;

		results.sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case 'relevance':
					comparison = a.relevanceScore - b.relevanceScore;
					break;
				case 'date':
					comparison = a.source.importDate.getTime() - b.source.importDate.getTime();
					break;
				case 'usage':
					comparison = a.source.usage.timesReferenced - b.source.usage.timesReferenced;
					break;
				case 'title':
					comparison = a.source.title.localeCompare(b.source.title);
					break;
				default:
					comparison = a.relevanceScore - b.relevanceScore;
			}

			return comparison * multiplier;
		});
	}

	/**
	 * Generate facets for search results
	 */
	private generateFacets(sources: WebContentSource[]): {
		categories: { [key: string]: number };
		tags: { [key: string]: number };
		domains: { [key: string]: number };
	} {
		const categories: { [key: string]: number } = {};
		const tags: { [key: string]: number } = {};
		const domains: { [key: string]: number } = {};

		sources.forEach((source) => {
			// Count categories
			const category = source.metadata.category || 'uncategorized';
			categories[category] = (categories[category] || 0) + 1;

			// Count tags
			(source.metadata.tags || []).forEach((tag) => {
				tags[tag] = (tags[tag] || 0) + 1;
			});

			// Count domains
			domains[source.domain] = (domains[source.domain] || 0) + 1;
		});

		return { categories, tags, domains };
	}

	/**
	 * Get categorization overview
	 */
	/**
	 * Get categorization of sources
	 */
	async getCategorization(): Promise<CategorizationResult> {
		const { sources } = await sourceManager.listSources();
		const categories: { [category: string]: { count: number; sources: WebContentSource[] } } = {};
		const uncategorized: WebContentSource[] = [];

		sources.forEach((source) => {
			const category = source.metadata?.category;

			if (!category || category === 'uncategorized') {
				uncategorized.push(source);
			} else {
				if (!categories[category]) {
					categories[category] = { count: 0, sources: [] };
				}
				categories[category].count++;
				categories[category].sources.push(source);
			}
		});

		return {
			categories,
			uncategorized,
			totalSources: sources.length
		};
	}
	private tokenizeText(text: string): string[] {
		return text
			.toLowerCase()
			.replace(/[^\w\s]/g, ' ')
			.split(/\s+/)
			.filter((word) => word.length > 2); // Filter out very short words
	}

	/**
	 * Update indices when a source is added/updated
	 */
	updateSourceInIndex(source: WebContentSource): void {
		if (this.isIndexed) {
			this.indexSource(source);
		}
	}

	/**
	 * Remove source from indices
	 */
	removeSourceFromIndex(sourceId: string): void {
		if (!this.isIndexed) return;

		// Remove from search index
		this.searchIndex.forEach((sourceIds, word) => {
			sourceIds.delete(sourceId);
			if (sourceIds.size === 0) {
				this.searchIndex.delete(word);
			}
		});

		// Remove from other indices
		this.categoryIndex.forEach((sourceIds, category) => {
			sourceIds.delete(sourceId);
			if (sourceIds.size === 0) {
				this.categoryIndex.delete(category);
			}
		});

		this.tagIndex.forEach((sourceIds, tag) => {
			sourceIds.delete(sourceId);
			if (sourceIds.size === 0) {
				this.tagIndex.delete(tag);
			}
		});

		this.domainIndex.forEach((sourceIds, domain) => {
			sourceIds.delete(sourceId);
			if (sourceIds.size === 0) {
				this.domainIndex.delete(domain);
			}
		});
	}
}

// Export singleton instance
export const sourceLibrary = SourceLibrary.getInstance();
