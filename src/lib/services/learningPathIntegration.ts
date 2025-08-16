/**
 * Learning Path Integration Service
 * Handles prerequisite detection and learning path suggestions for imported content
 */
import type { ContentModule, KnowledgeNode, LearningPath, PrerequisiteSuggestion, LearningPathSuggestion, LearningPathModule, ProgressionAnalysis, ContentLink, RelationshipType, WebContentSource as ContentSource } from '$lib/types/unified';
import { difficultyToRank } from '$lib/types/unified';
import { storage } from '../storage/indexeddb.js';
import { relationshipStorage } from '../storage/relationshipStorage.js';
import { searchEngine } from '../utils/searchEngine.js';

/**
 * Prerequisite suggestion with confidence scoring
 */


/**
 * Learning Path Integration Service
 */
export class LearningPathIntegration {
    /**
     * Analyze and suggest prerequisites for imported content
     */
    async suggestPrerequisites(
        importedModule: ContentModule,
        source: ContentSource
    ): Promise<PrerequisiteSuggestion[]> {
        const suggestions: PrerequisiteSuggestion[] = [];

        try {
            // Get all existing modules for comparison
            const existing_modules = await storage.getAll('modules') as ContentModule[];

            // Analyze content difficulty and topics
            const content_analysis = this.analyzeContentComplexity(importedModule);

            // Find modules with lower difficulty and related topics
            for (const module of existing_modules) {
                if (module.id === importedModule.id) {continue;}

                const similarity = this.calculateTopicSimilarity(importedModule, module);
        const difficulty_gap = difficultyToRank(importedModule.metadata.difficulty) - difficultyToRank(module.metadata.difficulty);

                // Suggest as prerequisite if:
                // 1. Lower difficulty (1-2 levels)
                // 2. High topic similarity (>0.4)
                // 3. Contains foundational concepts
                if (difficulty_gap >= 1 && difficulty_gap <= 2 && similarity.score > 0.4) {
                    const confidence = this.calculatePrerequisiteConfidence(
                        importedModule,
                        module,
                        similarity,
                        difficulty_gap
                    );

                    if (confidence > 0.3) {
                        suggestions.push({
                            contentId: module.id,
                            title: module.title,
                            confidence,
                            reasoning: [
                                `Lower difficulty (${module.metadata.difficulty} vs ${importedModule.metadata.difficulty})`,
                                `Topic similarity: ${(similarity.score * 100).toFixed(1)}%`,
                                ...similarity.reasons
                            ],
                            difficulty: module.metadata.difficulty,
                            estimatedTime: module.metadata.estimatedTime,
                            tags: module.metadata.tags
                        });
                    }
                }
            }

            // Sort by confidence and limit results
            suggestions.sort((a, b) => b.confidence - a.confidence);
            return suggestions.slice(0, 5);

        } catch (error) {
            return [];
        }
    }

    /**
     * Generate learning path suggestions that include imported content
     */
    async generateLearningPaths(
        importedModule: ContentModule,
        source: ContentSource
    ): Promise<LearningPathSuggestion[]> {
        const suggestions: LearningPathSuggestion[] = [];

        try {
            // Get existing learning paths
            const existingPaths = await storage.getAll('paths') as LearningPath[];
            const allModules = await storage.getAll('modules') as ContentModule[];

            // Analyze where imported content fits in existing paths
            for (const path of existingPaths) {
                const pathModules = allModules.filter((m: ContentModule) => path.modules.includes(m.id));
                const insertionAnalysis = this.analyzePathInsertion(importedModule, pathModules);

                if (insertionAnalysis.confidence > 0.4) {
                    const enhancedPath = this.createEnhancedPath(
                        path,
                        pathModules,
                        importedModule,
                        insertionAnalysis,
                        source
                    );
                    suggestions.push(enhancedPath);
                }
            }

            // Generate new learning paths based on content relationships
            const newPaths = await this.generateNewLearningPaths(importedModule, source);
            suggestions.push(...newPaths);

            // Sort by confidence and return top suggestions
            suggestions.sort((a, b) => b.confidence - a.confidence);
            return suggestions.slice(0, 3);

        } catch (error) {
            return [];
        }
    }

    /**
     * Analyze learning progression for a user based on imported content
     */
    async analyzeProgression(
        userId: string,
        completedContent: Set<string>
    ): Promise<ProgressionAnalysis[]> {
        const analyses: ProgressionAnalysis[] = [];

        try {
            const all_modules = await storage.getAll('modules') as ContentModule[];
            const imported_modules = all_modules.filter(m =>
                m.metadata.tags.includes('imported') && !completedContent.has(m.id)
            );

            for (const module of imported_modules) {
                const analysis = await this.analyzeModuleProgression(module, completedContent, all_modules);
                analyses.push(analysis);
            }

            return analyses.sort((a, b) => a.currentLevel - b.currentLevel);

        } catch (error) {
            return [];
        }
    }

