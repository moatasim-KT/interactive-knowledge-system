import { Server, type ServerOptions as BaseServerOptions } from '@modelcontextprotocol/sdk/server';
import { WebContentFetcher, type WebContentFetcherOptions } from './fetcher.js';
import type {
	WebContentTool,
	WebContentFetchOptions,
	WebContentExtractOptions,
	WebContent
} from './types';
import { WEB_CONTENT_TOOLS } from './tools';
import { createLogger } from '$lib/utils/logger';

// Import process for Node.js environment
import process from 'node:process';

/**
 * Extended server options with WebContentFetcher specific options
 */
export interface ServerOptions extends BaseServerOptions {
	fetcherOptions?: WebContentFetcherOptions;
}

export class WebContentMcpServer {
	private server: Server;
	private fetcher: WebContentFetcher;
	private logger = createLogger('mcp:web-content');

	constructor(options: ServerOptions = {}) {
		// Initialize the MCP server
		this.server = new Server({
			name: 'web-content-sourcing',
			version: '1.0.0',
			description: 'MCP server for web content sourcing and processing',
			...options
		});

		// Initialize the web content fetcher
		this.fetcher = new WebContentFetcher({
			// Default options can be overridden by passing them in the constructor
			...options.fetcherOptions
		});

		// Register tools
		this.registerTools();

		// Register error handlers
		this.registerErrorHandlers();
	}

	/**
	 * Register all available tools
	 */
	private registerTools(): void {
		// Register each tool from the tools definition
		Object.entries(WEB_CONTENT_TOOLS).forEach(([name, tool]) => {
			this.server.tool(name, {
				description: tool.description,
				parameters: tool.parameters,
				handler: this.handleToolCall.bind(this, name as keyof typeof WEB_CONTENT_TOOLS)
			});
		});

		this.logger.info(`Registered ${Object.keys(WEB_CONTENT_TOOLS).length} tools`);
	}

	/**
	 * Handle tool calls
	 */
	private async handleToolCall(
		toolName: keyof typeof WEB_CONTENT_TOOLS,
		params: Record<string, unknown>
	): Promise<unknown> {
		this.logger.debug(`Handling tool call: ${toolName}`, { params });

		try {
			// Type-safe parameter handling
			const safe_params = params as { url: string; options?: Record<string, unknown> };

			switch (toolName) {
				case 'fetchWebContent':
					return await this.handle_fetch_web_content(safe_params);
				// Add more tool handlers here as needed

				default:
					throw new Error(`Unhandled tool: ${String(toolName)}`);
			}
		} catch (error) {
			this.logger.error(`Error in tool ${String(toolName)}:`, error);
			throw error;
		}
	}

	/**
	 * Handle fetchWebContent tool call
	 */
	/**
	 * Handle fetch web content tool call
	 */
	private async handle_fetch_web_content(params: {
		url: string;
		options?: {
			fetchOptions?: WebContentFetchOptions;
			extractionOptions?: WebContentExtractOptions;
			[key: string]: unknown;
		};
	}): Promise<{
		success: boolean;
		data?: Partial<WebContent> & {
			processing_time: number;
			fetched_at: string;
		};
		error?: string;
	}> {
		const { url, options = {} } = params;
		const {
			fetchOptions: fetchOptions = {},
			extractionOptions: extractionOptions = {},
			...other_options
		} = options;

		if (!url) {
			throw new Error('URL is required');
		}

		this.logger.info(`Fetching web content from: ${url}`, {
			fetchOptions,
			extractionOptions,
			other_options
		});

		try {
			const start_time = Date.now();

			// Fetch the content with the provided options
			const content = await this.fetcher.fetch(url, {
				...fetchOptions,
				extractionOptions: {
					...extractionOptions,
					// Ensure content_type is set if not provided
					content_type: extractionOptions.content_type || 'text/html'
				}
			});

			const processing_time = Date.now() - start_time;

			// Format the response
			const response = {
				success: true as const,
				data: {
					...content,
					processing_time,
					fetched_at: new Date().toISOString()
				}
			};

			this.logger.debug('Successfully fetched content', {
				url,
				processing_time,
				content_length: content.text?.length || 0,
				block_count: content.blocks?.length || 0
			});

			return response;
		} catch (error) {
			const error_message = error instanceof Error ? error.message : 'Unknown error';
			this.logger.error(`Failed to fetch web content from ${url}:`, error);

			// Return a structured error response
			return {
				success: false,
				error: error_message
			};
		}
	}

	/**
	 * Register error handlers
	 */
	private registerErrorHandlers(): void {
		// Only register process handlers in Node.js environment
		if (!process) return;

		// Server error handler
		this.server.on('error', (error: Error) => {
			this.logger.error('MCP Server Error:', error);
		});

		// Log unhandled promise rejections
		process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
			this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
		});

		// Handle uncaught exceptions
		process.on('uncaughtException', (error: Error) => {
			this.logger.error('Uncaught Exception:', error);
			// In production, you might want to perform cleanup and exit
			if (process.env.NODE_ENV === 'production') {
				// Perform cleanup if needed
				this.stop().finally(() => {
					process.exit(1);
				});
			}
		});

		// Handle process termination signals
		const shutdown_signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
		shutdown_signals.forEach((signal) => {
			process.on(signal, async () => {
				this.logger.info(`Received ${signal}, shutting down gracefully...`);
				try {
					await this.stop();
					process.exit(0);
				} catch (error) {
					this.logger.error('Error during shutdown:', error);
					process.exit(1);
				}
			});
		});
	}

	/**
	 * Start the MCP server
	 */
	async start(): Promise<void> {
		try {
			await this.server.start();
			this.logger.info('Web Content MCP Server started');
		} catch (error) {
			this.logger.error('Failed to start MCP server:', error);
			throw error;
		}
	}

	/**
	 * Stop the MCP server
	 */
	async stop(): Promise<void> {
		try {
			await this.server.stop();
			this.logger.info('Web Content MCP Server stopped');
		} catch (error) {
			this.logger.error('Error stopping MCP server:', error);
			throw error;
		}
	}
}

// Export a singleton instance
export const webContentMcpServer = new WebContentMcpServer();

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
	webContentMcpServer.start().catch((error: Error) => {
		// eslint-disable-next-line no-console
		console.error('Failed to start Web Content MCP Server:', error);
		process.exit(1);
	});
}
