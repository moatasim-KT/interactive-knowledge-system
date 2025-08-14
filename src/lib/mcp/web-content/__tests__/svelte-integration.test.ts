/**
 * Test MCP server integration with Svelte components
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebContentMcpServer } from '../web-content-mcp-server.js';

// Mock the Svelte store to avoid runes dependency in tests
vi.mock('../../../stores/webContentState.svelte.js', () => ({
    webContentActions: {
        setContentProcessing: vi.fn(),
        addNotification: vi.fn(),
        addContent: vi.fn(),
        addSource: vi.fn(),
        addBatchJob: vi.fn(),
        setActiveBatchJob: vi.fn(),
        setBatchProcessing: vi.fn(),
        updateBatchJob: vi.fn()
    }
}));

// Mock the services
vi.mock('../../../services/webContentFetcher.js', () => ({
    webContentFetcher: {
        fetch: vi.fn().mockResolvedValue({
            id: 'test-content',
            url: 'https://example.com',
            title: 'Test Content',
            content: {
                html: '<h1>Test</h1>',
                text: 'Test content',
                images: [],
                codeBlocks: [],
                tables: [],
                charts: [],
                blocks: []
            },
            metadata: {
                url: 'https://example.com',
                domain: 'example.com',
                contentType: 'article',
                language: 'en',
                readingTime: 1,
                wordCount: 100,
                keywords: ['test'],
                description: 'Test content',
                attribution: 'https://example.com',
                tags: [],
                category: 'test',
                fetched_at: new Date().toISOString()
            },
            extraction: {
                method: 'heuristic',
                confidence: 0.8,
                qualityScore: 0.7,
                issues: [],
                processingTime: 1000
            },
            fetchedAt: new Date().toISOString(),
            success: true
        })
    }
}));

vi.mock('../../../services/sourceManager.js', () => ({
    sourceManager: {
        addSource: vi.fn().mockResolvedValue({
            sourceId: 'test-source',
            source: {
                id: 'test-source',
                url: 'https://example.com',
                title: 'Test Source',
                domain: 'example.com',
                importDate: new Date(),
                lastChecked: new Date(),
                status: 'active',
                metadata: {
                    domain: 'example.com',
                    contentType: 'article',
                    language: 'en',
                    readingTime: 1,
                    wordCount: 100,
                    keywords: ['test'],
                    description: 'Test source',
                    attribution: 'https://example.com',
                    tags: [],
                    category: 'test'
                },
                usage: {
                    timesReferenced: 0,
                    lastAccessed: new Date(),
                    generatedModules: []
                }
            },
            isDuplicate: false
        })
    }
}));

describe('MCP Server Svelte Integration', () => {
    let mcpServer: WebContentMcpServer;

    beforeEach(() => {
        vi.clearAllMocks();
        mcpServer = new WebContentMcpServer();
        mcpServer.initialize();
    });

    describe('Svelte Store Integration', () => {
        it('should integrate with webContentActions', async () => {
            const { webContentActions } = await import('../../../stores/webContentState.svelte.js');

            // Test that the server can call store actions
            expect(webContentActions.setContentProcessing).toBeDefined();
            expect(webContentActions.addNotification).toBeDefined();
            expect(webContentActions.addContent).toBeDefined();
            expect(webContentActions.addSource).toBeDefined();
        });

        it('should update UI state during content fetching', async () => {
            const { webContentActions } = await import('../../../stores/webContentState.svelte.js');

            await mcpServer.executeTool('fetchWebContent', {
                url: 'https://example.com',
                options: {}
            });

            // Verify that UI state was updated
            expect(webContentActions.setContentProcessing).toHaveBeenCalledWith(true, 0);
            expect(webContentActions.addNotification).toHaveBeenCalled();
            expect(webContentActions.addContent).toHaveBeenCalled();
            expect(webContentActions.addSource).toHaveBeenCalled();
            expect(webContentActions.setContentProcessing).toHaveBeenCalledWith(false, 100);
        });

        it('should update batch processing state', async () => {
            const { webContentActions } = await import('../../../stores/webContentState.svelte.js');

            await mcpServer.executeTool('batchImportUrls', {
                urls: ['https://example.com'],
                options: {}
            });

            // Verify that batch state was updated
            expect(webContentActions.addBatchJob).toHaveBeenCalled();
            expect(webContentActions.setActiveBatchJob).toHaveBeenCalled();
            expect(webContentActions.setBatchProcessing).toHaveBeenCalledWith(true);
            expect(webContentActions.setBatchProcessing).toHaveBeenCalledWith(false);
        });

        it('should show notifications for errors', async () => {
            const { webContentActions } = await import('../../../stores/webContentState.svelte.js');

            try {
                await mcpServer.executeTool('fetchWebContent', {
                    url: 'invalid-url',
                    options: {}
                });
            } catch (error) {
                // Expected to fail
            }

            // Verify that error notification was shown
            expect(webContentActions.addNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error'
                })
            );
        });
    });

    describe('Service Integration', () => {
        it('should integrate with webContentFetcher', async () => {
            const { webContentFetcher } = await import('../../../services/webContentFetcher.js');

            await mcpServer.executeTool('fetchWebContent', {
                url: 'https://example.com',
                options: {}
            });

            expect(webContentFetcher.fetch).toHaveBeenCalledWith(
                'https://example.com',
                expect.any(Object)
            );
        });

        it('should integrate with sourceManager', async () => {
            const { sourceManager } = await import('../../../services/sourceManager.js');

            await mcpServer.executeTool('fetchWebContent', {
                url: 'https://example.com',
                options: {}
            });

            expect(sourceManager.addSource).toHaveBeenCalled();
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle service errors gracefully', async () => {
            const { webContentFetcher } = await import('../../../services/webContentFetcher.js');
            const { webContentActions } = await import('../../../stores/webContentState.svelte.js');

            // Mock service to throw error
            vi.mocked(webContentFetcher.fetch).mockRejectedValueOnce(new Error('Network error'));

            try {
                await mcpServer.executeTool('fetchWebContent', {
                    url: 'https://example.com',
                    options: {}
                });
            } catch (error) {
                // Expected to fail
            }

            // Verify error handling
            expect(webContentActions.setContentProcessing).toHaveBeenCalledWith(false, 0);
            expect(webContentActions.addNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'error'
                })
            );
        });

        it('should provide user-friendly error messages', async () => {
            const { webContentActions } = await import('../../../stores/webContentState.svelte.js');

            try {
                await mcpServer.executeTool('fetchWebContent', {
                    url: 'invalid-url',
                    options: {}
                });
            } catch (error) {
                // Expected to fail
            }

            // Check that notification has user-friendly message
            const notificationCalls = vi.mocked(webContentActions.addNotification).mock.calls;
            const errorNotification = notificationCalls.find(call =>
                call[0].type === 'error'
            );

            expect(errorNotification).toBeDefined();
            expect(errorNotification![0].message).toContain('fetch');
        });
    });

    describe('Real-time Updates', () => {
        it('should provide progress updates during processing', async () => {
            const { webContentActions } = await import('../../../stores/webContentState.svelte.js');

            await mcpServer.executeTool('fetchWebContent', {
                url: 'https://example.com',
                options: {}
            });

            // Verify progress updates
            const progressCalls = vi.mocked(webContentActions.setContentProcessing).mock.calls;
            expect(progressCalls.length).toBeGreaterThan(1);

            // Should start with processing=true
            expect(progressCalls[0]).toEqual([true, 0]);

            // Should end with processing=false
            const lastCall = progressCalls[progressCalls.length - 1];
            expect(lastCall[0]).toBe(false);
        });

        it('should update batch progress incrementally', async () => {
            const { webContentActions } = await import('../../../stores/webContentState.svelte.js');

            await mcpServer.executeTool('batchImportUrls', {
                urls: ['https://example.com', 'https://test.com'],
                options: { concurrency: 1 }
            });

            // Verify batch job updates
            expect(webContentActions.updateBatchJob).toHaveBeenCalled();
        });
    });

    describe('Component Integration Patterns', () => {
        it('should support component-driven tool execution', async () => {
            // Simulate component calling MCP tool
            const result = await mcpServer.executeTool('manageContentSources', {
                action: 'list',
                filters: { domain: 'example.com' }
            });

            expect(result.success).toBe(true);
            expect(result.action).toBe('list');
        });

        it('should provide data in component-friendly format', async () => {
            const result = await mcpServer.executeTool('fetchWebContent', {
                url: 'https://example.com',
                options: {}
            });

            // Verify result structure is component-friendly
            expect(result).toHaveProperty('success');
            expect(result).toHaveProperty('data');
            expect(result).toHaveProperty('timestamp');
            expect(result.data).toHaveProperty('processingTime');
            expect(result.data).toHaveProperty('fetchedAt');
        });
    });
});