    /**
     * Create automatic relationships based on learning progression
     */
    async createProgressionRelationships(
        importedModule: ContentModule,
        prerequisites: PrerequisiteSuggestion[]
    ): Promise<ContentLink[]> {
        const created_links = [];

        try {
            // Create prerequisite relationships for high-confidence suggestions
            for (const prereq of prerequisites) {
                if (prereq.confidence > 0.7) {
                    const link = await relationshipStorage.createLink(
                        prereq.contentId,
                        importedModule.id,
                        'prerequisite',
                        prereq.confidence,
                        `Auto-detected prerequisite: ${prereq.reasoning.join(', ')}`,
                        true // automatic
                    );
                    created_links.push(link);
                }
            }

            return created_links;

        } catch (error) {
            return [];
        }
    }

    // Private helper methods

    /**
     * Analyze content complexity and extract key concepts
     */
    private analyzeContentComplexity(module: ContentModule): {
        concepts: string[];
        complexity: number;
        prerequisites: string[];
    } {
        const concepts: string[] = [];
        let complexity = difficultyToRank(module.metadata.difficulty);
        const prerequisites: string[] = [];

        // Extract concepts from content blocks
        for (const block of module.blocks) {
            if (block.type === 'text' && typeof block.content === 'string') {
                // Look for technical terms, definitions, and concepts
                const technical_terms = this.extractTechnicalTerms(block.content);
                concepts.push(...technical_terms);
            }

            if (block.type === 'code') {
                // Code blocks indicate higher complexity
                complexity += 0.5;
                const code_language = block.content?.language || 'unknown';
                concepts.push(`programming:${code_language}`);
            }
        }

        // Analyze tags for prerequisite hints
        for (const tag of module.metadata.tags) {
            if (tag.includes('advanced') || tag.includes('expert')) {
                complexity += 1;
            }
            if (tag.includes('beginner') || tag.includes('intro')) {
                complexity -= 0.5;
            }
        }

        return {
            concepts: [...new Set(concepts)],
            complexity: Math.max(1, Math.min(5, complexity)),
            prerequisites
        };
    }

    /**
     * Extract technical terms and concepts from text
     */
    private extractTechnicalTerms(text: string): string[] {
        const terms: string[] = [];

        // Common technical patterns
        const patterns = [
            /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g, // CamelCase terms
            /\b[a-z]+_[a-z]+(?:_[a-z]+)*\b/g, // snake_case terms
            /\b[A-Z]{2,}\b/g, // Acronyms
            /\b\w+\(\)/g, // Function calls
            /\b\w+\.\w+\b/g // Method calls or namespaced terms
        ];

        for (const pattern of patterns) {
            const matches = text.match(pattern);
            if (matches) {
                terms.push(...matches);
            }
        }

        return [...new Set(terms)].slice(0, 10); // Limit to top 10 terms
    }

    /**
     * Calculate topic similarity between two modules
     */
    private calculateTopicSimilarity(
        module1: ContentModule,
        module2: ContentModule
    ): { score: number; reasons: string[] } {
        let score = 0;
        const reasons: string[] = [];

        // Tag similarity
        const common_tags = module1.metadata.tags.filter(tag =>
            module2.metadata.tags.includes(tag)
        );
        const tag_similarity = common_tags.length /
            Math.max(module1.metadata.tags.length, module2.metadata.tags.length);
        score += tag_similarity * 0.4;

        if (common_tags.length > 0) {
            reasons.push(`Common tags: ${common_tags.join(', ')}`);
        }

        // Title similarity
        const title1_words = module1.title.toLowerCase().split(/\s+/);
        const title2_words = module2.title.toLowerCase().split(/\s+/);
        const common_words = title1_words.filter(word => title2_words.includes(word));
        const title_similarity = common_words.length /
            Math.max(title1_words.length, title2_words.length);
        score += title_similarity * 0.3;

        if (common_words.length > 0) {
            reasons.push(`Common title words: ${common_words.join(', ')}`);
        }

        // Content similarity (basic keyword matching)
        const content1 = this.extractContentText(module1);
        const content2 = this.extractContentText(module2);
        const content_similarity = this.calculateTextSimilarity(content1, content2);
        score += content_similarity * 0.3;

        if (content_similarity > 0.1) {
            reasons.push(`Content similarity: ${(content_similarity * 100).toFixed(1)}%`);
        }

        return { score: Math.min(1, score), reasons };
    }

