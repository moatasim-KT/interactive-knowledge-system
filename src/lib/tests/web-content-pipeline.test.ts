/**
 * End-to-end test for web content processing pipeline
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webContentFetcher } from '../services/webContentFetcher.js';
import { interactiveAnalyzer } from '../services/interactiveAnalyzer.js';
import { processingPipeline } from '../services/processingPipeline.js';
import { webContentState, webContentActions } from '../stores/webContentState.svelte.js';

// Mock fetch for testing
global.fetch = vi.fn();

describe('Web Content Processing Pipeline', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset state
        Object.keys(webContentState.sources.items).forEach(key => {
            delete webContentState.sources.items[key];
        });
        Object.keys(webContentState.content.items).forEach(key => {
            delete webContentState.content.items[key];
        });
    });

    it('should fetch and process web content successfully', async () => {
        // Mock successful fetch response
        const mockHtml = `
            <html>
                <head>
                    <title>Test Article</title>
                    <meta name="description" content="A test article for processing">
                </head>
                <body>
                    <article>
                        <h1>Test Article</h1>
                        <p>This is a test article with some content.</p>
                        <pre><code class="javascript">
                            function hello() {
                                console.log("Hello, world!");
                            }
                        </code></pre>
                        <table>
                            <tr><th>Name</th><th>Value</th></tr>
                            <tr><td>Test</td><td>123</td></tr>
                        </table>
                    </article>
                </body>
            </html>
        `;

        (global.fetch as any).mockResolvedValue({
            ok: true,
            url: 'https://example.com/article',
            text: () => Promise.resolve(mockHtml),
            headers: new Map()
        });

        // Test web content fetching
        const webContent = await webContentFetcher.fetch('https://example.com/article');

        expect(webContent.success).toBe(true);
        expect(webContent.title).toBe('A test article for processing');
        expect(webContent.content.codeBlocks).toHaveLength(1);
        expect(webContent.content.codeBlocks[0].language).toBe('javascript');
        expect(webContent.content.tables).toHaveLength(1);
        expect(webContent.metadata.domain).toBe('example.com');
    });

    it('should analyze content for interactive opportunities', async () => {
        const mockWebContent = {
            id: 'test-content',
            url: 'https://example.com/article',
            title: 'Test Article',
            content: {
                html: '<p>Test content</p>',
                text: 'Test content with algorithm description',
                images: [],
                codeBlocks: [{
                    id: 'code-1',
                    code: 'function test() { return "hello"; }',
                    language: 'javascript',
                    interactive: false,
                    executable: false
                }],
                tables: [{
                    id: 'table-1',
                    headers: ['Name', 'Value'],
                    rows: [
                        ['Item 1', '100'],
                        ['Item 2', '200'],
                        ['Item 3', '300'],
                        ['Item 4', '400'],
                        ['Item 5', '500'],
                        ['Item 6', '600']
                    ]
                }],
                charts: [{
                    id: 'chart-1',
                    type: 'line',
                    detected: true,
                    data: null
                }],
                blocks: []
            },
            metadata: {
                domain: 'example.com',
                contentType: 'article',
                language: 'en',
                readingTime: 5,
                wordCount: 100,
                keywords: ['test'],
                description: 'Test article',
                attribution: 'https://example.com/article',
                tags: ['test'],
                category: 'technology'
            },
            extraction: {
                method: 'heuristic' as const,
                confidence: 0.8,
                qualityScore: 0.7,
                issues: [],
                processingTime: 1000
            },
            fetchedAt: new Date().toISOString(),
            success: true
        };

        // Mock storage service to avoid IndexedDB issues in tests
        vi.doMock('../services/storage.ts', () => ({
            storageService: {
                initialize: vi.fn().mockResolvedValue(undefined),
                getContent: vi.fn().mockResolvedValue(mockWebContent)
            }
        }));

        // Mock the analyzer initialization to avoid storage dependency
        vi.spyOn(interactiveAnalyzer, 'initialize').mockResolvedValue(undefined);

        const analysis = await interactiveAnalyzer.analyzeContent('test-content');

        expect(analysis.opportunities).toBeDefined();
        expect(analysis.opportunities.length).toBeGreaterThan(0);

        // Should detect interactive code opportunity
        const codeOpportunity = analysis.opportunities.find(op => op.type === 'interactive-code');
        expect(codeOpportunity).toBeDefined();
        expect(codeOpportunity?.confidence).toBeGreaterThan(0.5);

        // Should detect interactive table opportunity
        const tableOpportunity = analysis.opportunities.find(op => op.type === 'interactive-table');
        expect(tableOpportunity).toBeDefined();

        // Should detect interactive chart opportunity
        const chartOpportunity = analysis.opportunities.find(op => op.type === 'interactive-chart');
        expect(chartOpportunity).toBeDefined();

        // Should detect simulation opportunity
        const simulationOpportunity = analysis.opportunities.find(op => op.type === 'simulation');
        expect(simulationOpportunity).toBeDefined();
    });

    it('should handle processing pipeline workflow', async () => {
        // Mock successful processing
        const jobId = await processingPipeline.startProcessing(['https://example.com/test'], {
            skipProcessing: false,
            enableAiEnhancements: true
        });

        expect(jobId).toBeDefined();
        expect(typeof jobId.id).toBe('string');
        expect(jobId.success).toBe(true);
    });

    it('should handle batch processing', async () => {
        const urls = [
            'https://example.com/article1',
            'https://example.com/article2',
            'https://example.com/article3'
        ];

        const batchJob = await processingPipeline.startBatchProcessing(urls, {
            skipProcessing: false,
            enableAiEnhancements: false
        });

        expect(batchJob).toBeDefined();
        expect(typeof batchJob.id).toBe('string');
    });

    it('should handle errors gracefully', async () => {
        // Mock fetch failure
        (global.fetch as any).mockRejectedValue(new Error('Network error'));

        const webContent = await webContentFetcher.fetch('https://invalid-url.com');

        expect(webContent.success).toBe(false);
        expect(webContent.extraction.issues).toContain('Network error');
    });

    it('should integrate with web content state', () => {
        const mockSource = {
            id: 'test-source',
            title: 'Test Source',
            url: 'https://example.com',
            domain: 'example.com',
            status: 'active' as const,
            importDate: new Date(),
            lastChecked: new Date(),
            metadata: {
                domain: 'example.com',
                contentType: 'webpage',
                language: 'en',
                readingTime: 5,
                wordCount: 100,
                keywords: ['test'],
                description: 'Test source',
                attribution: 'https://example.com',
                tags: ['test'],
                category: 'test'
            },
            usage: {
                timesReferenced: 0,
                lastAccessed: new Date(),
                generatedModules: []
            }
        };

        webContentActions.addSource(mockSource);

        expect(webContentState.sources.items['test-source']).toBeDefined();
        expect(webContentState.sources.items['test-source'].title).toBe('Test Source');
    });

    it('should track transformation opportunities', () => {
        const opportunities = [
            {
                id: 'opp-1',
                type: 'interactive-chart' as const,
                title: 'Interactive Chart',
                description: 'Make chart interactive',
                confidence: 0.8,
                reasoning: 'Chart detected',
                sourceElement: 'chart-1',
                parameters: {}
            }
        ];

        webContentActions.setTransformationOpportunities(opportunities);

        expect(webContentState.transformation.opportunities).toHaveLength(1);
        expect(webContentState.transformation.opportunities[0].type).toBe('interactive-chart');
    });
});