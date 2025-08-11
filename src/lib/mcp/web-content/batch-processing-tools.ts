/**
 * Batch Processing Tools
 * Implementation of batch processing capabilities for web content sourcing
 * Referencing existing UrlConversionTools architecture
 */

import { createLogger } from '$lib/utils/logger.js';
import type {
	BatchProcessingJob,
	WebContent,
	ContentProcessingResult,
	SourceHealthCheck
} from '$lib/types/web-content.js';

// Define missing types locally since they're not in the web-content.js types
type BatchJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
type BatchJobPriority = 'low' | 'normal' | 'high';

interface BatchJobOptions {
  concurrency?: number;
  extractInteractive?: boolean;
  generateQuizzes?: boolean;
  timeout?: number;
  priority?: BatchJobPriority;
}

interface BatchJobProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
  percentage: number;
  completed: number; // Matches BatchProcessingJob interface
}

interface BatchJobResult {
  jobId: string;
  status: BatchJobStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  results: ContentProcessingResult[];
  errors: Error[];
  progress: BatchJobProgress;
}

// Extend the BatchProcessingJob type to include our custom options
interface ExtendedBatchJob extends Omit<BatchProcessingJob, 'progress' | 'status' | 'options'>, BatchJobOptions {
  progress: BatchJobProgress;
  results: ContentProcessingResult[];
  errors: Error[];
  status: BatchJobStatus;
  updatedAt: Date;
  // Add any missing required properties from BatchProcessingJob
  id: string;
  urls: string[];
  createdAt: Date;
  // Include options as a required property
  options: Required<BatchJobOptions>;
}

export class BatchProcessingTools {
  private readonly logger = createLogger('BatchProcessingTools');
  private readonly activeJobs = new Map<string, ExtendedBatchJob>();
  private readonly jobQueue: string[] = [];
  private isProcessing = false;
  private readonly maxConcurrentJobs = 3;
  private readonly processingJobs = new Set<string>();
  
  // Default batch job options
  private readonly defaultBatchJobOptions: Required<BatchJobOptions> = {
    concurrency: 3,
    extractInteractive: true,
    generateQuizzes: false,
    timeout: 30000,
    priority: 'normal',
  };

	/**
	 * Creates a new batch job for processing multiple URLs
	 * @param urls Array of URLs to process
	 * @param options Configuration options for the batch job
	 * @returns The created batch job ID
	 */
	public createBatchJob(urls: string[], options: BatchJobOptions = {}): string {
		const job_id = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job_options: Required<BatchJobOptions> = {
      ...this.defaultBatchJobOptions,
      ...options,
    };
    
    const job: ExtendedBatchJob = {
      id: job_id,
      urls: [...urls],
      status: 'pending',
      progress: {
        total: urls.length,
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        percentage: 0,
        completed: 0,
      },
      results: [],
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      // Include all job options
      ...job_options,
      // Make sure to include the options object as a separate property
      options: job_options,
    };

		// Add job to active jobs map
		this.activeJobs.set(job_id, job);

		try {
			// Add job to queue
			this.jobQueue.push(job_id);

			// Start processing if not already running
			if (!this.isProcessing) {
				void this.processJobQueue(); // Use void for fire-and-forget
			}

			this.logger.info(`Created batch job ${job_id} with ${urls.length} URLs`);
			return job_id;
		} catch (error) {
			// Clean up in case of error
			this.activeJobs.delete(job_id);
			const error_message = error instanceof Error ? error.message : 'Unknown error creating batch job';
			this.logger.error(`Failed to create batch job: ${error_message}`, { error });
			throw new Error(`Failed to create batch job: ${error_message}`);
		}
	}

