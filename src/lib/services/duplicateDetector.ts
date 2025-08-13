/**
 * Duplicate Content Detection and Merging System
 * Identifies duplicate or similar content sources and provides merging capabilities
 */

import type { WebContentSource, DuplicateDetectionResult } from '../types/web-content.js';
import { sourceManager } from './sourceManager.js';

/**
 * Similarity calculation methods
 */
export type SimilarityMethod = 'url' | 'title' | 'content' | 'metadata' | 'combined';

/**
 * Duplicate detection configuration
 */
export interface DuplicateDetectionConfig {
	similarityThreshold: number; // 0.0 to 1.0
	methods: SimilarityMethod[];
	weights: {
		url: number;
		title: number;
		content: number;
		metadata: number;
	};
	ignoreParameters: boolean; // Ignore URL parameters when comparing
	caseSensitive: boolean;
}

/**
 * Merge operation configuration
 */
export interface MergeConfig {
	preferNewer: boolean;
	preserveUsageStats: boolean;
	combineMetadata: boolean;
	keepBothIfUncertain: boolean;
}

/**
 * Merge operation result
 */
export interface MergeResult {
	success: boolean;
	mergedSourceId: string;
	removedSourceIds: string[];
	conflicts: string[];
	preservedData: {
		usage: boolean;
		metadata: boolean;
		relationships: boolean;
	};
}

/**
 * Duplicate Content Detector class
 */
export class DuplicateDetector {
	private static instance: DuplicateDetector;
	private config: DuplicateDetectionConfig;

	private constructor() {
		this.config = {
			similarityThreshold: 0.8,
			methods: ['url', 'title', 'content', 'metadata'],
			weights: {
				url: 0.4,
				title: 0.3,
				content: 0.2,
				metadata: 0.1
			},
			ignoreParameters: true,
			caseSensitive: false
		};
	}

	static getInstance(): DuplicateDetector {
		if (!DuplicateDetector.instance) {
			DuplicateDetector.instance = new DuplicateDetector();
		}
		return DuplicateDetector.instance;
	}

