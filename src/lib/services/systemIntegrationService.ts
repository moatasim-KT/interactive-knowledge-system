/**
 * System Integration Service
 * Orchestrates the integration of all components in the interactive document transformation system
 */

import { EnhancedDocumentProcessor } from './enhancedDocumentProcessor.js';
import type { ProcessedDocument, SystemIntegrationOptions, IntegrationPipeline, DocumentTransformationResult, IntegrationResult, WebContent, WebContentMetadata, InteractiveArticle } from '$lib/types/unified';
import { InteractiveTransformer } from './interactiveTransformer.js';
import { knowledgeBaseIntegrationService } from './knowledgeBaseIntegrationService.js';
import { WebContentFetcher, type FetchOptions } from './webContentFetcher.js';
import { webContentState, webContentActions } from '../stores/webContentState.svelte.js';
import { appState, actions } from '../stores/appState.svelte.js';
import { logger } from '../utils/logger.js';
import type { KnowledgeNode, WebContentSource, ContentBlock, IntegrationStep } from '$lib/types/unified';



/**
 * Main system integration service that orchestrates all components
 */
export class SystemIntegrationService {
    private documentProcessor: EnhancedDocumentProcessor;
    private interactiveTransformer: InteractiveTransformer;
    private webContentFetcher: WebContentFetcher;
    private activePipelines: Map<string, IntegrationPipeline> = new Map();
    private options: Required<SystemIntegrationOptions>;

    constructor(options: Partial<SystemIntegrationOptions> = {}) {
        this.options = {
            enableAutoDiscovery: true,
            enableConflictResolution: true,
            enableOptimisticUpdates: true,
            maxRetries: 3,
            timeout: 30000,
            enableProgressTracking: true,
            enableErrorRecovery: true,
            enableCaching: true,
            enableMobileOptimization: true,
            batchSize: 5,
            maxConcurrentOperations: 3,
            ...options
        };

        this.documentProcessor = new EnhancedDocumentProcessor();
        this.interactiveTransformer = new InteractiveTransformer();
        this.webContentFetcher = new WebContentFetcher();

        this.initializeSystemIntegration();
    }

    /**
     * Initialize system-wide integrations and event handlers
     */
    private initializeSystemIntegration(): void {
        logger.info('Initializing system integration service');

        // Set up cross-component communication
        this.setupCrossComponentCommunication();

        // Initialize mobile optimizations if enabled
        if (this.options.enableMobileOptimization) {
            this.initializeMobileOptimizations();
        }

        // Set up error recovery mechanisms
        if (this.options.enableErrorRecovery) {
            this.setupErrorRecovery();
        }

        logger.info('System integration service initialized');
    }

