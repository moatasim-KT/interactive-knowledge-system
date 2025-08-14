/**
 * Content Processing Pipeline Manager
 * Orchestrates the multi-stage content processing workflow
 */

import type {
	ProcessingStage,
	ProcessingResult,
	WebContent,
	WebContentSource,
	ContentProcessingResult,
	BatchProcessingJob
} from '../types/web-content.js';
import type { ContentModule } from '../types/content.js';
import { sourceManager } from './sourceManager.js';
import { storageService } from './storage.js';
import { contentUpdateDetector } from './contentUpdateDetector.js';
import { duplicateDetector } from './duplicateDetector.js';
import { webContentFetcher } from './webContentFetcher.js';
import { interactiveAnalyzer } from './interactiveAnalyzer.js';
import { createLogger } from '../utils/logger.js';

/**
 * Processing pipeline configuration
 */
export interface ProcessingPipelineConfig {
	maxConcurrentJobs: number;
	retryAttempts: number;
	retryDelay: number;
	retryBackoffMultiplier: number;
	maxRetryDelay: number;
	timeoutMs: number;
	enableDuplicateDetection: boolean;
	enableQualityAssessment: boolean;
	enableInteractiveTransformation: boolean;
	enableParallelProcessing: boolean;
	progressReportingInterval: number;
	enableDetailedLogging: boolean;
}

/**
 * Processing job status
 */
export type ProcessingJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

/**
 * Processing job
 */
export interface ProcessingJob {
	id: string;
	type: 'single' | 'batch';
	status: ProcessingJobStatus;
	progress: {
		currentStage: number;
		totalStages: number;
		stageProgress: number;
		overallProgress: number;
		estimatedTimeRemaining?: number;
		throughput?: number;
	};
	stages: ProcessingStage[];
	results: ProcessingResult[];
	error?: string;
	retryCount: number;
	lastRetryAt?: Date;
	createdAt: Date;
	startedAt?: Date;
	completedAt?: Date;
	metadata: {
		sourceUrl?: string;
		sourceUrls?: string[];
		priority: 'low' | 'normal' | 'high';
		userId?: string;
		tags?: string[];
		batchId?: string;
	};
	// Enhanced progress tracking
	stageTimings: Map<string, { startTime: number; endTime?: number; duration?: number }>;
	progressHistory: Array<{ timestamp: Date; stage: string; progress: number }>;
}

/**
 * Processing Pipeline Manager class
 */
export class ProcessingPipelineManager {
	private static instance: ProcessingPipelineManager;
	private config: ProcessingPipelineConfig;
	private activeJobs = new Map<string, ProcessingJob>();
	private jobQueue: ProcessingJob[] = [];
	private completedJobs = new Map<string, ProcessingJob>();
	private isProcessing = false;
	private logger = createLogger('processing-pipeline');
	private progressReportingTimer?: NodeJS.Timeout;
	private eventListeners = new Map<string, Array<(event: any) => void>>();

	private constructor() {
		this.config = {
			maxConcurrentJobs: 3,
			retryAttempts: 3,
			retryDelay: 1000,
			retryBackoffMultiplier: 2,
			maxRetryDelay: 30000,
			timeoutMs: 300000, // 5 minutes
			enableDuplicateDetection: true,
			enableQualityAssessment: true,
			enableInteractiveTransformation: true,
			enableParallelProcessing: true,
			progressReportingInterval: 5000, // 5 seconds
			enableDetailedLogging: true
		};
		this.startProgressReporting();
	}

	static getInstance(): ProcessingPipelineManager {
		if (!ProcessingPipelineManager.instance) {
			ProcessingPipelineManager.instance = new ProcessingPipelineManager();
		}
		return ProcessingPipelineManager.instance;
	}

	/**
	 * Update pipeline configuration
	 */
	updateConfig(newConfig: Partial<ProcessingPipelineConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.logger.info('Pipeline configuration updated', newConfig);

		// Restart progress reporting if interval changed
		if (newConfig.progressReportingInterval !== undefined) {
			this.stopProgressReporting();
			this.startProgressReporting();
		}
	}

