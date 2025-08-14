/**
 * Test script for MCP server functionality
 * This script tests the core MCP server tools to ensure they work correctly
 */

import { WebContentMcpServer } from './web-content-mcp-server.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('mcp-test');

async function testMcpServer() {
    logger.info('Starting MCP server tests...');

    try {
        // Initialize the MCP server
        const mcpServer = new WebContentMcpServer();
        mcpServer.initialize();

        // Test 1: Get available tools
        logger.info('Test 1: Getting available tools');
        const tools = mcpServer.getAvailableTools();
        logger.info(`Found ${tools.length} tools:`, tools.map(t => t.name));

        // Test 2: Test fetchWebContent tool
        logger.info('Test 2: Testing fetchWebContent tool');
        try {
            const fetchResult = await mcpServer.executeTool('fetchWebContent', {
                url: 'https://example.com',
                options: {
                    timeout: 10000,
                    extractInteractive: true
                }
            });
            logger.info('fetchWebContent result:', fetchResult);
        } catch (error) {
            logger.error('fetchWebContent test failed:', error);
        }

        // Test 3: Test batchImportUrls tool
        logger.info('Test 3: Testing batchImportUrls tool');
        try {
            const batchResult = await mcpServer.executeTool('batchImportUrls', {
                urls: ['https://example.com', 'https://httpbin.org/json'],
                options: {
                    concurrency: 2,
                    extractInteractive: false
                }
            });
            logger.info('batchImportUrls result:', batchResult);
        } catch (error) {
            logger.error('batchImportUrls test failed:', error);
        }

        // Test 4: Test manageContentSources tool
        logger.info('Test 4: Testing manageContentSources tool');
        try {
            const sourcesResult = await mcpServer.executeTool('manageContentSources', {
                action: 'list',
                filters: {
                    domain: 'example.com'
                }
            });
            logger.info('manageContentSources result:', sourcesResult);
        } catch (error) {
            logger.error('manageContentSources test failed:', error);
        }

        // Test 5: Test transformToInteractive tool
        logger.info('Test 5: Testing transformToInteractive tool');
        try {
            const transformResult = await mcpServer.executeTool('transformToInteractive', {
                contentId: 'test-content-id',
                transformationType: 'auto',
                domain: 'technology'
            });
            logger.info('transformToInteractive result:', transformResult);
        } catch (error) {
            logger.error('transformToInteractive test failed:', error);
        }

        logger.info('MCP server tests completed successfully!');
        return true;

    } catch (error) {
        logger.error('MCP server tests failed:', error);
        return false;
    }
}

// Export for use in other test files
export { testMcpServer };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testMcpServer()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            logger.error('Test execution failed:', error);
            process.exit(1);
        });
}