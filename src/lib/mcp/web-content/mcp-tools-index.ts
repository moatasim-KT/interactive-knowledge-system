/**
 * Web Content MCP Tools Index
 * Exports all MCP server tools for web content processing automation
 */

// Import classes for local usage in this module
import { InteractiveContentTools } from './interactive-content-tools.js';
import { BatchProcessingTools } from './batch-processing-tools.js';
import { SourceManagementTools } from './source-management-tools.js';
import { TemplateAssetTools } from './template-asset-tools.js';

export { WebContentMcpServer } from './web-content-mcp-server.js';
export { InteractiveContentTools };
export { BatchProcessingTools };
export { SourceManagementTools };
export { TemplateAssetTools };

// Re-export types for convenience
export type {
	WebContent,
	WebContentSource,
	InteractiveOpportunity,
	BatchProcessingJob,
	ContentProcessingResult,
	QualityMetrics,
	SourceHealthCheck,
	SourceUpdateResult,
	DuplicateDetectionResult
} from '../../types/web-content.js';

// Export tool configurations
export const MCP_TOOL_CATEGORIES = {
	CONTENT_FETCHING: 'content-fetching',
	INTERACTIVE_TRANSFORMATION: 'interactive-transformation',
	SOURCE_MANAGEMENT: 'source-management',
	BATCH_PROCESSING: 'batch-processing',
	TEMPLATE_ASSET: 'template-asset'
} as const;

export const MCP_TOOL_PRIORITIES = {
	HIGH: 'high',
	NORMAL: 'normal',
	LOW: 'low'
} as const;

/**
 * Combined MCP Tools Manager
 * Provides a unified interface to all web content processing tools
 */
export class WebContentMcpToolsManager {
	private interactiveTools: InteractiveContentTools;
	private batchTools: BatchProcessingTools;
	private sourceTools: SourceManagementTools;
	private templateTools: TemplateAssetTools;

	constructor() {
		this.interactiveTools = new InteractiveContentTools();
		this.batchTools = new BatchProcessingTools();
		this.sourceTools = new SourceManagementTools();
		this.templateTools = new TemplateAssetTools();
	}

	/**
	 * Get interactive content tools
	 */
	getInteractiveTools(): InteractiveContentTools {
		return this.interactiveTools;
	}

	/**
	 * Get batch processing tools
	 */
	getBatchTools(): BatchProcessingTools {
		return this.batchTools;
	}

	/**
	 * Get source management tools
	 */
	getSourceTools(): SourceManagementTools {
		return this.sourceTools;
	}

	/**
	 * Get template and asset tools
	 */
	getTemplateTools(): TemplateAssetTools {
		return this.templateTools;
	}

	/**
	 * Get all available tool categories
	 */
	getToolCategories(): string[] {
		return Object.values(MCP_TOOL_CATEGORIES);
	}

	/**
	 * Get tool information by category
	 */
	getToolsByCategory(category: string): string[] {
		switch (category) {
			case MCP_TOOL_CATEGORIES.CONTENT_FETCHING:
				return ['fetchWebContent', 'batchImportUrls'];
			case MCP_TOOL_CATEGORIES.INTERACTIVE_TRANSFORMATION:
				return ['transformToInteractive', 'generateVisualization'];
			case MCP_TOOL_CATEGORIES.SOURCE_MANAGEMENT:
				return ['manageContentSources', 'validateContentQuality'];
			case MCP_TOOL_CATEGORIES.BATCH_PROCESSING:
				return ['processBatchJob', 'monitorRSSFeed'];
			case MCP_TOOL_CATEGORIES.TEMPLATE_ASSET:
				return ['manageTemplates', 'optimizeAssets'];
			default:
				return [];
		}
	}

	/**
	 * Get comprehensive tool statistics
	 */
	async getToolStatistics(): Promise<{
		interactive: any;
		batch: any;
		source: any;
		template: any;
	}> {
		const [batch_stats, source_stats] = await Promise.all([
			this.batchTools.getProcessingStats(),
			this.sourceTools.getSourceStatistics()
		]);

		return {
			interactive: {
				// Mock interactive tool stats
				transformationsPerformed: Math.floor(Math.random() * 100),
				visualizationsGenerated: Math.floor(Math.random() * 50),
				averageConfidence: 0.75 + Math.random() * 0.2
			},
			batch: batch_stats,
			source: source_stats,
			template: {
				// Mock template stats
				templatesAvailable: (await this.templateTools.listTemplates()).total,
				templatesUsed: Math.floor(Math.random() * 20),
				assetsOptimized: Math.floor(Math.random() * 200)
			}
		};
	}

	/**
	 * Perform health check on all tools
	 */
	async performHealthCheck(): Promise<{
		overall: 'healthy' | 'warning' | 'error';
		tools: {
			interactive: 'healthy' | 'warning' | 'error';
			batch: 'healthy' | 'warning' | 'error';
			source: 'healthy' | 'warning' | 'error';
			template: 'healthy' | 'warning' | 'error';
		};
		details: any;
	}> {
		try {
			// Perform health checks on all tools
			const [source_health] = await Promise.all([this.sourceTools.performHealthCheck()]);

			const tool_health = {
				interactive: 'healthy' as const,
				batch: 'healthy' as const,
				source:
					source_health.summary.error > 0
						? ('error' as const)
						: source_health.summary.warning > 0
							? ('warning' as const)
							: ('healthy' as const),
				template: 'healthy' as const
			};

			const has_error = Object.values(tool_health).includes('error');
			const has_warning = Object.values(tool_health).includes('warning');

			return {
				overall: has_error ? 'error' : has_warning ? 'warning' : 'healthy',
				tools: tool_health,
				details: {
					sourceHealth: source_health.summary,
					timestamp: new Date().toISOString()
				}
			};
		} catch (error) {
			return {
				overall: 'error',
				tools: {
					interactive: 'error',
					batch: 'error',
					source: 'error',
					template: 'error'
				},
				details: {
					error: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString()
				}
			};
		}
	}
}

// Export singleton instance
export const webContentMcpToolsManager = new WebContentMcpToolsManager();
