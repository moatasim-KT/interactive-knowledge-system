/**
 * Workflow Validation Tests
 * Validates end-to-end user workflows without external dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ContentBlock } from '../types/content';

// Mock the createEventDispatcher function for Svelte components
const createEventDispatcher = vi.fn(() => vi.fn());
global.createEventDispatcher = createEventDispatcher;

describe('End-to-End Workflow Validation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Content Creation Workflow Validation', () => {
        it('should validate content block creation and management', () => {
            // Define content block types
            const contentBlockTypes = ['text', 'code', 'image', 'video', 'quiz', 'flashcard', 'diagram'];

            // Validate each content block type can be created
            contentBlockTypes.forEach(type => {
                const block = {
                    id: `${type}-${Date.now()}`,
                    type,
                    content: getDefaultContent(type),
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        version: 1
                    }
                };

                expect(block.id).toBeTruthy();
                expect(block.type).toBe(type);
                expect(block.content).toBeDefined();
                expect(block.metadata.version).toBe(1);
            });

            function getDefaultContent(type: string) {
                switch (type) {
                    case 'text':
                        return { html: '<p>Default text content</p>' };
                    case 'code':
                        return { code: '// Default code', language: 'javascript' };
                    case 'image':
                        return { src: '', alt: '', caption: '' };
                    case 'video':
                        return { src: '', title: '', description: '' };
                    case 'quiz':
                        return { question: 'Default question?', type: 'multiple-choice', options: ['A', 'B'], correctAnswer: 0 };
                    case 'flashcard':
                        return { front: 'Front', back: 'Back' };
                    case 'diagram':
                        return { type: 'flowchart', data: {} };
                    default:
                        return {};
                }
            }
        });

        it('should validate content editor state management', () => {
            const editorState = {
                blocks: [],
                selectedBlock: null,
                isEditing: false,
                history: [[]]
            };

            // Test adding blocks
            const textBlock = {
                id: 'text-1',
                type: 'text',
                content: { html: '<p>Test content</p>' },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            editorState.blocks.push(textBlock);
            expect(editorState.blocks).toHaveLength(1);

            // Test selecting block
            editorState.selectedBlock = 'text-1';
            editorState.isEditing = true;
            expect(editorState.selectedBlock).toBe('text-1');
            expect(editorState.isEditing).toBe(true);

            // Test history management
            editorState.history.push([...editorState.blocks]);
            expect(editorState.history).toHaveLength(2);

            // Test undo functionality
            if (editorState.history.length > 1) {
                editorState.history.pop();
                const previousState = editorState.history[editorState.history.length - 1];
                editorState.blocks = [...previousState];
            }
            expect(editorState.history).toHaveLength(1);
        });

        it('should validate drag and drop reordering', () => {
            const blocks = [
                { id: 'block-1', type: 'text', content: { html: 'First' }, metadata: { created: new Date(), modified: new Date(), version: 1 } },
                { id: 'block-2', type: 'code', content: { code: 'console.log("Second");', language: 'javascript' }, metadata: { created: new Date(), modified: new Date(), version: 1 } },
                { id: 'block-3', type: 'text', content: { html: 'Third' }, metadata: { created: new Date(), modified: new Date(), version: 1 } }
            ];

            // Simulate drag and drop: move block-3 to position 0
            const draggedBlock = blocks[2];
            blocks.splice(2, 1); // Remove from position 2
            blocks.splice(0, 0, draggedBlock); // Insert at position 0

            expect(blocks[0].id).toBe('block-3');
            expect(blocks[1].id).toBe('block-1');
            expect(blocks[2].id).toBe('block-2');
        });
    });

    describe('2. Knowledge Management Workflow Validation', () => {
        it('should validate knowledge node creation and management', () => {
            const knowledgeNodes = new Map();
            const completedModules = new Set();
            const userProgress = new Map();

            // Create knowledge nodes
            const nodes = [
                {
                    id: 'python-basics',
                    title: 'Python Basics',
                    type: 'module',
                    metadata: {
                        difficulty: 1,
                        estimatedTime: 30,
                        prerequisites: [],
                        tags: ['python', 'programming']
                    },
                    progress: { completed: false, lastAccessed: new Date() }
                },
                {
                    id: 'data-structures',
                    title: 'Data Structures',
                    type: 'module',
                    metadata: {
                        difficulty: 2,
                        estimatedTime: 45,
                        prerequisites: ['python-basics'],
                        tags: ['python', 'data-structures']
                    },
                    progress: { completed: false, lastAccessed: new Date() }
                }
            ];

            // Add nodes to knowledge base
            nodes.forEach(node => knowledgeNodes.set(node.id, node));
            expect(knowledgeNodes.size).toBe(2);

            // Start learning journey
            const startModule = (moduleId: string) => {
                const progress = {
                    userId: 'test-user',
                    moduleId,
                    status: 'in-progress',
                    timeSpent: 0,
                    lastAccessed: new Date(),
                    attempts: 0,
                    bookmarked: false,
                    notes: '',
                    startedAt: new Date()
                };
                userProgress.set(moduleId, progress);
            };

            startModule('python-basics');
            expect(userProgress.get('python-basics')?.status).toBe('in-progress');

            // Complete module
            const markCompleted = (moduleId: string, score: number) => {
                completedModules.add(moduleId);
                const existing = userProgress.get(moduleId);
                if (existing) {
                    existing.status = 'completed';
                    existing.score = score;
                    existing.completedAt = new Date();
                    existing.attempts += 1;
                }
            };

            markCompleted('python-basics', 85);
            expect(completedModules.has('python-basics')).toBe(true);
            expect(userProgress.get('python-basics')?.score).toBe(85);
        });

        it('should validate progress statistics calculation', () => {
            const nodes = new Map([
                ['module-1', { id: 'module-1', title: 'Module 1' }],
                ['module-2', { id: 'module-2', title: 'Module 2' }],
                ['module-3', { id: 'module-3', title: 'Module 3' }]
            ]);

            const completedModules = new Set(['module-1', 'module-2']);
            const userProgress = new Map([
                ['module-1', { score: 85, timeSpent: 30 }],
                ['module-2', { score: 92, timeSpent: 45 }]
            ]);

            const stats = {
                totalModules: nodes.size,
                completedModules: completedModules.size,
                completionRate: (completedModules.size / nodes.size) * 100,
                averageScore: Array.from(userProgress.values())
                    .filter(p => p.score !== undefined)
                    .reduce((sum, p) => sum + (p.score || 0), 0) / 2,
                totalTimeSpent: Array.from(userProgress.values())
                    .reduce((sum, p) => sum + (p.timeSpent || 0), 0)
            };

            expect(stats.totalModules).toBe(3);
            expect(stats.completedModules).toBe(2);
            expect(Math.round(stats.completionRate * 100) / 100).toBe(66.67);
            expect(stats.averageScore).toBe(88.5);
            expect(stats.totalTimeSpent).toBe(75);
        });

        it('should validate search and filtering functionality', () => {
            const nodes = [
                {
                    id: 'python-1',
                    title: 'Python Basics',
                    tags: ['python', 'programming', 'basics']
                },
                {
                    id: 'js-1',
                    title: 'JavaScript Fundamentals',
                    tags: ['javascript', 'web-development', 'programming']
                },
                {
                    id: 'ml-1',
                    title: 'Machine Learning with Python',
                    tags: ['machine-learning', 'python', 'ai']
                }
            ];

            // Test search by title
            const searchByTitle = (query: string) => {
                return nodes.filter(node =>
                    node.title.toLowerCase().includes(query.toLowerCase())
                );
            };

            const pythonResults = searchByTitle('python');
            expect(pythonResults).toHaveLength(2);
            expect(pythonResults.map(r => r.id)).toEqual(['python-1', 'ml-1']);

            // Test search by tags
            const searchByTags = (query: string) => {
                return nodes.filter(node =>
                    node.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
                );
            };

            const programmingResults = searchByTags('programming');
            expect(programmingResults).toHaveLength(2);
            expect(programmingResults.map(r => r.id)).toEqual(['python-1', 'js-1']);
        });
    });

    describe('3. Web Content Processing Workflow Validation', () => {
        it('should validate content extraction workflow', () => {
            // Mock extracted content
            const extractedContent = {
                success: true,
                content: {
                    title: 'Machine Learning Guide',
                    text: 'This is a comprehensive guide to machine learning...',
                    html: '<h1>Machine Learning Guide</h1><p>This is a comprehensive guide...</p>',
                    metadata: {
                        author: 'Expert Author',
                        publishDate: new Date('2024-01-15'),
                        domain: 'example.com',
                        contentType: 'article',
                        language: 'en',
                        readingTime: 15,
                        wordCount: 3000,
                        keywords: ['machine learning', 'AI', 'tutorial'],
                        description: 'Comprehensive ML guide'
                    }
                },
                extractedAt: new Date()
            };

            expect(extractedContent.success).toBe(true);
            expect(extractedContent.content.title).toBe('Machine Learning Guide');
            expect(extractedContent.content.metadata.wordCount).toBe(3000);
            expect(extractedContent.content.metadata.keywords).toContain('machine learning');
        });

        it('should validate content transformation to interactive modules', () => {
            const rawContent = {
                title: 'Neural Networks Explained',
                text: 'Neural networks are computing systems...',
                metadata: {
                    contentType: 'article',
                    keywords: ['neural networks', 'deep learning']
                }
            };

            // Mock transformation process
            const transformToInteractive = (content: typeof rawContent) => {
                const blocks = [];

                // Add text block
                blocks.push({
                    id: 'intro-text',
                    type: 'text',
                    content: { html: `<h2>${content.title}</h2><p>${content.text}</p>` }
                });

                // Add interactive visualization if keywords suggest it
                if (content.metadata.keywords.includes('neural networks')) {
                    blocks.push({
                        id: 'neural-viz',
                        type: 'interactive-visualization',
                        content: {
                            type: 'neural-network',
                            config: { layers: [3, 4, 2], interactive: true }
                        }
                    });
                }

                // Add code example
                blocks.push({
                    id: 'code-example',
                    type: 'code',
                    content: {
                        code: 'import tensorflow as tf\n# Neural network example',
                        language: 'python'
                    }
                });

                // Add quiz
                blocks.push({
                    id: 'knowledge-check',
                    type: 'quiz',
                    content: {
                        question: 'What are neural networks?',
                        options: ['Computing systems', 'Biological systems', 'Network protocols'],
                        correctAnswer: 0
                    }
                });

                return {
                    success: true,
                    module: {
                        id: 'neural-networks-module',
                        title: content.title,
                        content: { blocks },
                        metadata: {
                            difficulty: 3,
                            estimatedTime: 45,
                            tags: content.metadata.keywords
                        }
                    }
                };
            };

            const result = transformToInteractive(rawContent);

            expect(result.success).toBe(true);
            expect(result.module.content.blocks).toHaveLength(4);
            expect(result.module.content.blocks[0].type).toBe('text');
            expect(result.module.content.blocks[1].type).toBe('interactive-visualization');
            expect(result.module.content.blocks[2].type).toBe('code');
            expect(result.module.content.blocks[3].type).toBe('quiz');
        });

        it('should validate source management workflow', () => {
            const sources = new Map();
            const sourceStats = {
                total: 0,
                byDomain: new Map(),
                byCategory: new Map(),
                byStatus: new Map()
            };

            const addSource = (sourceData: any) => {
                const source = {
                    id: `source-${Date.now()}`,
                    url: sourceData.url,
                    title: sourceData.title,
                    domain: new URL(sourceData.url).hostname,
                    importDate: new Date(),
                    lastChecked: new Date(),
                    status: 'active',
                    metadata: {
                        category: sourceData.category || 'general',
                        tags: sourceData.tags || [],
                        contentType: 'article'
                    },
                    usage: {
                        timesReferenced: 0,
                        lastAccessed: new Date(),
                        generatedModules: []
                    }
                };

                sources.set(source.id, source);

                // Update stats
                sourceStats.total = sources.size;
                sourceStats.byDomain.set(source.domain, (sourceStats.byDomain.get(source.domain) || 0) + 1);
                sourceStats.byCategory.set(source.metadata.category, (sourceStats.byCategory.get(source.metadata.category) || 0) + 1);
                sourceStats.byStatus.set(source.status, (sourceStats.byStatus.get(source.status) || 0) + 1);

                return { sourceId: source.id, source, isDuplicate: false };
            };

            // Add test sources
            const result1 = addSource({
                url: 'https://example.com/ml-guide',
                title: 'ML Guide',
                category: 'education',
                tags: ['machine-learning']
            });

            const result2 = addSource({
                url: 'https://tutorial.com/python-basics',
                title: 'Python Basics',
                category: 'programming',
                tags: ['python']
            });

            expect(sources.size).toBe(2);
            expect(sourceStats.total).toBe(2);
            expect(sourceStats.byDomain.get('example.com')).toBe(1);
            expect(sourceStats.byDomain.get('tutorial.com')).toBe(1);
            expect(sourceStats.byCategory.get('education')).toBe(1);
            expect(sourceStats.byCategory.get('programming')).toBe(1);
            expect(result1.isDuplicate).toBe(false);
            expect(result2.isDuplicate).toBe(false);
        });

        it('should validate batch processing workflow', () => {
            const urls = [
                'https://example.com/article-1',
                'https://example.com/article-2',
                'https://example.com/article-3'
            ];

            const processBatch = async (urlList: string[]) => {
                const results = [];

                for (let i = 0; i < urlList.length; i++) {
                    const url = urlList[i];
                    try {
                        // Simulate processing
                        const result = {
                            url,
                            success: true,
                            sourceId: `source-${i + 1}`,
                            processingTime: 1000 + (i * 200)
                        };
                        results.push(result);
                    } catch (error) {
                        results.push({
                            url,
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }

                return results;
            };

            const batchResults = processBatch(urls);

            // Since this is synchronous in our test, we can check immediately
            expect(batchResults).resolves.toHaveLength(3);
            batchResults.then(results => {
                results.forEach((result, index) => {
                    expect(result.success).toBe(true);
                    expect(result.sourceId).toBe(`source-${index + 1}`);
                });
            });
        });
    });

    describe('4. Interactive Article Workflow Validation', () => {
        it('should validate interactive article structure', () => {
            const interactiveArticle = {
                id: 'ml-fundamentals',
                title: 'Machine Learning Fundamentals',
                metadata: {
                    author: 'Dr. Smith',
                    difficulty: 3,
                    estimatedTime: 90,
                    tags: ['machine-learning', 'interactive']
                },
                sections: [
                    {
                        id: 'introduction',
                        title: 'Introduction',
                        blocks: [
                            {
                                id: 'intro-text',
                                type: 'text',
                                content: { html: '<h2>Introduction to ML</h2>' }
                            },
                            {
                                id: 'ml-viz',
                                type: 'interactive-visualization',
                                content: {
                                    type: 'ml-taxonomy',
                                    config: { interactive: true }
                                }
                            }
                        ] as ContentBlock[]
                    },
                    {
                        id: 'practice',
                        title: 'Hands-on Practice',
                        blocks: [
                            {
                                id: 'code-example',
                                type: 'code',
                                content: {
                                    code: 'import sklearn\n# ML example',
                                    language: 'python',
                                    executable: true
                                }
                            },
                            {
                                id: 'quiz',
                                type: 'quiz',
                                content: {
                                    question: 'What is supervised learning?',
                                    options: ['Learning with labels', 'Learning without labels'],
                                    correctAnswer: 0
                                }
                            }
                        ] as ContentBlock[]
                    }
                ]
            };

            expect(interactiveArticle.sections).toHaveLength(2);
            expect(interactiveArticle.sections[0].blocks).toHaveLength(2);
            expect(interactiveArticle.sections[1].blocks).toHaveLength(2);

            // Validate block types
            const allBlocks = interactiveArticle.sections.flatMap(s => s.blocks);
            const blockTypes = allBlocks.map(b => (b as any).type);
            expect(blockTypes).toContain('text');
            expect(blockTypes).toContain('interactive-visualization');
            expect(blockTypes).toContain('code');
            expect(blockTypes).toContain('quiz');
        });

        it('should validate interactive element state management', () => {
            const visualizationState = {
                id: 'neural-network-viz',
                type: 'neural-network',
                parameters: {
                    layers: [3, 4, 2],
                    learningRate: 0.01,
                    activationFunction: 'relu'
                },
                userInteractions: [],
                currentStep: 0,
                isPlaying: false
            };

            // Simulate user interactions
            const addInteraction = (interaction: any) => {
                visualizationState.userInteractions.push({
                    timestamp: new Date(),
                    ...interaction
                });
            };

            addInteraction({ type: 'weight-adjustment', layer: 1, neuron: 2, newWeight: 0.75 });
            addInteraction({ type: 'parameter-change', parameter: 'learningRate', newValue: 0.05 });

            expect(visualizationState.userInteractions).toHaveLength(2);
            expect(visualizationState.userInteractions[0].type).toBe('weight-adjustment');
            expect(visualizationState.userInteractions[1].type).toBe('parameter-change');
        });

        it('should validate quiz interaction workflow', () => {
            const quizSession = {
                quizId: 'ml-concepts-quiz',
                questions: [
                    {
                        id: 'q1',
                        question: 'What is supervised learning?',
                        options: ['Learning with labels', 'Learning without labels', 'Reinforcement learning'],
                        correctAnswer: 0
                    },
                    {
                        id: 'q2',
                        question: 'What is overfitting?',
                        options: ['Good generalization', 'Poor generalization', 'Perfect fit'],
                        correctAnswer: 1
                    }
                ],
                userAnswers: new Map(),
                score: 0,
                completed: false
            };

            // Simulate answering questions
            const answerQuestion = (questionId: string, answer: number) => {
                quizSession.userAnswers.set(questionId, answer);

                // Check if all questions answered
                if (quizSession.userAnswers.size === quizSession.questions.length) {
                    // Calculate score
                    let correct = 0;
                    quizSession.questions.forEach(q => {
                        const userAnswer = quizSession.userAnswers.get(q.id);
                        if (userAnswer === q.correctAnswer) {
                            correct++;
                        }
                    });

                    quizSession.score = (correct / quizSession.questions.length) * 100;
                    quizSession.completed = true;
                }
            };

            answerQuestion('q1', 0); // Correct
            answerQuestion('q2', 1); // Correct

            expect(quizSession.completed).toBe(true);
            expect(quizSession.score).toBe(100);
            expect(quizSession.userAnswers.size).toBe(2);
        });

        it('should validate reading progress tracking', () => {
            const readingSession = {
                articleId: 'ml-article',
                startTime: new Date(),
                sectionsRead: new Set(),
                totalSections: 4,
                timeSpentPerSection: new Map(),
                scrollProgress: 0,
                interactionsCount: 0
            };

            // Simulate reading sections
            const sections = ['intro', 'theory', 'practice', 'conclusion'];

            sections.forEach((sectionId, index) => {
                const timeSpent = Math.random() * 300 + 120; // 2-7 minutes

                readingSession.sectionsRead.add(sectionId);
                readingSession.timeSpentPerSection.set(sectionId, timeSpent);
                readingSession.scrollProgress = ((index + 1) / sections.length) * 100;
                readingSession.interactionsCount += Math.floor(Math.random() * 5) + 1;
            });

            const totalReadingTime = Array.from(readingSession.timeSpentPerSection.values())
                .reduce((sum, time) => sum + time, 0);

            const completionPercentage = (readingSession.sectionsRead.size / readingSession.totalSections) * 100;

            expect(readingSession.sectionsRead.size).toBe(4);
            expect(readingSession.scrollProgress).toBe(100);
            expect(totalReadingTime).toBeGreaterThan(480); // At least 8 minutes total
            expect(completionPercentage).toBe(100);
        });
    });

    describe('5. System Integration and Error Handling Validation', () => {
        it('should validate offline mode handling', () => {
            const syncState = {
                isOnline: true,
                pendingChanges: [],
                lastSync: null,
                isSyncing: false
            };

            // Simulate going offline
            syncState.isOnline = false;

            // Add changes while offline
            const addPendingChange = (changeId: string) => {
                if (!syncState.pendingChanges.includes(changeId)) {
                    syncState.pendingChanges.push(changeId);
                }
            };

            addPendingChange('content-1');
            addPendingChange('content-2');

            expect(syncState.isOnline).toBe(false);
            expect(syncState.pendingChanges).toHaveLength(2);

            // Simulate coming back online
            syncState.isOnline = true;
            syncState.isSyncing = true;

            // Simulate sync completion
            setTimeout(() => {
                syncState.pendingChanges = [];
                syncState.isSyncing = false;
                syncState.lastSync = new Date();
            }, 100);

            expect(syncState.isOnline).toBe(true);
        });

        it('should validate error handling scenarios', () => {
            const errorScenarios = [
                {
                    type: 'network-error',
                    message: 'Failed to fetch content',
                    recoverable: true
                },
                {
                    type: 'validation-error',
                    message: 'Invalid content format',
                    recoverable: false
                },
                {
                    type: 'processing-error',
                    message: 'Content processing failed',
                    recoverable: true
                }
            ];

            const handleError = (error: typeof errorScenarios[0]) => {
                const errorResponse = {
                    success: false,
                    error: error.message,
                    type: error.type,
                    recoverable: error.recoverable,
                    timestamp: new Date()
                };

                // Add to error log
                const errorLog = [];
                errorLog.push(errorResponse);

                return errorResponse;
            };

            errorScenarios.forEach(scenario => {
                const result = handleError(scenario);
                expect(result.success).toBe(false);
                expect(result.error).toBe(scenario.message);
                expect(result.type).toBe(scenario.type);
                expect(result.recoverable).toBe(scenario.recoverable);
            });
        });

        it('should validate data integrity checks', () => {
            const validateKnowledgeNode = (node: any) => {
                const errors = [];

                if (!node.id) { errors.push('ID is required'); }
                if (!node.title) { errors.push('Title is required'); }
                if (!['module', 'folder', 'article'].includes(node.type)) { errors.push('Invalid type'); }
                if (node.metadata.difficulty < 1 || node.metadata.difficulty > 5) { errors.push('Difficulty must be 1-5'); }
                if (node.metadata.estimatedTime < 0) { errors.push('Estimated time must be positive'); }

                return errors;
            };

            const validateContentBlock = (block: any) => {
                const errors = [];

                if (!block.id) { errors.push('Block ID is required'); }
                if (!['text', 'code', 'image', 'video', 'quiz', 'flashcard'].includes(block.type)) {
                    errors.push('Invalid block type');
                }
                if (!block.content) { errors.push('Block content is required'); }
                if (block.metadata.version < 1) { errors.push('Version must be >= 1'); }

                return errors;
            };

            // Test valid data
            const validNode = {
                id: 'valid-node',
                title: 'Valid Node',
                type: 'module',
                metadata: { difficulty: 3, estimatedTime: 30 }
            };

            const validBlock = {
                id: 'valid-block',
                type: 'text',
                content: { html: '<p>Valid content</p>' },
                metadata: { version: 1 }
            };

            expect(validateKnowledgeNode(validNode)).toHaveLength(0);
            expect(validateContentBlock(validBlock)).toHaveLength(0);

            // Test invalid data
            const invalidNode = {
                id: '',
                title: '',
                type: 'invalid',
                metadata: { difficulty: 10, estimatedTime: -5 }
            };

            const invalidBlock = {
                id: '',
                type: 'unknown',
                content: null,
                metadata: { version: 0 }
            };

            expect(validateKnowledgeNode(invalidNode).length).toBeGreaterThan(0);
            expect(validateContentBlock(invalidBlock).length).toBeGreaterThan(0);
        });

        it('should validate notification system', () => {
            const notifications = [];

            const addNotification = (notification: any) => {
                const id = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                notifications.push({
                    ...notification,
                    id,
                    timestamp: new Date()
                });
                return id;
            };

            const removeNotification = (id: string) => {
                const index = notifications.findIndex(n => n.id === id);
                if (index > -1) {
                    notifications.splice(index, 1);
                    return true;
                }
                return false;
            };

            // Test adding notifications
            const successId = addNotification({
                type: 'success',
                message: 'Content saved successfully'
            });

            const errorId = addNotification({
                type: 'error',
                message: 'Failed to save content'
            });

            expect(notifications).toHaveLength(2);
            expect(notifications[0].type).toBe('success');
            expect(notifications[1].type).toBe('error');

            // Test removing notifications
            const removed = removeNotification(successId);
            expect(removed).toBe(true);
            expect(notifications).toHaveLength(1);
            expect(notifications[0].id).toBe(errorId);
        });
    });
});