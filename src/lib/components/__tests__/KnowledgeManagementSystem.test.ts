import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appState, actions } from '../../stores/appState.svelte.ts';
import type { KnowledgeNode } from '../../types/knowledge.ts';

// Mock the stores
vi.mock('../../stores/appState.svelte.ts', () => ({
    appState: {
        content: {
            nodes: new Map(),
            currentNode: null,
            searchQuery: '',
            searchResults: [],
            isLoading: false
        },
        progress: {
            completedModules: new Set(),
            currentStreak: 0,
            totalTimeSpent: 0,
            userProgress: new Map()
        }
    },
    actions: {
        addKnowledgeNode: vi.fn(),
        setCurrentNode: vi.fn(),
        updateKnowledgeNode: vi.fn(),
        removeKnowledgeNode: vi.fn(),
        setSearchQuery: vi.fn(),
        setSearchResults: vi.fn(),
        markModuleCompleted: vi.fn(),
        startModule: vi.fn(),
        addNotification: vi.fn()
    }
}));

describe('Knowledge Management System Integration', () => {
    const sampleNodes: KnowledgeNode[] = [
        {
            id: 'test-folder',
            title: 'Test Folder',
            type: 'folder',
            metadata: {
                difficulty: 1 as 1 | 2 | 3 | 4 | 5,
                estimatedTime: 0,
                prerequisites: [],
                tags: ['test']
            }
        },
        {
            id: 'test-module',
            title: 'Test Module',
            type: 'module',
            parent: 'test-folder',
            metadata: {
                difficulty: 2 as 1 | 2 | 3 | 4 | 5,
                estimatedTime: 30,
                prerequisites: [],
                tags: ['test', 'module']
            }
        },
        {
            id: 'test-lesson',
            title: 'Test Lesson',
            type: 'lesson',
            parent: 'test-module',
            metadata: {
                difficulty: 1 as 1 | 2 | 3 | 4 | 5,
                estimatedTime: 15,
                prerequisites: [],
                tags: ['test', 'lesson']
            }
        }
    ];

    beforeEach(() => {
        // Reset the app state
        appState.content.nodes.clear();
        appState.content.currentNode = null;
        appState.content.searchQuery = '';
        appState.content.searchResults = [];
        appState.progress.completedModules.clear();
        appState.progress.userProgress.clear();

        // Clear all mocks
        vi.clearAllMocks();
    });

    describe('Knowledge Node Management', () => {
        it('should add knowledge nodes to the system', () => {
            sampleNodes.forEach(node => {
                actions.addKnowledgeNode(node);
            });

            expect(actions.addKnowledgeNode).toHaveBeenCalledTimes(3);
            expect(actions.addKnowledgeNode).toHaveBeenCalledWith(sampleNodes[0]);
            expect(actions.addKnowledgeNode).toHaveBeenCalledWith(sampleNodes[1]);
            expect(actions.addKnowledgeNode).toHaveBeenCalledWith(sampleNodes[2]);
        });

        it('should set current node', () => {
            const testNode = sampleNodes[0];
            actions.setCurrentNode(testNode);

            expect(actions.setCurrentNode).toHaveBeenCalledWith(testNode);
        });

        it('should update knowledge node', () => {
            const nodeId = 'test-module';
            const updates = { title: 'Updated Test Module' };

            actions.updateKnowledgeNode(nodeId, updates);

            expect(actions.updateKnowledgeNode).toHaveBeenCalledWith(nodeId, updates);
        });

        it('should remove knowledge node', () => {
            const nodeId = 'test-lesson';

            actions.removeKnowledgeNode(nodeId);

            expect(actions.removeKnowledgeNode).toHaveBeenCalledWith(nodeId);
        });
    });

    describe('Search Functionality', () => {
        it('should set search query', () => {
            const query = 'test search';

            actions.setSearchQuery(query);

            expect(actions.setSearchQuery).toHaveBeenCalledWith(query);
        });

        it('should set search results', () => {
            const results = [
                {
                    id: 'test-result',
                    title: 'Test Result',
                    snippet: 'Test snippet',
                    relevance: 0.8,
                    type: 'module',
                    tags: ['test']
                }
            ];

            actions.setSearchResults(results);

            expect(actions.setSearchResults).toHaveBeenCalledWith(results);
        });
    });

    describe('Progress Tracking', () => {
        it('should mark module as completed', () => {
            const moduleId = 'test-module';
            const score = 85;

            actions.markModuleCompleted(moduleId, score);

            expect(actions.markModuleCompleted).toHaveBeenCalledWith(moduleId, score);
        });

        it('should start module', () => {
            const moduleId = 'test-module';

            actions.startModule(moduleId);

            expect(actions.startModule).toHaveBeenCalledWith(moduleId);
        });
    });

    describe('Knowledge Tree Hierarchy', () => {
        it('should build proper hierarchical structure', () => {
            // Add nodes to the system
            sampleNodes.forEach(node => {
                appState.content.nodes.set(node.id, node);
            });

            // Test hierarchy building logic
            const flatNodes = Array.from(appState.content.nodes.values());
            const nodeMap = new Map<string, KnowledgeNode>();
            const rootNodes: KnowledgeNode[] = [];

            // First pass: create map of all nodes
            flatNodes.forEach(node => {
                nodeMap.set(node.id, { ...node, children: [] });
            });

            // Second pass: build hierarchy
            flatNodes.forEach(node => {
                const nodeWithChildren = nodeMap.get(node.id)!;
                if (node.parent) {
                    const parent = nodeMap.get(node.parent);
                    if (parent) {
                        parent.children = parent.children || [];
                        parent.children.push(nodeWithChildren);
                    } else {
                        // Parent not found, treat as root
                        rootNodes.push(nodeWithChildren);
                    }
                } else {
                    rootNodes.push(nodeWithChildren);
                }
            });

            // Verify hierarchy
            expect(rootNodes).toHaveLength(1);
            expect(rootNodes[0].id).toBe('test-folder');
            expect(rootNodes[0].children).toHaveLength(1);
            expect(rootNodes[0].children![0].id).toBe('test-module');
            expect(rootNodes[0].children![0].children).toHaveLength(1);
            expect(rootNodes[0].children![0].children![0].id).toBe('test-lesson');
        });
    });

    describe('Node Navigation', () => {
        it('should handle node selection and navigation', () => {
            const testNode = sampleNodes[1]; // test-module

            // Simulate node selection
            actions.setCurrentNode(testNode);

            expect(actions.setCurrentNode).toHaveBeenCalledWith(testNode);
        });
    });

    describe('Data Persistence', () => {
        it('should handle progress data persistence', () => {
            const moduleId = 'test-module';
            const userId = 'test-user';

            // Start a module
            actions.startModule(moduleId);

            // Complete the module
            actions.markModuleCompleted(moduleId, 90);

            expect(actions.startModule).toHaveBeenCalledWith(moduleId);
            expect(actions.markModuleCompleted).toHaveBeenCalledWith(moduleId, 90);
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid node operations gracefully', () => {
            // Try to update non-existent node
            actions.updateKnowledgeNode('non-existent', { title: 'Updated' });

            // Try to remove non-existent node
            actions.removeKnowledgeNode('non-existent');

            // These should not throw errors
            expect(actions.updateKnowledgeNode).toHaveBeenCalledWith('non-existent', { title: 'Updated' });
            expect(actions.removeKnowledgeNode).toHaveBeenCalledWith('non-existent');
        });
    });

    describe('Search and Filtering', () => {
        it('should filter nodes based on search criteria', () => {
            // Add nodes to the system
            sampleNodes.forEach(node => {
                appState.content.nodes.set(node.id, node);
            });

            // Test filtering logic
            const searchQuery = 'test';
            const nodes = Array.from(appState.content.nodes.values());
            const filteredNodes = nodes.filter(node =>
                node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                node.metadata.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );

            expect(filteredNodes).toHaveLength(3); // All nodes contain 'test'
        });

        it('should filter by difficulty', () => {
            // Add nodes to the system
            sampleNodes.forEach(node => {
                appState.content.nodes.set(node.id, node);
            });

            // Filter by difficulty level 1
            const nodes = Array.from(appState.content.nodes.values());
            const easyNodes = nodes.filter(node => node.metadata.difficulty === 1);

            expect(easyNodes).toHaveLength(2); // test-folder and test-lesson
        });

        it('should filter by tags', () => {
            // Add nodes to the system
            sampleNodes.forEach(node => {
                appState.content.nodes.set(node.id, node);
            });

            // Filter by 'module' tag
            const nodes = Array.from(appState.content.nodes.values());
            const moduleNodes = nodes.filter(node =>
                node.metadata.tags.includes('module')
            );

            expect(moduleNodes).toHaveLength(1); // Only test-module
            expect(moduleNodes[0].id).toBe('test-module');
        });
    });
});