	/**
	 * Get batch job status
	 */
	public async getBatchJobStatus(jobId: string): Promise<BatchJobStatus | undefined> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      this.logger.warn(`Job ${jobId} not found`);
      return undefined;
    }
    return job.status;
	}

	/**
	 * Cancel a batch job
	 */
	public async cancelBatchJob(jobId: string): Promise<{
		jobId: string;
		cancelled: boolean;
		partialResults: ContentProcessingResult[];
	}> {
    this.logger.info(`Cancelling batch job: ${jobId}`);

		const job = this.activeJobs.get(jobId);
		if (!job) {
			throw new Error(`Job ${jobId} not found`);
		}

		// Remove from queue if pending
		const queueIndex = this.jobQueue.indexOf(jobId);
		if (queueIndex !== -1) {
			this.jobQueue.splice(queueIndex, 1);
		}

		// Mark as cancelled
		job.status = 'cancelled';
		job.completedAt = new Date();

		// Remove from processing set
		this.processingJobs.delete(jobId);

		this.logger.info('Batch job cancelled', {
			jobId: jobId,
			completedUrls: job.progress.completed,
			totalUrls: job.progress.total
		});

		return {
			jobId: jobId,
			cancelled: true,
			partialResults: job.results
		};
	}

	/**
	 * Process the job queue
	 */
	public async processJobQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.jobQueue.length > 0) {
        const jobId = this.jobQueue.shift();
        if (!jobId) continue;

        const job = this.activeJobs.get(jobId);
        if (!job) continue;

        if (this.processingJobs.size >= this.maxConcurrentJobs) {
          // Move job back to front of queue if we're at capacity
          this.jobQueue.unshift(jobId);
          break;
        }

        this.processingJobs.add(jobId);
        await new Promise<void>((resolve) => {
          this.processBatchJob(jobId)
            .catch((error) => {
              this.logger.error(`Error processing job ${jobId}:`, error);
            })
            .finally(() => {
              this.processingJobs.delete(jobId);
              resolve();
            });
        });
      }
    } finally {
      this.isProcessing = false;
    }
	}

	/**
	 * Process a single batch job
	 */
	private async processBatchJob(jobId: string): Promise<void> {
		const job = this.activeJobs.get(jobId);
		if (!job) {
			this.processingJobs.delete(jobId);
			return;
		}

		try {
			job.status = 'processing';
			this.logger.info(`Starting batch job processing: ${job_id}`);

			const { concurrency = 3 } = job.options;

			// Process URLs in batches
			for (let i = 0; i < job.urls.length; i += concurrency) {
				// Check if job was cancelled
				if (job.status !== 'processing') {
					break;
				}

				const batch = job.urls.slice(i, i + concurrency);
				const batch_promises = batch.map((url) => this.processUrl(url, job.options));

				const batch_results = await Promise.allSettled(batch_promises);

				// Process results
				batch_results.forEach((result, index) => {
					const url = batch[index];
					if (result.status === 'fulfilled') {
						job.results.push(result.value);
						job.progress.completed++;
					} else {
						job.progress.failed++;
						this.logger.warn(`Failed to process URL in batch job ${job_id}:`, {
							url,
							error: result.reason
						});
					}
				});

				// Update progress
				this.logger.debug(`Batch job ${job_id} progress:`, {
					completed: job.progress.completed,
					failed: job.progress.failed,
					total: job.progress.total
				});
			}

			// Mark job as completed
			job.status = 'completed';
			job.completedAt = new Date();

			this.logger.info(`Batch job completed: ${job_id}`, {
				completed: job.progress.completed,
				failed: job.progress.failed,
				total: job.progress.total
			});
		} catch (error) {
			job.status = 'failed';
			job.completedAt = new Date();
			this.logger.error(`Batch job failed: ${job_id}`, error);
		} finally {
			this.processingJobs.delete(job_id);
			// Continue processing queue
			this.processJobQueue();
		}
	}

	/**
	 * Process a single URL
	 */
	private async processUrl(url: string, options: any): Promise<ContentProcessingResult> {
		const start_time = Date.now();

		try {
			// Mock URL processing - in real implementation, this would use WebContentFetcher
			const mock_content = {
				id: `content_${Date.now()}`,
				url,
				title: `Content from ${new URL(url).hostname}`,
				content: {
					html: '<html><body><h1>Mock Content</h1></body></html>',
					text: 'Mock content text',
					images: [],
					codeBlocks: [],
					tables: [],
					charts: []
				},
				metadata: {
					author: 'Unknown',
					domain: new URL(url).hostname,
					contentType: 'article',
					language: 'en',
					readingTime: 5,
					wordCount: 100,
					keywords: ['mock', 'content'],
					description: 'Mock content for testing',
					attribution: url,
					tags: [],
					category: 'web-content'
				},
				extraction: {
					method: 'readability',
					confidence: 0.8,
					qualityScore: 0.7,
					issues: [],
					processingTime: Date.now() - start_time
				},
				fetchedAt: new Date().toISOString(),
				success: true
			};

			const result: ContentProcessingResult = {
				id: mock_content.id,
				sourceUrl: url,
				processedAt: new Date().toISOString(),
				success: true,
				contentBlocks: [
					{
						id: `block_${Date.now()}`,
						type: 'text',
						content: mock_content.content.text,
						metadata: {}
					}
				],
				interactiveOpportunities: [],
				metadata: mock_content.metadata,
				processingSteps: ['fetch', 'extract', 'analyze']
			};

			// Add interactive opportunities if requested
			if (options.extractInteractive) {
				result.interactiveOpportunities = [
					{
						type: 'interactive-chart',
						confidence: 0.6,
						reasoning: 'Mock interactive opportunity',
						suggestedInteraction: {
							type: 'chart-explorer',
							parameters: {}
						}
					}
				];
			}

			// Add quizzes if requested
			if (options.generateQuizzes) {
				result.quizzes = [
					{
						id: `quiz_${Date.now()}`,
						type: 'multiple-choice',
						question: 'What is the main topic of this content?',
						options: ['Option A', 'Option B', 'Option C', 'Option D'],
						correctAnswer: 0,
						explanation: 'Mock quiz question generated from content'
					}
				];
			}

			return result;
		} catch (error) {
			throw new Error(
				`Failed to process URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Monitor RSS feeds for new content
	 */
	async monitorRSSFeed(args: {
		feedUrl: string;
		options?: {
			checkInterval?: number; // minutes
			maxItems?: number;
			autoProcess?: boolean;
		};
	}): Promise<{
		feedId: string;
		status: string;
		itemsFound: number;
		nextCheck: string;
	}> {
		const { feedUrl, options = {} } = args;
		const {
			checkInterval = 60, // 1 hour
			maxItems = 10,
			autoProcess = false
		} = options;

		this.logger.info('Setting up RSS feed monitoring', {
			feedUrl,
			checkInterval,
			maxItems,
			autoProcess
		});

		try {
			const feed_id = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

			// Mock RSS feed monitoring setup
			const mock_items = Math.floor(Math.random() * maxItems);
			const next_check = new Date(Date.now() + checkInterval * 60 * 1000).toISOString();

			// In real implementation, this would:
			// 1. Parse RSS feed
			// 2. Store feed configuration
			// 3. Set up periodic checking
			// 4. Optionally auto-process new items

			this.logger.info('RSS feed monitoring configured', {
				feedId: feed_id,
				feedUrl,
				itemsFound: mock_items,
				nextCheck: next_check
			});

			return {
				feedId: feed_id,
				status: 'active',
				itemsFound: mock_items,
				nextCheck: next_check
			};
		} catch (error) {
			this.logger.error('Failed to set up RSS feed monitoring:', error);
			throw new Error(
				`RSS feed monitoring setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Perform health check on content sources
	 */
	async performSourceHealthCheck(args: {
		sourceIds?: string[];
		filters?: {
			domain?: string;
			status?: string;
			lastCheckedBefore?: string;
		};
	}): Promise<{
		healthChecks: SourceHealthCheck[];
		summary: {
			total: number;
			healthy: number;
			warning: number;
			error: number;
		};
	}> {
		const { sourceIds, filters = {} } = args;

		this.logger.info('Performing source health check', {
			sourceIds: sourceIds?.length || 'all',
			filters
		});

		try {
			// Mock health check results
			const mock_health_checks = [];
			const source_count = sourceIds?.length || 5;

			for (let i = 0; i < source_count; i++) {
				const source_id = sourceIds?.[i] || `source_${i}`;
				const status = ['healthy', 'warning', 'error'][Math.floor(Math.random() * 3)] as
					| 'healthy'
					| 'warning'
					| 'error';

				mock_health_checks.push({
					sourceId: source_id,
					url: `https://example${i}.com`,
					status,
					lastChecked: new Date(),
					responseTime: Math.floor(Math.random() * 2000) + 100,
					issues:
						status === 'error'
							? ['Connection timeout']
							: status === 'warning'
								? ['Slow response']
								: [],
					suggestions:
						status === 'error'
							? ['Check URL validity', 'Verify network connectivity']
							: status === 'warning'
								? ['Consider caching', 'Monitor performance']
								: []
				});
			}

			const summary = {
				total: mock_health_checks.length,
				healthy: mock_health_checks.filter((h) => h.status === 'healthy').length,
				warning: mock_health_checks.filter((h) => h.status === 'warning').length,
				error: mock_health_checks.filter((h) => h.status === 'error').length
			};

			this.logger.info('Source health check completed', summary);

			return {
				healthChecks: mock_health_checks,
				summary
			};
		} catch (error) {
			this.logger.error('Source health check failed:', error);
			throw new Error(
				`Source health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Get all active batch jobs
	 */
	async listBatchJobs(filters?: {
		status?: string;
		createdAfter?: string;
		createdBefore?: string;
	}): Promise<{
		jobs: BatchProcessingJob[];
		summary: {
			total: number;
			pending: number;
			processing: number;
			completed: number;
			failed: number;
		};
	}> {
		const jobs = Array.from(this.activeJobs.values());

		// Apply filters if provided
		let filtered_jobs = jobs;
		if (filters) {
			filtered_jobs = jobs.filter((job) => {
				if (filters.status && job.status !== filters.status) return false;
				if (filters.createdAfter && job.createdAt < new Date(filters.createdAfter)) return false;
				if (filters.createdBefore && job.createdAt > new Date(filters.createdBefore)) return false;
				return true;
			});
		}

		const summary = {
			total: filtered_jobs.length,
			pending: filtered_jobs.filter((j) => j.status === 'pending').length,
			processing: filtered_jobs.filter((j) => j.status === 'processing').length,
			completed: filtered_jobs.filter((j) => j.status === 'completed').length,
			failed: filtered_jobs.filter((j) => j.status === 'failed').length
		};

		return {
			jobs: filtered_jobs,
			summary
		};
	}

	/**
	 * Clean up completed jobs older than specified time
	 */
	async cleanupCompletedJobs(older_than_hours = 24): Promise<{
		cleaned: number;
		remaining: number;
	}> {
		const cutoff_time = new Date(Date.now() - older_than_hours * 60 * 60 * 1000);
		let cleaned = 0;

		for (const [job_id, job] of this.activeJobs.entries()) {
			if (
				(job.status === 'completed' || job.status === 'failed') &&
				job.completedAt &&
				job.completedAt < cutoff_time
			) {
				this.activeJobs.delete(job_id);
				cleaned++;
			}
		}

		this.logger.info('Cleaned up completed jobs', {
			cleaned,
			remaining: this.activeJobs.size,
			cutoffTime: cutoff_time.toISOString()
		});

		return {
			cleaned,
			remaining: this.activeJobs.size
		};
	}

	/**
	 * Estimate job duration based on URL count and concurrency
	 */
	private estimateJobDuration(urlCount: number, concurrency: number): number {
		// Rough estimate: 5 seconds per URL on average, adjusted for concurrency
		const avg_time_per_url = 5000; // milliseconds
		const total_time = (urlCount / concurrency) * avg_time_per_url;
		return Math.round(total_time);
	}

	/**
	 * Get processing statistics
	 */
	async getProcessingStats(): Promise<{
		activeJobs: number;
		queuedJobs: number;
		processingCapacity: number;
		totalProcessed: number;
		averageProcessingTime: number;
	}> {
		const active_jobs = this.processingJobs.size;
		const queued_jobs = this.jobQueue.length;
		const total_jobs = this.activeJobs.size;

		// Calculate total processed URLs across all jobs
		let total_processed = 0;
		let total_processing_time = 0;

		for (const job of this.activeJobs.values()) {
			total_processed += job.progress.completed;
			if (job.completedAt && job.createdAt) {
				total_processing_time += job.completedAt.getTime() - job.createdAt.getTime();
			}
		}

		const average_processing_time = total_jobs > 0 ? total_processing_time / total_jobs : 0;

		return {
			activeJobs: active_jobs,
			queuedJobs: queued_jobs,
			processingCapacity: this.maxConcurrentJobs,
			totalProcessed: total_processed,
			averageProcessingTime: average_processing_time
		};
	}
}
