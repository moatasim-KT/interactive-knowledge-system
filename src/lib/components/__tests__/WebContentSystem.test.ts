/**
 * Basic integration test for the Web Content Sourcing System
 */

import { describe, it, expect } from 'vitest';
import { webContentState, webContentActions } from '$lib/stores/webContentState.svelte.js';

describe('Web Content Sourcing System', () => {
    it('should initialize with empty state', () => {
        expect(Object.keys(webContentState.sources.items)).toHaveLength(0);
        expect(Object.keys(webContentState.content.items)).toHaveLength(0);
        expect(webContentState.ui.activeView).toBe('sources');
    });

    it('should add a source to the store', () => {
        const mockSource = {
            id: 'test-source-1',
            title: 'Test Source',
            url: 'https://example.com',
            domain: 'example.com',
            status: 'active' as const,
            importDate: new Date(),
            lastChecked: new Date(),
            metadata: {
                category: 'test',
                tags: ['test'],
                description: 'Test source'
            },
            usage: {
                timesReferenced: 0,
                generatedModules: []
            }
        };

        webContentActions.addSource(mockSource);

        expect(webContentState.sources.items['test-source-1']).toBeDefined();
        expect(webContentState.sources.items['test-source-1'].title).toBe('Test Source');
    });

    it('should add content to the store', () => {
        const mockContent = {
            id: 'test-content-1',
            url: 'https://example.com',
            finalUrl: 'https://example.com',
            title: 'Test Content',
            content: {
                html: '<p>Test content</p>',
                text: 'Test content',
                images: [],
                codeBlocks: [],
                tables: [],
                charts: []
            },
            metadata: {
                domain: 'example.com',
                contentType: 'article',
                language: 'en',
                readingTime: 1,
                wordCount: 2,
                keywords: ['test'],
                description: 'Test content',
                attribution: 'https://example.com',
                tags: ['test'],
                category: 'test'
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

        webContentActions.addContent(mockContent);

        expect(webContentState.content.items['test-content-1']).toBeDefined();
        expect(webContentState.content.items['test-content-1'].title).toBe('Test Content');
    });

    it('should handle notifications', () => {
        webContentActions.addNotification({
            type: 'success',
            message: 'Test notification'
        });

        expect(webContentState.ui.notifications).toHaveLength(1);
        expect(webContentState.ui.notifications[0].message).toBe('Test notification');
        expect(webContentState.ui.notifications[0].type).toBe('success');
    });
});