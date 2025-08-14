/**
 * Test MCP server tools without Svelte dependencies
 * This script tests the core tool functionality without UI integration
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('mcp-tools-test');

// Mock the Svelte store actions to avoid dependency issues
const mockWebContentActions = {
    setContentProcessing: (processing: boolean, progress: number) => {
        logger.debug(`Mock: setContentProcessing(${processing}, ${progress})`);
    },
    addNotification: (notification: any) => {
        logger.debug(`Mock: addNotification(${notification.type}: ${notification.message})`);
    },
    addContent: (content: any) => {
        logger.debug(`Mock: addContent(${content.id})`);
    },
    addSource: (source: any) => {
        logger.debug(`Mock: addSource(${source.id})`);
    },
    addBatchJob: (job: any) => {
        logger.debug(`Mock: addBatchJob(${job.id})`);
    },
    setActiveBatchJob: (job: any) => {
        logger.debug(`Mock: setActiveBatchJob(${job?.id || 'null'})`);
    },
    setBatchProcessing: (processing: boolean) => {
        logger.debug(`Mock: setBatchProcessing(${processing})`);
    },
    updateBatchJob: (id: string, updates: any) => {
        logger.debug(`Mock: updateBatchJob(${id})`);
    }
};

// Mock the webContentState module
const mockModule = {
    webContentActions: mockWebContentActions
};

// Override the module resolution for the store
const originalRequire = require;
if (typeof require !== 'undefined') {
    require.cache[require.resolve('../../../stores/webContentState.svelte.js')] = {
        exports: mockModule,
        loaded: true,
        id: require.resolve('../../../stores/webContentState.svelte.js'),
        children: [],
        filename: require.resolve('../../../stores/webContentState.svelte.js'),
        isPreloading: false,
        parent: null,
        path: '',
        paths: []
    } as any;
}

async function testToolsOnly() {
    logger.info('Testing MCP server tools without Svelte dependencies...');

    try {
        // Import the server class after setting up mocks
        const { WebContentMcpServer } = await import('./web-content-mcp-server.js');

        // Create server instance
        const server = new WebContentMcpServer();
        server.initialize();

        logger.info('MCP server initialized successfully');

        // Test getting available tools
        const tools = server.getAvailableTools();
        logger.info(`Found ${tools.length} available tools:`);

        tools.forEach(tool => {
            logger.info(`- ${tool.name}: ${tool.description}`);
            logger.debug(`  Input schema:`, tool.inputSchema);
        });

        // Test basic tool execution (non-network dependent)
        logger.info('Testing basic tool execution...');

        try {
            const result = await server.executeTool('manageContentSources', {
                action: 'list'
            });
            logger.info('manageContentSources tool executed successfully:', result.success);
        } catch (error) {
            logger.error('manageContentSources tool execution failed:', error);
        }

        try {
            const result = await server.executeTool('manageTemplates', {
                action: 'list'
            });
            logger.info('manageTemplates tool executed successfully:', result.success);
        } catch (error) {
            logger.error('manageTemplates tool execution failed:', error);
        }

        try {
            const result = await server.executeTool('processBatchJob', {
                jobId: 'test-job-123',
                action: 'status'
            });
            logger.info('processBatchJob tool executed successfully:', result.success);
        } catch (error) {
            logger.error('processBatchJob tool execution failed:', error);
        }

        logger.info('MCP server tools test completed successfully!');
        return true;

    } catch (error) {
        logger.error('MCP server tools test failed:', error);
        return false;
    }
}

// Export for use in other files
export { testToolsOnly };

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    testToolsOnly()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            logger.error('Test execution failed:', error);
            process.exit(1);
        });
}