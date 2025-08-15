/**
 * Integration tests for Enhanced Web Content Fetcher Service
 * Tests real-world scenarios with different content types
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebContentFetcher } from '../webContentFetcher.js';

// Mock the logger
vi.mock('../utils/logger.js', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    })
}));

// Mock the error handler
vi.mock('../webContentErrorHandler.js', () => ({
    webContentErrorHandler: {
        handleError: vi.fn().mockReturnValue({
            code: 'NETWORK_ERROR',
            message: 'Network connection failed',
            userMessage: 'Unable to connect to the website',
            recoverable: true,
            retryable: true
        })
    }
}));

describe('WebContentFetcher Integration Tests', () => {
    let fetcher: WebContentFetcher;

    beforeEach(() => {
        fetcher = new WebContentFetcher();
        vi.clearAllMocks();
    });

    describe('HTML Content Extraction', () => {
        it('should extract content from HTML with semantic elements', async () => {
            const mockHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Test Article</title>
                    <meta name="description" content="A test article for extraction">
                    <meta name="author" content="Test Author">
                </head>
                <body>
                    <header>
                        <nav>Navigation</nav>
                    </header>
                    <main>
                        <article>
                            <h1>Main Article Title</h1>
                            <p>This is the main content of the article.</p>
                            <p>It contains multiple paragraphs with useful information.</p>
                            <pre><code class="language-javascript">
                                console.log('Hello, world!');
                            </code></pre>
                        </article>
                    </main>
                    <footer>Footer content</footer>
                </body>
                </html>
            `;

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                url: 'https://example.com/article',
                headers: new Map([['content-type', 'text/html']]),
                text: () => Promise.resolve(mockHtml)
            });

            const result = await fetcher.fetch('https://example.com/article');

            expect(result.success).toBe(true);
            expect(result.title).toBe('Test Article');
            expect(result.content.text).toContain('main content of the article');
            expect(result.content.codeBlocks).toHaveLength(1);
            expect(result.content.codeBlocks[0].language).toBe('javascript');
            expect(result.metadata.author).toBe('Test Author');
            expect(result.extraction.method).toBe('auto');
        });

        it('should use readability algorithm for complex HTML', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                url: 'https://example.com/complex',
                headers: new Map([['content-type', 'text/html']]),
                text: () => Promise.resolve('<html><body><div class="content"><p>Complex content</p></div></body></html>')
            });

            const result = await fetcher.fetch('https://example.com/complex', {
                extractionMethod: 'readability'
            });

            expect(result.success).toBe(true);
            expect(result.extraction.method).toBe('readability');
        });
    });

    describe('JSON Content Extraction', () => {
        it('should extract content from JSON data', async () => {
            const mockJson = {
                title: 'API Response',
                description: 'Sample API data',
                data: [
                    { id: 1, name: 'Item 1', value: 100 },
                    { id: 2, name: 'Item 2', value: 200 }
                ],
                keywords: ['api', 'data', 'json']
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                url: 'https://api.example.com/data',
                headers: new Map([['content-type', 'application/json']]),
                text: () => Promise.resolve(JSON.stringify(mockJson))
            });

            const result = await fetcher.fetch('https://api.example.com/data');

            expect(result.success).toBe(true);
            expect(result.title).toBe('API Response');
            expect(result.metadata.contentType).toBe('json');
            expect(result.metadata.keywords).toContain('api');
            expect(result.content.codeBlocks).toHaveLength(1);
            expect(result.content.codeBlocks[0].language).toBe('json');
            expect(result.content.tables).toHaveLength(1);
            expect(result.content.tables[0].headers).toEqual(['id', 'name', 'value']);
        });
    });

    describe('RSS Feed Extraction', () => {
        it('should extract content from RSS feed', async () => {
            const mockRss = `
                <?xml version="1.0" encoding="UTF-8"?>
                <rss version="2.0">
                    <channel>
                        <title>Test Blog</title>
                        <description>A test blog feed</description>
                        <item>
                            <title>First Post</title>
                            <description>Content of the first post</description>
                            <link>https://example.com/post1</link>
                            <pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>
                        </item>
                        <item>
                            <title>Second Post</title>
                            <description>Content of the second post</description>
                            <link>https://example.com/post2</link>
                        </item>
                    </channel>
                </rss>
            `;

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                url: 'https://example.com/feed.rss',
                headers: new Map([['content-type', 'application/rss+xml']]),
                text: () => Promise.resolve(mockRss)
            });

            const result = await fetcher.fetch('https://example.com/feed.rss');

            expect(result.success).toBe(true);
            expect(result.title).toBe('Test Blog');
            expect(result.metadata.contentType).toBe('rss');
            expect(result.metadata.category).toBe('news');
            expect(result.content.html).toContain('First Post');
            expect(result.content.html).toContain('Second Post');
            expect(result.content.text).toContain('First Post');
        });
    });

    describe('Error Handling and Retry Logic', () => {
        it('should handle timeout errors with retry', async () => {
            let callCount = 0;
            global.fetch = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount <= 2) {
                    return Promise.reject(new Error('Request timeout'));
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    url: 'https://example.com',
                    headers: new Map([['content-type', 'text/html']]),
                    text: () => Promise.resolve('<html><body><h1>Success</h1></body></html>')
                });
            });

            const result = await fetcher.fetch('https://example.com', {
                retryAttempts: 3,
                retryDelay: 100 // Faster for testing
            });

            expect(callCount).toBe(3);
            expect(result.success).toBe(true);
        });

        it('should handle HTTP errors appropriately', async () => {
            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                url: 'https://example.com/missing',
                headers: new Map([['content-type', 'text/html']]),
                text: () => Promise.resolve('')
            });

            const result = await fetcher.fetch('https://example.com/missing');

            expect(result.success).toBe(false);
            expect(result.metadata.category).toBe('error');
            expect(result.extraction.issues).toHaveLength(1);
        });
    });

    describe('Content Type Detection', () => {
        it('should detect JavaScript-heavy sites', async () => {
            const needsJs = await fetcher.checkIfNeedsJavaScript('https://twitter.com/user');
            expect(needsJs).toBe(true);
        });

        it('should not require JavaScript for simple sites', async () => {
            const needsJs = await fetcher.checkIfNeedsJavaScript('https://example.com');
            expect(needsJs).toBe(false);
        });

        it('should support custom content type handlers', () => {
            const customHandler = {
                canHandle: (contentType: string) => contentType.includes('application/custom'),
                extract: vi.fn().mockResolvedValue({
                    id: 'custom',
                    url: 'test',
                    title: 'Custom Content',
                    content: { html: '', text: '', images: [], codeBlocks: [], tables: [], charts: [], blocks: [] },
                    metadata: { domain: 'test', contentType: 'custom', language: 'en', readingTime: 0, wordCount: 0, keywords: [], description: '', attribution: '', tags: [], category: 'custom' },
                    extraction: { method: 'custom', confidence: 1, qualityScore: 1, issues: [], processingTime: 0 },
                    fetchedAt: new Date().toISOString(),
                    success: true
                })
            };

            fetcher.addContentTypeHandler(customHandler);

            const supportedTypes = fetcher.getSupportedContentTypes();
            expect(supportedTypes).toContain('text/html');
            expect(supportedTypes).toContain('application/json');
        });
    });
});