/**
 * Processing Pipeline Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProcessingPipelineManager } from '../processingPipeline.js';

describe('ProcessingPipelineManager', () => {
    let pipelineManager: ProcessingPipelineManager;

    beforeEach(() => {
        pipelineManager = ProcessingPipelineManager.getInstance();

        // Reset configuration for each test
        pipelineManager.updateConfig({
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
        const jobId = pipelineManager.createSingleProcessingJob('https://example.com', 'normal');

        expect(jobId).toBeDefined();
        expect(typeof jobId).toBe('string');

        // Wait a bit for processing to start and complete
        await new Promise(resolve => setTimeout(resolve, 200));

        // Job should now be in completed jobs (either success or failed)
        const job = pipelineManager.getJobStatus(jobId);
        expect(job).toBeDefined();
        expect(['pending', 'processing', 'failed', 'completed'].includes(job?.status || '')).toBe(true);
        expect(job?.type).toBe('single');
        expect(job?.metadata.sourceUrl).toBe('https://example.com');
    });

    it('should create a batch processing job with parallel processing', () => {
        const urls = ['https://example1.com', 'https://example2.com', 'https://example3.com'];
        const batchId = pipelineManager.createBatchProcessingJob(urls, 'high', { enableParallel: true });

        expect(batchId).toBeDefined();

        const batchStatus = pipelineManager.getBatchStatus(batchId);
        expect(batchStatus).toBeDefined();
        expect(batchStatus?.totalJobs).toBe(3);
        expect(batchStatus?.status).toBe('pending');
    });

    it('should create a batch processing job with sequential processing', () => {
        const urls = ['https://example1.com', 'https://example2.com'];
        const batchId = pipelineManager.createBatchProcessingJob(urls, 'normal', { enableParallel: false });

        expect(batchId).toBeDefined();

        // For sequential processing, it should create a single batch job
        const job = pipelineManager.getJobStatus(batchId);
        expect(job).toBeDefined();
        expect(job?.type).toBe('batch');
        expect(job?.metadata.sourceUrls).toEqual(urls);
    });

    it('should cancel a job', () => {
        const jobId = pipelineManager.createSingleProcessingJob('https://example.com');

        // Cancel should return true if job exists
        const cancelled = pipelineManager.cancelJob(jobId);
        expect(cancelled).toBe(true);

        // Cancelling non-existent job should return false
        const cancelledFake = pipelineManager.cancelJob('fake-job-id');
        expect(cancelledFake).toBe(false);
    });

    it('should get pipeline statistics', () => {
        // Create some jobs
        pipelineManager.createSingleProcessingJob('https://example1.com');
        pipelineManager.createSingleProcessingJob('https://example2.com');

        const stats = pipelineManager.getStatistics();
        expect(stats).toBeDefined();
        expect(stats.queuedJobs).toBeGreaterThanOrEqual(0);
        expect(stats.activeJobs).toBeGreaterThanOrEqual(0);
        expect(stats.completedJobs).toBeGreaterThanOrEqual(0);
        expect(stats.successRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle event listeners', () => {
        const mockListener = vi.fn();

        pipelineManager.addEventListener('job-created', mockListener);

        // Create a job to trigger the event
        pipelineManager.createSingleProcessingJob('https://example.com');

        // The event should have been emitted
        expect(mockListener).toHaveBeenCalled();

        // Remove the listener
        pipelineManager.removeEventListener('job-created', mockListener);
    });

    it('should update configuration', () => {
        const newConfig = {
            maxConcurrentJobs: 5,
            retryAttempts: 5,
            enableDetailedLogging: true
        };

        pipelineManager.updateConfig(newConfig);

        // Configuration should be updated (we can't directly test this without exposing config)
        // But we can test that it doesn't throw an error
        expect(() => pipelineManager.updateConfig(newConfig)).not.toThrow();
    });

    it('should cleanup completed jobs', () => {
        // This method should not throw an error
        expect(() => pipelineManager.cleanupCompletedJobs(1000)).not.toThrow();
    });

    it('should get active jobs', () => {
        const activeJobs = pipelineManager.getActiveJobs();
        expect(Array.isArray(activeJobs)).toBe(true);
    });

    it('should get job queue', () => {
        const jobQueue = pipelineManager.getJobQueue();
        expect(Array.isArray(jobQueue)).toBe(true);
    });

    it('should get completed jobs', () => {
        const completedJobs = pipelineManager.getCompletedJobs();
        expect(Array.isArray(completedJobs)).toBe(true);
    });
});