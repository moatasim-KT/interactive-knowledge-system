import type { WebContentTool } from './types';

/**
 * Web Content Sourcing Tools
 * Defines the MCP tools available for web content sourcing
 */

export const WEB_CONTENT_TOOLS = {
	fetchWebContent: {
		name: 'fetchWebContent',
		description: 'Fetch and extract content from a web URL',
		parameters: {
			url: {
				type: 'string',
				description: 'The URL to fetch content from',
				required: true
			},
			options: {
				type: 'object',
				description: 'Additional fetch and extraction options',
				required: false,
				properties: {
					useHeadlessBrowser: {
						type: 'boolean',
						description: 'Whether to use a headless browser for JavaScript-heavy sites',
						default: false
					},
					timeout: {
						type: 'number',
						description: 'Request timeout in milliseconds',
						default: 30000
					},
					userAgent: {
						type: 'string',
						description: 'Custom user agent string'
					},
					followRedirects: {
						type: 'boolean',
						description: 'Whether to follow redirects',
						default: true
					},
					maxRedirects: {
						type: 'number',
						description: 'Maximum number of redirects to follow',
						default: 5
					},
					mainContentOnly: {
						type: 'boolean',
						description: 'Whether to extract only the main content',
						default: true
					},
					includeImages: {
						type: 'boolean',
						description: 'Whether to include images in the extracted content',
						default: true
					},
					includeLinks: {
						type: 'boolean',
						description: 'Whether to include links in the extracted content',
						default: true
					},
					includeMetadata: {
						type: 'boolean',
						description: 'Whether to include metadata in the extracted content',
						default: true
					},
					includeStructuredData: {
						type: 'boolean',
						description: 'Whether to include structured data in the extracted content',
						default: true
					}
				}
			}
		},
		output: {
			type: 'object',
			properties: {
				success: { type: 'boolean' },
				data: { $ref: '#/definitions/WebContent' },
				error: { type: 'string' }
			}
		}
	}
	// Add more tools here as needed
} as const satisfies Record<string, WebContentTool>;

/**
 * Get the schema for all web content tools
 */
export function getWebContentToolsSchema() {
	return {
		$schema: 'http://json-schema.org/draft-07/schema#',
		definitions: {
			WebContent: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					metadata: { $ref: '#/definitions/WebContentMetadata' },
					text: { type: 'string' },
					html: { type: 'string' },
					blocks: {
						type: 'array',
						items: { $ref: '#/definitions/ContentBlock' }
					},
					headers: {
						type: 'object',
						additionalProperties: { type: 'string' }
					},
					statusCode: { type: 'number' },
					error: {
						type: 'object',
						properties: {
							message: { type: 'string' },
							code: { type: 'string' },
							details: {}
						}
					},
					fetchedAt: { type: 'string', format: 'date-time' },
					processingTime: { type: 'number' }
				},
				required: ['id', 'metadata', 'text', 'html', 'blocks', 'fetchedAt', 'processingTime']
			},
			WebContentMetadata: {
				type: 'object',
				properties: {
					title: { type: 'string' },
					description: { type: 'string' },
					author: { type: 'string' },
					publishedDate: { type: 'string', format: 'date-time' },
					modifiedDate: { type: 'string', format: 'date-time' },
					language: { type: 'string' },
					contentType: { type: 'string' },
					wordCount: { type: 'number' },
					readingTime: { type: 'number' },
					url: { type: 'string', format: 'uri' },
					canonicalUrl: { type: 'string', format: 'uri' },
					siteName: { type: 'string' },
					categories: {
						type: 'array',
						items: { type: 'string' }
					},
					tags: {
						type: 'array',
						items: { type: 'string' }
					},
					image: { type: 'string', format: 'uri' },
					license: { type: 'string' }
				},
				required: ['url']
			},
			ContentBlock: {
				type: 'object',
				properties: {
					id: { type: 'string' },
					type: {
						type: 'string',
						enum: ['text', 'image', 'video', 'code', 'quiz', 'flashcard', 'diagram']
					},
					content: {},
					metadata: { type: 'object' }
				},
				required: ['id', 'type', 'content']
			}
		}
	};
}

/**
 * Type guard to check if a tool name is valid
 */
export function isWebContentTool(toolName: string): toolName is keyof typeof WEB_CONTENT_TOOLS {
	return toolName in WEB_CONTENT_TOOLS;
}
