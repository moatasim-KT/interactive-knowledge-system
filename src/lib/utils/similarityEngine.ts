/**
 * Content similarity analysis and recommendation engine
 */
import type { ContentModule } from '../types/content.js';
import type {
	SimilarityScore,
	SimilarityReason,
	ContentRecommendation,
	RecommendationReason
} from '../types/relationships.js';
import { relationshipStorage } from '../storage/relationshipStorage.js';

/**
 * Content similarity and recommendation engine
 */
export class SimilarityEngine {
	/**
	 * Calculate similarity between two content modules
	 */
	async calculateSimilarity(
		module1: ContentModule,
		module2: ContentModule
	): Promise<SimilarityScore> {
		const reasons: SimilarityReason[] = [];
		let total_score = 0;
		let weight_sum = 0;

		// Tag similarity (weight: 0.3)
		const tag_similarity = this.calculateTagSimilarity(module1.metadata.tags, module2.metadata.tags);
		reasons.push({
			type: 'tags',
			score: tag_similarity,
			details: `Shared tags: ${this.getSharedTags(module1.metadata.tags, module2.metadata.tags).join(', ')}`
		});
		total_score += tag_similarity * 0.3;
		weight_sum += 0.3;

		// Difficulty similarity (weight: 0.2)
		const difficulty_similarity = this.calculateDifficultySimilarity(
			module1.metadata.difficulty,
			module2.metadata.difficulty
		);
		reasons.push({
			type: 'difficulty',
			score: difficulty_similarity,
			details: `Difficulty levels: ${module1.metadata.difficulty} vs ${module2.metadata.difficulty}`
		});
		total_score += difficulty_similarity * 0.2;
		weight_sum += 0.2;

		// Content similarity (weight: 0.3)
		const content_similarity = this.calculateContentSimilarity(module1, module2);
		reasons.push({
			type: 'content',
			score: content_similarity,
			details: `Content structure and text similarity`
		});
		total_score += content_similarity * 0.3;
		weight_sum += 0.3;

		// Structure similarity (weight: 0.2)
		const structure_similarity = this.calculateStructureSimilarity(module1, module2);
		reasons.push({
			type: 'structure',
			score: structure_similarity,
			details: `Similar content block types and organization`
		});
		total_score += structure_similarity * 0.2;
		weight_sum += 0.2;

		const final_score = weight_sum > 0 ? total_score / weight_sum : 0;

		return {
			contentId: module2.id,
			score: final_score,
			reasons
		};
	}

	/**
	 * Find similar content for a given module
	 */
	async findSimilarContent(
		targetModule: ContentModule,
		allModules: ContentModule[],
		limit: number = 10,
		min_similarity = 0.3
	): Promise<SimilarityScore[]> {
		const similarities: SimilarityScore[] = [];

                for (const module of allModules) {
                        if (module.id === targetModule.id) continue;

                        const similarity = await this.calculateSimilarity(targetModule, module);
			if (similarity.score >= min_similarity) {
				similarities.push(similarity);
			}
		}

		return similarities.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Generate content recommendations based on user progress and relationships
	 */
	async generateRecommendations(
		userId: string,
		completedContent: Set<string>,
		currentContent: string | null,
		allModules: ContentModule[],
		limit: number = 5
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Get current module if specified
		const current_module = currentContent ? allModules.find((m) => m.id === currentContent) : null;

		// 1. Next in sequence recommendations
		if (current_module) {
			const sequence_recs = await this.getSequenceRecommendations(
				current_module,
				allModules,
				completedContent
			);
			recommendations.push(...sequence_recs);
		}

		// 2. Related topic recommendations
		if (current_module) {
			const related_recs = await this.getRelatedTopicRecommendations(
				current_module,
				allModules,
				completedContent
			);
			recommendations.push(...related_recs);
		}

		// 3. Practice recommendations
		const practice_recs = await this.getPracticeRecommendations(completedContent, allModules);
		recommendations.push(...practice_recs);

		// 4. Similar difficulty recommendations
		if (current_module) {
			const difficulty_recs = await this.getSimilarDifficultyRecommendations(
				current_module,
				allModules,
				completedContent
			);
			recommendations.push(...difficulty_recs);
		}

		// 5. Review recommendations (spaced repetition)
		const review_recs = await this.getReviewRecommendations(completedContent, allModules);
		recommendations.push(...review_recs);

		// Sort by score and return top recommendations
		return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
	}

	/**
	 * Calculate tag similarity using Jaccard index
	 */
	private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
		if (tags1.length === 0 && tags2.length === 0) return 1;
		if (tags1.length === 0 || tags2.length === 0) return 0;

		const set1 = new Set(tags1.map((tag) => tag.toLowerCase()));
		const set2 = new Set(tags2.map((tag) => tag.toLowerCase()));

		const intersection = new Set([...set1].filter((tag) => set2.has(tag)));
		const union = new Set([...set1, ...set2]);

		return intersection.size / union.size;
	}