    /**
     * Process a document through the complete transformation pipeline
     */
    async processDocumentPipeline(
        input: File | string,
        type?: 'pdf' | 'markdown' | 'html' | 'url'
    ): Promise<DocumentTransformationResult> {
        const pipelineId = `pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        try {
            // Create and track pipeline
            const pipeline = this.createPipeline(pipelineId, 'Document Processing Pipeline', [
                { id: 'process', name: 'Process Document', description: 'Extract and process document content' },
                { id: 'transform', name: 'Transform to Interactive', description: 'Convert to interactive content' },
                { id: 'integrate', name: 'Integrate with Knowledge Base', description: 'Add to knowledge system' }
            ]);

            this.activePipelines.set(pipelineId, pipeline);

            // Step 1: Process the document
            await this.updatePipelineStep(pipelineId, 'process', 'running');
            const processedDocument = await this.processDocument(input, type);
            await this.updatePipelineStep(pipelineId, 'process', 'completed', processedDocument);

            // Step 2: Transform to interactive
            await this.updatePipelineStep(pipelineId, 'transform', 'running');
            const interactiveArticle = await this.transformToInteractive(processedDocument);
            await this.updatePipelineStep(pipelineId, 'transform', 'completed', interactiveArticle);

            // Step 3: Integrate with knowledge base
            await this.updatePipelineStep(pipelineId, 'integrate', 'running');
            const integrationResult = await this.integrateWithKnowledgeBase(processedDocument, interactiveArticle);
            await this.updatePipelineStep(pipelineId, 'integrate', 'completed', integrationResult);

            // Complete pipeline
            pipeline.status = 'completed';
            pipeline.progress = 100;
            pipeline.endTime = new Date();

            const processingTime = Date.now() - startTime;

            const result: DocumentTransformationResult = {
                originalDocument: processedDocument,
                interactiveArticle,
                knowledgeNode: integrationResult.node,
                integrationResult,
                processingTime,
                success: true,
                errors: []
            };

            // Update application state
            this.updateApplicationState(result);

            logger.info(`Document pipeline completed successfully in ${processingTime}ms`, {
                pipelineId,
                documentTitle: processedDocument.title
            });

            return result;

        } catch (error) {
            const processingTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Update pipeline with error
            const pipeline = this.activePipelines.get(pipelineId);
            if (pipeline) {
                pipeline.status = 'error';
                pipeline.error = errorMessage;
                pipeline.endTime = new Date();
            }

            logger.error(`Document pipeline failed after ${processingTime}ms`, {
                pipelineId,
                error: errorMessage
            });

            // Return error result
            return {
                originalDocument: {} as ProcessedDocument,
                interactiveArticle: {} as InteractiveArticle,
                knowledgeNode: {} as KnowledgeNode,
                integrationResult: {} as IntegrationResult,
                processingTime,
                success: false,
                errors: [errorMessage]
            };
        } finally {
            // Clean up pipeline after some time
            setTimeout(() => {
                this.activePipelines.delete(pipelineId);
            }, 300000); // 5 minutes
        }
    }

    /**
     * Process web content from URL through the complete pipeline
     */
    async processWebContentPipeline(
        url: string,
        options: FetchOptions = {}
    ): Promise<DocumentTransformationResult> {
        const pipelineId = `web_pipeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const startTime = Date.now();

        try {
            // Create pipeline for web content
            const pipeline = this.createPipeline(pipelineId, 'Web Content Processing Pipeline', [
                { id: 'fetch', name: 'Fetch Web Content', description: 'Download and extract web content' },
                { id: 'convert', name: 'Convert to Document', description: 'Convert web content to document format' },
                { id: 'transform', name: 'Transform to Interactive', description: 'Convert to interactive content' },
                { id: 'integrate', name: 'Integrate with Knowledge Base', description: 'Add to knowledge system' }
            ]);

            this.activePipelines.set(pipelineId, pipeline);

            // Step 1: Fetch web content
            await this.updatePipelineStep(pipelineId, 'fetch', 'running');
            const webContent = await this.webContentFetcher.fetch(url, options);
            await this.updatePipelineStep(pipelineId, 'fetch', 'completed', webContent);

            // Step 2: Convert to document format
            await this.updatePipelineStep(pipelineId, 'convert', 'running');
            const processedDocument = await this.convertWebContentToDocument(webContent);
            await this.updatePipelineStep(pipelineId, 'convert', 'completed', processedDocument);

            // Step 3: Transform to interactive
            await this.updatePipelineStep(pipelineId, 'transform', 'running');
            const interactiveArticle = await this.transformToInteractive(processedDocument);
            await this.updatePipelineStep(pipelineId, 'transform', 'completed', interactiveArticle);

            // Step 4: Integrate with knowledge base
            await this.updatePipelineStep(pipelineId, 'integrate', 'running');
            const integrationResult = await this.integrateWithKnowledgeBase(processedDocument, interactiveArticle);
            await this.updatePipelineStep(pipelineId, 'integrate', 'completed', integrationResult);

            // Complete pipeline
            pipeline.status = 'completed';
            pipeline.progress = 100;
            pipeline.endTime = new Date();

            const processingTime = Date.now() - startTime;

            const result: DocumentTransformationResult = {
                originalDocument: processedDocument,
                interactiveArticle,
                knowledgeNode: integrationResult.node,
                integrationResult,
                processingTime,
                success: true,
                errors: []
            };

            // Update application state
            this.updateApplicationState(result);
            this.updateWebContentState(webContent, result);

            logger.info(`Web content pipeline completed successfully in ${processingTime}ms`, {
                pipelineId,
                url,
                documentTitle: processedDocument.title
            });

            return result;

        } catch (error) {
            const processingTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Update pipeline with error
            const pipeline = this.activePipelines.get(pipelineId);
            if (pipeline) {
                pipeline.status = 'error';
                pipeline.error = errorMessage;
                pipeline.endTime = new Date();
            }

            logger.error(`Web content pipeline failed after ${processingTime}ms`, {
                pipelineId,
                url,
                error: errorMessage
            });

            return {
                originalDocument: {} as ProcessedDocument,
                interactiveArticle: {} as InteractiveArticle,
                knowledgeNode: {} as KnowledgeNode,
                integrationResult: {} as IntegrationResult,
                processingTime,
                success: false,
                errors: [errorMessage]
            };
        } finally {
            setTimeout(() => {
                this.activePipelines.delete(pipelineId);
            }, 300000);
        }
    }

