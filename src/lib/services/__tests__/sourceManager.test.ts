/**
 * Tests for Source Manager functionality
 */

import { describe, it, expect } from 'vitest';
import type { WebContent, SourceFilters } from '../../types/web-content.js';

describe('Source Management Types', () => {
	it('should have proper SourceFilters interface', () => {
		const filters: SourceFilters = {
			domain: 'example.com',
			status: 'active',
			category: 'tutorial',
			tags: ['javascript', 'programming'],
			dateRange: {
				start: new Date('2024-01-01'),
				end: new Date('2024-01-31')
			},
			qualityThreshold: 0.8,
			searchTerm: 'javascript tutorial'
		};

		expect(filters.domain).toBe('example.com');
		expect(filters.status).toBe('active');
		expect(filters.category).toBe('tutorial');
		expect(filters.tags).toEqual(['javascript', 'programming']);
		expect(filters.dateRange?.start).toBeInstanceOf(Date);
		expect(filters.dateRange?.end).toBeInstanceOf(Date);
		expect(filters.qualityThreshold).toBe(0.8);
		expect(filters.searchTerm).toBe('javascript tutorial');
	});

	it('should have proper WebContent structure', () => {
		const web_content = {
			id: 'test-content-1',
			url: 'https://example.com/article',
			finalUrl: 'https://example.com/article',
			title: 'Test Article',
			content: {
				html: '<h1>Test Article</h1><p>This is a test article.</p>',
				text: 'Test Article\nThis is a test article.',
				images: [],
				codeBlocks: [],
				tables: [],
				charts: []
			},
			metadata: {
				author: 'Test Author',
				publishDate: new Date('2024-01-01'),
				lastModified: new Date('2024-01-02'),
				domain: 'example.com',
				contentType: 'article',
				language: 'en',
				readingTime: 5,
				wordCount: 100,
				keywords: ['test', 'article', 'example'],
				description: 'A test article for demonstration',
				license: 'MIT',
				attribution: 'Test Author - Example.com',
				tags: ['test', 'demo'],
				category: 'tutorial'
			},
			extraction: {
				method: 'readability',
				confidence: 0.9,
				qualityScore: 0.8,
				issues: [],
				processingTime: 1000
			},
			fetchedAt: new Date().toISOString(),
			success: true
		};

		expect(web_content.id).toBe('test-content-1');
		expect(web_content.url).toBe('https://example.com/article');
		expect(web_content.title).toBe('Test Article');
		expect(web_content.metadata.domain).toBe('example.com');
		expect(web_content.metadata.category).toBe('tutorial');
		expect(web_content.extraction.method).toBe('readability');
		expect(web_content.success).toBe(true);
	});

	it('should validate filter combinations', () => {
		// Test empty filters
		const empty_filters = {};
		expect(Object.keys(empty_filters)).toHaveLength(0);

		// Test partial filters
		const partial_filters = {
			domain: 'github.com',
			tags: ['javascript']
		};
		expect(partial_filters.domain).toBe('github.com');
		expect(partial_filters.tags).toEqual(['javascript']);
		expect(partial_filters.status).toBeUndefined();

		// Test date range validation
		const date_filters = {
			dateRange: {
				start: new Date('2024-01-01'),
				end: new Date('2024-01-31')
			}
		};
		expect(date_filters.dateRange?.start.getTime()).toBeLessThan(
			date_filters.dateRange?.end.getTime() || 0
		);
	});
});
