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
		this.searchIndex.content.delete(contentId);
		this.searchIndex.links.delete(contentId);

		// Remove from tag mappings
		for (const [tag, contentIds] of this.searchIndex.tags.entries()) {
			const index = contentIds.indexOf(contentId);
			if (index > -1) {
				contentIds.splice(index, 1);
				if (contentIds.length === 0) {
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
		let hasTermMatch = false;

		// Term frequency scoring
		for (const queryToken of queryTokens) {
			// Only count partial matches if they're at least 3 characters and the token is longer
			const partialMatches = contentTokens.filter(
				(token: string) =>
					queryToken.length >= 3 &&
					token.length > queryToken.length &&
					token.includes(queryToken)
			).length;
			if (partialMatches > 0) {
				score += partialMatches * 5;
				hasTermMatch = true;
			}

			// Exact matches get higher scores
			if (contentTokens.includes(queryToken)) {
				score += 20;
				hasTermMatch = true;
			}
		}

		// Title matches get bonus points
		const title = module?.title || node?.title || '';
		const titleTokens = this.tokenize(title);
		for (const queryToken of queryTokens) {
			// Exact title matches
			if (titleTokens.includes(queryToken)) {
				score += 50;
				hasTermMatch = true;
			}
			// Partial title matches (only for longer queries)
			else if (
				queryToken.length >= 3 &&
				titleTokens.some(
					(token) => token.length > queryToken.length && token.includes(queryToken)
				)
			) {
				score += 25;
				hasTermMatch = true;
			}
		}

		// Tag matches get bonus points
		const tags = module?.metadata.tags || node?.metadata.tags || [];
		for (const tag of tags) {
			const tagTokens = this.tokenize(tag);
			for (const queryToken of queryTokens) {
				// Exact tag matches
				if (tagTokens.includes(queryToken)) {
					score += 30;
					hasTermMatch = true;
				}
				// Partial tag matches (only for longer queries)
				else if (
					queryToken.length >= 3 &&
					tagTokens.some(
						(token) => token.length > queryToken.length && token.includes(queryToken)
					)
				) {
					score += 15;
					hasTermMatch = true;
				}
			}
		}

		// Only boost with analytics if we have actual term matches
		if (hasTermMatch && module) {
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
				const itemTags = module?.metadata.tags || node?.metadata.tags || [];
				if (!filters.tags.some((tag) => itemTags.includes(tag))) {
					return false;
				}
			}

			// Difficulty filter
			if (filters.difficulty && filters.difficulty.length > 0) {
				const itemDifficulty = module?.metadata.difficulty || node?.metadata.difficulty;
				if (itemDifficulty && !filters.difficulty.includes(itemDifficulty)) {
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
	private generateSnippet(queryTokens: string[], contentText: string, maxLength = 150): string {
		const sentences = contentText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);

		// Find sentence with most query terms
		let bestSentence = '';
		let maxMatches = 0;

		for (const sentence of sentences) {
			const sentenceTokens = this.tokenize(sentence);
			const matches = queryTokens.filter((token: string) =>
				sentenceTokens.some((sToken: string) => sToken.includes(token))
			).length;

			if (matches > maxMatches) {
				maxMatches = matches;
				bestSentence = sentence.trim();
			}
		}

		// Truncate if too long
		if (bestSentence.length > maxLength) {
			bestSentence = bestSentence.substring(0, maxLength - 3) + '...';
		}

		return bestSentence || contentText.substring(0, maxLength - 3) + '...';
	}

	/**
	 * Search content with query and filters
	 */
	search(
		query: string,
		modules: Map<string, ContentModule>,
		nodes: Map<string, KnowledgeNode>,
		filters: SearchFilters = {},
		maxResults = 50
	): SearchResult[] {
		if (!query.trim()) {
			return [];
		}

		const queryTokens = this.tokenize(query);
		const results: SearchResult[] = [];

		for (const [contentId, contentTokens] of this.searchIndex.content.entries()) {
			const module = modules.get(contentId);
			const node = nodes.get(contentId);

			if (!module && !node) continue;

			const relevance = this.calculateRelevance(
				contentId,
				queryTokens,
				contentTokens,
				module,
				node
			);

			// Only include results with meaningful relevance (at least one term match)
			if (relevance > 10) {
				const title = module?.title || node?.title || '';
				const contentText = module
					? `${module.description} ${this.extractContentText(module.blocks)}`
					: title;

				const snippet = this.generateSnippet(queryTokens, contentText);
				const tags = module?.metadata.tags || node?.metadata.tags || [];
				const type = module ? 'module' : node?.type || 'unknown';

				results.push({
					id: contentId,
					title,
					snippet,
					relevance,
					type,
					tags
				});
			}
		}

		// Sort by relevance (descending)
		results.sort((a: SearchResult, b: SearchResult) => b.relevance - a.relevance);

		// Apply filters
		const filteredResults = this.applyFilters(results, filters, modules, nodes);

		// Return top results
		return filteredResults.slice(0, maxResults);
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
    const foundIds = new Set<string>();

    for (const tag of tags) {
        const contentIds = this.searchIndex.tags.get(tag) || [];
        for (const contentId of contentIds) {
            if (foundIds.has(contentId)) continue;
            foundIds.add(contentId);

            const module = modules.get(contentId);
            const node = nodes.get(contentId);

            if (module || node) {
                const title = module?.title || node?.title || '';
                const contentText = module
                    ? `${module.description} ${this.extractContentText(module.blocks)}`
                    : title;
                const snippet = this.generateSnippet([tag], contentText);
                const itemTags = module?.metadata.tags || node?.metadata.tags || [];
                const type = module ? 'module' : node?.type || 'unknown';

                results.push({
                    id: contentId,
                    title,
                    snippet,
                    relevance: 100, // High relevance for exact tag matches
                    type,
                    tags: itemTags
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
    maxResults = 10
): SearchResult[] {
    const results: SearchResult[] = [];
    const module = modules.get(contentId);
    const node = nodes.get(contentId);

    if (!module && !node) return results;

    // Get directly linked content
    const linkedIds = this.searchIndex.links.get(contentId) || [];
    for (const linkedId of linkedIds) {
        const linkedModule = modules.get(linkedId);
        const linkedNode = nodes.get(linkedId);

        if (linkedModule || linkedNode) {
            const title = linkedModule?.title || linkedNode?.title || '';
            const contentText = linkedModule
                ? `${linkedModule.description} ${this.extractContentText(linkedModule.blocks)}`
                : title;
            const snippet = this.generateSnippet([], contentText);
            const tags = linkedModule?.metadata.tags || linkedNode?.metadata.tags || [];
            const type = linkedModule ? 'module' : linkedNode?.type || 'unknown';

            results.push({
                id: linkedId,
                title,
                snippet,
                relevance: 90, // High relevance for direct links
                type,
                tags
            });
        }
    }

    // Get content with similar tags
    const itemTags = module?.metadata.tags || node?.metadata.tags || [];
    for (const tag of itemTags) {
        const taggedIds = this.searchIndex.tags.get(tag) || [];
        for (const taggedId of taggedIds) {
            if (taggedId === contentId || results.some((r) => r.id === taggedId)) continue;

            const taggedModule = modules.get(taggedId);
            const taggedNode = nodes.get(taggedId);

            if (taggedModule || taggedNode) {
                const title = taggedModule?.title || taggedNode?.title || '';
                const contentText = taggedModule
                    ? `${taggedModule.description} ${this.extractContentText(taggedModule.blocks)}`
                    : title;
                const snippet = this.generateSnippet([], contentText);
                const tags = taggedModule?.metadata.tags || taggedNode?.metadata.tags || [];
                const type = taggedModule ? 'module' : taggedNode?.type || 'unknown';

                results.push({
                    id: taggedId,
                    title,
                    snippet,
                    relevance: 70, // Medium relevance for tag similarity
                    type,
                    tags
                });
            }
        }
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, maxResults);
}

/**
 * Get search suggestions based on partial query
 */
getSuggestions(partialQuery: string, maxSuggestions = 5): string[] {
    if (partialQuery.length < 2) return [];

    const suggestions = new Set<string>();
    const queryLower = partialQuery.toLowerCase();

    // Search through indexed terms
    for (const tokens of this.searchIndex.content.values()) {
        for (const token of tokens) {
            if (token.startsWith(queryLower) && token.length > queryLower.length) {
                suggestions.add(token);
                if (suggestions.size >= maxSuggestions) break;
            }
        }
        if (suggestions.size >= maxSuggestions) break;
    }

    // Search through tags
    for (const tag of this.searchIndex.tags.keys()) {
        if (tag.toLowerCase().includes(queryLower)) {
            suggestions.add(tag);
            if (suggestions.size >= maxSuggestions) break;
        }
    }

    return Array.from(suggestions).slice(0, maxSuggestions);
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
