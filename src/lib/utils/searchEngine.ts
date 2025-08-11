/**
 * Search engine implementation with full-text indexing and relevance scoring
 */
import type { ContentModule } from '../types/content.js';
import type { KnowledgeNode } from '../types/knowledge.js';
import type { SearchResult, SearchIndex } from '../types/interactive.js';

/**
 * Search filter options
 */
export interface SearchFilters {
	contentTypes?: string[];
	tags?: string[];
	difficulty?: number[];
	dateRange?: {
		start: Date;
		end: Date;
	};
	author?: string;
	minRelevance?: number;
}

/**
 * Search engine class for indexing and searching content
 */
export class SearchEngine {
	private searchIndex: SearchIndex = {
		content: new Map(),
		tags: new Map(),
		links: new Map()
	};

	private stopWords = new Set([
		'a',
		'an',
		'and',
		'are',
		'as',
		'at',
		'be',
		'by',
		'for',
		'from',
		'has',
		'he',
		'in',
		'is',
		'it',
		'its',
		'of',
		'on',
		'that',
		'the',
		'to',
		'was',
		'will',
		'with',
		'the',
		'this',
		'but',
		'they',
		'have',
		'had',
		'what',
		'said',
		'each',
		'which',
		'she',
		'do',
		'how',
		'their',
		'if',
		'up',
		'out',
		'many',
		'then',
		'them',
		'these',
		'so',
		'some',
		'her',
		'would',
		'make',
		'like',
		'into',
		'him',
		'time',
		'two',
		'more',
		'go',
		'no',
		'way',
		'could',
		'my',
		'than',
		'first',
		'been',
		'call',
		'who',
		'oil',
		'sit',
		'now',
		'find',
		'down',
		'day',
		'did',
		'get',
		'come',
		'made',
		'may',
		'part'
	]);

	/**
	 * Tokenize text into searchable terms
	 */
	private tokenize(text: string): string[] {
		return text
			.toLowerCase()
			.replace(/[^\w\s]/g, ' ')
			.split(/\s+/)
			.filter((word) => word.length > 2 && !this.stopWords.has(word))
			.map((word) => word.trim())
			.filter((word) => word.length > 0);
	}

	/**
	 * Extract searchable text from content blocks
	 */
	private extractContentText(blocks: any[]): string {
		return blocks
			.map((block) => {
				switch (block.type) {
					case 'text':
						return typeof block.content === 'string' ? block.content : '';
					case 'code':
						return block.content?.code || '';
					case 'quiz':
						return block.content?.questions?.map((q: any) => q.question).join(' ') || '';
					case 'flashcard':
						return `${block.content?.front || ''} ${block.content?.back || ''}`;
					default:
						return '';
				}
			})
			.join(' ');
	}

	/**
	 * Index a content module for searching
	 */
	indexModule(module: ContentModule): void {
		const content_text = [
			module.title,
			module.description,
			this.extractContentText(module.blocks)
		].join(' ');

		const tokens = this.tokenize(content_text);
		this.searchIndex.content.set(module.id, tokens);

		// Index tags
		for (const tag of module.metadata.tags) {
			if (!this.searchIndex.tags.has(tag)) {
				this.searchIndex.tags.set(tag, []);
			}
			this.searchIndex.tags.get(tag)!.push(module.id);
		}

		// Index relationships
		const related_ids = [
			...module.relationships.prerequisites,
			...module.relationships.dependents,
			...module.relationships.related
		];
		this.searchIndex.links.set(module.id, related_ids);
	}

	/**
	 * Index a knowledge node for searching
	 */
	indexNode(node: KnowledgeNode): void {
		const content_text = [node.title].join(' ');
		const tokens = this.tokenize(content_text);
		this.searchIndex.content.set(node.id, tokens);

		// Index tags
		for (const tag of node.metadata.tags) {
			if (!this.searchIndex.tags.has(tag)) {
				this.searchIndex.tags.set(tag, []);
			}
			this.searchIndex.tags.get(tag)!.push(node.id);
		}
	}

