// Core exports
export * from './types';
export * from './server';
export * from './fetcher';
export * from './tools';

// Re-export types for convenience
export type { WebContentMcpServer } from './server';
export type { WebContentFetcher } from './fetcher';

// Export the singleton instance
import { webContentMcpServer } from './server';
export { webContentMcpServer };

// Default export for easier imports
export default {
	WebContentMcpServer: webContentMcpServer,
	start: () => webContentMcpServer.start(),
	stop: () => webContentMcpServer.stop()
};
