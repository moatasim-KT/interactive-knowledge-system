import { type ServerOptions } from '@modelcontextprotocol/sdk/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio';
import { z, type ZodRawShape } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { createLogger } from '../../utils/logger';
import process from 'node:process';
import { WebContentMcpServer as AppWebContentServer } from './web-content-mcp-server';

/**
 * Unified MCP server entrypoint that delegates tool logic to AppWebContentServer
 */
export class WebContentMcpEntrypoint {
    private mcp: McpServer;
    private app: AppWebContentServer;
    private logger = createLogger('mcp:web-content');

    constructor(options: ServerOptions = {}) {
        this.mcp = new McpServer(
            {
                name: 'web-content-sourcing',
                version: '1.0.0',
                description: 'MCP server for web content sourcing and processing'
            },
            {
                ...options
            }
        );

        // Svelte-integrated application server
        this.app = new AppWebContentServer();
        this.app.initialize();

        this.registerToolsFromApp();
        this.registerProcessErrorHandlers();
    }

    private registerToolsFromApp(): void {
        const tools = this.app.getAvailableTools();
        tools.forEach((t) => {
            // Build a permissive Zod shape from the tool's declared input schema (if any)
            const shape: ZodRawShape = {};
            const props = t?.inputSchema?.properties as Record<string, unknown> | undefined;
            if (props && typeof props === 'object') {
                for (const key of Object.keys(props)) {
                    // Accept any type for inputs to preserve current behavior
                    shape[key] = z.any();
                }
            }

            // Prefer the explicit overload with description + raw shape
            if (Object.keys(shape).length > 0) {
                this.mcp.tool(t.name, t.description ?? '', shape, async (args, _extra) => {
                    const result = await this.app.executeTool(t.name, args as Record<string, unknown>);
                    const out: CallToolResult = {
                        content: [{ type: 'text', text: JSON.stringify(result) }]
                    };
                    return out;
                });
            } else {
                // No inputs: register zero-arg tool
                this.mcp.tool(t.name, t.description ?? '', async (_extra) => {
                    const result = await this.app.executeTool(t.name, {});
                    const out: CallToolResult = {
                        content: [{ type: 'text', text: JSON.stringify(result) }]
                    };
                    return out;
                });
            }
        });
        this.logger.info(`Registered ${tools.length} tools`);
    }

    private registerProcessErrorHandlers(): void {
        // Log unhandled promise rejections
        process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
            this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error: Error) => {
            this.logger.error('Uncaught Exception:', error);
            if (process.env.NODE_ENV === 'production') {
                this.stop().finally(() => process.exit(1));
            }
        });

        // Graceful shutdown
        ['SIGINT', 'SIGTERM'].forEach((signal) => {
            process.on(signal as NodeJS.Signals, async () => {
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

    async start(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.mcp.connect(transport);
        this.logger.info('Web Content MCP Server started (stdio transport)');
    }

    async stop(): Promise<void> {
        await this.mcp.close();
        this.logger.info('Web Content MCP Server stopped');
    }
}

// Export a singleton instance
export const webContentMcpServer = new WebContentMcpEntrypoint();

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    webContentMcpServer.start().catch((error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to start Web Content MCP Server:', error);
        process.exit(1);
    });
}
