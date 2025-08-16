import type { ProcessedDocument, KnowledgeNode, ContentRelationship, RelationshipStrength } from '$lib/types/unified';
import { logger } from '../utils/logger.js';

export interface RelationshipDetectionResult {
    relationships: ContentRelationship[];
    confidence: number;
    suggestedConnections: SuggestedConnection[];
}

export interface SuggestedConnection {
    targetNodeId: string;
    relationshipType: string;
    strength: RelationshipStrength;
    confidence: number;
    reason: string;
}

export interface RelationshipDetectionOptions {
    minConfidence?: number;
    maxSuggestions?: number;
    includeWeakConnections?: boolean;
    analysisDepth?: 'shallow' | 'medium' | 'deep';
}

/**
 * Service for detecting relationships between content and existing knowledge base nodes
 */
export class RelationshipDetectionService {
    private readonly defaultOptions: Required<RelationshipDetectionOptions> = {
        minConfidence: 0.3,
        maxSuggestions: 10,
        includeWeakConnections: false,
        analysisDepth: 'medium'
    };

    /**
     * Analyze content for relationships with existing nodes
     */
    async analyzeContentRelationships(
        document: ProcessedDocument,
        existingNodes: KnowledgeNode[],
        options: RelationshipDetectionOptions = {}
    ): Promise<RelationshipDetectionResult> {
        const opts = { ...this.defaultOptions, ...options };

        try {
            logger.info('Starting relationship analysis', {
                documentId: document.id,
                nodeCount: existingNodes.length
            });

            const relationships = await this.detectRelationships(document, existingNodes, opts);
            const suggestedConnections = await this.generateSuggestions(document, existingNodes, opts);

            const result: RelationshipDetectionResult = {
                relationships: relationships.filter(r => r.confidence >= opts.minConfidence),
                confidence: this.calculateOverallConfidence(relationships),
                suggestedConnections: suggestedConnections
                    .filter(s => s.confidence >= opts.minConfidence)
                    .slice(0, opts.maxSuggestions)
            };

            logger.info('Relationship analysis completed', {
                relationshipsFound: result.relationships.length,
                suggestionsGenerated: result.suggestedConnections.length,
                overallConfidence: result.confidence
            });

            return result;
        } catch (error) {
            logger.error('Failed to analyze content relationships', { error, documentId: document.id });
            throw new Error(`Relationship analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Detect direct relationships between document content and existing nodes
     */
    private async detectRelationships(
        document: ProcessedDocument,
        existingNodes: KnowledgeNode[],
        options: Required<RelationshipDetectionOptions>
    ): Promise<ContentRelationship[]> {
        const relationships: ContentRelationship[] = [];

        for (const node of existingNodes) {
            const relationship = await this.analyzeNodeRelationship(document, node, options);
            if (relationship && relationship.confidence >= options.minConfidence) {
                relationships.push(relationship);
            }
        }

        return relationships.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Analyze relationship between document and a specific node
     */
    private async analyzeNodeRelationship(
        document: ProcessedDocument,
        node: KnowledgeNode,
        options: Required<RelationshipDetectionOptions>
    ): Promise<ContentRelationship | null> {
        const similarities = await this.calculateSimilarities(document, node, options.analysisDepth);

        if (similarities.overall < options.minConfidence) {
            return null;
        }

        const relationshipType = this.determineRelationshipType(similarities);
        const strength = this.calculateRelationshipStrength(similarities);

        return {
            id: `rel_${document.id}_${node.id}_${Date.now()}`,
            sourceId: document.id,
            targetId: node.id,
            type: relationshipType,
            strength,
            confidence: similarities.overall,
            metadata: {
                created: new Date(),
                detectionMethod: 'automatic',
                similarities,
                analysisDepth: options.analysisDepth
            }
        };
    }

    /**
     * Calculate various similarity metrics between document and node
     */
    private async calculateSimilarities(
        document: ProcessedDocument,
        node: KnowledgeNode,
        depth: 'shallow' | 'medium' | 'deep'
    ): Promise<SimilarityMetrics> {
        const documentText = this.extractTextContent(document);
        const nodeText = this.extractNodeText(node);

        const titleSimilarity = this.calculateTextSimilarity(document.title, node.title);
        const contentSimilarity = this.calculateTextSimilarity(documentText, nodeText);
        const keywordSimilarity = await this.calculateKeywordSimilarity(document, node);

        let semanticSimilarity = 0;
        let topicSimilarity = 0;

        if (depth === 'medium' || depth === 'deep') {
            semanticSimilarity = await this.calculateSemanticSimilarity(documentText, nodeText);
        }

        if (depth === 'deep') {
            topicSimilarity = await this.calculateTopicSimilarity(document, node);
        }

        const overall = this.calculateOverallSimilarity({
            title: titleSimilarity,
            content: contentSimilarity,
            keywords: keywordSimilarity,
            semantic: semanticSimilarity,
            topics: topicSimilarity
        });

        return {
            title: titleSimilarity,
            content: contentSimilarity,
            keywords: keywordSimilarity,
            semantic: semanticSimilarity,
            topics: topicSimilarity,
            overall
        };
    }

    /**
     * Extract text content from processed document
     */
    private extractTextContent(document: ProcessedDocument): string {
        return document.content
            .filter(block => block.type === 'text')
            .map(block => typeof block.content === 'string' ? block.content : '')
            .join(' ');
    }

    /**
     * Extract text content from knowledge node
     */
    private extractNodeText(node: KnowledgeNode): string {
        // This would depend on the actual structure of KnowledgeNode
        // For now, return title and any available content
        return `${node.title} ${node.metadata?.description || ''}`;
    }

    /**
     * Calculate text similarity using simple string matching
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        if (!text1 || !text2) {return 0;}

        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));

        const intersection = new Set([...words1].filter(word => words2.has(word)));
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * Calculate keyword-based similarity
     */
    private async calculateKeywordSimilarity(
        document: ProcessedDocument,
        node: KnowledgeNode
    ): Promise<number> {
        const docKeywords = this.extractKeywords(document);
        const nodeKeywords = this.extractNodeKeywords(node);

        if (docKeywords.length === 0 || nodeKeywords.length === 0) {return 0;}

        const commonKeywords = docKeywords.filter(keyword =>
            nodeKeywords.some(nodeKeyword =>
                nodeKeyword.toLowerCase().includes(keyword.toLowerCase()) ||
                keyword.toLowerCase().includes(nodeKeyword.toLowerCase())
            )
        );

        return commonKeywords.length / Math.max(docKeywords.length, nodeKeywords.length);
    }

    /**
     * Extract keywords from document
     */
    private extractKeywords(document: ProcessedDocument): string[] {
        const text = this.extractTextContent(document);
        const words = text.toLowerCase().split(/\s+/);

        // Simple keyword extraction - in a real implementation, you'd use NLP libraries
        const wordFreq = new Map<string, number>();
        words.forEach(word => {
            if (word.length > 3) { // Filter out short words
                wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
            }
        });

        return Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    }

    /**
     * Extract keywords from knowledge node
     */
    private extractNodeKeywords(node: KnowledgeNode): string[] {
        const text = this.extractNodeText(node);
        return this.extractKeywords({
            id: node.id,
            title: node.title,
            content: [{ id: '1', type: 'text', content: text, metadata: { created: new Date(), modified: new Date(), version: 1 } }],
            metadata: { created: new Date(), modified: new Date(), version: 1 },
            structure: { sections: [], toc: { items: [] }, metadata: { totalSections: 0, maxDepth: 0, hasImages: false, hasCode: false, hasTables: false } },
            assets: [],
            source: { type: 'text' }
        });
    }

    /**
     * Calculate semantic similarity (placeholder for more advanced NLP)
     */
    private async calculateSemanticSimilarity(text1: string, text2: string): Promise<number> {
        // Placeholder for semantic similarity calculation
        // In a real implementation, you'd use embeddings or semantic analysis
        return this.calculateTextSimilarity(text1, text2) * 0.8;
    }

    /**
     * Calculate topic-based similarity
     */
    private async calculateTopicSimilarity(
        document: ProcessedDocument,
        node: KnowledgeNode
    ): Promise<number> {
        // Placeholder for topic modeling similarity
        // In a real implementation, you'd use topic modeling algorithms
        return 0.5;
    }

    /**
     * Calculate overall similarity from individual metrics
     */
    private calculateOverallSimilarity(similarities: Omit<SimilarityMetrics, 'overall'>): number {
        const weights = {
            title: 0.3,
            content: 0.25,
            keywords: 0.25,
            semantic: 0.15,
            topics: 0.05
        };

        return (
            similarities.title * weights.title +
            similarities.content * weights.content +
            similarities.keywords * weights.keywords +
            similarities.semantic * weights.semantic +
            similarities.topics * weights.topics
        );
    }

    /**
     * Determine relationship type based on similarities
     */
    private determineRelationshipType(similarities: SimilarityMetrics): string {
        if (similarities.title > 0.7) {return 'duplicate';}
        if (similarities.content > 0.6) {return 'similar';}
        if (similarities.keywords > 0.5) {return 'related';}
        if (similarities.semantic > 0.4) {return 'conceptual';}
        return 'weak';
    }

    /**
     * Calculate relationship strength from similarities
     */
    private calculateRelationshipStrength(similarities: SimilarityMetrics): RelationshipStrength {
        if (similarities.overall > 0.8) {return 'strong';}
        if (similarities.overall > 0.5) {return 'medium';}
        if (similarities.overall > 0.3) {return 'weak';}
        return 'very-weak';
    }

    /**
     * Generate relationship suggestions
     */
    private async generateSuggestions(
        document: ProcessedDocument,
        existingNodes: KnowledgeNode[],
        options: Required<RelationshipDetectionOptions>
    ): Promise<SuggestedConnection[]> {
        const suggestions: SuggestedConnection[] = [];

        for (const node of existingNodes) {
            const similarities = await this.calculateSimilarities(document, node, options.analysisDepth);

            if (similarities.overall >= options.minConfidence) {
                const suggestion: SuggestedConnection = {
                    targetNodeId: node.id,
                    relationshipType: this.determineRelationshipType(similarities),
                    strength: this.calculateRelationshipStrength(similarities),
                    confidence: similarities.overall,
                    reason: this.generateSuggestionReason(similarities)
                };

                suggestions.push(suggestion);
            }
        }

        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Generate human-readable reason for suggestion
     */
    private generateSuggestionReason(similarities: SimilarityMetrics): string {
        const reasons: string[] = [];

        if (similarities.title > 0.5) {reasons.push('similar titles');}
        if (similarities.content > 0.4) {reasons.push('overlapping content');}
        if (similarities.keywords > 0.4) {reasons.push('shared keywords');}
        if (similarities.semantic > 0.3) {reasons.push('semantic similarity');}

        return reasons.length > 0 ? reasons.join(', ') : 'general similarity';
    }

    /**
     * Calculate overall confidence for the analysis
     */
    private calculateOverallConfidence(relationships: ContentRelationship[]): number {
        if (relationships.length === 0) {return 0;}

        const avgConfidence = relationships.reduce((sum, rel) => sum + rel.confidence, 0) / relationships.length;
        const confidenceBoost = Math.min(relationships.length / 10, 0.2); // Boost for having more relationships

        return Math.min(avgConfidence + confidenceBoost, 1);
    }
}

interface SimilarityMetrics {
    title: number;
    content: number;
    keywords: number;
    semantic: number;
    topics: number;
    overall: number;
}

export const relationshipDetectionService = new RelationshipDetectionService();