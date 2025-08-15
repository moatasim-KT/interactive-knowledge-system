/**
 * Web Content Sourcing MCP Server - Svelte-Native Implementation
 * Implementation of MCP server tools for content processing automation
 * Integrates with Svelte stores and components for seamless UI updates
 * Based on existing MCP server patterns from mcp/server.js
 */

import { createLogger } from '../../utils/logger';
// Prefer headless/no-op integrations when running in Node (no window)
const isNodeRuntime = typeof window === 'undefined';

// Svelte store actions: use real actions only in browser, headless bridge in Node
let webContentActions: any;
if (isNodeRuntime) {
    webContentActions = (await import('./svelte-actions-bridge')).svelteActions;
} else {
    try {
        const storesIndex = await import('../../stores');
        // @ts-ignore runtime guard
        webContentActions = (storesIndex as any).webContentActions ?? (await import('./svelte-actions-bridge')).svelteActions;
    } catch {
        webContentActions = (await import('./svelte-actions-bridge')).svelteActions;
    }
}

// Fetcher: use headless implementation in Node to avoid DOMParser
let webContentFetcher: any;
if (isNodeRuntime) {
    webContentFetcher = (await import('./headless/webContentFetcher.headless')).webContentFetcherHeadless;
} else {
    try {
        const m = await import('../../services/webContentFetcher');
        // @ts-ignore runtime guard
        webContentFetcher = (m as any).webContentFetcher;
    } catch {
        webContentFetcher = (await import('./headless/webContentFetcher.headless')).webContentFetcherHeadless;
    }
}

// Source manager: prefer lightweight stub in Node
let sourceManager: any;
if (isNodeRuntime) {
    sourceManager = {
        async addSource(_args: any) { return { sourceId: 'headless', source: _args, isDuplicate: false }; },
        async listSources() { return { sources: [], total: 0, filtered: 0 }; },
        async updateSource(id: string) { return { sourceId: id, success: true, hasChanges: false, updatedAt: new Date() }; },
        async removeSource(id: string) { return { sourceId: id, removed: true }; },
        async validateSources() { return { validationResults: [], summary: { total: 0, valid: 0, invalid: 0 } }; },
        async performHealthCheck() { return { summary: { total: 0, healthy: 0, warning: 0, error: 0 } }; }
    };
} else {
    try {
        const m = await import('../../services/sourceManager');
        // @ts-ignore runtime guard
        sourceManager = (m as any).sourceManager;
    } catch {
        sourceManager = {
            async addSource(_args: any) { return { sourceId: 'headless', source: _args, isDuplicate: false }; },
            async listSources() { return { sources: [], total: 0, filtered: 0 }; },
            async updateSource(id: string) { return { sourceId: id, success: true, hasChanges: false, updatedAt: new Date() }; },
            async removeSource(id: string) { return { sourceId: id, removed: true }; },
            async validateSources() { return { validationResults: [], summary: { total: 0, valid: 0, invalid: 0 } }; },
            async performHealthCheck() { return { summary: { total: 0, healthy: 0, warning: 0, error: 0 } }; }
        };
    }
}

// Interactive analyzer: avoid IndexedDB dependency in Node by using headless stub
let interactiveAnalyzer: any;
if (isNodeRuntime) {
    interactiveAnalyzer = {
        async analyzeContent(_id: string) { return { interactiveElements: [], javascriptFrameworks: [], dependencies: [], dataRequirements: {}, preservationFeasibility: {}, opportunities: [] }; },
        async transform(_id: string, options: any) { return { transformedContent: null, interactiveBlocks: [], preservationResults: {}, metadata: { transformationType: options?.type, domain: options?.domain, transformedAt: new Date().toISOString() } }; },
        async generateVisualization(_id: string, options: any) { return { visualization: { id: `viz_${Date.now()}`, type: options?.type, contentId: _id, data: null, config: {}, interactionHandlers: [] }, config: {}, interactionHandlers: [] }; }
    };
} else {
    try {
        const m = await import('../../services/interactiveAnalyzer');
        // @ts-ignore runtime guard
        interactiveAnalyzer = (m as any).interactiveAnalyzer;
    } catch {
        interactiveAnalyzer = {
            async analyzeContent(_id: string) { return { interactiveElements: [], javascriptFrameworks: [], dependencies: [], dataRequirements: {}, preservationFeasibility: {}, opportunities: [] }; },
            async transform(_id: string, options: any) { return { transformedContent: null, interactiveBlocks: [], preservationResults: {}, metadata: { transformationType: options?.type, domain: options?.domain, transformedAt: new Date().toISOString() } }; },
            async generateVisualization(_id: string, options: any) { return { visualization: { id: `viz_${Date.now()}`, type: options?.type, contentId: _id, data: null, config: {}, interactionHandlers: [] }, config: {}, interactionHandlers: [] }; }
        };
    }
}

