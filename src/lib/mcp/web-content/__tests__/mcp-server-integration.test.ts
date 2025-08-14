/**
 * Integration tests for MCP server functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebContentMcpServer } from '../web-content-mcp-server.js';
import { webContentActions } from '../../../stores/webContentState.svelte.js';

// Mock the stores and services
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

vi.mock('../../../services/webContentFetcher.js', () => ({
    webContentFetcher: {
        fetch: vi.fn().mockResolvedValue({
            id: 'test-content-id',
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
            sourceId: 'test-source-id',
            source: {
                id: 'test-source-id',
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

describe('MCP Server Integration Tests', () => {
    let mcpServer: WebContentMcpServer;

    beforeEach(() => {
        vi.clearAllMocks();
        mcpServer = new WebContentMcpServer();
        mcpServer.initialize();
    });

    describe('Server Initialization', () => {
        it('should initialize successfully', () => {
            expect(mcpServer).toBeDefined();
        });

        it('should return available tools', () => {
            const tools = mcpServer.getAvailableTools();
            expect(tools).toBeDefined();
            expect(Array.isArray(tools)).toBe(true);
            expect(tools.length).toBeGreaterThan(0);
        });

        it('should have required tools', () => {
            const tools = mcpServer.getAvailableTools();
            const toolNames = tools.map(t => t.name);

            expect(toolNames).toContain('fetchWebContent');
            expect(toolNames).toContain('batchImportUrls');
            expect(toolNames).toContain('transformToInteractive');
            expect(toolNames).toContain('manageContentSources');
        });
    });

    describe('fetchWebContent Tool', () => {
        it('should fetch web content successfully', async () => {
            const result = await mcpServer.executeTool('fetchWebContent', {
                url: 'https://example.com',
                options: {
                    timeout: 10000,
                    extractInteractive: true
                }
            });

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.timestamp).toBeDefined();
        });

        it('should handle invalid URLs gracefully', async () => {
            try {
                await mcpServer.executeTool('fetchWebContent', {
                    url: 'invalid-url',
                    options: {}
                });
            } catch (error) {
                expect(error).toBeDefined();
                expect(error instanceof Error).toBe(true);
            }
        });

        it('should update UI state during processing', async () => {
            await mcpServer.executeTool('fetchWebContent', {
                url: 'https://example.com',
                options: {}
            });

            expect(webContentActions.setContentProcessing).toHaveBeenCalled();
            expect(webContentActions.addNotification).toHaveBeenCalled();
            expect(webContentActions.addContent).toHaveBeenCalled();
            expect(webContentActions.addSource).toHaveBeenCalled();
        });
    });

    describe('batchImportUrls Tool', () => {
        it('should process multiple URLs', async () => {
            const result = await mcpServer.executeTool('batchImportUrls', {
                urls: ['https://example.com', 'https://httpbin.org/json'],
                options: {
                    concurrency: 2,
                    extractInteractive: false
                }
            });

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.totalUrls).toBe(2);
        });

        it('should handle empty URL list', async () => {
            const result = await mcpServer.executeTool('batchImportUrls', {
                urls: [],
                options: {}
            });

            expect(result).toBeDefined();
            expect(result.data.totalUrls).toBe(0);
        });

        it('should update batch processing state', async () => {
            await mcpServer.executeTool('batchImportUrls', {
                urls: ['https://example.com'],
                options: {}
            });

            expect(webContentActions.addBatchJob).toHaveBeenCalled();
            expect(webContentActions.setActiveBatchJob).toHaveBeenCalled();
            expect(webContentActions.setBatchProcessing).toHaveBeenCalled();
        });
    });

    describe('manageContentSources Tool', () => {
        it('should list sources', async () => {
            const result = await mcpServer.executeTool('manageContentSources', {
                action: 'list',
                filters: {}
            });

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.action).toBe('list');
        });

        it('should handle different actions', async () => {
            const actions = ['list', 'update', 'validate', 'health-check'];

            for (const action of actions) {
                const result = await mcpServer.executeTool('manageContentSources', {
                    action,
                    sourceId: action === 'list' ? undefined : 'test-source-id'
                });

                expect(result).toBeDefined();
                expect(result.action).toBe(action);
            }
        });
    });

    describe('transformToInteractive Tool', () => {
        it('should transform content', async () => {
            const result = await mcpServer.executeTool('transformToInteractive', {
                contentId: 'test-content-id',
                transformationType: 'auto',
                domain: 'technology'
            });

            expect(result).toBeDefined();
            expect(result.success).toBe(true);
        });

        it('should handle different transformation types', async () => {
            const types = ['auto', 'visualization', 'simulation', 'chart', 'quiz'];

            for (const type of types) {
                const result = await mcpServer.executeTool('transformToInteractive', {
                    contentId: 'test-content-id',
                    transformationType: type
                });

                expect(result).toBeDefined();
                expect(result.success).toBe(true);
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle unknown tools', async () => {
            try {
                await mcpServer.executeTool('unknownTool', {});
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeDefined();
                expect(error instanceof Error).toBe(true);
                expect((error as Error).message).toContain('Unknown tool');
            }
        });

        it('should handle missing required parameters', async () => {
            try {
                await mcpServer.executeTool('fetchWebContent', {});
                expect(true).toBe(false); // Should not reach here
            } catch (error) {
                expect(error).toBeDefined();
                expect(error instanceof Error).toBe(true);
            }
        });
    });

    describe('Tool Schemas', () => {
        it('should have proper input schemas for all tools', () => {
            const tools = mcpServer.getAvailableTools();

            for (const tool of tools) {
                expect(tool.inputSchema).toBeDefined();
                expect(tool.inputSchema.type).toBe('object');
                expect(tool.inputSchema.properties).toBeDefined();
            }
        });

        it('should have required fields marked correctly', () => {
            const tools = mcpServer.getAvailableTools();
            const fetchTool = tools.find(t => t.name === 'fetchWebContent');

            expect(fetchTool).toBeDefined();
            expect(fetchTool!.inputSchema.required).toContain('url');
        });
    });
});