    /**
     * Extract text content from module blocks
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
     * Calculate text similarity using word overlap
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        const words1 = new Set(text1.split(/\s+/).filter(word => word.length > 3));
        const words2 = new Set(text2.split(/\s+/).filter(word => word.length > 3));

        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);

        return union.size > 0 ? intersection.size / union.size : 0;
    }

    /**
     * Calculate confidence score for prerequisite suggestion
     */
    private calculatePrerequisiteConfidence(
        targetModule: ContentModule,
        prereqModule: ContentModule,
        similarity: { score: number; reasons: string[] },
        difficultyGap: number
    ): number {
        let confidence = similarity.score * 0.5; // Base similarity score

        // Difficulty gap bonus (1-2 levels is ideal)
        if (difficultyGap === 1) {
            confidence += 0.3;
        } else if (difficultyGap === 2) {
            confidence += 0.2;
        }

        // Foundational content bonus
        const has_foundational_terms = prereqModule.metadata.tags.some((tag: string) =>
            ['basic', 'intro', 'fundamental', 'foundation', 'beginner'].includes(tag.toLowerCase())
        );
        if (has_foundational_terms) {
            confidence += 0.2;
        }

        // Time investment consideration (shorter prereqs are better)
        if (prereqModule.metadata.estimatedTime <= 30) {
            confidence += 0.1;
        }

        return Math.min(1, confidence);
    }

    /**
     * Analyze where imported content fits in an existing learning path
     */
    private analyzePathInsertion(
        importedModule: ContentModule,
        pathModules: ContentModule[]
    ): { confidence: number; position: number; reasoning: string[] } {
        let best_position = pathModules.length; // Default to end
        let max_confidence = 0;
        const reasoning: string[] = [];

        // Try inserting at each position and calculate fit
        for (let i = 0; i <= pathModules.length; i++) {
            const confidence = this.calculateInsertionConfidence(
                importedModule,
                pathModules,
                i
            );

            if (confidence > max_confidence) {
                max_confidence = confidence;
                best_position = i;
            }
        }

        // Add reasoning based on best position
        if (best_position === 0) {
            reasoning.push('Fits as introductory content');
        } else if (best_position === pathModules.length) {
            reasoning.push('Fits as advanced content');
        } else {
            reasoning.push(`Fits between "${pathModules[best_position - 1]?.title}" and "${pathModules[best_position]?.title}"`);
        }

        return { confidence: max_confidence, position: best_position, reasoning };
    }

    /**
     * Calculate confidence for inserting content at a specific position
     */
    private calculateInsertionConfidence(
        importedModule: ContentModule,
        pathModules: ContentModule[],
        position: number
    ): number {
        let confidence = 0.5; // Base confidence

        // Check difficulty progression
        const prev_module = pathModules[position - 1];
        const next_module = pathModules[position];

        if (prev_module && next_module) {
            // Check if difficulty fits between previous and next
            const prev_diff = difficultyToRank(prev_module.metadata.difficulty);
            const next_diff = difficultyToRank(next_module.metadata.difficulty);
            const imported_diff = difficultyToRank(importedModule.metadata.difficulty);

            if (imported_diff >= prev_diff && imported_diff <= next_diff) {
                confidence += 0.3;
            }
        } else if (prev_module) {
            // At the end - should be higher difficulty
            if (difficultyToRank(importedModule.metadata.difficulty) >= difficultyToRank(prev_module.metadata.difficulty)) {
                confidence += 0.2;
            }
        } else if (next_module) {
            // At the beginning - should be lower difficulty
            if (difficultyToRank(importedModule.metadata.difficulty) <= difficultyToRank(next_module.metadata.difficulty)) {
                confidence += 0.2;
            }
        }

        // Check topic continuity
        const adjacent_modules = [prev_module, next_module].filter(Boolean);
        for (const adjacent of adjacent_modules) {
            const similarity = this.calculateTopicSimilarity(importedModule, adjacent);
            confidence += similarity.score * 0.2;
        }

        return Math.min(1, confidence);
    }

