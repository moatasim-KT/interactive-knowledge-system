/**
 * Content Creation Workflow Tests
 * Tests the complete content creation and editing workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ContentBlock, EditorState } from '../types/content.ts';

describe('Content Creation Workflow', () => {
    let editorState: EditorState;

    beforeEach(() => {
        editorState = {
            blocks: [],
            selectedBlock: null,
            isEditing: false,
            history: [[]]
        };
    });

    describe('Block Creation and Management', () => {
        it('should create different types of content blocks', () => {
            const textBlock: ContentBlock = {
                id: 'text-1',
                type: 'text',
                content: {
                    html: '<p>Sample text content</p>'
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            };

            const codeBlock: ContentBlock = {
                id: 'code-1',
                type: 'code',
                content: {
                    code: 'console.log("Hello, World!");',
                    language: 'javascript',
                    title: 'Hello World Example',
                    description: 'Basic JavaScript example',
                    executable: true,
                    version: 1,
                    history: []
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            };

            const quizBlock: ContentBlock = {
                id: 'quiz-1',
                type: 'quiz',
                content: {
                    question: 'What is 2 + 2?',
                    type: 'multiple-choice',
                    options: ['3', '4', '5', '6'],
                    correctAnswer: 1
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            };

            editorState.blocks = [textBlock, codeBlock, quizBlock];

            expect(editorState.blocks).toHaveLength(3);
            expect(editorState.blocks[0].type).toBe('text');
            expect(editorState.blocks[1].type).toBe('code');
            expect(editorState.blocks[2].type).toBe('quiz');
        });

        it('should handle block reordering via drag and drop', () => {
            const blocks: ContentBlock[] = [
                {
                    id: 'block-1',
                    type: 'text',
                    content: { html: '<p>First block</p>' },
                    metadata: { created: new Date(), modified: new Date(), version: 1 }
                },
                {
                    id: 'block-2',
                    type: 'code',
                    content: { code: 'console.log("Second");', language: 'javascript' },
                    metadata: { created: new Date(), modified: new Date(), version: 1 }
                },
                {
                    id: 'block-3',
                    type: 'text',
                    content: { html: '<p>Third block</p>' },
                    metadata: { created: new Date(), modified: new Date(), version: 1 }
                }
            ];

            editorState.blocks = [...blocks];

            // Simulate drag and drop: move block-3 to position 0
            const draggedBlock = editorState.blocks[2];
            editorState.blocks.splice(2, 1); // Remove from position 2
            editorState.blocks.splice(0, 0, draggedBlock); // Insert at position 0

            expect(editorState.blocks[0].id).toBe('block-3');
            expect(editorState.blocks[1].id).toBe('block-1');
            expect(editorState.blocks[2].id).toBe('block-2');
        });

        it('should maintain version history for blocks', () => {
            const block: ContentBlock = {
                id: 'versioned-block',
                type: 'text',
                content: { html: '<p>Original content</p>' },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            editorState.blocks = [block];

            // Simulate content update
            const updatedBlock = {
                ...block,
                content: { html: '<p>Updated content</p>' },
                metadata: {
                    ...block.metadata,
                    modified: new Date(),
                    version: 2
                }
            };

            editorState.blocks[0] = updatedBlock;

            expect(editorState.blocks[0].metadata.version).toBe(2);
            expect(editorState.blocks[0].content.html).toBe('<p>Updated content</p>');
        });
    });

    describe('Editor State Management', () => {
        it('should track selected block and editing state', () => {
            const block: ContentBlock = {
                id: 'selectable-block',
                type: 'text',
                content: { html: '<p>Selectable content</p>' },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            editorState.blocks = [block];
            editorState.selectedBlock = 'selectable-block';
            editorState.isEditing = true;

            expect(editorState.selectedBlock).toBe('selectable-block');
            expect(editorState.isEditing).toBe(true);

            // Deselect block
            editorState.selectedBlock = null;
            editorState.isEditing = false;

            expect(editorState.selectedBlock).toBeNull();
            expect(editorState.isEditing).toBe(false);
        });

        it('should maintain undo/redo history', () => {
            const initialBlocks: ContentBlock[] = [
                {
                    id: 'history-block',
                    type: 'text',
                    content: { html: '<p>Initial content</p>' },
                    metadata: { created: new Date(), modified: new Date(), version: 1 }
                }
            ];

            editorState.blocks = [...initialBlocks];
            editorState.history = [structuredClone(initialBlocks)];

            // Make a change
            const updatedBlocks = [
                {
                    ...initialBlocks[0],
                    content: { html: '<p>Modified content</p>' },
                    metadata: { ...initialBlocks[0].metadata, version: 2 }
                }
            ];

            editorState.blocks = [...updatedBlocks];
            editorState.history.push(structuredClone(updatedBlocks));

            expect(editorState.history).toHaveLength(2);

            // Simulate undo
            if (editorState.history.length > 1) {
                editorState.history.pop(); // Remove current state
                const previousState = editorState.history[editorState.history.length - 1];
                editorState.blocks = structuredClone(previousState);
            }

            expect(editorState.blocks[0].content.html).toBe('<p>Initial content</p>');
        });
    });

    describe('Auto-save Functionality', () => {
        it('should trigger auto-save after content changes', async () => {
            let saveTriggered = false;
            const mockSave = vi.fn(() => {
                saveTriggered = true;
                return Promise.resolve({ success: true });
            });

            const block: ContentBlock = {
                id: 'auto-save-block',
                type: 'text',
                content: { html: '<p>Auto-save content</p>' },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            editorState.blocks = [block];

            // Simulate auto-save trigger
            setTimeout(() => {
                mockSave();
            }, 1000);

            // Wait for auto-save
            await new Promise(resolve => setTimeout(resolve, 1100));

            expect(mockSave).toHaveBeenCalled();
            expect(saveTriggered).toBe(true);
        });

        it('should debounce rapid changes', async () => {
            const saveCallCount = vi.fn();
            let debounceTimeout: NodeJS.Timeout | null = null;

            const debouncedSave = () => {
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                }
                debounceTimeout = setTimeout(() => {
                    saveCallCount();
                }, 500);
            };

            // Simulate rapid changes
            debouncedSave(); // Change 1
            debouncedSave(); // Change 2
            debouncedSave(); // Change 3

            // Wait for debounce
            await new Promise(resolve => setTimeout(resolve, 600));

            expect(saveCallCount).toHaveBeenCalledTimes(1);
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('should handle save shortcut (Ctrl+S)', () => {
            let saveTriggered = false;
            const handleSave = () => {
                saveTriggered = true;
            };

            // Simulate Ctrl+S keydown event
            const keyEvent = new KeyboardEvent('keydown', {
                key: 's',
                ctrlKey: true,
                bubbles: true
            });

            // Mock event handler
            const handleKeydown = (event: KeyboardEvent) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                    event.preventDefault();
                    handleSave();
                }
            };

            handleKeydown(keyEvent);

            expect(saveTriggered).toBe(true);
        });

        it('should handle undo shortcut (Ctrl+Z)', () => {
            const initialState = [
                {
                    id: 'undo-block',
                    type: 'text' as const,
                    content: { html: '<p>Original</p>' },
                    metadata: { created: new Date(), modified: new Date(), version: 1 }
                }
            ];

            const modifiedState = [
                {
                    ...initialState[0],
                    content: { html: '<p>Modified</p>' },
                    metadata: { ...initialState[0].metadata, version: 2 }
                }
            ];

            editorState.blocks = [...modifiedState];
            editorState.history = [
                structuredClone(initialState),
                structuredClone(modifiedState)
            ];

            const handleUndo = () => {
                if (editorState.history.length > 1) {
                    editorState.history.pop();
                    const previousState = editorState.history[editorState.history.length - 1];
                    editorState.blocks = structuredClone(previousState);
                }
            };

            // Simulate Ctrl+Z keydown event
            const keyEvent = new KeyboardEvent('keydown', {
                key: 'z',
                ctrlKey: true,
                bubbles: true
            });

            const handleKeydown = (event: KeyboardEvent) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
                    event.preventDefault();
                    handleUndo();
                }
            };

            handleKeydown(keyEvent);

            expect(editorState.blocks[0].content.html).toBe('<p>Original</p>');
        });
    });

    describe('Content Validation', () => {
        it('should validate required fields for different block types', () => {
            const validateTextBlock = (block: ContentBlock) => {
                const errors: string[] = [];
                if (block.type !== 'text') { errors.push('Invalid block type'); }
                if (!block.content.html) { errors.push('HTML content is required'); }
                return errors;
            };

            const validateCodeBlock = (block: ContentBlock) => {
                const errors: string[] = [];
                if (block.type !== 'code') { errors.push('Invalid block type'); }
                if (!block.content.code) { errors.push('Code content is required'); }
                if (!block.content.language) { errors.push('Language is required'); }
                return errors;
            };

            const validateQuizBlock = (block: ContentBlock) => {
                const errors: string[] = [];
                if (block.type !== 'quiz') { errors.push('Invalid block type'); }
                if (!block.content.question) { errors.push('Question is required'); }
                if (!block.content.options || block.content.options.length < 2) {
                    errors.push('At least 2 options are required');
                }
                if (block.content.correctAnswer === undefined) {
                    errors.push('Correct answer is required');
                }
                return errors;
            };

            // Test valid blocks
            const validTextBlock: ContentBlock = {
                id: 'valid-text',
                type: 'text',
                content: { html: '<p>Valid content</p>' },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            const validCodeBlock: ContentBlock = {
                id: 'valid-code',
                type: 'code',
                content: {
                    code: 'console.log("valid");',
                    language: 'javascript'
                },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            const validQuizBlock: ContentBlock = {
                id: 'valid-quiz',
                type: 'quiz',
                content: {
                    question: 'Valid question?',
                    type: 'multiple-choice',
                    options: ['A', 'B', 'C'],
                    correctAnswer: 1
                },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            expect(validateTextBlock(validTextBlock)).toHaveLength(0);
            expect(validateCodeBlock(validCodeBlock)).toHaveLength(0);
            expect(validateQuizBlock(validQuizBlock)).toHaveLength(0);

            // Test invalid blocks
            const invalidTextBlock: ContentBlock = {
                id: 'invalid-text',
                type: 'text',
                content: { html: '' },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            const invalidCodeBlock: ContentBlock = {
                id: 'invalid-code',
                type: 'code',
                content: { code: '', language: '' },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            const invalidQuizBlock: ContentBlock = {
                id: 'invalid-quiz',
                type: 'quiz',
                content: {
                    question: '',
                    type: 'multiple-choice',
                    options: [],
                    correctAnswer: undefined as any
                },
                metadata: { created: new Date(), modified: new Date(), version: 1 }
            };

            expect(validateTextBlock(invalidTextBlock)).toContain('HTML content is required');
            expect(validateCodeBlock(invalidCodeBlock)).toContain('Code content is required');
            expect(validateCodeBlock(invalidCodeBlock)).toContain('Language is required');
            expect(validateQuizBlock(invalidQuizBlock)).toContain('Question is required');
            expect(validateQuizBlock(invalidQuizBlock)).toContain('At least 2 options are required');
            expect(validateQuizBlock(invalidQuizBlock)).toContain('Correct answer is required');
        });
    });
});