    /**
     * Process multiple documents in batch
     */
    async processBatchDocuments(
        inputs: Array<{ input: File | string; type?: 'pdf' | 'markdown' | 'html' | 'url' }>
    ): Promise<DocumentTransformationResult[]> {
        const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const results: DocumentTransformationResult[] = [];

        logger.info(`Starting batch processing of ${inputs.length} documents`, { batchId });

        // Process in batches to avoid overwhelming the system
        const batches = this.chunkArray(inputs, this.options.batchSize);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            logger.info(`Processing batch ${i + 1}/${batches.length} with ${batch.length} items`);

            // Process batch concurrently but with limited concurrency
            const batchPromises = batch.map(({ input, type }) =>
                this.processDocumentPipeline(input, type)
            );

            const batchResults = await Promise.allSettled(batchPromises);

            // Collect results
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                } else {
                    logger.error(`Batch item ${index} failed:`, result.reason);
                    results.push({
                        originalDocument: {} as ProcessedDocument,
                        interactiveArticle: {} as InteractiveArticle,
                        knowledgeNode: {} as KnowledgeNode,
                        integrationResult: {} as IntegrationResult,
                        processingTime: 0,
                        success: false,
                        errors: [result.reason?.message || 'Unknown error']
                    });
                }
            });

            // Add delay between batches to prevent overwhelming
            if (i < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        logger.info(`Batch processing completed. ${results.filter(r => r.success).length}/${results.length} successful`);

        return results;
    }

    /**
     * Get active pipeline status
     */
    getPipelineStatus(pipelineId: string): IntegrationPipeline | null {
        return this.activePipelines.get(pipelineId) || null;
    }

    /**
     * Get all active pipelines
     */
    getActivePipelines(): IntegrationPipeline[] {
        return Array.from(this.activePipelines.values());
    }

    /**
     * Cancel a running pipeline
     */
    cancelPipeline(pipelineId: string): boolean {
        const pipeline = this.activePipelines.get(pipelineId);
        if (pipeline && pipeline.status === 'running') {
            pipeline.status = 'error';
            pipeline.error = 'Cancelled by user';
            pipeline.endTime = new Date();
            return true;
        }
        return false;
    }

    // Private helper methods

    private async processDocument(input: File | string, type?: string): Promise<ProcessedDocument> {
        return await this.documentProcessor.processDocument(input, type as any);
    }

    private async transformToInteractive(document: ProcessedDocument): Promise<InteractiveArticle> {
        return await this.interactiveTransformer.transformToInteractive(document);
    }

    private async integrateWithKnowledgeBase(
        document: ProcessedDocument,
        interactiveArticle: InteractiveArticle
    ): Promise<IntegrationResult> {
        // Get existing nodes from app state
        const existingNodes = Array.from(appState.content.nodes.values());

        const result = await knowledgeBaseIntegrationService.integrateDocument(
            document,
            existingNodes,
            {
                autoCreateRelationships: true,
                generateTags: true,
                extractCategories: true,
                assignToCollections: true
            }
        );
        return {
            node: result.node,
            relationships: result.relationships as any,
            metrics: {
                suggestions: result.suggestions,
                metadata: result.metadata
            }
        } as any;
    }

    private async convertWebContentToDocument(webContent: WebContent): Promise<ProcessedDocument> {
        // Convert WebContent to ProcessedDocument format
        const contentBlocks: ContentBlock[] = [
            {
                id: `block_${Date.now()}`,
                type: 'text',
                content: {
                    text: webContent.content.text,
                    format: 'html',
                    originalHtml: webContent.content.html
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            }
        ];

        // Add code blocks if present
        if (webContent.content.codeBlocks) {
            webContent.content.codeBlocks.forEach(codeBlock => {
                contentBlocks.push({
                    id: codeBlock.id,
                    type: 'code',
                    content: {
                        code: codeBlock.code,
                        language: codeBlock.language,
                        executable: !!codeBlock.executable
                    } as any,
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        version: 1
                    }
                } as ContentBlock);
            });
        }

        return {
            id: webContent.id,
            title: webContent.title,
            content: contentBlocks,
            metadata: {
                originalFormat: 'html' as const,
                title: webContent.title,
                created: new Date(webContent.fetchedAt),
                modified: new Date(),
                wordCount: webContent.metadata.wordCount,
                tags: webContent.metadata.tags,
                extractionMethod: webContent.extraction.method,
                confidence: webContent.extraction.confidence,
                sourceUrl: webContent.url
            },
            structure: {
                sections: [],
                toc: { items: [] },
                metadata: {
                    totalSections: 1,
                    maxDepth: 1,
                    hasImages: webContent.content.images.length > 0,
                    hasCode: webContent.content.codeBlocks.length > 0,
                    hasTables: webContent.content.tables.length > 0
                }
            },
            assets: webContent.content.images.map(img => ({
                id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                type: 'image' as const,
                name: img.alt || 'image',
                path: img.url || '',
                url: img.url,
                filename: img.alt || 'image',
                size: 0,
                mimeType: 'image/jpeg',
                extractedFrom: 'web',
                metadata: {
                    alt: img.alt || 'image'
                }
            })),
            source: {
                type: 'url',
                originalUrl: webContent.url,
                uploadedAt: new Date(webContent.fetchedAt)
            }
        };
    }

    private createPipeline(id: string, name: string, stepConfigs: Array<{ id: string; name: string; description: string }>): IntegrationPipeline {
        const steps: IntegrationStep[] = stepConfigs.map((config, index) => ({
            id: config.id,
            name: config.name,
            type: 'integrate' as const,
            order: index,
            config: {},
            status: 'pending',
            progress: 0
        }));

        return {
            id,
            name,
            description: 'Pipeline for processing content',
            steps,
            status: 'idle',
            progress: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            startTime: new Date()
        };
    }

    private async updatePipelineStep(pipelineId: string, stepId: string, status: 'pending' | 'running' | 'completed' | 'failed', result?: any): Promise<void> {
        const pipeline = this.activePipelines.get(pipelineId);
        if (!pipeline) { return; }

        const step = pipeline.steps.find(s => s.id === stepId);
        if (!step) { return; }

        step.status = status;
        step.result = result;

        if (status === 'running') {
            step.progress = 0;
            pipeline.status = 'running';
        } else if (status === 'completed') {
            step.progress = 100;
        } else if (status === 'failed') {
            step.progress = 0;
            pipeline.status = 'error';
        }

        // Update overall pipeline progress
        const completedSteps = pipeline.steps.filter(s => s.status === 'completed').length;
        pipeline.progress = Math.round((completedSteps / pipeline.steps.length) * 100);

        // Emit progress update if tracking is enabled
        if (this.options.enableProgressTracking) {
            this.emitProgressUpdate(pipeline);
        }
    }

    private updateApplicationState(result: DocumentTransformationResult): void {
        // Add knowledge node to app state
        actions.addKnowledgeNode(result.knowledgeNode);

        // Add notification
        actions.addNotification({
            type: 'success',
            message: `Successfully processed "${result.originalDocument.title}" and added to knowledge base`
        });
    }

    private updateWebContentState(webContent: WebContent, result: DocumentTransformationResult): void {
        // Create web content source
        const source: WebContentSource = {
            id: webContent.id,
            type: 'url',
            url: webContent.url,
            title: webContent.title,
            domain: webContent.metadata.domain,
            status: 'active',
            importDate: new Date(webContent.fetchedAt),
            lastChecked: new Date(),
            metadata: {
                category: webContent.metadata.category,
                tags: webContent.metadata.tags,
                readingTime: webContent.metadata.readingTime,
                wordCount: webContent.metadata.wordCount,
                domain: webContent.metadata.domain,
                contentType: webContent.metadata.contentType,
                language: webContent.metadata.language,
                keywords: webContent.metadata.keywords,
                description: webContent.metadata.description,
                attribution: webContent.metadata.attribution
            },
            usage: {
                timesReferenced: 0,
                referenceCount: 0,
                lastAccessed: new Date(),
                generatedModules: []
            }
        };

        // Add to web content state
        webContentActions.addSource(source);
        webContentActions.addContent(webContent);

        // Add transformation to history
        webContentActions.addTransformationToHistory({
            id: result.interactiveArticle.id,
            title: result.originalDocument.title,
            type: 'document-to-interactive',
            sourceId: webContent.id,
            timestamp: new Date()
        });
    }

    private setupCrossComponentCommunication(): void {
        // Set up event listeners and communication channels between components
        logger.info('Setting up cross-component communication');
    }

    private initializeMobileOptimizations(): void {
        // Initialize mobile-specific optimizations
        logger.info('Initializing mobile optimizations');
    }

    private setupErrorRecovery(): void {
        // Set up error recovery mechanisms
        logger.info('Setting up error recovery mechanisms');
    }

    private emitProgressUpdate(pipeline: IntegrationPipeline): void {
        // Emit progress update event (could be used by UI components)
        logger.debug(`Pipeline ${pipeline.id} progress: ${pipeline.progress}%`);
    }

    private chunkArray<T>(array: T[], chunkSize: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < array.length; i += chunkSize) {
            chunks.push(array.slice(i, i + chunkSize));
        }
        return chunks;
    }
}

// Export singleton instance
export const systemIntegrationService = new SystemIntegrationService();