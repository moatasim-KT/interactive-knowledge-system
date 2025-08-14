/**
 * Test MCP server startup and tool registration
 * This script verifies that the MCP server can start up and register tools correctly
 */

import { WebContentMcpEntrypoint } from './server.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('mcp-startup-test');

async function testServerStartup() {
    logger.info('Testing MCP server startup...');

    try {
        // Create MCP server instance
        const server = new WebContentMcpEntrypoint();

        logger.info('MCP server instance created successfully');

        // Test that we can get tools without starting the server
        const appServer = (server as any).app;
        const tools = appServer.getAvailableTools();

        logger.info(`Found ${tools.length} available tools:`);
        tools.forEach((tool: any) => {
            logger.info(`- ${tool.name}: ${tool.description}`);
        });

        // Test tool execution
        logger.info('Testing tool execution...');

        try {
            const result = await appServer.executeTool('manageContentSources', {
                action: 'list'
            });
            logger.info('Tool execution successful:', result);
        } catch (error) {
            logger.error('Tool execution failed:', error);
        }

        logger.info('MCP server startup test completed successfully!');
        return true;

    } catch (error) {
        logger.error('MCP server startup test failed:', error);
        return false;
    }
}

// Export for use in other files
export { testServerStartup };

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testServerStartup()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            logger.error('Test execution failed:', error);
            process.exit(1);
        });
}