	/**
	 * Remove content from search index
	 */
	removeFromIndex(contentId: string): void {
		this.searchIndex.content.delete(content_id);
		this.searchIndex.links.delete(content_id);

		// Remove from tag mappings
		for (const [tag, content_ids] of this.searchIndex.tags.entries()) {
			const index = content_ids.indexOf(content_id);
			if (index > -1) {
				content_ids.splice(index, 1);
				if (content_ids.length === 0) {
					this.searchIndex.tags.delete(tag);
				}
			}
		}
	}

	/**
	 * Calculate relevance score for a content item
	 */
	private calculateRelevance(
		contentId: string,
		queryTokens: string[],
		contentTokens: string[],
		module?: ContentModule,
		node?: KnowledgeNode
	): number {
		let score = 0;
		let has_term_match = false;

		// Term frequency scoring
		for (const query_token of query_tokens) {
			// Only count partial matches if they're at least 3 characters and the token is longer
			const partial_matches = content_tokens.filter(
				(token) =>
					query_token.length >= 3 &&
					token.length > query_token.length &&
					token.includes(query_token)
			).length;
			if (partial_matches > 0) {
				score += partial_matches * 5;
				has_term_match = true;
			}

			// Exact matches get higher scores
			if (content_tokens.includes(query_token)) {
				score += 20;
				has_term_match = true;
			}
		}

		// Title matches get bonus points
		const title = module?.title || node?.title || '';
		const title_tokens = this.tokenize(title);
		for (const query_token of query_tokens) {
			// Exact title matches
			if (title_tokens.includes(query_token)) {
				score += 50;
				has_term_match = true;
			}
			// Partial title matches (only for longer queries)
			else if (
				query_token.length >= 3 &&
				title_tokens.some(
					(token) => token.length > query_token.length && token.includes(query_token)
				)
			) {
				score += 25;
				has_term_match = true;
			}
		}

		// Tag matches get bonus points
		const tags = module?.metadata.tags || node?.metadata.tags || [];
		for (const tag of tags) {
			const tag_tokens = this.tokenize(tag);
			for (const query_token of query_tokens) {
				// Exact tag matches
				if (tag_tokens.includes(query_token)) {
					score += 30;
					has_term_match = true;
				}
				// Partial tag matches (only for longer queries)
				else if (
					query_token.length >= 3 &&
					tag_tokens.some(
						(token) => token.length > query_token.length && token.includes(query_token)
					)
				) {
					score += 15;
					has_term_match = true;
				}
			}
		}

		// Only boost with analytics if we have actual term matches
		if (has_term_match && module) {
			// More views/completions = higher relevance
			score += Math.log(module.analytics.views + 1) * 2;
			score += Math.log(module.analytics.completions + 1) * 3;

			// Higher average score = higher relevance
			score += module.analytics.averageScore * 0.5;
		}

		return score;
	}