    /**
     * Create an enhanced learning path with imported content
     */
    private createEnhancedPath(
        originalPath: LearningPath,
        pathModules: ContentModule[],
        importedModule: ContentModule,
        insertionAnalysis: { confidence: number; position: number; reasoning: string[] },
        source: ContentSource
    ): LearningPathSuggestion {
        const modules: LearningPathModule[] = [];

        // Add modules before insertion point
        for (let i = 0; i < insertionAnalysis.position; i++) {
            const module = pathModules[i];
            modules.push({
                id: module.id,
                title: module.title,
                position: i,
                isImported: false,
                estimatedTime: module.metadata.estimatedTime,
                difficulty: module.metadata.difficulty,
                sourceUrl: '',
                tags: module.metadata.tags ?? [],
                prerequisites: module.metadata.prerequisites ?? []
            });
        }

        // Add imported module
        modules.push({
            id: importedModule.id,
            title: importedModule.title,
            position: insertionAnalysis.position,
            isImported: true,
            sourceUrl: source.url,
            estimatedTime: importedModule.metadata.estimatedTime,
            difficulty: importedModule.metadata.difficulty,
            tags: importedModule.metadata.tags ?? [],
            prerequisites: importedModule.metadata.prerequisites ?? []
        });

        // Add modules after insertion point
        for (let i = insertionAnalysis.position; i < pathModules.length; i++) {
            const module = pathModules[i];
            modules.push({
                id: module.id,
                title: module.title,
                position: i + 1,
                isImported: false,
                estimatedTime: module.metadata.estimatedTime,
                difficulty: module.metadata.difficulty,
                sourceUrl: '',
                tags: module.metadata.tags ?? [],
                prerequisites: module.metadata.prerequisites ?? []
            });
        }

        const total_duration = modules.reduce((sum, m) => sum + m.estimatedTime, 0);
        const average_difficulty = modules.reduce((sum, m) => sum + difficultyToRank(m.difficulty), 0) / modules.length;

        return {
            id: `enhanced-${originalPath.id}`,
            name: `Enhanced ${originalPath.name}`,
            description: `${originalPath.description} - Enhanced with imported content from ${source.domain}`,
            modules,
            totalDuration: total_duration,
            averageDifficulty: average_difficulty,
            confidence: insertionAnalysis.confidence,
            reasoning: [
                `Based on existing path: ${originalPath.name}`,
                ...insertionAnalysis.reasoning
            ]
        };
    }

    /**
     * Generate new learning paths based on imported content relationships
     */
    private async generateNewLearningPaths(
        importedModule: ContentModule,
        source: ContentSource
    ): Promise<LearningPathSuggestion[]> {
        const suggestions: LearningPathSuggestion[] = [];

        try {
            // Get related content through relationships
            const relationships = await relationshipStorage.getLinksForContent(importedModule.id);
            const allModules = await storage.getAll('modules') as ContentModule[];

            // Find related modules
            const related_module_ids = relationships.all.map(rel =>
                rel.sourceId === importedModule.id ? rel.targetId : rel.sourceId
            );
            const related_modules = allModules.filter((m: ContentModule) => related_module_ids.includes(m.id));

            if (related_modules.length >= 2) {
                // Create a learning path with imported content and related modules
                const pathModules = [importedModule, ...related_modules]
                    .sort((a, b) => difficultyToRank(a.metadata.difficulty) - difficultyToRank(b.metadata.difficulty));

                const modules: LearningPathModule[] = pathModules.map((module, index) => ({
                    id: module.id,
                    title: module.title,
                    position: index,
                    isImported: module.id === importedModule.id,
                    sourceUrl: module.id === importedModule.id ? source.url : '',
                    estimatedTime: module.metadata.estimatedTime,
                    difficulty: module.metadata.difficulty,
                    tags: module.metadata.tags ?? [],
                    prerequisites: module.metadata.prerequisites ?? []
                }));

                const total_duration = modules.reduce((sum, m) => sum + m.estimatedTime, 0);
                const average_difficulty = modules.reduce((sum, m) => sum + difficultyToRank(m.difficulty), 0) / modules.length;

                suggestions.push({
                    id: `generated-${importedModule.id}`,
                    name: `Learning Path: ${importedModule.title}`,
                    description: `Auto-generated learning path based on imported content and related materials`,
                    modules,
                    totalDuration: total_duration,
                    averageDifficulty: average_difficulty,
                    confidence: 0.7,
                    reasoning: [
                        'Based on automatic relationship detection',
                        `Includes ${related_modules.length} related modules`,
                        'Ordered by difficulty progression'
                    ]
                });
            }

            return suggestions;

        } catch (error) {
            return [];
        }
    }