	/**
	 * Get shared tags between two tag arrays
	 */
	private getSharedTags(tags1: string[], tags2: string[]): string[] {
		const set1 = new Set(tags1.map((tag) => tag.toLowerCase()));
		const set2 = new Set(tags2.map((tag) => tag.toLowerCase()));

		return [...set1].filter((tag) => set2.has(tag));
	}

	/**
	 * Calculate difficulty similarity (closer difficulties = higher similarity)
	 */
	private calculateDifficultySimilarity(diff1: number, diff2: number): number {
		const max_diff = 4; // Max difference between difficulty levels (1-5)
		const actual_diff = Math.abs(diff1 - diff2);
		return 1 - actual_diff / max_diff;
	}

	/**
	 * Calculate content similarity based on text content
	 */
	private calculateContentSimilarity(module1: ContentModule, module2: ContentModule): number {
		// Simple text similarity based on title and description
		const text1 = `${module1.title} ${module1.description}`.toLowerCase();
		const text2 = `${module2.title} ${module2.description}`.toLowerCase();

		const words1 = new Set(text1.split(/\s+/).filter((word) => word.length > 2));
		const words2 = new Set(text2.split(/\s+/).filter((word) => word.length > 2));

		if (words1.size === 0 && words2.size === 0) return 1;
		if (words1.size === 0 || words2.size === 0) return 0;

		const intersection = new Set([...words1].filter((word) => words2.has(word)));
		const union = new Set([...words1, ...words2]);

		return intersection.size / union.size;
	}

	/**
	 * Calculate structure similarity based on content blocks
	 */
	private calculateStructureSimilarity(module1: ContentModule, module2: ContentModule): number {
		const types1 = module1.blocks.map((block) => block.type);
		const types2 = module2.blocks.map((block) => block.type);

		const type_count1 = this.countTypes(types1);
		const type_count2 = this.countTypes(types2);

		const all_types = new Set([...Object.keys(type_count1), ...Object.keys(type_count2)]);
		let similarity = 0;

		for (const type of all_types) {
			const count1 = type_count1[type] || 0;
			const count2 = type_count2[type] || 0;
			const max_count = Math.max(count1, count2);
			const min_count = Math.min(count1, count2);

			if (max_count > 0) {
				similarity += min_count / max_count;
			}
		}

		return all_types.size > 0 ? similarity / all_types.size : 0;
	}

	/**
	 * Count occurrences of each content block type
	 */
	private countTypes(types: string[]): Record<string, number> {
		const counts: Record<string, number> = {};
		for (const type of types) {
			counts[type] = (counts[type] || 0) + 1;
		}
		return counts;
	}

	/**
	 * Get next-in-sequence recommendations
	 */
	private async getSequenceRecommendations(
		currentModule: ContentModule,
		allModules: ContentModule[],
		completedContent: Set<string>
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find modules that have current module as prerequisite
                const dependent_links = await relationshipStorage.getOutgoingLinks(currentModule.id);
		const sequence_links = dependent_links.filter(
			(link) => link.type === 'sequence' || link.type === 'prerequisite'
		);

		for (const link of sequence_links) {
			const target_module = allModules.find((m) => m.id === link.targetId);
			if (!target_module || completedContent.has(target_module.id)) continue;

			// Check if all prerequisites are met
			const dependency_chain = await relationshipStorage.analyzeDependencyChain(
				target_module.id,
				completedContent
			);

			if (dependency_chain.canAccess) {
				recommendations.push({
					contentId: target_module.id,
					score: 0.9 * link.strength,
					type: 'next-in-sequence',
					reasons: [
						{
							type: 'prerequisite-completed',
							weight: 1.0,
                                                        description: `Next step after completing ${currentModule.title}`
						}
					]
				});
			}
		}

		return recommendations;
	}