	/**
	 * Add event listener for pipeline events
	 */
	addEventListener(event: string, listener: (data: any) => void): void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, []);
		}
		this.eventListeners.get(event)!.push(listener);
	}

	/**
	 * Remove event listener
	 */
	removeEventListener(event: string, listener: (data: any) => void): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			const index = listeners.indexOf(listener);
			if (index > -1) {
				listeners.splice(index, 1);
			}
		}
	}

	/**
	 * Emit event to listeners
	 */
	private emitEvent(event: string, data: any): void {
		const listeners = this.eventListeners.get(event);
		if (listeners) {
			listeners.forEach(listener => {
				try {
					listener(data);
				} catch (error) {
					this.logger.error('Error in event listener:', error);
				}
			});
		}
	}

	/**
	 * Create a processing job for a single URL
	 */
	createSingleProcessingJob(
		url: string,
		priority: 'low' | 'normal' | 'high' = 'normal',
		options: { tags?: string[]; userId?: string; batchId?: string } = {}
	): string {
		const jobId = this.generateJobId();
		const stages = this.createProcessingStages('single');

		const job: ProcessingJob = {
			id: jobId,
			type: 'single',
			status: 'pending',
			progress: {
				currentStage: 0,
				totalStages: stages.length,
				stageProgress: 0,
				overallProgress: 0
			},
			stages,
			results: [],
			retryCount: 0,
			createdAt: new Date(),
			metadata: {
				sourceUrl: url,
				priority,
				...options
			},
			stageTimings: new Map(),
			progressHistory: []
		};

		this.jobQueue.push(job);
		this.sortJobQueue();

		this.logger.info('Single processing job created', { jobId, url, priority });
		this.emitEvent('job-created', { job: this.sanitizeJobForEvent(job) });

		// Start processing if not already running
		if (!this.isProcessing) {
			void this.processJobQueue();
		}

		return jobId;
	}

	/**
	 * Create a batch processing job for multiple URLs
	 */
	createBatchProcessingJob(
		urls: string[],
		priority: 'low' | 'normal' | 'high' = 'normal',
		options: { tags?: string[]; userId?: string; enableParallel?: boolean } = {}
	): string {
		const batchId = this.generateJobId();

		if (this.config.enableParallelProcessing && options.enableParallel !== false) {
			// Create individual jobs for parallel processing
			const jobIds = urls.map(url =>
				this.createSingleProcessingJob(url, priority, {
					...options,
					tags: [...(options.tags || []), 'batch'],
					batchId
				})
			);

			this.logger.info('Batch processing job created (parallel)', {
				batchId,
				urlCount: urls.length,
				jobIds
			});

			this.emitEvent('batch-created', {
				batchId,
				urlCount: urls.length,
				jobIds,
				parallel: true
			});

			return batchId;
		} else {
			// Create single batch job for sequential processing
			const stages = this.createProcessingStages('batch');

			const job: ProcessingJob = {
				id: batchId,
				type: 'batch',
				status: 'pending',
				progress: {
					currentStage: 0,
					totalStages: stages.length,
					stageProgress: 0,
					overallProgress: 0
				},
				stages,
				results: [],
				retryCount: 0,
				createdAt: new Date(),
				metadata: {
					sourceUrls: urls,
					priority,
					...options
				},
				stageTimings: new Map(),
				progressHistory: []
			};

			this.jobQueue.push(job);
			this.sortJobQueue();

			this.logger.info('Batch processing job created (sequential)', {
				batchId,
				urlCount: urls.length
			});

			this.emitEvent('batch-created', {
				batchId,
				urlCount: urls.length,
				parallel: false
			});

			if (!this.isProcessing) {
				void this.processJobQueue();
			}

			return batchId;
		}
	}

	/**
	 * Get job status
	 */
	getJobStatus(jobId: string): ProcessingJob | undefined {
		return this.activeJobs.get(jobId) ||
			this.jobQueue.find((job) => job.id === jobId) ||
			this.completedJobs.get(jobId);
	}

	/**
	 * Cancel a processing job
	 */
	cancelJob(jobId: string): boolean {
		const job = this.getJobStatus(jobId);
		if (!job) {
			return false;
		}

		if (job.status === 'pending') {
			// Remove from queue
			const idx = this.jobQueue.findIndex((j) => j.id === jobId);
			if (idx >= 0) {
				this.jobQueue.splice(idx, 1);
			}
		}

		job.status = 'cancelled';
		job.completedAt = new Date();

		return true;
	}

	/**
	 * Get all active jobs
	 */
	getActiveJobs(): ProcessingJob[] {
		return Array.from(this.activeJobs.values());
	}

	/**
	 * Get job queue
	 */
	getJobQueue(): ProcessingJob[] {
		return [...this.jobQueue];
	}

	/**
	 * Get completed jobs
	 */
	getCompletedJobs(): ProcessingJob[] {
		return Array.from(this.completedJobs.values());
	}

	/**
	 * Get batch status for parallel batch jobs
	 */
	getBatchStatus(batchId: string): {
		batchId: string;
		totalJobs: number;
		completedJobs: number;
		failedJobs: number;
		overallProgress: number;
		status: 'pending' | 'processing' | 'completed' | 'failed';
	} | null {
		const batchJobs = [
			...this.jobQueue,
			...this.activeJobs.values(),
			...this.completedJobs.values()
		].filter(job => job.metadata.batchId === batchId);

		if (batchJobs.length === 0) {
			return null;
		}

		const completed = batchJobs.filter(job => job.status === 'completed').length;
		const failed = batchJobs.filter(job => job.status === 'failed').length;
		const processing = batchJobs.filter(job => job.status === 'processing').length;

		let status: 'pending' | 'processing' | 'completed' | 'failed';
		if (completed === batchJobs.length) {
			status = 'completed';
		} else if (failed === batchJobs.length) {
			status = 'failed';
		} else if (processing > 0 || completed > 0) {
			status = 'processing';
		} else {
			status = 'pending';
		}

		return {
			batchId,
			totalJobs: batchJobs.length,
			completedJobs: completed,
			failedJobs: failed,
			overallProgress: (completed / batchJobs.length) * 100,
			status
		};
	}

	/**
	 * Get pipeline statistics
	 */
	getStatistics(): {
		activeJobs: number;
		queuedJobs: number;
		completedJobs: number;
		totalProcessed: number;
		averageProcessingTime: number;
		successRate: number;
	} {
		const completedJobs = Array.from(this.completedJobs.values());
		const successfulJobs = completedJobs.filter(job => job.status === 'completed');

		const processingTimes = completedJobs
			.filter(job => job.startedAt && job.completedAt)
			.map(job => job.completedAt!.getTime() - job.startedAt!.getTime());

		const averageTime = processingTimes.length > 0
			? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
			: 0;

		return {
			activeJobs: this.activeJobs.size,
			queuedJobs: this.jobQueue.length,
			completedJobs: completedJobs.length,
			totalProcessed: completedJobs.length,
			averageProcessingTime: averageTime,
			successRate: completedJobs.length > 0 ? (successfulJobs.length / completedJobs.length) * 100 : 0
		};
	}

	/**
	 * Process job queue
	 */
	private async processJobQueue(): Promise<void> {
		if (this.isProcessing) {
			return;
		}

		this.isProcessing = true;

		try {
			while (this.jobQueue.length > 0 && this.activeJobs.size < this.config.maxConcurrentJobs) {
				const job = this.jobQueue.shift();
				if (!job || job.status === 'cancelled') {
					continue;
				}

				// Small delay to make this properly async
				await new Promise((resolve) => setTimeout(resolve, 0));

				this.activeJobs.set(job.id, job);
				this.processJob(job)
					.catch((error) => {
						// Log error for debugging - in production this would use a proper logger
						// console.error(`Job ${job.id} failed:`, error);
						job.status = 'failed';
						job.error = error instanceof Error ? error.message : 'Unknown error';
						job.completedAt = new Date();
					})
					.finally(() => {
						this.activeJobs.delete(job.id);

						// Continue processing queue
						if (this.jobQueue.length > 0) {
							setTimeout(() => void this.processJobQueue(), 100);
						}
					});
			}
		} finally {
			if (this.activeJobs.size === 0 && this.jobQueue.length === 0) {
				this.isProcessing = false;
			}
		}
	}

	/**
	 * Process a single job with enhanced retry and progress tracking
	 */
	private async processJob(job: ProcessingJob): Promise<void> {
		job.status = 'processing';
		job.startedAt = new Date();

		this.logger.info('Starting job processing', { jobId: job.id, type: job.type });
		this.emitEvent('job-started', { job: this.sanitizeJobForEvent(job) });

		try {
			for (let i = 0; i < job.stages.length; i++) {
				if (this.activeJobs.get(job.id)?.status === 'cancelled') {
					this.logger.info('Job cancelled during processing', { jobId: job.id });
					return;
				}

				const stage = job.stages[i];
				job.progress.currentStage = i;
				job.progress.stageProgress = 0;

				// Record stage start time
				job.stageTimings.set(stage.name, { startTime: Date.now() });

				this.logger.debug('Processing stage', { jobId: job.id, stage: stage.name });
				this.emitEvent('stage-started', {
					jobId: job.id,
					stage: stage.name,
					stageIndex: i
				});

				let stageResult: ProcessingResult;
				let retryCount = 0;

				// Retry logic for individual stages
				while (retryCount <= this.config.retryAttempts) {
					try {
						stageResult = await this.processStageWithTimeout(job, stage);
						break; // Success, exit retry loop
					} catch (error) {
						retryCount++;

						if (retryCount > this.config.retryAttempts) {
							throw error; // Max retries exceeded
						}

						const delay = this.calculateRetryDelay(retryCount);
						this.logger.warn('Stage failed, retrying', {
							jobId: job.id,
							stage: stage.name,
							attempt: retryCount,
							delay,
							error: error instanceof Error ? error.message : 'Unknown error'
						});

						this.emitEvent('stage-retry', {
							jobId: job.id,
							stage: stage.name,
							attempt: retryCount,
							delay
						});

						await this.delay(delay);
					}
				}

				// Record stage completion
				const stageTiming = job.stageTimings.get(stage.name)!;
				stageTiming.endTime = Date.now();
				stageTiming.duration = stageTiming.endTime - stageTiming.startTime;

				job.results.push(stageResult!);

				if (!stageResult!.success) {
					throw new Error(`Stage ${stage.name} failed: ${stageResult!.metadata.issues.join(', ')}`);
				}

				job.progress.stageProgress = 100;
				job.progress.overallProgress = ((i + 1) / job.stages.length) * 100;

				// Update progress history
				job.progressHistory.push({
					timestamp: new Date(),
					stage: stage.name,
					progress: job.progress.overallProgress
				});

				// Calculate estimated time remaining
				this.updateTimeEstimate(job);

				this.logger.debug('Stage completed', {
					jobId: job.id,
					stage: stage.name,
					duration: stageTiming.duration
				});

				this.emitEvent('stage-completed', {
					jobId: job.id,
					stage: stage.name,
					duration: stageTiming.duration,
					progress: job.progress.overallProgress
				});
			}

			job.status = 'completed';
			job.completedAt = new Date();

			// Move to completed jobs
			this.completedJobs.set(job.id, job);

			this.logger.info('Job completed successfully', {
				jobId: job.id,
				duration: job.completedAt.getTime() - job.startedAt!.getTime()
			});

			this.emitEvent('job-completed', { job: this.sanitizeJobForEvent(job) });

		} catch (error) {
			job.status = 'failed';
			job.error = error instanceof Error ? error.message : 'Unknown error';
			job.completedAt = new Date();

			// Move to completed jobs even if failed for tracking
			this.completedJobs.set(job.id, job);

			this.logger.error('Job failed', {
				jobId: job.id,
				error: job.error,
				retryCount: job.retryCount
			});

			this.emitEvent('job-failed', {
				job: this.sanitizeJobForEvent(job),
				error: job.error
			});

			throw error;
		}
	}

	/**
	 * Process a single stage
	 */
	private async processStage(
		job: ProcessingJob,
		stage: ProcessingStage
	): Promise<ProcessingResult> {
		const startTime = Date.now();
		const issues: string[] = [];

		try {
			let stageData: Record<string, unknown> = {};

			switch (stage.name) {
				case 'fetch':
					stageData = await this.processFetchStage(job, stage);
					break;

				case 'extract':
					stageData = await this.processExtractStage(job, stage);
					break;

				case 'store':
					stageData = await this.processStoreStage(job, stage);
					break;

				case 'duplicate_check':
					if (this.config.enableDuplicateDetection) {
						stageData = await this.processDuplicateCheckStage(job, stage);
					}
					break;

				case 'quality_assessment':
					if (this.config.enableQualityAssessment) {
						stageData = await this.processQualityAssessmentStage(job, stage);
					}
					break;

				case 'interactive_transformation':
					if (this.config.enableInteractiveTransformation) {
						stageData = await this.processInteractiveTransformationStage(job, stage);
					}
					break;

				default:
					issues.push(`Unknown stage: ${stage.name}`);
			}

			const confidence = this.calculateStageConfidence(stage.name, stageData);

			return {
				stage: stage.name,
				success: issues.length === 0,
				data: stageData,
				metadata: {
					processingTime: Date.now() - startTime,
					confidence,
					issues
				}
			};
		} catch (error) {
			issues.push(error instanceof Error ? error.message : 'Unknown error');

			return {
				stage: stage.name,
				success: false,
				data: null,
				metadata: {
					processingTime: Date.now() - startTime,
					confidence: 0,
					issues
				}
			};
		}
	}

	/**
	 * Process fetch stage
	 */
	private async processFetchStage(job: ProcessingJob, stage: ProcessingStage): Promise<any> {
		const url = job.metadata.sourceUrl || job.metadata.sourceUrls?.[0];
		if (!url) {
			throw new Error('No URL provided for fetch stage');
		}

		this.logger.debug('Fetching content', { jobId: job.id, url });

		try {
			const webContent = await webContentFetcher.fetch(url, {
				timeout: this.config.timeoutMs,
				cleanContent: true,
				preserveInteractivity: true
			});

			if (!webContent.success) {
				throw new Error(`Failed to fetch content: ${webContent.extraction.issues.join(', ')}`);
			}

			return {
				webContent: webContent,
				url,
				fetchedAt: new Date(),
				success: true,
				confidence: webContent.extraction.confidence
			};
		} catch (error) {
			this.logger.error('Fetch stage failed', { jobId: job.id, url, error });
			throw error;
		}
	}

	/**
	 * Process extract stage (analyze content for interactive opportunities)
	 */
	private async processExtractStage(job: ProcessingJob, stage: ProcessingStage): Promise<any> {
		const fetchResult = job.results.find(r => r.stage === 'fetch');
		if (!fetchResult?.data?.webContent) {
			throw new Error('No web content available for extraction');
		}

		const webContent = fetchResult.data.webContent;
		this.logger.debug('Analyzing content for interactivity', { jobId: job.id, contentId: webContent.id });

		try {
			// Add source record (without unsupported fields)
			const addResult = await sourceManager.addSource({
				url: webContent.url,
				title: webContent.title,
				metadata: webContent.metadata
			});

			// Analyze for interactive opportunities (using fetched content id)
			const analysis = await interactiveAnalyzer.analyzeContent(webContent.id);

			return {
				contentId: addResult.sourceId,
				analysis,
				extractionMethod: webContent.extraction.method,
				confidence: webContent.extraction.confidence,
				interactiveOpportunities: analysis.opportunities.length
			};
		} catch (error) {
			this.logger.error('Extract stage failed', { jobId: job.id, error });
			throw error;
		}
	}

	/**
	 * Process store stage (permanently store the content)
	 */
	private async processStoreStage(job: ProcessingJob, stage: ProcessingStage): Promise<any> {
		const extract_result = job.results.find(r => r.stage === 'extract');
		if (!extract_result?.data?.contentId) {
			throw new Error('No content ID available for storage');
		}

		const content_id = extract_result.data.contentId;
		this.logger.debug('Storing content permanently', { jobId: job.id, contentId: content_id });

		try {
			// Confirm the source exists in storage
			const source = await storageService.getSource(content_id);
			if (!source) {
				throw new Error('Content not found in source manager');
			}

			// Update source status to reflect processing
			await sourceManager.updateSource(content_id, {
				status: 'updated'
			});

			return {
				sourceId: content_id,
				stored: true,
				url: source.url,
				title: source.title
			};
		} catch (error) {
			this.logger.error('Store stage failed', { jobId: job.id, error });
			throw error;
		}
	}

	/**
	 * Process duplicate check stage
	 */
	private async processDuplicateCheckStage(
		job: ProcessingJob,
		stage: ProcessingStage
	): Promise<any> {
		// This would use the duplicate detector
		const store_result = job.results.find((r) => r.stage === 'store');
		if (!store_result?.data?.sourceId) {
			return { duplicatesFound: false };
		}

		const duplicate_result = await duplicateDetector.detectDuplicatesForSource(
			store_result.data.sourceId
		);

		return {
			duplicatesFound: duplicate_result.duplicates.length > 0,
			duplicateCount: duplicate_result.duplicates.length,
			suggestions: duplicate_result.suggestions
		};
	}

	/**
	 * Process quality assessment stage
	 */
	private async processQualityAssessmentStage(job: ProcessingJob, stage: ProcessingStage): Promise<any> {
		const extract_result = job.results.find(r => r.stage === 'extract');
		if (!extract_result?.data?.contentId) {
			throw new Error('No content ID available for quality assessment');
		}

		const content_id = extract_result.data.contentId;
		const analysis = extract_result.data.analysis;

		this.logger.debug('Assessing content quality', { jobId: job.id, contentId: content_id });

		try {
			// Get the source content for quality assessment
			const source = await storageService.getSource(content_id);
			if (!source) {
				throw new Error('Source not found for quality assessment');
			}

			const quality_metrics = this.assessContentQuality(source, analysis);

			return {
				contentId: content_id,
				qualityScore: quality_metrics.overallScore,
				readabilityScore: quality_metrics.readabilityScore,
				interactivityPotential: quality_metrics.interactivityScore,
				accessibilityScore: quality_metrics.accessibilityScore,
				suggestions: this.generateQualityImprovements(quality_metrics),
				metrics: quality_metrics
			};
		} catch (error) {
			this.logger.error('Quality assessment stage failed', { jobId: job.id, error });
			throw error;
		}
	}

	/**
	 * Process interactive transformation stage
	 */
	private async processInteractiveTransformationStage(job: ProcessingJob, stage: ProcessingStage): Promise<any> {
		const extract_result = job.results.find(r => r.stage === 'extract');
		if (!extract_result?.data?.contentId) {
			throw new Error('No content ID available for transformation');
		}

		const content_id = extract_result.data.contentId;
		const analysis = extract_result.data.analysis;

		this.logger.debug('Transforming content to interactive', {
			jobId: job.id,
			contentId: content_id,
			opportunities: analysis.opportunities.length
		});

		try {
			// Transform content based on detected opportunities
			const transformation = await interactiveAnalyzer.transform(content_id, {
				type: 'auto',
				domain: this.detectDomain(analysis),
				parameters: stage.config
			});

			return {
				contentId: content_id,
				transformationsApplied: transformation.interactiveBlocks.length,
				interactiveElementsCreated: transformation.interactiveBlocks.map(block => block.type),
				confidence: this.calculateTransformationConfidence(transformation),
				transformedContent: transformation.transformedContent
			};
		} catch (error) {
			this.logger.error('Interactive transformation stage failed', { jobId: job.id, error });
			throw error;
		}
	}

	/**
	 * Create processing stages based on job type
	 */
	private createProcessingStages(jobType: 'single' | 'batch'): ProcessingStage[] {
		const base_stages = [
			{
				name: 'fetch',
				processor: 'WebContentFetcher',
				config: {},
				dependencies: [],
				outputs: ['webContent']
			},
			{
				name: 'extract',
				processor: 'ContentExtractor',
				config: {},
				dependencies: ['fetch'],
				outputs: ['extractedContent']
			},
			{
				name: 'store',
				processor: 'SourceManager',
				config: {},
				dependencies: ['extract'],
				outputs: ['sourceId']
			}
		];

		// Add optional stages based on configuration
		if (this.config.enableDuplicateDetection) {
			base_stages.push({
				name: 'duplicate_check',
				processor: 'DuplicateDetector',
				config: {},
				dependencies: ['store'],
				outputs: ['duplicateReport']
			});
		}

		if (this.config.enableQualityAssessment) {
			base_stages.push({
				name: 'quality_assessment',
				processor: 'QualityAssessor',
				config: {},
				dependencies: ['store'],
				outputs: ['qualityReport']
			});
		}

		if (this.config.enableInteractiveTransformation) {
			base_stages.push({
				name: 'interactive_transformation',
				processor: 'InteractiveTransformer',
				config: {},
				dependencies: ['quality_assessment'],
				outputs: ['interactiveContent']
			});
		}

		return base_stages;
	}

	/**
	 * Sort job queue by priority
	 */
	private sortJobQueue(): void {
		const priority_order = { high: 3, normal: 2, low: 1 };

		this.jobQueue.sort((a, b) => {
			const a_priority = priority_order[a.metadata.priority];
			const b_priority = priority_order[b.metadata.priority];

			if (a_priority !== b_priority) {
				return b_priority - a_priority;
			}

			// If same priority, sort by creation time (FIFO)
			return a.createdAt.getTime() - b.createdAt.getTime();
		});
	}

	/**
	 * Generate unique job ID
	 */
	private generateJobId(): string {
		return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Process stage with timeout
	 */
	private async processStageWithTimeout(job: ProcessingJob, stage: ProcessingStage): Promise<ProcessingResult> {
		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				reject(new Error(`Stage ${stage.name} timed out after ${this.config.timeoutMs}ms`));
			}, this.config.timeoutMs);

			this.processStage(job, stage)
				.then(result => {
					clearTimeout(timeout);
					resolve(result);
				})
				.catch(error => {
					clearTimeout(timeout);
					reject(error);
				});
		});
	}

	/**
	 * Calculate retry delay with exponential backoff
	 */
	private calculateRetryDelay(attempt: number): number {
		const delay = this.config.retryDelay * Math.pow(this.config.retryBackoffMultiplier, attempt - 1);
		return Math.min(delay, this.config.maxRetryDelay);
	}

	/**
	 * Delay utility
	 */
	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Update time estimate for job
	 */
	private updateTimeEstimate(job: ProcessingJob): void {
		if (job.progressHistory.length < 2) {return;}

		const recent_progress = job.progressHistory.slice(-3);
		const time_per_percent = recent_progress.reduce((acc, curr, index) => {
			if (index === 0) {return acc;}
			const prev = recent_progress[index - 1];
			const time_diff = curr.timestamp.getTime() - prev.timestamp.getTime();
			const progress_diff = curr.progress - prev.progress;
			return acc + (progress_diff > 0 ? time_diff / progress_diff : 0);
		}, 0) / (recent_progress.length - 1);

		const remaining_progress = 100 - job.progress.overallProgress;
		job.progress.estimatedTimeRemaining = remaining_progress * time_per_percent;

		// Calculate throughput (progress per second)
		if (job.startedAt) {
			const elapsed = Date.now() - job.startedAt.getTime();
			job.progress.throughput = (job.progress.overallProgress / elapsed) * 1000;
		}
	}

	/**
	 * Sanitize job for event emission (remove sensitive data)
	 */
	private sanitizeJobForEvent(job: ProcessingJob): any {
		return {
			id: job.id,
			type: job.type,
			status: job.status,
			progress: job.progress,
			retryCount: job.retryCount,
			createdAt: job.createdAt,
			startedAt: job.startedAt,
			completedAt: job.completedAt,
			metadata: {
				priority: job.metadata.priority,
				tags: job.metadata.tags,
				batchId: job.metadata.batchId
			}
		};
	}

	/**
	 * Start progress reporting
	 */
	private startProgressReporting(): void {
		if (this.progressReportingTimer) {
			clearInterval(this.progressReportingTimer);
		}

		this.progressReportingTimer = setInterval(() => {
			if (this.activeJobs.size > 0) {
				const active_jobs = Array.from(this.activeJobs.values());
				const statistics = this.getStatistics();

				this.emitEvent('progress-report', {
					activeJobs: active_jobs.map(job => this.sanitizeJobForEvent(job)),
					statistics,
					timestamp: new Date()
				});

				if (this.config.enableDetailedLogging) {
					this.logger.debug('Progress report', { statistics, activeJobCount: active_jobs.length });
				}
			}
		}, this.config.progressReportingInterval);
	}

	/**
	 * Stop progress reporting
	 */
	private stopProgressReporting(): void {
		if (this.progressReportingTimer) {
			clearInterval(this.progressReportingTimer);
			this.progressReportingTimer = undefined;
		}
	}

	/**
	 * Cleanup completed jobs (keep only recent ones)
	 */
	cleanupCompletedJobs(max_age = 24 * 60 * 60 * 1000): void {
		const cutoff = Date.now() - max_age;
		const to_remove: string[] = [];

		this.completedJobs.forEach((job, id) => {
			if (job.completedAt && job.completedAt.getTime() < cutoff) {
				to_remove.push(id);
			}
		});

		to_remove.forEach(id => this.completedJobs.delete(id));

		if (to_remove.length > 0) {
			this.logger.info('Cleaned up completed jobs', { removedCount: to_remove.length });
		}
	}

	/**
	 * Detect domain from content analysis
	 */
	private detectDomain(analysis: any): string {
		// Simple domain detection based on content analysis
		if (analysis.javascriptFrameworks.some((fw: any) => fw.name.includes('React'))) {
			return 'web-development';
		}
		if (analysis.interactiveElements.some((el: any) => el.type === 'canvas')) {
			return 'data-visualization';
		}
		return 'general';
	}

	/**
	 * Calculate transformation confidence
	 */
	private calculateTransformationConfidence(transformation: any): number {
		const blocks_created = transformation.interactiveBlocks.length;
		if (blocks_created === 0) {return 0.1;}
		if (blocks_created >= 3) {return 0.9;}
		return 0.5 + (blocks_created * 0.2);
	}

	/**
	 * Calculate stage confidence based on stage type and results
	 */
	private calculateStageConfidence(stageName: string, stageData: any): number {
		switch (stageName) {
			case 'fetch':
				return stageData.confidence || 0.8;
			case 'extract':
				return stageData.confidence || 0.7;
			case 'store':
				return stageData.stored ? 0.9 : 0.1;
			case 'duplicate_check':
				return 0.8;
			case 'quality_assessment':
				return stageData.qualityScore || 0.6;
			case 'interactive_transformation':
				return stageData.confidence || 0.7;
			default:
				return 0.5;
		}
	}

	/**
	 * Assess content quality
	 */
	private assessContentQuality(source: any, analysis: any): any {
		const content = source.content;
		const metadata = source.metadata;

		// Calculate readability score
		const readability_score = this.calculateReadabilityScore(content.text);

		// Calculate interactivity score
		const interactivity_score = analysis.opportunities.length > 0 ?
			Math.min(analysis.opportunities.length * 0.2, 1.0) : 0.1;

		// Calculate accessibility score
		const accessibility_score = this.calculateAccessibilityScore(content.html);

		// Calculate engagement score
		const engagement_score = this.calculateEngagementScore(content, metadata);

		// Overall score
		const overall_score = (readability_score + interactivity_score + accessibility_score + engagement_score) / 4;

		return {
			readabilityScore: readability_score,
			interactivityScore: interactivity_score,
			accessibilityScore: accessibility_score,
			engagementScore: engagement_score,
			overallScore: overall_score
		};
	}

	/**
	 * Calculate readability score
	 */
	private calculateReadabilityScore(text: string): number {
		const word_count = text.split(/\s+/).length;
		const sentence_count = text.split(/[.!?]+/).length;
		const avg_words_per_sentence = word_count / sentence_count;

		// Simple readability heuristic
		if (avg_words_per_sentence < 15) {return 0.9;}
		if (avg_words_per_sentence < 20) {return 0.7;}
		if (avg_words_per_sentence < 25) {return 0.5;}
		return 0.3;
	}

	/**
	 * Calculate accessibility score
	 */
	private calculateAccessibilityScore(html: string): number {
		let score = 0.5; // Base score

		// Check for alt attributes on images
		const img_matches = html.match(/<img[^>]*>/g) || [];
		const img_with_alt = html.match(/<img[^>]*alt\s*=\s*["'][^"']*["'][^>]*>/g) || [];
		if (img_matches.length > 0) {
			score += (img_with_alt.length / img_matches.length) * 0.2;
		}

		// Check for semantic HTML
		if (html.includes('<h1') || html.includes('<h2')) {score += 0.1;}
		if (html.includes('<nav') || html.includes('<main')) {score += 0.1;}
		if (html.includes('aria-')) {score += 0.1;}

		return Math.min(score, 1.0);
	}

	/**
	 * Calculate engagement score
	 */
	private calculateEngagementScore(content: any, metadata: any): number {
		let score = 0.3; // Base score

		// Content length
		if (content.text.length > 1000) {score += 0.1;}
		if (content.text.length > 3000) {score += 0.1;}

		// Media content
		if (content.images.length > 0) {score += 0.1;}
		if (content.codeBlocks.length > 0) {score += 0.1;}
		if (content.tables.length > 0) {score += 0.1;}

		// Metadata completeness
		if (metadata.description && metadata.description.length > 50) {score += 0.1;}
		if (metadata.keywords.length > 0) {score += 0.1;}

		return Math.min(score, 1.0);
	}

	/**
	 * Generate quality improvement suggestions
	 */
	private generateQualityImprovements(metrics: any): string[] {
		const suggestions: string[] = [];

		if (metrics.readabilityScore < 0.6) {
			suggestions.push('Consider breaking up long sentences for better readability');
		}
		if (metrics.interactivityScore < 0.4) {
			suggestions.push('Add interactive elements like charts, quizzes, or simulations');
		}
		if (metrics.accessibilityScore < 0.7) {
			suggestions.push('Improve accessibility by adding alt text to images and using semantic HTML');
		}
		if (metrics.engagementScore < 0.5) {
			suggestions.push('Add more visual elements and structured content to increase engagement');
		}

		return suggestions;
	}
}