	/**
	 * Update detection configuration
	 */
	updateConfig(newConfig: Partial<DuplicateDetectionConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Detect duplicates for a specific source
	 */
	async detectDuplicatesForSource(sourceId: string): Promise<DuplicateDetectionResult> {
		const target_source = await sourceManager.getSource(sourceId);
		if (!target_source) {
			throw new Error(`Source ${sourceId} not found`);
		}

		const all_sources = await sourceManager.getAllSources();
		const other_sources = all_sources.filter((s) => s.id !== sourceId);

		const duplicates: Array<{ id: string; similarity: number; reason: string }> = [];

		for (const source of other_sources) {
			const similarity = this.calculateSimilarity(target_source, source);

			if (similarity >= this.config.similarityThreshold) {
				const reason = this.generateSimilarityReason(target_source, source, similarity);
				duplicates.push({
					id: source.id,
					similarity,
					reason
				});
			}
		}

		// Sort by similarity (highest first)
		duplicates.sort((a, b) => b.similarity - a.similarity);

		const suggestions = this.generateMergeSuggestions(target_source, duplicates);

		return {
			sourceId,
			duplicates,
			suggestions
		};
	}

	/**
	 * Detect all duplicates in the system
	 */
	async detectAllDuplicates(): Promise<DuplicateDetectionResult[]> {
		const all_sources = await sourceManager.getAllSources();
		const results: DuplicateDetectionResult[] = [];
		const processed_pairs = new Set<string>();

		for (const source of all_sources) {
			const result = await this.detectDuplicatesForSource(source.id);

			// Filter out already processed pairs to avoid duplicates in results
			const filtered_duplicates = result.duplicates.filter((dup) => {
				const pair_key = [source.id, dup.id].sort().join('-');
				if (processed_pairs.has(pair_key)) {
					return false;
				}
				processed_pairs.add(pair_key);
				return true;
			});

			if (filtered_duplicates.length > 0) {
				results.push({
					...result,
					duplicates: filtered_duplicates
				});
			}
		}

		return results;
	}

	/**
	 * Calculate similarity between two sources
	 */
	private calculateSimilarity(source1: WebContentSource, source2: WebContentSource): number {
		let total_score = 0;
		let total_weight = 0;

		for (const method of this.config.methods) {
			const weight = this.config.weights[method];
			const score = this.calculateMethodSimilarity(source1, source2, method);

			total_score += score * weight;
			total_weight += weight;
		}

		return total_weight > 0 ? total_score / total_weight : 0;
	}

	/**
	 * Calculate similarity using a specific method
	 */
	private calculateMethodSimilarity(
		source1: WebContentSource,
		source2: WebContentSource,
		method: SimilarityMethod
	): number {
		switch (method) {
			case 'url':
				return this.calculateUrlSimilarity(source1.url, source2.url);

			case 'title':
				return this.calculateTextSimilarity(source1.title, source2.title);

			case 'content':
				return this.calculateContentSimilarity(source1, source2);

			case 'metadata':
				return this.calculateMetadataSimilarity(source1.metadata, source2.metadata);

			case 'combined':
				// This would be a more sophisticated combined approach
				return (
					this.calculateUrlSimilarity(source1.url, source2.url) * 0.4 +
					this.calculateTextSimilarity(source1.title, source2.title) * 0.6
				);

			default:
				return 0;
		}
	}

	/**
	 * Calculate URL similarity
	 */
	private calculateUrlSimilarity(url1: string, url2: string): number {
		try {
			const u1 = new URL(url1);
			const u2 = new URL(url2);

			// Exact match
			if (url1 === url2) {return 1.0;}

			// Same domain and path
			if (u1.hostname === u2.hostname && u1.pathname === u2.pathname) {
				if (this.config.ignoreParameters) {
					return 1.0;
				}
				// Compare query parameters
				const params1 = new Set(u1.searchParams.keys());
				const params2 = new Set(u2.searchParams.keys());
				const common_params = new Set(Array.from(params1).filter((x) => params2.has(x)));
				const total_params = new Set([...Array.from(params1), ...Array.from(params2)]);

				return total_params.size > 0 ? common_params.size / total_params.size : 1.0;
			}

			// Same domain, different path
			if (u1.hostname === u2.hostname) {
				return 0.7;
			}

			// Different domains but similar paths
			if (u1.pathname === u2.pathname && u1.pathname !== '/') {
				return 0.5;
			}

			return 0;
		} catch {
			// Fallback to string similarity if URL parsing fails
			return this.calculateTextSimilarity(url1, url2);
		}
	}

	/**
	 * Calculate text similarity using Jaccard similarity
	 */
	private calculateTextSimilarity(text1: string, text2: string): number {
		if (!text1 || !text2) {return 0;}

		const normalize = (text: string) => (this.config.caseSensitive ? text : text.toLowerCase());

		const t1 = normalize(text1);
		const t2 = normalize(text2);

		if (t1 === t2) {return 1.0;}

		// Tokenize into words
		const words1 = new Set(t1.split(/\s+/).filter((w) => w.length > 0));
		const words2 = new Set(t2.split(/\s+/).filter((w) => w.length > 0));

		const intersection = new Set(Array.from(words1).filter((x) => words2.has(x)));
		const union = new Set([...Array.from(words1), ...Array.from(words2)]);

		return union.size > 0 ? intersection.size / union.size : 0;
	}

	/**
	 * Calculate content similarity (simplified)
	 */
	private calculateContentSimilarity(source1: WebContentSource, source2: WebContentSource): number {
		// This is a simplified implementation
		// In practice, you might want to compare actual content hashes or use more sophisticated NLP

		const factors = [
			// Word count similarity
			this.calculateNumericSimilarity(
				source1.metadata?.wordCount ?? 0,
				source2.metadata?.wordCount ?? 0
			),
			// Reading time similarity
			this.calculateNumericSimilarity(
				source1.metadata?.readingTime ?? 0,
				source2.metadata?.readingTime ?? 0
			),
			// Keywords overlap
			this.calculateArraySimilarity(source1.metadata?.keywords ?? [], source2.metadata?.keywords ?? [])
		];

		return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
	}

	/**
	 * Calculate metadata similarity
	 */
	private calculateMetadataSimilarity(meta1: any, meta2: any): number {
		const factors = [];

		// Author similarity
		if (meta1?.author && meta2?.author) {
			factors.push(this.calculateTextSimilarity(meta1.author, meta2.author));
		}

		// Category similarity
		if (meta1?.category && meta2?.category) {
			factors.push(meta1.category === meta2.category ? 1.0 : 0.0);
		}

		// Tags similarity
		factors.push(this.calculateArraySimilarity(meta1?.tags || [], meta2?.tags || []));

		// Language similarity
		if (meta1?.language && meta2?.language) {
			factors.push(meta1.language === meta2.language ? 1.0 : 0.0);
		}

		return factors.length > 0 ? factors.reduce((sum, f) => sum + f, 0) / factors.length : 0;
	}

	/**
	 * Calculate numeric similarity
	 */
	private calculateNumericSimilarity(num1: number, num2: number): number {
		if (num1 === num2) {return 1.0;}
		if (num1 === 0 || num2 === 0) {return 0;}

		const ratio = Math.min(num1, num2) / Math.max(num1, num2);
		return ratio;
	}

	/**
	 * Calculate array similarity (Jaccard index)
	 */
	private calculateArraySimilarity(arr1: string[], arr2: string[]): number {
		if (arr1.length === 0 && arr2.length === 0) {return 1.0;}
		if (arr1.length === 0 || arr2.length === 0) {return 0;}

		const set1 = new Set(arr1.map((s) => (this.config.caseSensitive ? s : s.toLowerCase())));
		const set2 = new Set(arr2.map((s) => (this.config.caseSensitive ? s : s.toLowerCase())));

		const intersection = new Set(Array.from(set1).filter((x) => set2.has(x)));
		const union = new Set([...Array.from(set1), ...Array.from(set2)]);

		return union.size > 0 ? intersection.size / union.size : 0;
	}

	/**
	 * Generate similarity reason explanation
	 */
	private generateSimilarityReason(
		source1: WebContentSource,
		source2: WebContentSource,
		similarity: number
	): string {
		const reasons = [];

		// Check URL similarity
		const url_sim = this.calculateUrlSimilarity(source1.url, source2.url);
		if (url_sim > 0.8) {
			reasons.push('Very similar URLs');
		} else if (url_sim > 0.5) {
			reasons.push('Similar domains or paths');
		}

		// Check title similarity
		const title_sim = this.calculateTextSimilarity(source1.title, source2.title);
		if (title_sim > 0.8) {
			reasons.push('Nearly identical titles');
		} else if (title_sim > 0.5) {
			reasons.push('Similar titles');
		}

		// Check metadata
		if (
			source1.metadata?.author &&
			source2.metadata?.author &&
			source1.metadata.author === source2.metadata.author
		) {
			reasons.push('Same author');
		}

		if (source1.metadata?.category && source2.metadata?.category && source1.metadata.category === source2.metadata.category) {
			reasons.push('Same category');
		}

		return reasons.length > 0 ? reasons.join(', ') : `${Math.round(similarity * 100)}% similarity`;
	}

	/**
	 * Generate merge suggestions
	 */
	private generateMergeSuggestions(
		targetSource: WebContentSource,
		duplicates: Array<{ id: string; similarity: number; reason: string }>
	): Array<{
		action: 'merge' | 'keep_both' | 'remove_duplicate';
		confidence: number;
		reasoning: string;
	}> {
		return duplicates.map((dup) => {
			if (dup.similarity > 0.95) {
				return {
					action: 'merge' as const,
					confidence: 0.9,
					reasoning: 'Very high similarity suggests these are the same content'
				};
			} else if (dup.similarity > 0.85) {
				return {
					action: 'merge' as const,
					confidence: 0.7,
					reasoning: 'High similarity suggests likely duplicates'
				};
			} else if (dup.similarity > 0.7) {
				return {
					action: 'keep_both' as const,
					confidence: 0.6,
					reasoning: 'Moderate similarity - may be related but distinct content'
				};
			} else {
				return {
					action: 'keep_both' as const,
					confidence: 0.8,
					reasoning: 'Low similarity - likely different content'
				};
			}
		});
	}

	/**
	 * Merge duplicate sources
	 */
	async mergeSources(
		primarySourceId: string,
		duplicateSourceIds: string[],
		config: MergeConfig = {
			preferNewer: true,
			preserveUsageStats: true,
			combineMetadata: true,
			keepBothIfUncertain: false
		}
	): Promise<MergeResult> {
		const primary_source = await sourceManager.getSource(primarySourceId);
		if (!primary_source) {
			throw new Error(`Primary source ${primarySourceId} not found`);
		}

		const duplicate_sources = await Promise.all(
			duplicateSourceIds.map((id) => sourceManager.getSource(id))
		);

		const valid_duplicates = duplicate_sources.filter((s) => s !== undefined) as WebContentSource[];
		const conflicts: string[] = [];

		// Merge usage statistics
		if (config.preserveUsageStats) {
			for (const duplicate of valid_duplicates) {
				if (primary_source.usage && duplicate.usage) {
					primary_source.usage.timesReferenced += duplicate.usage.timesReferenced;

					// Combine generated modules
					const new_modules = duplicate.usage.generatedModules.filter(
						(module_id) => !primary_source.usage.generatedModules.includes(module_id)
					);
					primary_source.usage.generatedModules.push(...new_modules);

					// Use the most recent access date
					if (duplicate.usage.lastAccessed > primary_source.usage.lastAccessed) {
						primary_source.usage.lastAccessed = duplicate.usage.lastAccessed;
					}
				}
			}
		}

		// Merge metadata
		if (config.combineMetadata) {
			for (const duplicate of valid_duplicates) {
				if (primary_source.metadata && duplicate.metadata) {
					// Combine tags
					const new_tags = duplicate.metadata.tags.filter(
						(tag) => !primary_source.metadata.tags.includes(tag)
					);
					primary_source.metadata.tags.push(...new_tags);

					// Combine keywords
					const new_keywords = duplicate.metadata.keywords.filter(
						(keyword) => !primary_source.metadata.keywords.includes(keyword)
					);
					primary_source.metadata.keywords.push(...new_keywords);

					// Handle conflicts in other metadata
					if (
						duplicate.metadata.author &&
						primary_source.metadata.author &&
						duplicate.metadata.author !== primary_source.metadata.author
					) {
						conflicts.push(
							`Author conflict: ${primary_source.metadata.author} vs ${duplicate.metadata.author}`
						);
					}
				}
			}
		}

		// Update primary source
		await sourceManager.updateSource(primary_source.id, primary_source);

		// Remove duplicate sources
		for (const duplicate_id of duplicateSourceIds) {
			await sourceManager.deleteSource(duplicate_id);
		}

		return {
			success: true,
			mergedSourceId: primarySourceId,
			removedSourceIds: duplicateSourceIds,
			conflicts,
			preservedData: {
				usage: config.preserveUsageStats,
				metadata: config.combineMetadata,
				relationships: true // TODO: Implement relationship preservation
			}
		};
	}
}

// Export singleton instance
export const duplicateDetector = DuplicateDetector.getInstance();