	/**
	 * Get related topic recommendations
	 */
	private async getRelatedTopicRecommendations(
		currentModule: ContentModule,
		allModules: ContentModule[],
		completedContent: Set<string>
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find similar content based on tags and content
                const similar_content = await this.findSimilarContent(currentModule, allModules, 5, 0.4);

		for (const similar of similar_content) {
			if (completedContent.has(similar.contentId)) continue;

			recommendations.push({
				contentId: similar.contentId,
				score: 0.7 * similar.score,
				type: 'related-topic',
				reasons: [
					{
						type: 'similar-content',
						weight: similar.score,
                                                description: `Similar to ${currentModule.title} (${Math.round(similar.score * 100)}% match)`
					}
				]
			});
		}

		return recommendations;
	}

	/**
	 * Get practice recommendations
	 */
	private async getPracticeRecommendations(
		completedContent: Set<string>,
		allModules: ContentModule[]
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Find modules that provide practice for completed content
		for (const completed_id of completedContent) {
			const practice_links = await relationshipStorage.getOutgoingLinks(completed_id);
			const practice_modules = practice_links
				.filter((link) => link.type === 'practice')
				.map((link) => allModules.find((m) => m.id === link.targetId))
				.filter((module) => module && !completedContent.has(module.id));

			for (const module of practice_modules) {
				if (!module) continue;

				recommendations.push({
					contentId: module.id,
					score: 0.6,
					type: 'practice',
					reasons: [
						{
							type: 'difficulty-match',
							weight: 0.8,
							description: `Practice exercises for completed content`
						}
					]
				});
			}
		}

		return recommendations;
	}

	/**
	 * Get similar difficulty recommendations
	 */
	private async getSimilarDifficultyRecommendations(
		currentModule: ContentModule,
		allModules: ContentModule[],
		completedContent: Set<string>
	): Promise<ContentRecommendation[]> {
                const recommendations: ContentRecommendation[] = [];
                const target_difficulty = currentModule.metadata.difficulty;

		const similar_difficulty_modules = allModules.filter(
			(module) =>
                                !completedContent.has(module.id) &&
                                module.id !== currentModule.id &&
				Math.abs(module.metadata.difficulty - target_difficulty) <= 1
		);

		for (const module of similar_difficulty_modules.slice(0, 3)) {
			const difficulty_score = this.calculateDifficultySimilarity(
				target_difficulty,
				module.metadata.difficulty
			);

			recommendations.push({
				contentId: module.id,
				score: 0.5 * difficulty_score,
				type: 'similar-difficulty',
				reasons: [
					{
						type: 'difficulty-match',
						weight: difficulty_score,
						description: `Similar difficulty level (${module.metadata.difficulty})`
					}
				]
			});
		}

		return recommendations;
	}

	/**
	 * Get review recommendations based on spaced repetition
	 */
	private async getReviewRecommendations(
		completedContent: Set<string>,
		allModules: ContentModule[]
	): Promise<ContentRecommendation[]> {
		const recommendations: ContentRecommendation[] = [];

		// Simple spaced repetition: recommend review of older completed content
		// In a real implementation, this would use more sophisticated algorithms
		const completed_modules = allModules.filter((module) => completedContent.has(module.id));

		// Sort by completion time (oldest first) - simplified
		const review_candidates = completed_modules.slice(0, 2);

		for (const module of review_candidates) {
			recommendations.push({
				contentId: module.id,
				score: 0.4,
				type: 'review',
				reasons: [
					{
						type: 'topic-continuation',
						weight: 0.6,
						description: `Review previously completed content`
					}
				]
			});
		}

		return recommendations;
	}
}

// Export singleton instance
export const similarityEngine = new SimilarityEngine();
