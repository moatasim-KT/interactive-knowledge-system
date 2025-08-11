/**
 * Processing Pipeline Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessingPipelineManager } from '../processingPipeline.js';

describe('ProcessingPipelineManager', () => {
    let pipeline_manager;

    beforeEach(() => {
        pipeline_manager = ProcessingPipelineManager.getInstance();

        // Reset configuration for each test
        pipeline_manager.updateConfig({
            maxConcurrentJobs: 2,
            retryAttempts: 2,
            retryDelay: 100,
            retryBackoffMultiplier: 2,
            maxRetryDelay: 1000,
            timeoutMs: 5000,
            enableDuplicateDetection: false,
            enableQualityAssessment: false,
            enableInteractiveTransformation: false,
            enableParallelProcessing: true,
            progressReportingInterval: 1000,
            enableDetailedLogging: false
        });
    });

    it('should create a single processing job', async () => {
        const job_id = pipeline_manager.createSingleProcessingJob('https://example.com', 'normal');

        expect(job_id).toBeDefined();
        expect(typeof job_id).toBe('string');

        // Wait a bit for processing to start and complete
        await new Promise(resolve => setTimeout(resolve, 200));

        // Job should now be in completed jobs (either success or failed)
        const job = pipeline_manager.getJobStatus(job_id);
        expect(job).toBeDefined();
        expect(['pending', 'processing', 'failed', 'completed'].includes(job?.status || '')).toBe(true);
        expect(job?.type).toBe('single');
        expect(job?.metadata.sourceUrl).toBe('https://example.com');
    });

    it('should create a batch processing job with parallel processing', () => {
        const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];
        const batch_id = pipeline_manager.createBatchProcessingJob(urls, 'high', { enableParallel: true });

        expect(batch_id).toBeDefined();

        const batch_status = pipeline_manager.getBatchStatus(batch_id);
        expect(batch_status).toBeDefined();
        expect(batch_status?.totalJobs).toBe(3);
        expect(batch_status?.status).toBe('pending');
    });

    it('should create a batch processing job with sequential processing', () => {
        const urls = ['https://example1.com', 'https://example2.com'];
        const batch_id = pipeline_manager.createBatchProcessingJob(urls, 'normal', { enableParallel: false });

        expect(batch_id).toBeDefined();

        // For sequential processing, it should create a single batch job
        const job = pipeline_manager.getJobStatus(batch_id);
        expect(job).toBeDefined();
        expect(job?.type).toBe('batch');
        expect(job?.metadata.sourceUrls).toEqual(urls);
    });

    it('should cancel a job', () => {
        const job_id = pipeline_manager.createSingleProcessingJob('https://example.com');

        // Cancel should return true if job exists
        const cancelled = pipeline_manager.cancelJob(job_id);
        expect(cancelled).toBe(true);

        // Cancelling non-existent job should return false
        const cancelled_fake = pipeline_manager.cancelJob('fake-job-id');
        expect(cancelled_fake).toBe(false);
    });

    it('should get pipeline statistics', () => {
        // Create some jobs
        pipeline_manager.createSingleProcessingJob('https://example1.com');
        pipeline_manager.createSingleProcessingJob('https://example2.com');

        const stats = pipeline_manager.getStatistics();
        expect(stats).toBeDefined();
        expect(stats.queuedJobs).toBeGreaterThanOrEqual(0);
        expect(stats.activeJobs).toBeGreaterThanOrEqual(0);
        expect(stats.completedJobs).toBeGreaterThanOrEqual(0);
        expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle event listeners', () => {
        const mock_listener = vi.fn();

        pipeline_manager.addEventListener('job-created', mock_listener);

        // Create a job to trigger the event
        pipeline_manager.createSingleProcessingJob('https://example.com');

        // The event should have been emitted
        expect(mock_listener).toHaveBeenCalled();

        // Remove the listener
        pipeline_manager.removeEventListener('job-created', mock_listener);
    });

    it('should update configuration', () => {
        const new_config = {
            maxConcurrentJobs: 5,
            retryAttempts: 5,
            enableDetailedLogging: true
        };

        pipeline_manager.updateConfig(new_config);

        // Configuration should be updated (we can't directly test this without exposing config)
        // But we can test that it doesn't throw an error
        expect(() => pipeline_manager.updateConfig(new_config)).not.toThrow();
    });

    it('should cleanup completed jobs', () => {
        // This method should not throw an error
        expect(() => pipeline_manager.cleanupCompletedJobs(1000)).not.toThrow();
    });

    it('should get active jobs', () => {
        const active_jobs = pipeline_manager.getActiveJobs();
        expect(Array.isArray(active_jobs)).toBe(true);
    });

    it('should get job queue', () => {
        const job_queue = pipeline_manager.getJobQueue();
        expect(Array.isArray(job_queue)).toBe(true);
    });

    it('should get completed jobs', () => {
        const completed_jobs = pipeline_manager.getCompletedJobs();
        expect(Array.isArray(completed_jobs)).toBe(true);
    });
});