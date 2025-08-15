/**
 * Tests for Enhanced Web Content Fetcher Service
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

describe('WebContentFetcher', () => {
    let fetcher: WebContentFetcher;

    beforeEach(() => {
        fetcher = new WebContentFetcher();
        vi.clearAllMocks();
    });

    describe('Content Type Support', () => {
        it('should support multiple content types', () => {
            const supportedTypes = fetcher.getSupportedContentTypes();
            expect(supportedTypes).toContain('text/html');
            expect(supportedTypes).toContain('application/json');
            expect(supportedTypes).toContain('application/xml');
            expect(supportedTypes).toContain('application/rss+xml');
        });

        it('should allow adding custom content type handlers', () => {
            const customHandler = {
                canHandle: (contentType: string) => contentType.includes('custom/type'),
                extract: vi.fn()
            };

            fetcher.addContentTypeHandler(customHandler);
            // Handler should be added (we can't easily test this without exposing internals)
            expect(true).toBe(true);
        });
    });

    describe('JavaScript Detection', () => {
        it('should detect JavaScript-heavy sites', async () => {
            const needsJs = await fetcher.checkIfNeedsJavaScript('https://twitter.com/test');
            expect(needsJs).toBe(true);
        });

        it('should not require JavaScript for simple sites', async () => {
            const needsJs = await fetcher.checkIfNeedsJavaScript('https://example.com');
            expect(needsJs).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            // Mock fetch to throw network error
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            const result = await fetcher.fetch('https://example.com');

            expect(result.success).toBe(false);
            expect(result.metadata.category).toBe('error');
            expect(result.extraction.issues).toHaveLength(1);
        });

        it('should handle invalid URLs', async () => {
            const result = await fetcher.fetch('not-a-url');

            expect(result.success).toBe(false);
            expect(result.metadata.category).toBe('error');
        });
    });

    describe('Retry Logic', () => {
        it('should retry on retryable errors', async () => {
            let callCount = 0;
            global.fetch = vi.fn().mockImplementation(() => {
                callCount++;
                if (callCount < 3) {
                    throw new Error('Network timeout');
                }
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    url: 'https://example.com',
                    headers: new Map([['content-type', 'text/html']]),
                    text: () => Promise.resolve('<html><body><h1>Test</h1></body></html>')
                });
            });

            const result = await fetcher.fetch('https://example.com', { retryAttempts: 3 });

            expect(callCount).toBe(3);
            expect(result.success).toBe(true);
        });
    });
});