	/**
	 * Apply filters to search results
	 */
	private applyFilters(
		results: SearchResult[],
		filters: SearchFilters,
		modules: Map<string, ContentModule>,
		nodes: Map<string, KnowledgeNode>
	): SearchResult[] {
		return results.filter((result) => {
			const module = modules.get(result.id);
			const node = nodes.get(result.id);

			// Content type filter
			if (filters.contentTypes && filters.contentTypes.length > 0) {
				if (!filters.contentTypes.includes(result.type)) {
					return false;
				}
			}

			// Tag filter
			if (filters.tags && filters.tags.length > 0) {
				const item_tags = module?.metadata.tags || node?.metadata.tags || [];
				if (!filters.tags.some((tag) => item_tags.includes(tag))) {
					return false;
				}
			}

			// Difficulty filter
			if (filters.difficulty && filters.difficulty.length > 0) {
				const item_difficulty = module?.metadata.difficulty || node?.metadata.difficulty;
				if (item_difficulty && !filters.difficulty.includes(item_difficulty)) {
					return false;
				}
			}

			// Date range filter
			if (filters.dateRange && module) {
				const created = module.metadata.created;
				if (created < filters.dateRange.start || created > filters.dateRange.end) {
					return false;
				}
			}

			// Author filter
			if (filters.author && module) {
				if (module.metadata.author !== filters.author) {
					return false;
				}
			}

			// Minimum relevance filter
			if (filters.minRelevance && result.relevance < filters.minRelevance) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Generate snippet from content
	 */
	private generateSnippet(queryTokens: string[], contentText: string, max_length = 150): string {
		const sentences = content_text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

		// Find sentence with most query terms
		let best_sentence = '';
		let max_matches = 0;

		for (const sentence of sentences) {
			const sentence_tokens = this.tokenize(sentence);
			const matches = query_tokens.filter((token) =>
				sentence_tokens.some((s_token) => s_token.includes(token))
			).length;

			if (matches > max_matches) {
				max_matches = matches;
				best_sentence = sentence.trim();
			}
		}

		// Truncate if too long
		if (best_sentence.length > max_length) {
			best_sentence = best_sentence.substring(0, max_length - 3) + '...';
		}

		return best_sentence || content_text.substring(0, max_length - 3) + '...';
	}

	/**
	 * Search content with query and filters
	 */
	search(
		query: string,
		modules: Map<string, ContentModule>,
		nodes: Map<string, KnowledgeNode>,
		filters: SearchFilters = {},
		max_results = 50
	): SearchResult[] {
		if (!query.trim()) {
			return [];
		}

		const query_tokens = this.tokenize(query);
		const results: SearchResult[] = [];

		// Search through indexed content
		for (const [content_id, content_tokens] of this.searchIndex.content.entries()) {
			const module = modules.get(content_id);
			const node = nodes.get(content_id);

			if (!module && !node) continue;

			const relevance = this.calculateRelevance(
				content_id,
				query_tokens,
				content_tokens,
				module,
				node
			);

			// Only include results with meaningful relevance (at least one term match)
			if (relevance > 10) {
				const title = module?.title || node?.title || '';
				const content_text = module
					? `${module.description} ${this.extractContentText(module.blocks)}`
					: title;

				const snippet = this.generateSnippet(query_tokens, content_text);
				const tags = module?.metadata.tags || node?.metadata.tags || [];
				const type = module ? 'module' : node?.type || 'unknown';

				results.push({
					id: content_id,
					title,
					snippet,
					relevance,
					type,
					tags
				});
			}
		}

		// Sort by relevance (descending)
		results.sort((a, b) => b.relevance - a.relevance);

		// Apply filters
		const filtered_results = this.applyFilters(results, filters, modules, nodes);

		// Return top results
		return filtered_results.slice(0, max_results);
	}

	/**
	 * Search by tags only
	 */
	searchByTags(
		tags: string[],
		modules: Map<string, ContentModule>,
		nodes: Map<string, KnowledgeNode>
	): SearchResult[] {
		const results: SearchResult[] = [];
		const found_ids = new Set<string>();

		for (const tag of tags) {
			const content_ids = this.searchIndex.tags.get(tag) || [];
			for (const content_id of content_ids) {
				if (found_ids.has(content_id)) continue;
				found_ids.add(content_id);

				const module = modules.get(content_id);
				const node = nodes.get(content_id);

				if (module || node) {
					const title = module?.title || node?.title || '';
					const content_text = module
						? `${module.description} ${this.extractContentText(module.blocks)}`
						: title;
					const snippet = this.generateSnippet([tag], content_text);
					const item_tags = module?.metadata.tags || node?.metadata.tags || [];
					const type = module ? 'module' : node?.type || 'unknown';

					results.push({
						id: content_id,
						title,
						snippet,
						relevance: 100, // High relevance for exact tag matches
						type,
						tags: item_tags
					});
				}
			}
		}

		return results.sort((a, b) => b.relevance - a.relevance);
	}

	/**
	 * Get related content based on links and tags
	 */
	getRelatedContent(
		contentId: string,
		modules: Map<string, ContentModule>,
		nodes: Map<string, KnowledgeNode>,
		max_results = 10
	): SearchResult[] {
		const results: SearchResult[] = [];
		const module = modules.get(content_id);
		const node = nodes.get(content_id);

		if (!module && !node) return results;

		// Get directly linked content
		const linked_ids = this.searchIndex.links.get(content_id) || [];
		for (const linked_id of linked_ids) {
			const linked_module = modules.get(linked_id);
			const linked_node = nodes.get(linked_id);

			if (linked_module || linked_node) {
				const title = linked_module?.title || linked_node?.title || '';
				const content_text = linked_module
					? `${linked_module.description} ${this.extractContentText(linked_module.blocks)}`
					: title;
				const snippet = this.generateSnippet([], content_text);
				const tags = linked_module?.metadata.tags || linked_node?.metadata.tags || [];
				const type = linked_module ? 'module' : linked_node?.type || 'unknown';

				results.push({
					id: linked_id,
					title,
					snippet,
					relevance: 90, // High relevance for direct links
					type,
					tags
				});
			}
		}

		// Get content with similar tags
		const item_tags = module?.metadata.tags || node?.metadata.tags || [];
		for (const tag of item_tags) {
			const tagged_ids = this.searchIndex.tags.get(tag) || [];
			for (const tagged_id of tagged_ids) {
				if (tagged_id === content_id || results.some((r) => r.id === tagged_id)) continue;

				const tagged_module = modules.get(tagged_id);
				const tagged_node = nodes.get(tagged_id);

				if (tagged_module || tagged_node) {
					const title = tagged_module?.title || tagged_node?.title || '';
					const content_text = tagged_module
						? `${tagged_module.description} ${this.extractContentText(tagged_module.blocks)}`
						: title;
					const snippet = this.generateSnippet([], content_text);
					const tags = tagged_module?.metadata.tags || tagged_node?.metadata.tags || [];
					const type = tagged_module ? 'module' : tagged_node?.type || 'unknown';

					results.push({
						id: tagged_id,
						title,
						snippet,
						relevance: 70, // Medium relevance for tag similarity
						type,
						tags
					});
				}
			}
		}

		return results.sort((a, b) => b.relevance - a.relevance).slice(0, max_results);
	}

	/**
	 * Get search suggestions based on partial query
	 */
	getSuggestions(partialQuery: string, max_suggestions = 5): string[] {
		if (partialQuery.length < 2) return [];

		const suggestions = new Set<string>();
		const query_lower = partialQuery.toLowerCase();

		// Search through indexed terms
		for (const tokens of this.searchIndex.content.values()) {
			for (const token of tokens) {
				if (token.startsWith(query_lower) && token.length > query_lower.length) {
					suggestions.add(token);
					if (suggestions.size >= max_suggestions) break;
				}
			}
			if (suggestions.size >= max_suggestions) break;
		}

		// Search through tags
		for (const tag of this.searchIndex.tags.keys()) {
			if (tag.toLowerCase().includes(query_lower)) {
				suggestions.add(tag);
				if (suggestions.size >= max_suggestions) break;
			}
		}

		return Array.from(suggestions).slice(0, max_suggestions);
	}

	/**
	 * Clear the entire search index
	 */
	clearIndex(): void {
		this.searchIndex.content.clear();
		this.searchIndex.tags.clear();
		this.searchIndex.links.clear();
	}

	/**
	 * Get index statistics
	 */
	getIndexStats() {
		return {
			totalContent: this.searchIndex.content.size,
			totalTags: this.searchIndex.tags.size,
			totalLinks: this.searchIndex.links.size,
			averageTokensPerContent:
				this.searchIndex.content.size > 0
					? Array.from(this.searchIndex.content.values()).reduce(
							(sum, tokens) => sum + tokens.length,
							0
						) / this.searchIndex.content.size
					: 0
		};
	}
}

// Export singleton instance
export const searchEngine = new SearchEngine();
