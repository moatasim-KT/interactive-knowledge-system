/**
 * Interactive Content Transformer Service
 * Converts static content to interactive elements including expandable sections,
 * embedded quizzes, related content suggestions, and enhanced code blocks
 */

import type { ProcessedDocument, ContentBlock, InteractiveContentBlock, InteractiveArticle, InteractivityConfig, InteractiveFeature, ExpandableConfig, ExecutableConfig, ContentEnhancement, InteractiveMetadata, InteractiveStructure, InteractiveSection, InteractiveAsset, ContentLink, DifficultyLevel } from '$lib/types/unified';
import type { Question, QuizState } from '$lib/types/unified';

// Interactive transformation interfaces


// Transformation configuration
export interface TransformationConfig {
    enableExpandableSections: boolean;
    generateQuizzes: boolean;
    enhanceCodeBlocks: boolean;
    findRelatedContent: boolean;
    aiEnhancement: boolean;
    maxQuizzesPerSection: number;
    minSectionLengthForExpansion: number;
    codeExecutionTimeout: number;
    relatedContentThreshold: number;
}

// Default transformation configuration
const DEFAULT_TRANSFORMATION_CONFIG: TransformationConfig = {
    enableExpandableSections: true,
    generateQuizzes: true,
    enhanceCodeBlocks: true,
    findRelatedContent: true,
    aiEnhancement: true,
    maxQuizzesPerSection: 3,
    minSectionLengthForExpansion: 200,
    codeExecutionTimeout: 5000,
    relatedContentThreshold: 0.7
};

/**
 * Interactive Content Transformer class
 */
export class InteractiveTransformer {
    private config: TransformationConfig;
    private knowledgeBase: Map<string, any> = new Map();

    constructor(config: Partial<TransformationConfig> = {}) {
        this.config = { ...DEFAULT_TRANSFORMATION_CONFIG, ...config };
    }