// Export singleton instance
export const processingPipelineManager = ProcessingPipelineManager.getInstance();

// Compatibility adapter to match expected API in components
export const processingPipeline = {
  startProcessing: async (
    urls: string[],
    _options?: { skipProcessing?: boolean; enableAiEnhancements?: boolean }
  ): Promise<{ success: boolean; id: string }> => {
    const id = processingPipelineManager.createSingleProcessingJob(urls[0] ?? '');
    return { success: true, id };
  },
  startBatchProcessing: async (
    urls: string[],
    _options?: { skipProcessing?: boolean; enableAiEnhancements?: boolean }
  ): Promise<{ id: string }> => {
    const id = processingPipelineManager.createBatchProcessingJob(urls);
    return { id };
  },
  onProgressUpdate: (cb: (progress: any) => void): (() => void) => {
    const listener = (event: any) => cb(event);
    processingPipelineManager.addEventListener('progress-report', listener);
    return () => processingPipelineManager.removeEventListener('progress-report', listener);
  },
  onJobComplete: (cb: (job: any) => void): (() => void) => {
    const listener = ({ job }: any) => cb(job);
    processingPipelineManager.addEventListener('job-completed', listener);
    return () => processingPipelineManager.removeEventListener('job-completed', listener);
  },
  onJobError: (cb: (jobId: string, error: Error) => void): (() => void) => {
    const listener = ({ job, error }: any) => cb(job.id, new Error(error));
    processingPipelineManager.addEventListener('job-failed', listener);
    return () => processingPipelineManager.removeEventListener('job-failed', listener);
  }
};