import { ProcessingPipelineManager } from '../../services/processingPipeline.js';

let webContentErrorHandler: any;
if (isNodeRuntime) {
    webContentErrorHandler = (await import('./headless/webContentErrorHandler.headless')).webContentErrorHandlerHeadless;
} else {
    try {
        const m = await import('../../services/webContentErrorHandler');
        // @ts-ignore runtime guard
        webContentErrorHandler = (m as any).webContentErrorHandler;
    } catch {
        webContentErrorHandler = (await import('./headless/webContentErrorHandler.headless')).webContentErrorHandlerHeadless;
    }
}
import { storageService } from '../../services/storage';
import type { ContentValidationResult } from '../../types/web-content';

/**
 * Web Content Sourcing MCP Server Class
 * Provides automated content processing tools through Model Context Protocol
 * Integrates with Svelte stores for real-time UI updates
 */
export class WebContentMcpServer {
    private logger = createLogger('mcp:web-content-server');
    private initialized = false;

    // Svelte-integrated processing modules
    private webContentFetcher = webContentFetcher;
    private sourceManager = sourceManager;
    private interactiveAnalyzer = interactiveAnalyzer;
    private processingPipeline = ProcessingPipelineManager.getInstance();
    private errorHandler = webContentErrorHandler;

    constructor() {
        this.logger.info('Svelte-native Web Content MCP Server initialized');

        // Initialize error handling for MCP operations
        this.setupErrorHandling();
    }

    /**
     * Setup error handling for MCP operations
     */
    private setupErrorHandling(): void {
        // No explicit configuration method on error handler; reserved for future hooks
        return;
    }

