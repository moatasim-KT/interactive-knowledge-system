/**
 * Tests for Interactive Content Transformer Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InteractiveTransformer, transformationUtils } from '../interactiveTransformer.js';
import type { ContentBlock } from '../../types/content.js';
import type { ProcessedDocument } from '../../types/content.js';

describe('InteractiveTransformer', () => {
    let transformer: InteractiveTransformer;
    let mockDocument: ProcessedDocument;

    beforeEach(() => {
        transformer = new InteractiveTransformer();

        mockDocument = {
            id: 'test-doc-1',
            title: 'Test Document',
            source: {
                type: 'manual',
                importedAt: new Date()
            },
            content: [
                {
                    id: 'block-1',
                    type: 'text',
                    content: {
                        text: 'This is a long text block that should be made expandable because it contains more than 200 characters. It has multiple sentences and provides detailed information about a topic that users might want to explore in depth.',
                        format: 'markdown'
                    },
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        version: 1
                    }
                },
                {
                    id: 'block-2',
                    type: 'code',
                    content: {
                        code: 'console.log("Hello, World!");',
                        language: 'javascript',
                        executable: true
                    },
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        version: 1
                    }
                }
            ],
            metadata: {
                originalFormat: 'markdown' as const,
                title: 'Test Document',
                created: new Date(),
                modified: new Date(),
                wordCount: 50,
                tags: ['test'],
                extractionMethod: 'test',
                confidence: 1.0
            },
            structure: {
                sections: [],
                toc: { entries: [] },
                metadata: {
                    maxDepth: 1,
                    sectionCount: 1,
                    hasImages: false,
                    hasCodeBlocks: true,
                    hasTables: false
                }
            },
            assets: []
        };
    });

    describe('transformToInteractive', () => {
        it('should transform a document to interactive article', async () => {
            const result = await transformer.transformToInteractive(mockDocument);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.title).toBe(mockDocument.title);
            expect(result.content).toHaveLength(2);
            expect(result.metadata.originalDocument).toBe(mockDocument.id);
            expect(result.metadata.transformationDate).toBeInstanceOf(Date);
        });

        it('should create interactive content blocks with interactivity config', async () => {
            const result = await transformer.transformToInteractive(mockDocument);

            const textBlock = result.content.find(block => block.type === 'text');
            const codeBlock = result.content.find(block => block.type === 'code');

            expect(textBlock?.interactivity).toBeDefined();
            expect(textBlock?.interactivity.level).toBe('basic');
            expect(textBlock?.interactivity.features).toContainEqual(
                expect.objectContaining({ type: 'expandable', enabled: true })
            );

            expect(codeBlock?.interactivity).toBeDefined();
            expect(codeBlock?.interactivity.features).toContainEqual(
                expect.objectContaining({ type: 'code-execution', enabled: true })
            );
        });

        it('should generate enhancements for content blocks', async () => {
            const result = await transformer.transformToInteractive(mockDocument);

            const textBlock = result.content.find(block => block.type === 'text');
            expect(textBlock?.enhancements).toBeDefined();
            expect(textBlock?.enhancements.length).toBeGreaterThan(0);
        });
    });

    describe('transformContentBlocks', () => {
        it('should transform all content blocks to interactive blocks', async () => {
            const result = await transformer.transformContentBlocks(mockDocument.content);

            expect(result).toHaveLength(2);
            result.forEach(block => {
                expect(block.interactivity).toBeDefined();
                expect(block.enhancements).toBeDefined();
            });
        });

        it('should preserve original block properties', async () => {
            const result = await transformer.transformContentBlocks(mockDocument.content);

            expect(result[0].id).toBe(mockDocument.content[0].id);
            expect(result[0].type).toBe(mockDocument.content[0].type);
            expect(result[0].content).toEqual(expect.objectContaining(mockDocument.content[0].content));
        });
    });

    describe('generateQuizzesFromText', () => {
        it('should generate quizzes from text content', async () => {
            const text = 'JavaScript is a programming language. It can run in browsers. Variables are declared with let or const.';
            const quizzes = await transformer.generateQuizzesFromText(text);

            expect(quizzes).toBeDefined();
            expect(Array.isArray(quizzes)).toBe(true);

            if (quizzes.length > 0) {
                expect(quizzes[0]).toHaveProperty('id');
                expect(quizzes[0]).toHaveProperty('type');
                expect(quizzes[0]).toHaveProperty('question');
                expect(quizzes[0]).toHaveProperty('correctAnswer');
            }
        });

        it('should limit number of quizzes based on configuration', async () => {
            const customTransformer = new InteractiveTransformer({ maxQuizzesPerSection: 2 });
            const longText = 'Statement one is true. Statement two is correct. Statement three is valid. Statement four is accurate. Statement five is right.';

            const quizzes = await customTransformer.generateQuizzesFromText(longText);
            expect(quizzes.length).toBeLessThanOrEqual(2);
        });
    });

    describe('createExpandableSections', () => {
        it('should create expandable sections from content blocks', async () => {
            const interactiveBlocks = await transformer.transformContentBlocks(mockDocument.content);
            const sections = await transformer.createExpandableSections(interactiveBlocks);

            expect(sections).toBeDefined();
            expect(Array.isArray(sections)).toBe(true);

            if (sections.length > 0) {
                expect(sections[0]).toHaveProperty('id');
                expect(sections[0]).toHaveProperty('title');
                expect(sections[0]).toHaveProperty('expandable');
                expect(sections[0]).toHaveProperty('estimatedTime');
            }
        });
    });

    describe('generateRelatedContentSuggestions', () => {
        it('should generate related content suggestions', async () => {
            const interactiveBlocks = await transformer.transformContentBlocks(mockDocument.content);
            const relationships = await transformer.generateRelatedContentSuggestions(interactiveBlocks);

            expect(relationships).toBeDefined();
            expect(Array.isArray(relationships)).toBe(true);
        });
    });

    describe('enhanceWithAI', () => {
        it('should enhance content with AI when enabled', async () => {
            const aiTransformer = new InteractiveTransformer({ aiEnhancement: true });
            const interactiveBlocks = await aiTransformer.transformContentBlocks(mockDocument.content);
            const enhanced = await aiTransformer.enhanceWithAI(interactiveBlocks);

            expect(enhanced).toBeDefined();
            expect(enhanced.length).toBe(interactiveBlocks.length);
        });

        it('should return original content when AI enhancement is disabled', async () => {
            const noAiTransformer = new InteractiveTransformer({ aiEnhancement: false });
            const interactiveBlocks = await noAiTransformer.transformContentBlocks(mockDocument.content);
            const enhanced = await noAiTransformer.enhanceWithAI(interactiveBlocks);

            expect(enhanced).toEqual(interactiveBlocks);
        });
    });

    describe('configuration options', () => {
        it('should respect expandable sections configuration', async () => {
            const noExpandableTransformer = new InteractiveTransformer({ enableExpandableSections: false });
            const result = await noExpandableTransformer.transformContentBlocks(mockDocument.content);

            const textBlock = result.find(block => block.type === 'text');
            const hasExpandableFeature = textBlock?.interactivity.features.some(f => f.type === 'expandable');
            expect(hasExpandableFeature).toBe(false);
        });

        it('should respect quiz generation configuration', async () => {
            const noQuizTransformer = new InteractiveTransformer({ generateQuizzes: false });
            const result = await noQuizTransformer.transformContentBlocks(mockDocument.content);

            const textBlock = result.find(block => block.type === 'text');
            const hasQuizEnhancement = textBlock?.enhancements.some(e => e.type === 'quiz');
            expect(hasQuizEnhancement).toBe(false);
        });

        it('should respect code enhancement configuration', async () => {
            const noCodeTransformer = new InteractiveTransformer({ enhanceCodeBlocks: false });
            const result = await noCodeTransformer.transformContentBlocks(mockDocument.content);

            const codeBlock = result.find(block => block.type === 'code');
            const hasCodeExecutionFeature = codeBlock?.interactivity.features.some(f => f.type === 'code-execution');
            expect(hasCodeExecutionFeature).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should handle empty content gracefully', async () => {
            const emptyDocument = { ...mockDocument, content: [] };
            const result = await transformer.transformToInteractive(emptyDocument);

            expect(result).toBeDefined();
            expect(result.content).toHaveLength(0);
        });

        it('should handle malformed content blocks', async () => {
            const malformedBlocks: ContentBlock[] = [
                {
                    id: 'malformed',
                    type: 'text',
                    content: null,
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        version: 1
                    }
                }
            ];

            const result = await transformer.transformContentBlocks(malformedBlocks);
            expect(result).toHaveLength(1);
            expect(result[0].interactivity).toBeDefined();
        });

        it('should throw error for transformation failures', async () => {
            const invalidDocument = null as any;

            await expect(transformer.transformToInteractive(invalidDocument))
                .rejects.toThrow('Interactive transformation failed');
        });
    });
});

describe('transformationUtils', () => {
    describe('createExpandableSection', () => {
        it('should create expandable section with preview', () => {
            const longContent = 'This is a very long content that should be truncated in the preview and show the full content when expanded.';
            const result = transformationUtils.createExpandableSection(longContent, 50);

            expect(result.preview).toHaveLength(53); // 50 + '...'
            expect(result.fullContent).toBe(longContent);
            expect(result.expanded).toBe(false);
        });

        it('should not truncate short content', () => {
            const shortContent = 'Short content';
            const result = transformationUtils.createExpandableSection(shortContent, 50);

            expect(result.preview).toBe(shortContent);
            expect(result.fullContent).toBe(shortContent);
        });
    });

    describe('generateQuizFromText', () => {
        it('should generate quiz from text', async () => {
            const text = 'JavaScript is a programming language used for web development.';
            const quizzes = await transformationUtils.generateQuizFromText(text);

            expect(Array.isArray(quizzes)).toBe(true);
        });
    });

    describe('enhanceCodeBlock', () => {
        it('should enhance code block with syntax highlighting', () => {
            const code = 'console.log("Hello");';
            const language = 'javascript';
            const result = transformationUtils.enhanceCodeBlock(code, language);

            expect(result.code).toBe(code);
            expect(result.language).toBe(language);
            expect(result.syntaxHighlighting).toBe(true);
            expect(result.executable).toBe(true);
            expect(result.lineNumbers).toBe(true);
        });

        it('should mark non-executable languages correctly', () => {
            const result = transformationUtils.enhanceCodeBlock('SELECT * FROM users;', 'sql');
            expect(result.executable).toBe(false);
        });
    });
});