    /**
     * Analyze learning progression for a specific module
     */
    private async analyzeModuleProgression(
        module: ContentModule,
        completedContent: Set<string>,
        allModules: ContentModule[]
    ): Promise<ProgressionAnalysis> {
        const relationships = await relationshipStorage.getLinksForContent(module.id);
        
        // Find prerequisites and check completion
        const prerequisites = relationships.all
            .filter(rel => rel.type === 'prerequisite' && rel.targetId === module.id)
            .map(rel => rel.sourceId);

        const completed_prereqs = prerequisites.filter(id => completedContent.has(id));
        const current_level = completed_prereqs.length / Math.max(prerequisites.length, 1);

        // Suggest next steps
        const suggested_next = await this.findNextSteps(module, completedContent, allModules);
        const suggested_previous = await this.findPreviousSteps(module, completedContent, allModules);
        const related_topics = this.findRelatedTopics(module, allModules);

        // Identify skill gaps
        const skill_gaps = prerequisites
            .filter(id => !completedContent.has(id))
            .map(id => {
                const prereq_module = allModules.find((m) => m.id === id);
                return prereq_module?.title || 'Unknown prerequisite';
            });

        return {
            contentId: module.id,
            currentLevel: current_level,
            suggestedNext: suggested_next,
            suggestedPrevious: suggested_previous,
            relatedTopics: related_topics,
            skillGaps: skill_gaps
        };
    }

    /**
     * Find next steps in learning progression
     */
    private async findNextSteps(
        module: ContentModule,
        completedContent: Set<string>,
        allModules: ContentModule[]
    ): Promise<PrerequisiteSuggestion[]> {
        const suggestions: PrerequisiteSuggestion[] = [];

        // Find modules that have this module as a prerequisite
        const relationships = await relationshipStorage.getLinksForContent(module.id);
        const next_module_ids = relationships.all
            .filter(rel => rel.type === 'prerequisite' && rel.sourceId === module.id)
            .map(rel => rel.targetId);

        for (const module_id of next_module_ids) {
            if (completedContent.has(module_id)) {continue;}

            const next_module = allModules.find((m) => m.id === module_id);
            if (next_module) {
                suggestions.push({
                    contentId: next_module.id,
                    title: next_module.title,
                    confidence: 0.8,
                    reasoning: ['Direct progression from current module'],
                    difficulty: next_module.metadata.difficulty,
                    estimatedTime: next_module.metadata.estimatedTime,
                    tags: next_module.metadata.tags
                });
            }
        }

        return suggestions;
    }

    /**
     * Find previous steps in learning progression
     */
    private async findPreviousSteps(
        module: ContentModule,
        completedContent: Set<string>,
        allModules: ContentModule[]
    ): Promise<PrerequisiteSuggestion[]> {
        const suggestions: PrerequisiteSuggestion[] = [];

        // Find prerequisite modules that aren't completed
        const relationships = await relationshipStorage.getLinksForContent(module.id);
        const prereq_module_ids = relationships.all
            .filter(rel => rel.type === 'prerequisite' && rel.targetId === module.id)
            .map(rel => rel.sourceId);

        for (const module_id of prereq_module_ids) {
            if (completedContent.has(module_id)) {continue;}

            const prereq_module = allModules.find((m) => m.id === module_id);
            if (prereq_module) {
                suggestions.push({
                    contentId: prereq_module.id,
                    title: prereq_module.title,
                    confidence: 0.9,
                    reasoning: ['Required prerequisite for current module'],
                    difficulty: prereq_module.metadata.difficulty,
                    estimatedTime: prereq_module.metadata.estimatedTime,
                    tags: prereq_module.metadata.tags
                });
            }
        }

        return suggestions;
    }

    /**
     * Find related topics for exploration
     */
    private findRelatedTopics(
        module: ContentModule,
        allModules: ContentModule[]
    ): PrerequisiteSuggestion[] {
        const suggestions: PrerequisiteSuggestion[] = [];

        // Find modules with similar tags and difficulty
        for (const other_module of allModules) {
            if (other_module.id === module.id) {continue;}

            const similarity = this.calculateTopicSimilarity(module, other_module);
            const difficulty_diff = Math.abs(difficultyToRank(module.metadata.difficulty) - difficultyToRank(other_module.metadata.difficulty));

            if (similarity.score > 0.4 && difficulty_diff <= 1) {
                suggestions.push({
                    contentId: other_module.id,
                    title: other_module.title,
                    confidence: similarity.score,
                    reasoning: similarity.reasons,
                    difficulty: other_module.metadata.difficulty,
                    estimatedTime: other_module.metadata.estimatedTime,
                    tags: other_module.metadata.tags
                });
            }
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
    }
}

// Export singleton instance
export const learningPathIntegration = new LearningPathIntegration();