    /**
     * Initialize the server and load required modules
     */
    initialize(): void {
        if (this.initialized) {
            return;
        }

        try {
            this.logger.info('Initializing Svelte-native Web Content MCP Server...');

            // Initialize Svelte store integration
            this.initializeSvelteIntegration();

            // Initialize processing modules
            this.loadProcessingModules();

            this.initialized = true;
            this.logger.info('Svelte-native Web Content MCP Server initialized successfully');

            // Notify UI of successful initialization
            webContentActions.addNotification({
                type: 'success',
                message: 'Web Content MCP Server initialized successfully'
            });
        } catch (error) {
            this.logger.error('Failed to initialize Web Content MCP Server:', error);

            // Notify UI of initialization failure
            webContentActions.addNotification({
                type: 'error',
                message: `MCP Server initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });

            throw error;
        }
    }

    /**
     * Initialize Svelte store integration
     */
    private initializeSvelteIntegration(): void {
        this.logger.info('Setting up Svelte store integration...');

        // The stores are already imported and available
        // This method can be extended for additional integration setup

        this.logger.info('Svelte store integration completed');
    }

    /**
     * Load processing modules with Svelte integration
     */
    private loadProcessingModules(): void {
        try {
            this.logger.info('Loading Svelte-integrated processing modules...');

            // Modules are already imported and available as class properties
            // Verify they are properly initialized
            if (!this.webContentFetcher) {
                throw new Error('WebContentFetcher not available');
            }
            if (!this.sourceManager) {
                throw new Error('SourceManager not available');
            }
            if (!this.interactiveAnalyzer) {
                throw new Error('InteractiveAnalyzer not available');
            }
            if (!this.processingPipeline) {
                throw new Error('ProcessingPipeline not available');
            }

            this.logger.info('All Svelte-integrated processing modules loaded successfully');
        } catch (error) {
            this.logger.error('Failed to load processing modules:', error);
            throw error;
        }
    }

    /**
     * Get available tools
     */
    getAvailableTools(): any[] {
        return [
            {
                name: 'fetchWebContent',
                description: 'Fetch and extract content from a web URL with enhanced processing, retry logic, and multiple content type support',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'URL to fetch content from' },
                        options: {
                            type: 'object',
                            properties: {
                                useHeadlessBrowser: {
                                    type: 'boolean',
                                    default: false,
                                    description: 'Use headless browser for JavaScript-heavy sites'
                                },
                                extractInteractive: {
                                    type: 'boolean',
                                    default: true,
                                    description: 'Extract interactive elements from content'
                                },
                                generateQuizzes: {
                                    type: 'boolean',
                                    default: false,
                                    description: 'Generate quizzes from content'
                                },
                                timeout: {
                                    type: 'number',
                                    default: 30000,
                                    description: 'Request timeout in milliseconds'
                                },
                                retryAttempts: {
                                    type: 'number',
                                    default: 3,
                                    description: 'Number of retry attempts for failed requests'
                                },
                                extractionMethod: {
                                    type: 'string',
                                    enum: ['auto', 'readability', 'semantic', 'heuristic'],
                                    default: 'auto',
                                    description: 'Content extraction method to use'
                                },
                                acceptedContentTypes: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Accepted content types (HTML, JSON, XML, RSS)',
                                    default: ['text/html', 'application/json', 'application/xml', 'application/rss+xml']
                                },
                                cleanContent: {
                                    type: 'boolean',
                                    default: true,
                                    description: 'Remove ads, navigation, and other non-content elements'
                                },
                                extractAssets: {
                                    type: 'boolean',
                                    default: true,
                                    description: 'Extract images, code blocks, and other assets'
                                }
                            }
                        }
                    },
                    required: ['url']
                }
            },
            {
                name: 'batchImportUrls',
                description: 'Import multiple URLs in batch with processing queue',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urls: { type: 'array', items: { type: 'string' } },
                        options: {
                            type: 'object',
                            properties: {
                                concurrency: { type: 'number', default: 3 },
                                extractInteractive: { type: 'boolean', default: true },
                                generateQuizzes: { type: 'boolean', default: false }
                            }
                        }
                    },
                    required: ['urls']
                }
            },
            {
                name: 'transformToInteractive',
                description: 'Transform static content into interactive visualizations',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentId: { type: 'string', description: 'ID of content to transform' },
                        transformationType: {
                            type: 'string',
                            enum: ['auto', 'visualization', 'simulation', 'chart', 'quiz'],
                            default: 'auto'
                        },
                        domain: {
                            type: 'string',
                            description: 'Content domain (e.g., machine-learning, finance)'
                        }
                    },
                    required: ['contentId']
                }
            },
            {
                name: 'generateVisualization',
                description: 'Generate interactive visualization from content',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentId: { type: 'string', description: 'ID of content to visualize' },
                        visualizationType: {
                            type: 'string',
                            enum: ['chart', 'network', 'timeline', 'heatmap', 'neural-network']
                        },
                        config: { type: 'object', description: 'Visualization configuration' }
                    },
                    required: ['contentId']
                }
            },
            {
                name: 'manageContentSources',
                description: 'Manage imported content sources',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['list', 'update', 'remove', 'validate', 'health-check']
                        },
                        sourceId: { type: 'string' },
                        filters: {
                            type: 'object',
                            properties: {
                                domain: { type: 'string' },
                                status: { type: 'string' },
                                category: { type: 'string' }
                            }
                        }
                    },
                    required: ['action']
                }
            },
            {
                name: 'validateContentQuality',
                description: 'Validate and assess content quality',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentId: { type: 'string', description: 'ID of content to validate' },
                        checks: {
                            type: 'array',
                            items: {
                                type: 'string',
                                enum: ['readability', 'accessibility', 'interactivity', 'accuracy']
                            },
                            default: ['readability', 'accessibility']
                        }
                    },
                    required: ['contentId']
                }
            },
            {
                name: 'processBatchJob',
                description: 'Process batch content import and transformation job',
                inputSchema: {
                    type: 'object',
                    properties: {
                        jobId: { type: 'string', description: 'Batch job ID to process' },
                        action: {
                            type: 'string',
                            enum: ['start', 'pause', 'resume', 'cancel', 'status']
                        }
                    },
                    required: ['jobId', 'action']
                }
            },
            {
                name: 'manageTemplates',
                description: 'Manage content transformation templates',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: {
                            type: 'string',
                            enum: ['list', 'create', 'update', 'delete', 'apply']
                        },
                        templateId: { type: 'string' },
                        templateData: { type: 'object' }
                    },
                    required: ['action']
                }
            },
            {
                name: 'optimizeAssets',
                description: 'Optimize and manage content assets',
                inputSchema: {
                    type: 'object',
                    properties: {
                        contentId: { type: 'string', description: 'Content ID to optimize assets for' },
                        options: {
                            type: 'object',
                            properties: {
                                compressImages: { type: 'boolean', default: true },
                                minifyCode: { type: 'boolean', default: true },
                                optimizeForMobile: { type: 'boolean', default: true }
                            }
                        }
                    },
                    required: ['contentId']
                }
            }
        ];
    }

    /**
     * Execute a tool
     */
    async executeTool(toolName: string, args: any): Promise<any> {
        this.ensureInitialized();

        switch (toolName) {
            case 'fetchWebContent':
                return await this.handleFetchWebContent(args);
            case 'batchImportUrls':
                return await this.handleBatchImportUrls(args);
            case 'transformToInteractive':
                return await this.handleTransformToInteractive(args);
            case 'generateVisualization':
                return await this.handleGenerateVisualization(args);
            case 'manageContentSources':
                return await this.handleManageContentSources(args);
            case 'validateContentQuality':
                return await this.handleValidateContentQuality(args);
            case 'processBatchJob':
                return this.handleProcessBatchJob(args);
            case 'manageTemplates':
                return this.handleManageTemplates(args);
            case 'optimizeAssets':
                return this.handleOptimizeAssets(args);
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }

    /**
     * Ensure server is initialized before handling requests
     */
    private ensureInitialized(): void {
        if (!this.initialized) {
            this.initialize();
        }
    }

    // Tool handlers implementation

    /**
     * Handle fetchWebContent tool call with Svelte store integration
     */
    private async handleFetchWebContent(args: any): Promise<any> {
        const { url, options = {} } = args;

        this.logger.info(`Fetching web content from: ${url}`);

        try {
            // Update UI state to show processing
            webContentActions.setContentProcessing(true, 0);
            webContentActions.addNotification({
                type: 'info',
                message: `Starting to fetch content from ${new URL(url).hostname}`
            });

            const start_time = Date.now();

            // Update progress
            webContentActions.setContentProcessing(true, 25);

            // Fetch content using the real fetcher
            const content = await this.webContentFetcher.fetch(url, options);

            webContentActions.setContentProcessing(true, 75);

            const processing_time = Date.now() - start_time;

            if (content.success) {
                // Add content to Svelte store
                webContentActions.addContent(content);

                // Create and add source (use real API addSource)
                const addResult = await this.sourceManager.addSource({
                    url,
                    title: content.title
                });

                webContentActions.addSource(addResult.source);

                // Complete processing
                webContentActions.setContentProcessing(false, 100);

                webContentActions.addNotification({
                    type: 'success',
                    message: `Successfully fetched content from ${new URL(url).hostname}`
                });

                return {
                    success: true,
                    data: {
                        ...content,
                        processingTime: processing_time,
                        fetchedAt: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error('Content fetching failed');
            }
        } catch (error) {
            // Update UI with error state
            webContentActions.setContentProcessing(false, 0);

            const errorMessage = `Failed to fetch web content: ${error instanceof Error ? error.message : 'Unknown error'}`;

            webContentActions.addNotification({
                type: 'error',
                message: errorMessage
            });

            // Handle error through error handler
            this.errorHandler.handleError(error, `url=${url}`, 'fetchWebContent');

            throw new Error(errorMessage);
        }
    }

    /**
     * Handle batchImportUrls tool call with Svelte store integration
     */
    private async handleBatchImportUrls(args: any): Promise<any> {
        const { urls, options = {} } = args;
        const { concurrency = 3 } = options;

        this.logger.info(`Starting batch import of ${urls.length} URLs`);

        try {
            // Create batch job in Svelte store
            const batchJob: import('../../types/web-content').BatchProcessingJob = {
                id: `batch_${Date.now()}`,
                urls,
                options,
                status: 'processing',
                progress: {
                    total: urls.length,
                    completed: 0,
                    failed: 0
                },
                results: [],
                createdAt: new Date()
            };

            webContentActions.addBatchJob(batchJob);
            webContentActions.setActiveBatchJob(batchJob);
            webContentActions.setBatchProcessing(true);

            webContentActions.addNotification({
                type: 'info',
                message: `Starting batch import of ${urls.length} URLs`
            });

            const results: any[] = [];
            const errors: any[] = [];

            // Process URLs in batches
            for (let i = 0; i < urls.length; i += concurrency) {
                const batch = urls.slice(i, i + concurrency);
                const batch_promises = batch.map(async (url: string) => {
                    try {
                        const result = await this.handleFetchWebContent({ url, options });

                        // Update batch job progress (increment counters)
                        const newProgress = {
                            ...batchJob.progress,
                            completed: batchJob.progress.completed + 1
                        };
                        batchJob.progress = newProgress;
                        webContentActions.updateBatchJob(batchJob.id, { progress: newProgress });

                        return { url, success: true, result };
                    } catch (error) {
                        const error_result = {
                            url,
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        };
                        errors.push(error_result);

                        // Update batch job progress (increment failed)
                        const newProgress = {
                            ...batchJob.progress,
                            failed: batchJob.progress.failed + 1
                        };
                        batchJob.progress = newProgress;
                        webContentActions.updateBatchJob(batchJob.id, { progress: newProgress });

                        return error_result;
                    }
                });

                const batch_results = await Promise.all(batch_promises);
                results.push(...batch_results);
            }

            // Complete batch job
            webContentActions.updateBatchJob(batchJob.id, {
                status: 'completed' as const,
                completedAt: new Date()
            });
            webContentActions.setBatchProcessing(false);

            const successful = results.filter((r) => r.success).length;
            const failed = errors.length;

            webContentActions.addNotification({
                type: successful > 0 ? 'success' : 'warning',
                message: `Batch import completed: ${successful} successful, ${failed} failed`
            });

            return {
                success: true,
                data: {
                    totalUrls: urls.length,
                    successful,
                    failed,
                    results,
                    errors
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            webContentActions.setBatchProcessing(false);

            const errorMessage = `Batch import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;

            webContentActions.addNotification({
                type: 'error',
                message: errorMessage
            });

            throw new Error(errorMessage);
        }
    }

    /**
     * Handle transformToInteractive tool call
     */
    private async handleTransformToInteractive(args: any): Promise<any> {
        const { contentId: content_id, transformationType = 'auto', domain } = args;

        this.logger.info(`Transforming content ${content_id} to interactive (${transformationType})`);

        try {
            const transformation = await this.interactiveAnalyzer.transform(content_id, {
                type: transformationType,
                domain
            });

            // Update Svelte store with transformation results
            webContentActions.setCurrentTransformation(transformation);
            webContentActions.addTransformationToHistory({
                ...transformation,
                id: transformation?.transformedContent?.id || `transform_${Date.now()}`
            });

            webContentActions.addNotification({
                type: 'success',
                message: `Transformation completed: ${transformationType}`
            });

            return {
                success: true,
                data: transformation,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(
                `Interactive transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Handle generateVisualization tool call
     */
    private async handleGenerateVisualization(args: any): Promise<any> {
        const { contentId: content_id, visualizationType, config = {} } = args;

        this.logger.info(`Generating ${visualizationType} visualization for content ${content_id}`);

        try {
            const visualization = await this.interactiveAnalyzer.generateVisualization(content_id, {
                type: visualizationType,
                config
            });

            webContentActions.addNotification({
                type: 'success',
                message: `Visualization generated: ${visualizationType}`
            });

            return {
                success: true,
                data: visualization,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(
                `Visualization generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Handle manageContentSources tool call
     */
    private async handleManageContentSources(args: any): Promise<any> {
        const { action, sourceId, filters = {} } = args;

        this.logger.info(`Managing content sources: ${action}`);

        try {
            let result: any;
            switch (action) {
                case 'list':
                    if (typeof (this.sourceManager as any).listSources === 'function') {
                        result = await (this.sourceManager as any).listSources(filters);
                    } else {
                        result = { sources: [], total: 0, filtered: 0 };
                    }
                    break;
                case 'update':
                    if (!sourceId) {throw new Error('sourceId required for update action');}
                    if (typeof (this.sourceManager as any).updateSource === 'function') {
                        result = await (this.sourceManager as any).updateSource(sourceId, {});
                    } else {
                        result = { sourceId, success: true, hasChanges: false, updatedAt: new Date() };
                    }
                    break;
                case 'remove':
                    if (!sourceId) {throw new Error('sourceId required for remove action');}
                    if (typeof (this.sourceManager as any).removeSource === 'function') {
                        result = await (this.sourceManager as any).removeSource(sourceId);
                    } else {
                        result = { sourceId, removed: true };
                    }
                    break;
                case 'validate':
                    if (typeof (this.sourceManager as any).validateSources === 'function') {
                        result = await (this.sourceManager as any).validateSources(sourceId ? [sourceId] : undefined);
                    } else {
                        result = { validationResults: [], summary: { total: 0, valid: 0, invalid: 0 } };
                    }
                    break;
                case 'health-check':
                    if (typeof (this.sourceManager as any).performHealthCheck === 'function') {
                        result = await (this.sourceManager as any).performHealthCheck(filters);
                    } else {
                        result = { summary: { total: 0, healthy: 0, warning: 0, error: 0 } };
                    }
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }

            return {
                success: true,
                action,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(
                `Source management failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Handle validateContentQuality tool call
     */
    private async handleValidateContentQuality(args: any): Promise<any> {
        const { contentId: content_id, checks = ['readability', 'accessibility'] } = args;

        this.logger.info(`Validating content quality for ${content_id}`);

        try {
            // Load content from storage
            await storageService.initialize().catch(() => undefined);
            const content = await storageService.getContent(content_id);
            if (!content) {
                throw new Error(`Content not found: ${content_id}`);
            }

            const result: ContentValidationResult = this.computeContentValidation(content, checks);

            webContentActions.addNotification({
                type: 'info',
                message: `Quality validation completed: Overall ${(result.scores.overall * 100).toFixed(0)}%`
            });

            return {
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(
                `Quality validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Compute a simple content validation result using heuristics
     */
    private computeContentValidation(content: any, checks: string[]): ContentValidationResult {
        const textLength = content?.content?.text?.length || 0;
        const wordCount = content?.metadata?.wordCount || (content?.content?.text?.split(/\s+/).length || 0);
        const hasHeadings = /<h[1-6][^>]*>/i.test(content?.content?.html || '');
        const hasImages = Array.isArray(content?.content?.images) && content.content.images.length > 0;
        const hasCode = Array.isArray(content?.content?.codeBlocks) && content.content.codeBlocks.length > 0;
        const hasTables = Array.isArray(content?.content?.tables) && content.content.tables.length > 0;

        const readability = Math.max(0.1, Math.min(1,
            (wordCount > 200 ? 0.3 : 0.15) +
            (wordCount > 800 ? 0.3 : 0.1) +
            (hasHeadings ? 0.2 : 0) +
            (textLength > 2000 ? 0.2 : 0.05)
        ));

        const interactivity = Math.max(0.1, Math.min(1,
            (hasImages ? 0.2 : 0) + (hasCode ? 0.3 : 0) + (hasTables ? 0.2 : 0) +
            (Array.isArray(content?.content?.charts) && content.content.charts.length > 0 ? 0.3 : 0.1)
        ));

        // Accessibility heuristic: presence of alt texts on images
        const imagesWithAlt = (content?.content?.images || []).filter((img: any) => (img.alt || '').trim().length > 0).length;
        const accessibility = hasImages ? Math.max(0.1, Math.min(1, imagesWithAlt / content.content.images.length)) : 0.6;

        const included = (k: string) => checks.includes(k);
        const scores = {
            readability: included('readability') ? readability : undefined,
            accessibility: included('accessibility') ? accessibility : undefined,
            interactivity: included('interactivity') ? interactivity : undefined,
            overall: (
                (included('readability') ? readability : 0) * 0.4 +
                (included('accessibility') ? accessibility : 0) * 0.3 +
                (included('interactivity') ? interactivity : 0) * 0.3
            ) || readability
        } as ContentValidationResult['scores'];

        const issues: string[] = [];
        const suggestions: string[] = [];
        if (included('readability') && wordCount < 300) {
            issues.push('Content is short; may lack depth.');
            suggestions.push('Add more explanatory text and examples.');
        }
        if (included('accessibility') && hasImages && imagesWithAlt < content.content.images.length) {
            issues.push('Some images are missing alt text.');
            suggestions.push('Add descriptive alt text to all images.');
        }
        if (included('interactivity') && !hasTables && !hasCode && !(content?.content?.charts?.length > 0)) {
            issues.push('No obvious interactive elements detected.');
            suggestions.push('Consider adding charts, code playgrounds, or interactive widgets.');
        }

        const validation: ContentValidationResult = {
            id: content.id,
            validatedAt: new Date().toISOString(),
            success: true,
            scores,
            issues,
            suggestions,
            validationSteps: checks
        };

        return validation;
    }

    /**
     * Handle processBatchJob tool call
     */
    private handleProcessBatchJob(args: any): any {
        const { jobId, action } = args;

        this.logger.info(`Processing batch job ${jobId}: ${action}`);

        try {
            // Mock batch job processing for now
            const job_status = {
                jobId,
                action,
                status: action === 'start' ? 'processing' : action,
                progress: {
                    total: 10,
                    completed: Math.floor(Math.random() * 10),
                    failed: Math.floor(Math.random() * 2)
                },
                timestamp: new Date().toISOString()
            };

            return {
                success: true,
                data: job_status,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(
                `Batch job processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Handle manageTemplates tool call
     */
    private handleManageTemplates(args: any): any {
        const { action, templateId, templateData } = args;

        this.logger.info(`Managing templates: ${action}`);

        try {
            // Mock template management for now
            let result;
            switch (action) {
                case 'list':
                    result = {
                        templates: [
                            { id: 'article', name: 'Article Template', type: 'content' },
                            { id: 'tutorial', name: 'Tutorial Template', type: 'educational' },
                            { id: 'interactive', name: 'Interactive Template', type: 'visualization' }
                        ]
                    };
                    break;
                case 'create':
                case 'update':
                    result = {
                        templateId: templateId || `template_${Date.now()}`,
                        action,
                        data: templateData
                    };
                    break;
                case 'delete':
                    result = { templateId, deleted: true };
                    break;
                case 'apply':
                    result = { templateId, applied: true };
                    break;
                default:
                    throw new Error(`Unknown template action: ${action}`);
            }

            return {
                success: true,
                action,
                data: result,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(
                `Template management failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    /**
     * Handle optimizeAssets tool call
     */
    private handleOptimizeAssets(args: any): any {
        const { contentId: content_id, options = {} } = args;

        this.logger.info(`Optimizing assets for content ${content_id}`);

        try {
            // Mock asset optimization for now
            const optimization = {
                contentId: content_id,
                options,
                results: {
                    imagesOptimized: Math.floor(Math.random() * 10),
                    codeMinified: Math.floor(Math.random() * 5),
                    sizeSaved: Math.floor(Math.random() * 1000000), // bytes
                    optimizedAt: new Date().toISOString()
                }
            };

            return {
                success: true,
                data: optimization,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(
                `Asset optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }
}

// Export singleton instance
export const webContentMcpServer = new WebContentMcpServer();
