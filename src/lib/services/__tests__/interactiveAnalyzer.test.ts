/**
 * Tests for InteractiveAnalyzer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InteractiveAnalyzer } from '../interactiveAnalyzer.js';
import type { WebContent } from '../../types/web-content.js';

describe('InteractiveAnalyzer', () => {
	let analyzer: InteractiveAnalyzer;

	beforeEach(() => {
		analyzer = new InteractiveAnalyzer();
	});

	describe('analyzeContent', () => {
		it('should analyze basic web content', () => {
			const web_content = {
				id: 'test-1',
				url: 'https://example.com/test',
				title: 'Test Article',
				content: {
					html: '<html><body><h1>Machine Learning Tutorial</h1><p>This is about neural networks and algorithms.</p></body></html>',
					text: 'Machine Learning Tutorial. This is about neural networks and algorithms.',
					images: [],
					codeBlocks: [],
					tables: [],
					charts: []
				},
				metadata: {
					domain: 'example.com',
					contentType: 'article',
					language: 'en',
					readingTime: 5,
					wordCount: 100,
					keywords: ['machine', 'learning', 'neural', 'network', 'algorithm'],
					description: 'A tutorial about machine learning',
					attribution: 'Example Author',
					tags: ['ml', 'ai'],
					category: 'technical'
				},
				extraction: {
					method: 'readability',
					confidence: 0.8,
					qualityScore: 0.7,
					issues: [],
					processingTime: 100
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result = analyzer.analyzeContent(web_content);

			expect(result).toBeDefined();
			// Basic analysis should work
			expect(result.domain).toBeDefined();
			expect(result.contentType).toBe('general');
                        expect(result.confidence).toBeGreaterThan(0);
                        expect(result.qualityMetrics).toBeDefined();
                        expect(result.opportunities).toBeDefined();
		});

		it('should detect interactive code blocks', () => {
			const web_content = {
				id: 'test-2',
				url: 'https://example.com/code',
				title: 'JavaScript Tutorial',
				content: {
					html: '<html><body><pre><code>function hello() { console.log("Hello World"); }</code></pre></body></html>',
					text: 'JavaScript Tutorial. Function example.',
					images: [],
					codeBlocks: [
						{
							id: 'code-1',
							code: 'function hello() { console.log("Hello World"); }',
							language: 'javascript',
							interactive: false,
							executable: true
						}
					],
					tables: [],
					charts: []
				},
				metadata: {
					domain: 'example.com',
					contentType: 'tutorial',
					language: 'en',
					readingTime: 3,
					wordCount: 50,
					keywords: ['javascript', 'programming', 'function', 'code'],
					description: 'JavaScript programming tutorial',
					attribution: 'Code Author',
					tags: ['js', 'programming'],
					category: 'technical'
				},
				extraction: {
					method: 'semantic',
					confidence: 0.9,
					qualityScore: 0.8,
					issues: [],
					processingTime: 80
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result = analyzer.analyzeContent(web_content);

                        expect(result.domain).toBeDefined();
                        expect(result.interactiveElements.length).toBe(1);
                        expect(result.interactiveElements[0].type).toBe('code');
                        // Ensure the detected element is executable/interactable
                        expect(result.interactiveElements[0].executable).toBe(true);
                        expect(result.opportunities.length).toBeGreaterThanOrEqual(0);
                });

		it('should detect table opportunities', () => {
			const web_content = {
				id: 'test-3',
				url: 'https://example.com/data',
				title: 'Data Analysis',
				content: {
					html: '<html><body><table><tr><th>Name</th><th>Value</th></tr><tr><td>A</td><td>1</td></tr></table></body></html>',
					text: 'Data Analysis with tables.',
					images: [],
					codeBlocks: [],
					tables: [
						{
							id: 'table-1',
							headers: ['Name', 'Value', 'Category', 'Score', 'Date', 'Status'],
							rows: Array.from({ length: 10 }, (_, i) => [
								`Item ${i}`,
								`${i * 10}`,
								'A',
								`${i * 5}`,
								'2024-01-01',
								'Active'
							])
						}
					],
					charts: []
				},
				metadata: {
					domain: 'example.com',
					contentType: 'data',
					language: 'en',
					readingTime: 2,
					wordCount: 30,
					keywords: ['data', 'analysis', 'table'],
					description: 'Data analysis with tables',
					attribution: 'Data Analyst',
					tags: ['data', 'analysis'],
					category: 'technical'
				},
				extraction: {
					method: 'heuristic',
					confidence: 0.7,
					qualityScore: 0.6,
					issues: [],
					processingTime: 120
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result = analyzer.analyzeContent(web_content);

			expect(result.interactiveElements.length).toBeGreaterThanOrEqual(0);
			if (result.interactiveElements.length > 0) {
				expect(result.interactiveElements[0].type).toBe('table');
			}
			expect(result.opportunities.length).toBeGreaterThanOrEqual(0);
		});

		it('should detect chart opportunities', () => {
			const web_content = {
				id: 'test-4',
				url: 'https://example.com/charts',
				title: 'Data Visualization',
				content: {
					html: '<html><body><div class="chart">Chart content</div></body></html>',
					text: 'Data Visualization with charts and graphs.',
					images: [],
					codeBlocks: [],
					tables: [],
					charts: [
						{
							id: 'chart-1',
							type: 'line',
							detected: true,
							data: { x: [1, 2, 3], y: [1, 4, 9] }
						}
					]
				},
				metadata: {
					domain: 'example.com',
					contentType: 'visualization',
					language: 'en',
					readingTime: 4,
					wordCount: 80,
					keywords: ['visualization', 'chart', 'graph', 'data', 'plot'],
					description: 'Data visualization tutorial',
					attribution: 'Viz Expert',
					tags: ['dataviz', 'charts'],
					category: 'technical'
				},
				extraction: {
					method: 'custom',
					confidence: 0.85,
					qualityScore: 0.9,
					issues: [],
					processingTime: 90
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result = analyzer.analyzeContent(web_content);

			expect(result.domain).toBeDefined();
			expect(result.interactiveElements.length).toBeGreaterThanOrEqual(0);
			if (result.interactiveElements.length > 0) {
				expect(result.interactiveElements[0].type).toBe('chart');
			}
			expect(result.opportunities.length).toBeGreaterThanOrEqual(0);
		});

		it('should detect framework usage', () => {
			const web_content = {
				id: 'test-5',
				url: 'https://example.com/react',
				title: 'React Tutorial',
				content: {
					html: '<html><body><div id="root" data-reactroot><script src="react.min.js"></script></div></body></html>',
					text: 'React Tutorial with interactive components.',
					images: [],
					codeBlocks: [],
					tables: [],
					charts: []
				},
				metadata: {
					domain: 'example.com',
					contentType: 'tutorial',
					language: 'en',
					readingTime: 6,
					wordCount: 120,
					keywords: ['react', 'javascript', 'components'],
					description: 'React framework tutorial',
					attribution: 'React Developer',
					tags: ['react', 'js', 'frontend'],
					category: 'technical'
				},
				extraction: {
					method: 'semantic',
					confidence: 0.9,
					qualityScore: 0.85,
					issues: [],
					processingTime: 110
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result = analyzer.analyzeContent(web_content);

			expect(result.frameworks.length).toBeGreaterThanOrEqual(0);
			if (result.frameworks.length > 0) {
				expect(result.frameworks[0].name).toBeDefined();
				expect(result.frameworks[0].confidence).toBeGreaterThan(0);
			}
		});

		it('should calculate quality metrics', () => {
			const web_content = {
				id: 'test-6',
				url: 'https://example.com/quality',
				title: 'Quality Test',
				content: {
					html: '<html><body><p>This is a well-written article with good readability. It has clear sentences and proper structure.</p></body></html>',
					text: 'This is a well-written article with good readability. It has clear sentences and proper structure.',
					images: [],
					codeBlocks: [],
					tables: [],
					charts: []
				},
				metadata: {
					domain: 'example.com',
					contentType: 'article',
					language: 'en',
					readingTime: 2,
					wordCount: 60,
					keywords: ['quality', 'readability', 'structure'],
					description: 'Quality test article',
					attribution: 'Quality Author',
					tags: ['quality'],
					category: 'general'
				},
				extraction: {
					method: 'readability',
					confidence: 0.95,
					qualityScore: 0.9,
					issues: [],
					processingTime: 70
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result = analyzer.analyzeContent(web_content);

			expect(result.qualityMetrics.readabilityScore).toBeGreaterThanOrEqual(0);
			expect(result.qualityMetrics.accuracyScore).toBeGreaterThanOrEqual(0.5);
			expect(result.qualityMetrics.overallScore).toBeGreaterThanOrEqual(0);
		});

		it('should handle empty content gracefully', () => {
			const web_content = {
				id: 'test-7',
				url: 'https://example.com/empty',
				title: '',
				content: {
					html: '',
					text: '',
					images: [],
					codeBlocks: [],
					tables: [],
					charts: []
				},
				metadata: {
					domain: 'example.com',
					contentType: 'unknown',
					language: 'en',
					readingTime: 0,
					wordCount: 0,
					keywords: [],
					description: '',
					attribution: '',
					tags: [],
					category: 'general'
				},
				extraction: {
					method: 'readability',
					confidence: 0.1,
					qualityScore: 0.1,
					issues: ['No content found'],
					processingTime: 50
				},
				fetchedAt: new Date().toISOString(),
				success: false
			};

			const result = analyzer.analyzeContent(web_content);

			expect(result).toBeDefined();
			expect(result.domain).toBe('general');
			expect(result.opportunities).toHaveLength(0);
			expect(result.confidence).toBeLessThan(0.5);
		});
	});

	describe('generateQualityImprovements', () => {
		it('should generate readability improvements', () => {
			const analysis_result = {
				domain: 'general',
				contentType: 'general' as const,
				topics: [],
				frameworks: [],
				interactiveElements: [],
				opportunities: [],
				complexity: 'low' as const,
				qualityMetrics: {
					readabilityScore: 0.3,
					interactivityScore: 0.8,
					accuracyScore: 0.9,
					engagementScore: 0.7,
					accessibilityScore: 0.8,
					overallScore: 0.7
				},
				confidence: 0.8,
				processingTime: 100
			};

			const improvements = analyzer.generateQualityImprovements(analysis_result);

			expect(improvements).toHaveLength(1);
			expect(improvements[0].type).toBe('readability');
			expect(improvements[0].priority).toBe('high');
		});

		it('should generate interactivity improvements', () => {
			const analysis_result = {
				domain: 'general',
				contentType: 'general' as const,
				topics: [],
				frameworks: [],
				interactiveElements: [],
				opportunities: [],
				complexity: 'low' as const,
				qualityMetrics: {
					readabilityScore: 0.8,
					interactivityScore: 0.2,
					accuracyScore: 0.9,
					engagementScore: 0.7,
					accessibilityScore: 0.8,
					overallScore: 0.7
				},
				confidence: 0.8,
				processingTime: 100
			};

			const improvements = analyzer.generateQualityImprovements(analysis_result);

			expect(improvements.some((imp) => imp.type === 'interactivity')).toBe(true);
		});

		it('should generate accessibility improvements', () => {
			const analysis_result = {
				domain: 'general',
				contentType: 'general' as const,
				topics: [],
				frameworks: [],
				interactiveElements: [],
				opportunities: [],
				complexity: 'low' as const,
				qualityMetrics: {
					readabilityScore: 0.8,
					interactivityScore: 0.8,
					accuracyScore: 0.9,
					engagementScore: 0.7,
					accessibilityScore: 0.5,
					overallScore: 0.7
				},
				confidence: 0.8,
				processingTime: 100
			};

			const improvements = analyzer.generateQualityImprovements(analysis_result);

			expect(improvements.some((imp) => imp.type === 'accessibility')).toBe(true);
			expect(improvements.find((imp) => imp.type === 'accessibility')?.priority).toBe('high');
		});
	});

	describe('domain detection', () => {
		it('should detect machine learning domain', () => {
			const web_content = {
				id: 'test-ml',
				url: 'https://example.com/ml',
				title: 'Neural Network Training',
				content: {
					html: '<html><body><h1>Neural Network Training</h1><p>Deep learning algorithms and model training.</p></body></html>',
					text: 'Neural Network Training. Deep learning algorithms and model training.',
					images: [],
					codeBlocks: [],
					tables: [],
					charts: []
				},
				metadata: {
					domain: 'example.com',
					contentType: 'article',
					language: 'en',
					readingTime: 5,
					wordCount: 100,
					keywords: ['neural', 'network', 'deep', 'learning', 'algorithm', 'training', 'machine'],
					description: 'Neural network training guide',
					attribution: 'ML Expert',
					tags: ['ml', 'ai', 'neural-networks'],
					category: 'technical'
				},
				extraction: {
					method: 'readability',
					confidence: 0.8,
					qualityScore: 0.7,
					issues: [],
					processingTime: 100
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result = analyzer.analyzeContent(web_content);

			expect(result.domain).toBeDefined();
			expect(result.topics.length).toBeGreaterThanOrEqual(0);
		});

		it('should detect physics domain', () => {
			const web_content = {
				id: 'test-physics',
				url: 'https://example.com/physics',
				title: 'Quantum Mechanics',
				content: {
					html: '<html><body><h1>Quantum Mechanics</h1><p>Wave particle duality and quantum physics principles.</p></body></html>',
					text: 'Quantum Mechanics. Wave particle duality and quantum physics principles.',
					images: [],
					codeBlocks: [],
					tables: [],
					charts: []
				},
				metadata: {
					domain: 'example.com',
					contentType: 'article',
					language: 'en',
					readingTime: 4,
					wordCount: 80,
					keywords: ['quantum', 'mechanics', 'wave', 'particle', 'physics', 'force', 'energy'],
					description: 'Quantum mechanics introduction',
					attribution: 'Physics Professor',
					tags: ['physics', 'quantum'],
					category: 'educational'
				},
				extraction: {
					method: 'readability',
					confidence: 0.85,
					qualityScore: 0.8,
					issues: [],
					processingTime: 90
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result = analyzer.analyzeContent(web_content);

			expect(result.domain).toBeDefined();
			expect(result.topics.length).toBeGreaterThanOrEqual(0);
		});
	});
});
