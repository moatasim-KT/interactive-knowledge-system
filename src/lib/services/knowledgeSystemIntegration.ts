/**
 * Knowledge System Integration Service
 * Seamlessly integrates web-sourced content with the existing Interactive Knowledge System
 */
import type { ContentModule } from '../types/content.js';
import { storage } from '../storage/indexeddb.js';
import type { KnowledgeNode, LearningPath } from '../types/knowledge.js';
import type { ContentLink, RelationshipType, ContentRecommendation } from '../types/relationships.js';
import type { ContentSource } from '../types/web-content.js';
import { searchEngine } from '../utils/searchEngine.js';
import { relationshipStorage } from '../storage/relationshipStorage.js';
import { storage } from '../storage/indexeddb.js';

/**
 * Configuration for automatic relationship detection
 */
export interface RelationshipDetectionConfig {
    similarityThreshold: number; // 0-1, minimum similarity for automatic linking
    tagMatchWeight: number; // Weight for tag-based similarity
    contentMatchWeight: number; // Weight for content-based similarity
    titleMatchWeight: number; // Weight for title-based similarity
    enableAutomaticPrerequisites: boolean; // Whether to auto-detect prerequisites
    enableAutomaticRelated: boolean; // Whether to auto-detect related content
    maxAutoRelationships: number; // Maximum automatic relationships per content
}

/**
 * Result of relationship detection analysis
 */
export interface RelationshipDetectionResult {
    sourceContentId: string;
    suggestedRelationships: SuggestedRelationship[];
    confidence: number;
    reasoning: string[];
}

export interface SuggestedRelationship {
    targetContentId: string;
    relationshipType: RelationshipType;
    confidence: number;
    reasoning: string;
    automatic: boolean;
}

/**
 * Learning path suggestion result
 */
export interface LearningPathSuggestion {
    pathId: string;
    name: string;
    description: string;
    suggestedModules: string[];
    estimatedDuration: number;
    difficulty: number;
    confidence: number;
    reasoning: string[];
}

/**
 * Integration statistics and metrics
 */
export interface IntegrationMetrics {
    totalImportedContent: number;
    automaticRelationshipsCreated: number;
    manualRelationshipsCreated: number;
    searchIndexEntries: number;
    learningPathsGenerated: number;
    averageIntegrationTime: number;
}

/**
 * Knowledge System Integration Service
 */
export class KnowledgeSystemIntegration {
    private config: RelationshipDetectionConfig = {
        similarityThreshold: 0.3,
        tagMatchWeight: 0.4,
        contentMatchWeight: 0.3,
        titleMatchWeight: 0.3,
        enableAutomaticPrerequisites: true,
        enableAutomaticRelated: true,
        maxAutoRelationships: 5
    };