    /**
     * Transform a processed document into an interactive article
     */
    async transformToInteractive(document: ProcessedDocument): Promise<InteractiveArticle> {
        try {
            // Create interactive content blocks
            const interactiveContent = await this.transformContentBlocks(document.content);

            // Build interactive structure
            const interactiveStructure = await this.buildInteractiveStructure(
                document.structure,
                interactiveContent
            );

            // Transform assets to interactive assets
            const interactiveAssets = await this.transformAssets(document.assets);

            // Find and create relationships
            const relationships = await this.findContentRelationships(document, interactiveContent);

            // Create interactive metadata
            const interactiveMetadata = this.createInteractiveMetadata(document);

            return {
                id: this.generateId(),
                title: document.title,
                content: interactiveContent,
                interactiveElements: [],
                metadata: interactiveMetadata,
                structure: interactiveStructure,
                assets: interactiveAssets,
                relationships
            };
        } catch (error) {
            throw new Error(`Interactive transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Transform content blocks to interactive content blocks
     */
    async transformContentBlocks(blocks: ContentBlock[]): Promise<InteractiveContentBlock[]> {
        const interactiveBlocks: InteractiveContentBlock[] = [];

        for (const block of blocks) {
            const interactiveBlock = await this.transformSingleBlock(block);
            interactiveBlocks.push(interactiveBlock);
        }

        return interactiveBlocks;
    }

    /**
     * Transform a single content block to interactive
     */
    private async transformSingleBlock(block: ContentBlock): Promise<InteractiveContentBlock> {
        const interactiveBlock: InteractiveContentBlock = {
            ...block,
            type: 'interactive-content',
            interactivity: await this.determineInteractivity(block),
            enhancements: await this.generateEnhancements(block)
        };

        // Apply specific transformations based on block type
        switch (block.type) {
            case 'text':
                await this.enhanceTextBlock(interactiveBlock);
                break;
            case 'code':
                await this.enhanceCodeBlock(interactiveBlock);
                break;
            case 'image':
                await this.enhanceImageBlock(interactiveBlock);
                break;
            default:
                // Apply basic interactivity
                break;
        }

        return interactiveBlock;
    }

    /**
     * Determine interactivity level and features for a content block
     */
    private async determineInteractivity(block: ContentBlock): Promise<InteractivityConfig> {
        const features: InteractiveFeature[] = [];

        // Determine features based on content type and configuration
        if (block.type === 'text' && this.config.enableExpandableSections) {
            const textLength = this.getTextLength(block.content);
            if (textLength > this.config.minSectionLengthForExpansion) {
                features.push({
                    type: 'expandable',
                    enabled: true,
                    config: {
                        defaultExpanded: false,
                        previewLength: Math.min(150, textLength * 0.3),
                        animationDuration: 300
                    }
                });
            }
        }

        if (block.type === 'code' && this.config.enhanceCodeBlocks) {
            features.push({
                type: 'code-execution',
                enabled: this.isExecutableLanguage(block.content?.language),
                config: {
                    runtime: this.determineRuntime(block.content?.language),
                    timeoutMs: this.config.codeExecutionTimeout
                }
            });
        }

        if (this.config.findRelatedContent) {
            features.push({
                type: 'related-content',
                enabled: true,
                config: {
                    maxSuggestions: 5,
                    threshold: this.config.relatedContentThreshold
                }
            });
        }

        // Determine overall interactivity level
        const level = features.length === 0 ? 'static' :
            features.length <= 2 ? 'basic' : 'advanced';

        return {
            type: 'interactive',
            level: typeof level === 'string' ? 1 : level,
            features,
            parameters: []
        };
    }

    /**
     * Generate content enhancements for a block
     */
    private async generateEnhancements(block: ContentBlock): Promise<ContentEnhancement[]> {
        const enhancements: ContentEnhancement[] = [];

        // Generate quizzes for text blocks
        if (block.type === 'text' && this.config.generateQuizzes) {
            const quizzes = await this.generateQuizzesFromText(block.content?.text || '');
            if (quizzes.length > 0) {
                enhancements.push({
                    type: 'quiz',
                    content: quizzes.slice(0, this.config.maxQuizzesPerSection),
                    position: 'after',
                    generated: true
                });
            }
        }

        // Generate related content suggestions
        if (this.config.findRelatedContent) {
            const relatedContent = await this.findRelatedContent(block);
            if (relatedContent.length > 0) {
                enhancements.push({
                    type: 'related-content',
                    content: relatedContent,
                    position: 'sidebar',
                    generated: true
                });
            }
        }

        // Generate summary for long text blocks
        if (block.type === 'text' && this.config.aiEnhancement) {
            const textLength = this.getTextLength(block.content);
            if (textLength > 500) {
                const summary = await this.generateSummary(block.content?.text || '');
                if (summary) {
                    enhancements.push({
                        type: 'summary',
                        content: { text: summary },
                        position: 'before',
                        generated: true
                    });
                }
            }
        }

        return enhancements;
    }

    /**
     * Enhance text blocks with expandable sections and other features
     */
    private async enhanceTextBlock(block: InteractiveContentBlock): Promise<void> {
        if (!block.interactivity.expandable) { return; }

        const textContent = block.content?.text || '';
        const config = block.interactivity.expandable;

        // Create preview text
        const previewText = this.createPreviewText(textContent, config.previewLength);

        // Update block content with expandable configuration
        block.content = {
            ...block.content,
            preview: previewText,
            fullText: textContent,
            expandable: true,
            defaultExpanded: config.defaultExpanded
        };
    }

    /**
     * Enhance code blocks with syntax highlighting and execution capabilities
     */
    private async enhanceCodeBlock(block: InteractiveContentBlock): Promise<void> {
        const codeContent = block.content?.code || '';
        const language = block.content?.language || 'text';

        // Add syntax highlighting configuration
        block.content = {
            ...block.content,
            syntaxHighlighting: {
                enabled: true,
                theme: 'default',
                lineNumbers: true,
                highlightLines: []
            }
        };

        // Add execution capabilities if supported
        if (block.interactivity.executable) {
            block.content.execution = {
                enabled: true,
                runtime: block.interactivity.executable.runtime,
                allowedLibraries: block.interactivity.executable.allowedLibraries || [],
                timeoutMs: block.interactivity.executable.timeoutMs,
                sandboxed: true
            };

            // Add example outputs or test cases if available
            const examples = await this.generateCodeExamples(codeContent, language);
            if (examples.length > 0) {
                block.content.examples = examples;
            }
        }
    }

    /**
     * Enhance image blocks with interactive features
     */
    private async enhanceImageBlock(block: InteractiveContentBlock): Promise<void> {
        // Add zoom and annotation capabilities
        block.content = {
            ...block.content,
            interactive: {
                zoomable: true,
                annotatable: true,
                overlays: []
            }
        };

        // Generate alt text if missing and AI enhancement is enabled
        if (this.config.aiEnhancement && !block.content?.alt) {
            const altText = await this.generateImageAltText(block.content?.url || '');
            if (altText) {
                block.content.alt = altText;
            }
        }
    }

    /**
     * Generate quizzes from text content
     */
    async generateQuizzesFromText(text: string): Promise<Question[]> {
        const quizzes: Question[] = [];

        // Simple quiz generation based on text analysis
        const sentences = this.extractKeyStatements(text);

        for (const sentence of sentences.slice(0, this.config.maxQuizzesPerSection)) {
            // Generate multiple choice questions
            const question = await this.createMultipleChoiceQuestion(sentence, text);
            if (question) {
                quizzes.push(question);
            }
        }

        return quizzes;
    }

    /**
     * Create expandable sections from content structure
     */
    async createExpandableSections(content: InteractiveContentBlock[]): Promise<InteractiveSection[]> {
        const sections: InteractiveSection[] = [];

        // Group content blocks into logical sections
        const groupedBlocks = this.groupContentBlocks(content);

        for (const group of groupedBlocks) {
            const section: InteractiveSection = {
                id: this.generateId(),
                title: group.title,
                level: group.level,
                content: group.blocks,
                subsections: [],
                expandable: group.blocks.length > 1 || this.getGroupTextLength(group) > this.config.minSectionLengthForExpansion,
                estimatedTime: this.estimateReadingTime(group.blocks),
                prerequisites: []
            };

            sections.push(section);
        }

        return sections;
    }

    /**
     * Generate related content suggestions
     */
    async generateRelatedContentSuggestions(content: InteractiveContentBlock[]): Promise<ContentLink[]> {
        const relationships: ContentLink[] = [];

        for (const block of content) {
            const related = await this.findRelatedContent(block);

            for (const relatedItem of related) {
                relationships.push({
                    id: this.generateId(),
                    sourceId: '',
                    targetId: relatedItem.id,
                    type: 'related',
                    strength: relatedItem.similarity,
                    metadata: {
                        created: new Date(),
                        createdBy: 'interactive-transformer',
                        description: relatedItem.reason,
                        automatic: true
                    }
                });
            }
        }

        return relationships;
    }

    /**
     * Build AI-powered content enhancement integration
     */
    async enhanceWithAI(content: InteractiveContentBlock[]): Promise<InteractiveContentBlock[]> {
        if (!this.config.aiEnhancement) { return content; }

        const enhancedContent: InteractiveContentBlock[] = [];

        for (const block of content) {
            const enhanced = await this.applyAIEnhancements(block);
            enhancedContent.push(enhanced);
        }

        return enhancedContent;
    }

    // Private helper methods
    private async buildInteractiveStructure(
        originalStructure: any,
        content: InteractiveContentBlock[]
    ): Promise<InteractiveStructure> {
        const sections = await this.createExpandableSections(content);

        return {
            sections,
            navigation: {
                showTableOfContents: true,
                showProgressBar: true,
                enableKeyboardNavigation: true,
                breadcrumbs: true
            },
            progressTracking: {
                trackReadingProgress: true,
                trackInteractionProgress: true,
                saveBookmarks: true,
                estimateCompletionTime: true
            }
        };
    }

    private async transformAssets(assets: any[]): Promise<InteractiveAsset[]> {
        return assets.map(asset => ({
            id: asset.id,
            type: asset.type,
            url: asset.url,
            interactivity: {
                zoomable: asset.type === 'image',
                annotatable: true,
                clickable: true,
                overlays: []
            },
            metadata: asset.metadata || {}
        }));
    }

    private async findContentRelationships(
        document: ProcessedDocument,
        content: InteractiveContentBlock[]
    ): Promise<ContentLink[]> {
        const relationships: ContentLink[] = [];

        // Find relationships based on content similarity and references
        for (const block of content) {
            const related = await this.findRelatedContent(block);

            for (const relatedItem of related) {
                if (relatedItem.similarity >= this.config.relatedContentThreshold) {
                    relationships.push({
                        id: this.generateId(),
                        sourceId: document.id,
                        targetId: relatedItem.id,
                        type: 'related',
                        strength: relatedItem.similarity,
                        metadata: {
                            created: new Date(),
                            createdBy: 'interactive-transformer',
                            description: `Related content based on ${relatedItem.reason}`,
                            automatic: true
                        }
                    });
                }
            }
        }

        return relationships;
    }

    private createInteractiveMetadata(document: ProcessedDocument): InteractiveMetadata {
        return {
            originalDocument: document.id,
            transformationDate: new Date(),
            interactivityLevel: this.calculateInteractivityLevel(document),
            estimatedReadingTime: this.estimateDocumentReadingTime(document),
            difficultyLevel: (() => {
                const level = this.assessDifficultyLevel(document);
                return level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3;
            })(),
            completionTracking: true,
            aiEnhanced: this.config.aiEnhancement
        };
    }

    private getTextLength(content: any): number {
        if (typeof content === 'string') { return content.length; }
        if (content?.text) { return content.text.length; }
        return 0;
    }

    private isExecutableLanguage(language?: string): boolean {
        const executableLanguages = ['javascript', 'typescript', 'python', 'sql', 'html', 'css'];
        return language ? executableLanguages.includes(language.toLowerCase()) : false;
    }

    private determineRuntime(language?: string): 'browser' | 'server' | 'sandbox' {
        if (!language) { return 'sandbox'; }

        const browserLanguages = ['javascript', 'typescript', 'html', 'css'];
        const serverLanguages = ['python', 'sql'];

        if (browserLanguages.includes(language.toLowerCase())) { return 'browser'; }
        if (serverLanguages.includes(language.toLowerCase())) { return 'server'; }
        return 'sandbox';
    }

    private createPreviewText(text: string, previewLength: number): string {
        if (text.length <= previewLength) { return text; }

        const preview = text.substring(0, previewLength);
        const lastSpace = preview.lastIndexOf(' ');

        return lastSpace > previewLength * 0.8 ?
            preview.substring(0, lastSpace) + '...' :
            preview + '...';
    }

    private extractKeyStatements(text: string): string[] {
        // Simple extraction of sentences that might make good quiz questions
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);

        // Filter for statements that contain key information
        return sentences.filter(sentence => {
            const words = sentence.toLowerCase();
            return words.includes('is') || words.includes('are') ||
                words.includes('can') || words.includes('will') ||
                words.includes('must') || words.includes('should');
        });
    }

    private async createMultipleChoiceQuestion(statement: string, context: string): Promise<Question | null> {
        // Simple question generation - in a real implementation, this would use AI
        const words = statement.trim().split(' ');
        if (words.length < 5) { return null; }

        // Create a simple fill-in-the-blank style question
        const keyWordIndex = Math.floor(words.length / 2);
        const keyWord = words[keyWordIndex];

        const questionText = words.map((word, index) =>
            index === keyWordIndex ? '____' : word
        ).join(' ');

        // Generate some plausible wrong answers
        const options = [
            keyWord,
            this.generateDistractor(keyWord, context),
            this.generateDistractor(keyWord, context),
            this.generateDistractor(keyWord, context)
        ].filter(Boolean);

        if (options.length < 4) { return null; }

        // Shuffle options
        const shuffledOptions = this.shuffleArray([...options]);

        return {
            id: this.generateId(),
            type: 'multiple-choice',
            text: questionText + '?',
            question: questionText + '?',
            options: shuffledOptions,
            correctAnswer: keyWord,
            explanation: `The correct answer is "${keyWord}" based on the context provided.`,
            difficulty: 'medium'
        };
    }

    private generateDistractor(correctAnswer: string, context: string): string {
        // Simple distractor generation - in a real implementation, this would be more sophisticated
        const words = context.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const candidates = words.filter(w => w !== correctAnswer.toLowerCase() && w.length >= correctAnswer.length - 2);

        return candidates[Math.floor(Math.random() * candidates.length)] || 'alternative';
    }

    private async findRelatedContent(block: ContentBlock): Promise<Array<{ id: string; similarity: number; reason: string }>> {
        // Placeholder for content similarity search
        // In a real implementation, this would search the knowledge base
        return [];
    }

    private async generateSummary(text: string): Promise<string | null> {
        // Placeholder for AI-powered summary generation
        if (text.length < 200) { return null; }

        // Simple extractive summary - take first and last sentences
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentences.length < 3) { return null; }

        return `${sentences[0].trim()}. ${sentences[sentences.length - 1].trim()}.`;
    }

    private async generateCodeExamples(code: string, language: string): Promise<Array<{ input: string; output: string }>> {
        // Placeholder for code example generation
        return [];
    }

    private async generateImageAltText(imageUrl: string): Promise<string | null> {
        // Placeholder for AI-powered image description
        return null;
    }

    private groupContentBlocks(blocks: InteractiveContentBlock[]): Array<{ title: string; level: number; blocks: InteractiveContentBlock[] }> {
        // Simple grouping logic - in a real implementation, this would be more sophisticated
        const groups: Array<{ title: string; level: number; blocks: InteractiveContentBlock[] }> = [];
        let currentGroup: InteractiveContentBlock[] = [];
        let groupTitle = 'Section';
        let groupLevel = 1;

        for (const block of blocks) {
            if (block.type === 'interactive-content' && block.content?.section) {
                // Start new group
                if (currentGroup.length > 0) {
                    groups.push({
                        title: groupTitle,
                        level: groupLevel,
                        blocks: [...currentGroup]
                    });
                }
                currentGroup = [block];
                groupTitle = block.content.section;
                groupLevel = 1;
            } else {
                currentGroup.push(block);
            }
        }

        // Add final group
        if (currentGroup.length > 0) {
            groups.push({
                title: groupTitle,
                level: groupLevel,
                blocks: currentGroup
            });
        }

        return groups;
    }

    private getGroupTextLength(group: { blocks: InteractiveContentBlock[] }): number {
        return group.blocks.reduce((total, block) => total + this.getTextLength(block.content), 0);
    }

    private estimateReadingTime(blocks: InteractiveContentBlock[]): number {
        const totalWords = blocks.reduce((total, block) => {
            const textLength = this.getTextLength(block.content);
            return total + Math.ceil(textLength / 5); // Rough word count estimation
        }, 0);

        return Math.ceil(totalWords / 200); // 200 words per minute reading speed
    }

    private async applyAIEnhancements(block: InteractiveContentBlock): Promise<InteractiveContentBlock> {
        // Placeholder for AI enhancement application
        return block;
    }

    private calculateInteractivityLevel(document: ProcessedDocument): number {
        // Calculate interactivity level based on features enabled
        let level = 0;

        if (this.config.enableExpandableSections) { level += 2; }
        if (this.config.generateQuizzes) { level += 3; }
        if (this.config.enhanceCodeBlocks) { level += 2; }
        if (this.config.findRelatedContent) { level += 1; }
        if (this.config.aiEnhancement) { level += 2; }

        return Math.min(level, 10);
    }

    private estimateDocumentReadingTime(document: ProcessedDocument): number {
        const wordCount = document.metadata.wordCount || 0;
        return Math.ceil(wordCount / 200); // 200 words per minute
    }

    private assessDifficultyLevel(document: ProcessedDocument): DifficultyLevel {
        // Simple difficulty assessment based on content characteristics
        let score = 1;

        if (document.structure.metadata.hasCodeBlocks) { score += 2; }
        if (document.structure.metadata.maxDepth > 3) { score += 1; }
        if (document.metadata.wordCount > 2000) { score += 1; }

        const clamped = Math.min(score, 5);
        // Map numeric score to string level
        if (clamped <= 2) { return 'beginner'; }
        if (clamped <= 3) { return 'intermediate'; }
        return 'advanced';
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    private generateId(): string {
        return `interactive_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

// Export utility functions for external use
export const transformationUtils = {
    createExpandableSection: (content: string, previewLength: number = 150) => {
        return {
            preview: content.length > previewLength ?
                content.substring(0, previewLength) + '...' : content,
            fullContent: content,
            expanded: false
        };
    },

    generateQuizFromText: async (text: string): Promise<Question[]> => {
        const transformer = new InteractiveTransformer();
        return transformer.generateQuizzesFromText(text);
    },

    enhanceCodeBlock: (code: string, language: string) => {
        return {
            code,
            language,
            syntaxHighlighting: true,
            executable: ['javascript', 'typescript', 'python'].includes(language.toLowerCase()),
            lineNumbers: true
        };
    }
};