/**
 * Source Library Service
 * Provides comprehensive search, filtering, and categorization capabilities for web content sources
 */

import type { WebContentSource, SourceFilters } from '../types/web-content.js';
import { sourceManager } from './sourceManager.js';

/**
 * Advanced search configuration
 */
export interface AdvancedSearchConfig {
	query: string;
	filters: SourceFilters;
	sortBy: 'relevance' | 'date' | 'usage' | 'quality' | 'title';
	sortOrder: 'asc' | 'desc';
	limit?: number;
	offset?: number;
}

/**
 * Search result with relevance scoring
 */
export interface SearchResult {
	source: WebContentSource;
	relevanceScore: number;
	matchedFields: string[];
	highlights: {
		[field: string]: string;
	};
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
	tags: {
		[tag: string]: {
			count: number;
			sources: string[]; // source IDs
			relatedTags: string[];
			category?: string;
		};
	};
	tagClusters: {
		[cluster: string]: string[];
	};
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
		const sources = await sourceManager.getAllSources();

		// Clear existing indices
		this.searchIndex.clear();
		this.categoryIndex.clear();
		this.tagIndex.clear();
		this.domainIndex.clear();

		for (const source of sources) {
			this.indexSource(source);
		}

		this.isIndexed = true;
	}

	/**
	 * Index a single source
	 */
	private indexSource(source: WebContentSource): void {
		// Index searchable text
		const searchable_text = [
			source.title,
			source.metadata.description,
			source.metadata.author || '',
			...source.metadata.keywords
		]
			.join(' ')
			.toLowerCase();

		const words = this.tokenizeText(searchable_text);
		for (const word of words) {
			if (!this.searchIndex.has(word)) {
				this.searchIndex.set(word, new Set());
			}
			this.searchIndex.get(word)!.add(source.id);
		}

		// Index category
		const category = source.metadata.category || 'uncategorized';
		if (!this.categoryIndex.has(category)) {
			this.categoryIndex.set(category, new Set());
		}
		this.categoryIndex.get(category)!.add(source.id);

		// Index tags
		for (const tag of source.metadata.tags) {
			if (!this.tagIndex.has(tag)) {
				this.tagIndex.set(tag, new Set());
			}
			this.tagIndex.get(tag)!.add(source.id);
		}

		// Index domain
		if (!this.domainIndex.has(source.domain)) {
			this.domainIndex.set(source.domain, new Set());
		}
		this.domainIndex.get(source.domain)!.add(source.id);
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
		let candidate_ids;

		if (config.query.trim()) {
			candidate_ids = this.searchByQuery(config.query);
		} else {
			// No query - get all sources
			const all_sources = await sourceManager.getAllSources();
			candidate_ids = new Set(all_sources.map((s) => s.id));
		}

		// Apply filters
		candidate_ids = await this.applyFilters(candidate_ids, config.filters);

		// Get source objects and calculate relevance scores
		const sources = await Promise.all(
			Array.from(candidate_ids).map((id) => sourceManager.getSource(id))
		);
		const valid_sources = sources.filter((s) => s !== undefined) as WebContentSource[];

		const search_results = valid_sources.map((source) => ({
			source,
			relevanceScore: this.calculateRelevanceScore(source, config.query),
			matchedFields: this.getMatchedFields(source, config.query),
			highlights: this.generateHighlights(source, config.query)
		}));

		// Sort results
		this.sortResults(search_results, config.sortBy, config.sortOrder);

		// Apply pagination
		const total_count = search_results.length;
		const offset = config.offset || 0;
		const limit = config.limit || total_count;
		const paginated_results = search_results.slice(offset, offset + limit);

		// Generate facets
		const facets = this.generateFacets(valid_sources);

		return {
			results: paginated_results,
			totalCount: total_count,
			facets
		};
	}

	/**
	 * Search by text query
	 */
	private searchByQuery(query: string): Set<string> {
		const query_words = this.tokenizeText(query.toLowerCase());
		const result_sets = [];

		for (const word of query_words) {
			const source_ids = this.searchIndex.get(word);
			if (source_ids) {
				result_sets.push(source_ids);
			}
		}

		if (result_sets.length === 0) {
			return new Set();
		}

		// Find intersection of all result sets (AND operation)
		let intersection = new Set(result_sets[0]);
		for (let i = 1; i < result_sets.length; i++) {
			intersection = new Set([...intersection].filter((id) => result_sets[i].has(id)));
		}

		return intersection;
	}

	/**
	 * Apply filters to candidate source IDs
	 */
	private async applyFilters(
		candidateIds: Set<string>,
		filters: SourceFilters
	): Promise<Set<string>> {
		let filtered_ids = new Set(candidate_ids);

		// Domain filter
		if (filters.domain) {
			const domain_ids = this.domainIndex.get(filters.domain) || new Set();
			filtered_ids = new Set([...filtered_ids].filter((id) => domain_ids.has(id)));
		}

		// Category filter
		if (filters.category) {
			const category_ids = this.categoryIndex.get(filters.category) || new Set();
			filtered_ids = new Set([...filtered_ids].filter((id) => category_ids.has(id)));
		}

		// Tags filter
		if (filters.tags && filters.tags.length > 0) {
			const tag_ids = new Set<string>();
			for (const tag of filters.tags) {
				const ids = this.tagIndex.get(tag) || new Set();
				ids.forEach((id) => tag_ids.add(id));
			}
			filtered_ids = new Set([...filtered_ids].filter((id) => tag_ids.has(id)));
		}

		// Status filter
		if (filters.status) {
			const sources = await Promise.all(
				Array.from(filtered_ids).map((id) => sourceManager.getSource(id))
			);
			const status_filtered_ids = sources
				.filter((s) => s && s.status === filters.status)
				.map((s) => s!.id);
			filtered_ids = new Set(status_filtered_ids);
		}

		// Date range filter
		if (filters.dateRange) {
			const sources = await Promise.all(
				Array.from(filtered_ids).map((id) => sourceManager.getSource(id))
			);
			const date_filtered_ids = sources
				.filter(
					(s) =>
						s && s.importDate >= filters.dateRange!.start && s.importDate <= filters.dateRange!.end
				)
				.map((s) => s!.id);
			filtered_ids = new Set(date_filtered_ids);
		}

		return filtered_ids;
	}

	/**
	 * Calculate relevance score for a source
	 */
	private calculateRelevanceScore(source: WebContentSource, query: string): number {
		if (!query.trim()) {
			return 1.0; // No query - all sources equally relevant
		}

		const query_words = this.tokenizeText(query.toLowerCase());
		let score = 0;

		// Title matches (highest weight)
		const title_words = this.tokenizeText(source.title.toLowerCase());
		const title_matches = query_words.filter((word) => title_words.includes(word));
		score += title_matches.length * 0.4;

		// Description matches
		const desc_words = this.tokenizeText(source.metadata.description.toLowerCase());
		const desc_matches = query_words.filter((word) => desc_words.includes(word));
		score += desc_matches.length * 0.3;

		// Keyword matches
		const keywords = source.metadata.keywords.map((k) => k.toLowerCase());
		const keyword_matches = query_words.filter((word) => keywords.includes(word));
		score += keyword_matches.length * 0.2;

		// Tag matches
		const tags = source.metadata.tags.map((t) => t.toLowerCase());
		const tag_matches = query_words.filter((word) => tags.includes(word));
		score += tag_matches.length * 0.1;

		// Normalize by query length
		return query_words.length > 0 ? score / query_words.length : 0;
	}

	/**
	 * Get matched fields for a source
	 */
	private getMatchedFields(source: WebContentSource, query: string): string[] {
		if (!query.trim()) return [];

		const query_words = this.tokenizeText(query.toLowerCase());
		const matched_fields = [];

		// Check title
		const title_words = this.tokenizeText(source.title.toLowerCase());
		if (query_words.some((word) => title_words.includes(word))) {
			matched_fields.push('title');
		}

		// Check description
		const desc_words = this.tokenizeText(source.metadata.description.toLowerCase());
		if (query_words.some((word) => desc_words.includes(word))) {
			matched_fields.push('description');
		}

		// Check keywords
		const keywords = source.metadata.keywords.map((k) => k.toLowerCase());
		if (query_words.some((word) => keywords.includes(word))) {
			matched_fields.push('keywords');
		}

		// Check tags
		const tags = source.metadata.tags.map((t) => t.toLowerCase());
		if (query_words.some((word) => tags.includes(word))) {
			matched_fields.push('tags');
		}

		return matched_fields;
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

		for (const word of query_words) {
			const regex = new RegExp(`\\b${word}\\b`, 'gi');
			highlighted = highlighted.replace(regex, `<mark>$&</mark>`);
		}

		return highlighted;
	}

	/**
	 * Sort search results
	 */
	private sortResults(results: SearchResult[], sortBy: string, sortOrder: 'asc' | 'desc'): void {
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

		for (const source of sources) {
			// Count categories
			const category = source.metadata.category || 'uncategorized';
			categories[category] = (categories[category] || 0) + 1;

			// Count tags
			for (const tag of source.metadata.tags) {
				tags[tag] = (tags[tag] || 0) + 1;
			}

			// Count domains
			domains[source.domain] = (domains[source.domain] || 0) + 1;
		}

		return { categories, tags, domains };
	}

	/**
	 * Get categorization overview
	 */
	async getCategorization(): Promise<CategorizationResult> {
		const sources = await sourceManager.getAllSources();
		const categories: { [category: string]: { count: number; sources: WebContentSource[] } } = {};
		const uncategorized: WebContentSource[] = [];

		for (const source of sources) {
			const category = source.metadata.category;

			if (!category || category === 'uncategorized') {
				uncategorized.push(source);
			} else {
				if (!categories[category]) {
					categories[category] = { count: 0, sources: [] };
				}
				categories[category].count++;
				categories[category].sources.push(source);
			}
		}

		return {
			categories,
			uncategorized,
			totalSources: sources.length
		};
	}

	/**
	 * Analyze tags and their relationships
	 */
	async analyzeTagsAndRelationships(): Promise<TagAnalysis> {
		const sources = await sourceManager.getAllSources();
		const tags: { [tag: string]: { count: number; sources: string[]; relatedTags: string[] } } = {};
		const tag_cooccurrence = {};

		// Count tag occurrences and co-occurrences
		for (const source of sources) {
			const source_tags = source.metadata.tags;

			for (const tag of source_tags) {
				if (!tags[tag]) {
					tags[tag] = { count: 0, sources: [], relatedTags: [] };
				}
				tags[tag].count++;
				tags[tag].sources.push(source.id);
			}

			// Count co-occurrences
			for (let i = 0; i < source_tags.length; i++) {
				for (let j = i + 1; j < source_tags.length; j++) {
					const pair = [source_tags[i], source_tags[j]].sort().join('|');
					tag_cooccurrence[pair] = (tag_cooccurrence[pair] || 0) + 1;
				}
			}
		}

		// Calculate related tags
		for (const tag of Object.keys(tags)) {
			const related_tags = [];

			for (const [pair, count] of Object.entries(tag_cooccurrence)) {
				const [tag1, tag2] = pair.split('|');
				if (tag1 === tag || tag2 === tag) {
					const related_tag = tag1 === tag ? tag2 : tag1;
					const score = count / Math.min(tags[tag].count, tags[related_tag].count);
					related_tags.push({ tag: related_tag, score });
				}
			}

			// Sort by score and take top 5
			related_tags.sort((a, b) => b.score - a.score);
			tags[tag].relatedTags = related_tags.slice(0, 5).map((rt) => rt.tag);
		}

		// Simple tag clustering (could be improved with more sophisticated algorithms)
		const tag_clusters = {};
		const processed_tags = new Set<string>();

		for (const [tag, data] of Object.entries(tags)) {
			if (processed_tags.has(tag)) continue;

			const cluster = [tag];
			processed_tags.add(tag);

			// Add highly related tags to the same cluster
			for (const related_tag of data.relatedTags.slice(0, 3)) {
				if (!processed_tags.has(related_tag)) {
					cluster.push(related_tag);
					processed_tags.add(related_tag);
				}
			}

			if (cluster.length > 1) {
				tag_clusters[tag] = cluster;
			}
		}

		return {
			tags,
			tagClusters: tag_clusters,
			totalTags: Object.keys(tags).length
		};
	}

	/**
	 * Tokenize text into words
	 */
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
		for (const [word, source_ids] of this.searchIndex.entries()) {
			source_ids.delete(sourceId);
			if (source_ids.size === 0) {
				this.searchIndex.delete(word);
			}
		}

		// Remove from other indices
		for (const [category, source_ids] of this.categoryIndex.entries()) {
			source_ids.delete(sourceId);
			if (source_ids.size === 0) {
				this.categoryIndex.delete(category);
			}
		}

		for (const [tag, source_ids] of this.tagIndex.entries()) {
			source_ids.delete(sourceId);
			if (source_ids.size === 0) {
				this.tagIndex.delete(tag);
			}
		}

		for (const [domain, source_ids] of this.domainIndex.entries()) {
			source_ids.delete(sourceId);
			if (source_ids.size === 0) {
				this.domainIndex.delete(domain);
			}
		}
	}
}

// Export singleton instance
export const sourceLibrary = SourceLibrary.getInstance();