    /**
     * Update integration configuration
     */
    updateConfig(newConfig: Partial<RelationshipDetectionConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Integrate imported web content with the existing knowledge system
     */
    async integrateContent(
        source: ContentSource,
        processedModule: ContentModule
    ): Promise<RelationshipDetectionResult> {
        const start_time = Date.now();

        try {
            // 1. Create KnowledgeNode entry
            await this.createKnowledgeNode(source, processedModule);

            // 2. Detect and create automatic relationships
            const relationship_result = await this.detectRelationships(processedModule);

            // 3. Add to search index
            this.addToSearchIndex(processedModule);

            // 4. Update recommendation systems
            await this.updateRecommendations(processedModule);

            // 5. Generate learning path suggestions
            await this.generateLearningPathSuggestions(processedModule);

            // 6. Record integration metrics
            await this.recordIntegrationMetrics(start_time);

            return relationship_result;
        } catch (error) {
            throw new Error(`Integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create a KnowledgeNode entry for imported content
     */
    private async createKnowledgeNode(
        source: ContentSource,
        module: ContentModule
    ): Promise<KnowledgeNode> {
        // Determine appropriate parent based on content tags and existing structure
        const parent_id = await this.findAppropriateParent(module);

        const knowledge_node = {
            id: module.id,
            title: module.title,
            type: 'module',
            parent: parent_id,
            metadata: {
                difficulty: module.metadata.difficulty,
                estimatedTime: module.metadata.estimatedTime,
                prerequisites: module.relationships.prerequisites,
                tags: [
                    ...module.metadata.tags,
                    'imported',
                    `source:${source.domain}`,
                    `type:${source.metadata.category}`
                ]
            },
            progress: {
                completed: false,
                lastAccessed: new Date()
            }
        };

        await storage.add('knowledge_nodes', knowledge_node, 'Created knowledge node for imported content');
        return knowledge_node;
    }

    /**
     * Find appropriate parent node for imported content
     */
    private async findAppropriateParent(module: ContentModule): Promise<string | undefined> {
        const existing_nodes = await storage.getAll('knowledge_nodes');

        // Look for folder-type nodes with matching tags
        const folder_nodes = existing_nodes.filter(node => node.type === 'folder');

        for (const folder of folder_nodes) {
            const common_tags = module.metadata.tags.filter(tag =>
                folder.metadata.tags.includes(tag)
            );

            // If we have 2+ common tags, this is likely a good parent
            if (common_tags.length >= 2) {
                return folder.id;
            }
        }

        // Look for topic-based folders
        const topic_keywords = ['programming', 'science', 'math', 'history', 'language'];
        for (const keyword of topic_keywords) {
            if (module.metadata.tags.some(tag => tag.toLowerCase().includes(keyword))) {
                const matching_folder = folder_nodes.find(folder =>
                    folder.title.toLowerCase().includes(keyword) ||
                    folder.metadata.tags.some(tag => tag.toLowerCase().includes(keyword))
                );
                if (matching_folder) {
                    return matching_folder.id;
                }
            }
        }

        return undefined; // Root level
    }

    /**
     * Detect relationships between imported content and existing content
     */
    async detectRelationships(module: ContentModule): Promise<RelationshipDetectionResult> {
        const existing_modules = await storage.getAll('modules');
        const suggested_relationships = [];
        const reasoning: string[] = [];

        for (const existing_module of existing_modules) {
            if (existing_module.id === module.id) continue;

            const similarity = this.calculateContentSimilarity(module, existing_module);

            if (similarity.score >= this.config.similarityThreshold) {
                const relationship_type = this.determineRelationshipType(module, existing_module, similarity);

                suggested_relationships.push({
                    targetContentId: existing_module.id,
                    relationshipType: relationship_type,
                    confidence: similarity.score,
                    reasoning: similarity.reasons.join(', '),
                    automatic: true
                });

                reasoning.push(
                    `Found ${relationship_type} relationship with "${existing_module.title}" (confidence: ${(similarity.score * 100).toFixed(1)}%)`
                );
            }
        }

        // Sort by confidence and limit to max relationships
        suggested_relationships.sort((a, b) => b.confidence - a.confidence);
        const limited_relationships = suggested_relationships.slice(0, this.config.maxAutoRelationships);

        // Create the relationships if automatic creation is enabled
        if (this.config.enableAutomaticRelated || this.config.enableAutomaticPrerequisites) {
            await this.createAutomaticRelationships(module.id, limited_relationships);
        }

        const overall_confidence = limited_relationships.length > 0
            ? limited_relationships.reduce((sum, rel) => sum + rel.confidence, 0) / limited_relationships.length
            : 0;

        return {
            sourceContentId: module.id,
            suggestedRelationships: limited_relationships,
            confidence: overall_confidence,
            reasoning
        };
    }

    /**
     * Calculate similarity between two content modules
     */
    private calculateContentSimilarity(
        module1: ContentModule,
        module2: ContentModule
    ): { score: number; reasons: string[] } {
        let total_score = 0;
        const reasons: string[] = [];

        // Tag-based similarity
        const common_tags = module1.metadata.tags.filter(tag =>
            module2.metadata.tags.includes(tag)
        );
        const tag_similarity = common_tags.length / Math.max(module1.metadata.tags.length, module2.metadata.tags.length);
        total_score += tag_similarity * this.config.tagMatchWeight;

        if (common_tags.length > 0) {
            reasons.push(`Common tags: ${common_tags.join(', ')}`);
        }

        // Title similarity (simple word overlap)
        const title1_words = module1.title.toLowerCase().split(/\s+/);
        const title2_words = module2.title.toLowerCase().split(/\s+/);
        const common_words = title1_words.filter(word => title2_words.includes(word));
        const title_similarity = common_words.length / Math.max(title1_words.length, title2_words.length);
        total_score += title_similarity * this.config.titleMatchWeight;

        if (common_words.length > 0) {
            reasons.push(`Common title words: ${common_words.join(', ')}`);
        }

        // Content similarity (basic keyword matching)
        const content1_text = this.extractContentText(module1);
        const content2_text = this.extractContentText(module2);
        const content_similarity = this.calculateTextSimilarity(content1_text, content2_text);
        total_score += content_similarity * this.config.contentMatchWeight;

        if (content_similarity > 0.1) {
            reasons.push(`Content similarity: ${(content_similarity * 100).toFixed(1)}%`);
        }

        // Difficulty similarity bonus
        const difficulty_diff = Math.abs(module1.metadata.difficulty - module2.metadata.difficulty);
        if (difficulty_diff <= 1) {
            total_score += 0.1;
            reasons.push(`Similar difficulty levels`);
        }

        return { score: Math.min(1, total_score), reasons };
    }

    /**
     * Extract text content from module blocks for similarity analysis
     */
    private extractContentText(module: ContentModule): string {
        return module.blocks
            .map(block => {
                switch (block.type) {
                    case 'text':
                        return typeof block.content === 'string' ? block.content : '';
                    case 'code':
                        return block.content?.code || '';
                    case 'quiz':
                        return block.content?.questions?.map((q: any) => q.question).join(' ') || '';
                    default:
                        return '';
                }
            })
            .join(' ')
            .toLowerCase();
    }

    /**
     * Calculate text similarity using simple word overlap
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.split(/\s+/).filter(word => word.length > 3));
        const words2 = new Set(text2.split(/\s+/).filter(word => word.length > 3));

        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Determine the most appropriate relationship type between two modules
     */
    private determineRelationshipType(
        sourceModule: ContentModule,
        targetModule: ContentModule,
        similarity: { score: number; reasons: string[] }
    ): RelationshipType {
        // Check for prerequisite relationships based on difficulty and content
        if (targetModule.metadata.difficulty < sourceModule.metadata.difficulty) {
            // Lower difficulty content might be a prerequisite
            const has_foundational_content = similarity.reasons.some(reason =>
                reason.includes('basic') || reason.includes('intro') || reason.includes('fundamental')
            );
            if (has_foundational_content) {
                return 'prerequisite';
            }
        }

        // Check for sequence relationships
        const has_sequence_indicators = similarity.reasons.some(reason =>
            reason.includes('part') || reason.includes('chapter') || reason.includes('lesson')
        );
        if (has_sequence_indicators) {
            return 'sequence';
        }

        // Check for example relationships
        const has_example_indicators = similarity.reasons.some(reason =>
            reason.includes('example') || reason.includes('demo') || reason.includes('tutorial')
        );
        if (has_example_indicators) {
            return 'example';
        }

        // Default to related for high similarity
        return 'related';
    }

    /**
     * Create automatic relationships based on detection results
     */
    private async createAutomaticRelationships(
        sourceId: string,
        relationships: SuggestedRelationship[]
    ): Promise<void> {
        for (const relationship of relationships) {
            try {
                // Check if relationship should be created automatically
                const should_create =
                    (relationship.relationshipType === 'related' && this.config.enableAutomaticRelated) ||
                    (relationship.relationshipType === 'prerequisite' && this.config.enableAutomaticPrerequisites) ||
                    relationship.relationshipType === 'sequence' ||
                    relationship.relationshipType === 'example';

                if (should_create) {
                    await relationshipStorage.createLink(
                        sourceId,
                        relationship.targetContentId,
                        relationship.relationshipType,
                        relationship.confidence,
                        relationship.reasoning,
                        true // automatic = true
                    );
                }
            } catch (error) {
                // Silently continue if relationship creation fails
            }
        }
    }

    /**
     * Add imported content to search index
     */
    private addToSearchIndex(module: ContentModule): void {
        searchEngine.indexModule(module);
    }

    /**
     * Update recommendation systems with new content
     */
    private async updateRecommendations(module: ContentModule): Promise<void> {
        // This would integrate with existing recommendation algorithms
        // For now, we'll just ensure the content is available for recommendations

        // Update related content caches
        const related_content = searchEngine.getRelatedContent(
            module.id,
            new Map([[module.id, module]]),
            new Map()
        );

        // Store recommendation data for future use
        await storage.add('content_recommendations', {
            contentId: module.id,
            relatedContent: related_content.map(item => item.id),
            lastUpdated: new Date()
        }, 'Updated recommendations for imported content');
    }

    /**
     * Generate learning path suggestions that include imported content
     */
    private async generateLearningPathSuggestions(module: ContentModule): Promise<LearningPathSuggestion[]> {
        const suggestions: LearningPathSuggestion[] = [];

        // Find existing learning paths that could include this content
        const existing_paths = await storage.getAll('learning_paths') as LearningPath[];
        const all_modules = await storage.getAll('modules') as ContentModule[];

        for (const path of existing_paths) {
            const path_modules = all_modules.filter(m => path.modules.includes(m.id));
            const similarity = await this.calculatePathSimilarity(module, path_modules);

            if (similarity.score > 0.4) {
                suggestions.push({
                    pathId: path.id,
                    name: `Enhanced ${path.name}`,
                    description: `${path.description} - Enhanced with imported content from ${module.metadata.tags.join(', ')}`,
                    suggestedModules: [...path.modules, module.id],
                    estimatedDuration: path.estimatedDuration + module.metadata.estimatedTime,
                    difficulty: Math.max(path.difficulty, module.metadata.difficulty),
                    confidence: similarity.score,
                    reasoning: similarity.reasons
                });
            }
        }

        // Generate new learning paths based on content relationships
        const relationships = await relationshipStorage.getLinksForContent(module.id);
        if (relationships.length > 0) {
            const related_module_ids = relationships.map(rel =>
                rel.sourceId === module.id ? rel.targetId : rel.sourceId
            );

            suggestions.push({
                pathId: `generated-${module.id}`,
                name: `Learning Path: ${module.title}`,
                description: `Auto-generated learning path based on imported content and related materials`,
                suggestedModules: [module.id, ...related_module_ids.slice(0, 3)],
                estimatedDuration: module.metadata.estimatedTime * 2,
                difficulty: module.metadata.difficulty,
                confidence: 0.7,
                reasoning: ['Based on automatic relationship detection', 'Includes related existing content']
            });
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Calculate how well a module fits into an existing learning path
     */
    private async calculatePathSimilarity(
        module: ContentModule,
        pathModules: ContentModule[]
    ): Promise<{ score: number; reasons: string[] }> {
        let total_score = 0;
        const reasons: string[] = [];

        // Check tag overlap with path modules
        const path_tags = new Set(path_modules.flatMap(m => m.metadata.tags));
        const common_tags = module.metadata.tags.filter(tag => path_tags.has(tag));
        const tag_score = common_tags.length / Math.max(module.metadata.tags.length, path_tags.size);
        total_score += tag_score * 0.5;

        if (common_tags.length > 0) {
            reasons.push(`Common tags with path: ${common_tags.join(', ')}`);
        }

        // Check difficulty progression
        const path_difficulties = path_modules.map(m => m.metadata.difficulty).sort((a, b) => a - b);
        const fits_progression = module.metadata.difficulty >= path_difficulties[0] &&
            module.metadata.difficulty <= path_difficulties[path_difficulties.length - 1];
        if (fits_progression) {
            total_score += 0.3;
            reasons.push('Difficulty fits path progression');
        }

        // Check for existing relationships with path modules
        const relationships = await relationshipStorage.getLinksForContent(module.id);
        const related_path_modules = relationships.filter(rel =>
            path_modules.some(pm => pm.id === rel.targetId || pm.id === rel.sourceId)
        );
        if (related_path_modules.length > 0) {
            total_score += 0.2;
            reasons.push(`Has relationships with ${related_path_modules.length} path modules`);
        }

        return { score: Math.min(1, total_score), reasons };
    }

    /**
     * Record integration metrics for monitoring and optimization
     */
    private async recordIntegrationMetrics(startTime: number): Promise<void> {
        const integration_time = Date.now() - start_time;

        try {
            const existing_metrics = await storage.get('integration_metrics', 'current') as IntegrationMetrics || {
                totalImportedContent: 0,
                automaticRelationshipsCreated: 0,
                manualRelationshipsCreated: 0,
                searchIndexEntries: 0,
                learningPathsGenerated: 0,
                averageIntegrationTime: 0
            };

            const updated_metrics = {
                ...existing_metrics,
                totalImportedContent: existing_metrics.totalImportedContent + 1,
                averageIntegrationTime: (existing_metrics.averageIntegrationTime + integration_time) / 2
            };

            await storage.put('integration_metrics', updated_metrics, 'Updated integration metrics');
        } catch (error) {
            // Silently continue if metrics recording fails
        }
    }

    /**
     * Get integration statistics
     */
    async getIntegrationMetrics(): Promise<IntegrationMetrics> {
        try {
            return await storage.get('integration_metrics', 'current') as IntegrationMetrics;
        } catch {
            return {
                totalImportedContent: 0,
                automaticRelationshipsCreated: 0,
                manualRelationshipsCreated: 0,
                searchIndexEntries: 0,
                learningPathsGenerated: 0,
                averageIntegrationTime: 0
            };
        }
    }

    /**
     * Manually create a relationship between imported and existing content
     */
    async createManualRelationship(
        sourceId: string,
        targetId: string,
        relationshipType: RelationshipType,
        description?: string
    ): Promise<ContentLink> {
        const link = await relationshipStorage.createLink(
            sourceId,
            targetId,
            relationship_type,
            1.0, // Full confidence for manual relationships
            description,
            false // automatic = false
        );

        // Update metrics
        try {
            const metrics = await this.getIntegrationMetrics();
            metrics.manualRelationshipsCreated += 1;
            await storage.put('integration_metrics', metrics, 'Updated manual relationship count');
        } catch (error) {
            // Silently continue if metrics update fails
        }

        return link;
    }

    /**
     * Get content recommendations based on user's current progress and imported content
     */
    async getContentRecommendations(
        userId: string,
        completedContent: Set<string>,
        max_recommendations = 10
    ): Promise<ContentRecommendation[]> {
        const recommendations: ContentRecommendation[] = [];
        const all_modules = await storage.getAll('modules') as ContentModule[];

        // Find imported content that user hasn't completed
        const imported_modules = all_modules.filter(module =>
            module.metadata.tags.includes('imported') && !completedContent.has(module.id)
        );

        for (const module of imported_modules) {
            const relationships = await relationshipStorage.getLinksForContent(module.id);
            const prerequisites = relationships
                .filter(rel => rel.type === 'prerequisite' && rel.targetId === module.id)
                .map(rel => rel.sourceId);

            // Check if prerequisites are met
            const prerequisites_met = prerequisites.every(prereq_id => completedContent.has(prereq_id));

            if (prerequisites_met) {
                const reasons: any[] = [];
                let score = 0.5; // Base score for available imported content

                // Boost score based on relationships with completed content
                const related_completed = relationships.filter(rel =>
                    completedContent.has(rel.sourceId) || completedContent.has(rel.targetId)
                );
                score += related_completed.length * 0.1;

                if (related_completed.length > 0) {
                    reasons.push({
                        type: 'prerequisite-completed',
                        weight: 0.3,
                        description: `Related to ${related_completed.length} completed modules`
                    });
                }

                recommendations.push({
                    contentId: module.id,
                    score: Math.min(1, score),
                    reasons,
                    type: 'related-topic'
                });
            }
        }

        return recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, max_recommendations);
    }
}

// Export singleton instance
export const knowledgeSystemIntegration = new KnowledgeSystemIntegration();