import { describe, it, expect, vi, beforeEach } from 'vitest';
import { relationshipDetectionService } from '../relationshipDetectionService.js';
import { knowledgeBaseIntegrationService } from '../knowledgeBaseIntegrationService.js';
import type { ProcessedDocument, KnowledgeNode } from '../../types/index.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
    }
}));

describe('Knowledge Base Integration', () => {
    let mockDocument: ProcessedDocument;
    let mockNodes: KnowledgeNode[];

    beforeEach(() => {
        mockDocument = {
            id: 'doc-1',
            title: 'Test Document',
            source: {
                type: 'manual',
                importedAt: new Date()
            },
            content: [
                {
                    id: 'block-1',
                    type: 'text',
                    content: 'This is a test document about machine learning and artificial intelligence.',
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        version: 1
                    }
                }
            ],
            metadata: {
                created: new Date(),
                modified: new Date(),
                version: 1,
                keywords: ['machine learning', 'AI', 'artificial intelligence']
            },
            structure: {
                sections: [
                    {
                        id: 'section-1',
                        title: 'Introduction',
                        level: 1,
                        content: [],
                        subsections: []
                    }
                ],
                toc: {
                    items: [
                        {
                            id: 'toc-1',
                            title: 'Introduction',
                            level: 1,
                            children: []
                        }
                    ]
                },
                metadata: {
                    totalSections: 1,
                    maxDepth: 1,
                    hasImages: false,
                    hasCode: false,
                    hasTables: false
                }
            },
            assets: []
        };

        mockNodes = [
            {
                id: 'node-1',
                title: 'Introduction to Machine Learning',
                type: 'article',
                metadata: {
                    description: 'Basic concepts of machine learning',
                    created: new Date(),
                    modified: new Date(),
                    version: 1,
                    tags: ['machine learning', 'basics']
                }
            },
            {
                id: 'node-2',
                title: 'Deep Learning Fundamentals',
                type: 'article',
                metadata: {
                    description: 'Understanding neural networks',
                    created: new Date(),
                    modified: new Date(),
                    version: 1,
                    tags: ['deep learning', 'neural networks']
                }
            }
        ];
    });

    describe('RelationshipDetectionService', () => {
        it('should analyze content relationships', async () => {
            const result = await relationshipDetectionService.analyzeContentRelationships(
                mockDocument,
                mockNodes,
                {
                    minConfidence: 0.1,
                    maxSuggestions: 5,
                    analysisDepth: 'shallow'
                }
            );

            expect(result).toBeDefined();
            expect(result.relationships).toBeInstanceOf(Array);
            expect(result.suggestedConnections).toBeInstanceOf(Array);
            expect(typeof result.confidence).toBe('number');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('should filter relationships by confidence threshold', async () => {
            const result = await relationshipDetectionService.analyzeContentRelationships(
                mockDocument,
                mockNodes,
                {
                    minConfidence: 0.8,
                    maxSuggestions: 5,
                    analysisDepth: 'shallow'
                }
            );

            // With high confidence threshold, we should get fewer relationships
            result.relationships.forEach(rel => {
                expect(rel.confidence).toBeGreaterThanOrEqual(0.8);
            });
        });

        it('should limit suggestions to maxSuggestions', async () => {
            const result = await relationshipDetectionService.analyzeContentRelationships(
                mockDocument,
                mockNodes,
                {
                    minConfidence: 0.1,
                    maxSuggestions: 2,
                    analysisDepth: 'shallow'
                }
            );

            expect(result.suggestedConnections.length).toBeLessThanOrEqual(2);
        });
    });

    describe('KnowledgeBaseIntegrationService', () => {
        it('should integrate document into knowledge base', async () => {
            const result = await knowledgeBaseIntegrationService.integrateDocument(
                mockDocument,
                mockNodes,
                {
                    autoCreateRelationships: true,
                    generateTags: true,
                    extractCategories: true
                }
            );

            expect(result).toBeDefined();
            expect(result.node).toBeDefined();
            expect(result.node.id).toBe(`node_${mockDocument.id}`);
            expect(result.node.title).toBe(mockDocument.title);
            expect(result.node.type).toBe('interactive-content');
            expect(result.relationships).toBeInstanceOf(Array);
            expect(result.suggestions).toBeDefined();
            expect(result.metadata).toBeDefined();
        });

        it('should generate appropriate metadata', async () => {
            const result = await knowledgeBaseIntegrationService.integrateDocument(
                mockDocument,
                mockNodes,
                {
                    generateTags: true,
                    extractCategories: true,
                    assignToCollections: true
                }
            );

            expect(result.node.metadata).toBeDefined();
            expect(result.node.metadata?.description).toBeDefined();
            expect(result.node.metadata?.wordCount).toBeGreaterThan(0);
            expect(result.node.metadata?.readingTime).toBeGreaterThan(0);
            expect(result.node.metadata?.difficulty).toMatch(/beginner|intermediate|advanced/);
            expect(result.node.metadata?.tags).toBeInstanceOf(Array);
            expect(result.node.metadata?.categories).toBeInstanceOf(Array);
        });

        it('should handle documents without relationships', async () => {
            const result = await knowledgeBaseIntegrationService.integrateDocument(
                mockDocument,
                [], // No existing nodes
                {
                    autoCreateRelationships: true
                }
            );

            expect(result).toBeDefined();
            expect(result.node).toBeDefined();
            expect(result.relationships).toHaveLength(0);
            expect(result.suggestions.suggestedConnections).toHaveLength(0);
        });

        it('should respect autoCreateRelationships setting', async () => {
            const resultWithAuto = await knowledgeBaseIntegrationService.integrateDocument(
                mockDocument,
                mockNodes,
                {
                    autoCreateRelationships: true,
                    minRelationshipConfidence: 0.1
                }
            );

            const resultWithoutAuto = await knowledgeBaseIntegrationService.integrateDocument(
                mockDocument,
                mockNodes,
                {
                    autoCreateRelationships: false,
                    minRelationshipConfidence: 0.1
                }
            );

            // When auto-creation is disabled, no relationships should be created
            expect(resultWithoutAuto.relationships).toHaveLength(0);
            // But suggestions should still be available
            expect(resultWithoutAuto.suggestions).toBeDefined();
        });
    });

    describe('Integration Workflow', () => {
        it('should complete full integration workflow', async () => {
            // Step 1: Analyze relationships
            const analysisResult = await relationshipDetectionService.analyzeContentRelationships(
                mockDocument,
                mockNodes,
                {
                    minConfidence: 0.3,
                    maxSuggestions: 10,
                    analysisDepth: 'medium'
                }
            );

            expect(analysisResult).toBeDefined();

            // Step 2: Integrate into knowledge base
            const integrationResult = await knowledgeBaseIntegrationService.integrateDocument(
                mockDocument,
                mockNodes,
                {
                    autoCreateRelationships: true,
                    minRelationshipConfidence: 0.4,
                    generateTags: true,
                    extractCategories: true
                }
            );

            expect(integrationResult).toBeDefined();
            expect(integrationResult.node).toBeDefined();
            expect(integrationResult.metadata.processingTime).toBeGreaterThanOrEqual(0);
            expect(integrationResult.metadata.source).toMatch(/document|url|manual/);
            expect(integrationResult.metadata.autoGeneratedFields).toBeInstanceOf(Array);
        });
    });
});