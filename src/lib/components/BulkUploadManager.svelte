<script lang="ts">
	import type { UploadProgress, ProcessedDocument } from '$lib/types/content.js';
	import { processDocumentBatch } from '$lib/services/enhancedDocumentProcessor.js';
	import DocumentUploadManager from './DocumentUploadManager.svelte';
	import Button from './ui/Button.svelte';
	import ProgressBar from './ui/ProgressBar.svelte';
	import Card from './ui/Card.svelte';

	type Props = {
		maxConcurrentUploads?: number;
		allowedTypes?: string[];
		maxFileSize?: number;
		maxTotalFiles?: number;
		batchComplete?: (event: CustomEvent<{ results: ProcessedDocument[]; errors: string[] }>) => void;
		batchProgress?: (event: CustomEvent<{ overall: number; current: string }>) => void;
		batchError?: (event: CustomEvent<{ message: string }>) => void;
	}

	let {
		maxConcurrentUploads = 3,
		allowedTypes = ['.pdf', '.md', '.markdown'],
		maxFileSize = 50 * 1024 * 1024, // 50MB
		maxTotalFiles = 50,
		batchComplete,
		batchProgress,
		batchError
	}: Props = $props();

	let uploadQueue = $state<File[]>([]);
	let processingQueue = $state<File[]>([]);
	let completedFiles = $state<ProcessedDocument[]>([]);
	let failedFiles = $state<Array<{ file: File; error: string }>>([]);
	let currentProgress = $state<Map<string, UploadProgress>>(new Map());

	let isBatchProcessing = $state(false);
	let overallProgress = $state(0);
	let currentFileName = $state('');
	let abortController: AbortController | null = null;

	// Statistics
	const totalFiles = $derived(uploadQueue.length + processingQueue.length + completedFiles.length + failedFiles.length);
	const completedCount = $derived(completedFiles.length);
	const failedCount = $derived(failedFiles.length);
	const remainingCount = $derived(uploadQueue.length + processingQueue.length);

	function handleFilesAdded(event: CustomEvent<{ files: File[] }>) {
		const newFiles = event.detail.files;
		
		// Check total file limit
		if (totalFiles + newFiles.length > maxTotalFiles) {
			batchError?.(new CustomEvent('batchError', { detail: { message: `Cannot add ${newFiles.length} files. Maximum ${maxTotalFiles} files allowed in batch.` } }));
			return;
		}

		uploadQueue = [...uploadQueue, ...newFiles];
	}

	function handleUploadError(event: CustomEvent<{ message: string; files: File[] }>) {
		batchError?.(new CustomEvent('batchError', { detail: { message: event.detail.message } }));
	}

	async function startBatchProcessing() {
		if (isBatchProcessing || uploadQueue.length === 0) return;

		isBatchProcessing = true;
		abortController = new AbortController();
		overallProgress = 0;
		currentFileName = '';

		// Move files from upload queue to processing queue
		const filesToProcess = [...uploadQueue];
		uploadQueue = [];
		processingQueue = filesToProcess;

		try {
			const results = await processDocumentBatch(
				filesToProcess,
				{
					maxConcurrent: maxConcurrentUploads,
					signal: abortController.signal,
					onProgress: (fileId: string, progress: UploadProgress) => {
						currentProgress.set(fileId, progress);

						// Update overall progress
						const progressValues = Array.from(currentProgress.values());
						const totalProgress = progressValues.reduce((sum, p) => sum + p.percentage, 0);
						overallProgress = Math.round(totalProgress / Math.max(progressValues.length, 1));
						currentFileName = progress.fileName;

						batchProgress?.(new CustomEvent('batchProgress', { detail: { overall: overallProgress, current: currentFileName } }));
					}
				}
			);

			// Move completed files
			completedFiles = [...completedFiles, ...results];
			processingQueue = [];

			// Collect any errors
			const errors: string[] = [];
			const processedFileNames = new Set(results.map(r => r.metadata.originalFileName));
			
			for (const file of filesToProcess) {
				if (!processedFileNames.has(file.name)) {
					const progress = currentProgress.get(`${file.name}_${Date.now()}`);
					const errorMessage = progress?.message || 'Processing failed';
					failedFiles = [...failedFiles, { file, error: errorMessage }];
					errors.push(`${file.name}: ${errorMessage}`);
				}
			}

			batchComplete?.(new CustomEvent('batchComplete', { detail: { results, errors } }));

		} catch (error) {
			// Handle batch processing error
			const errorMessage = error instanceof Error ? error.message : 'Batch processing failed';
			
			// Move all processing files to failed
			for (const file of processingQueue) {
				failedFiles = [...failedFiles, { file, error: errorMessage }];
			}
			
			processingQueue = [];
			batchError?.(new CustomEvent('batchError', { detail: { message: errorMessage } }));

		} finally {
			isBatchProcessing = false;
			abortController = null;
			overallProgress = 0;
			currentFileName = '';
		}
	}

	function cancelBatchProcessing() {
		if (abortController) {
			abortController.abort();
		}
		
		// Move processing files back to upload queue
		uploadQueue = [...uploadQueue, ...processingQueue];
		processingQueue = [];
		
		isBatchProcessing = false;
		overallProgress = 0;
		currentFileName = '';
	}

	function clearCompleted() {
		completedFiles = [];
		// Remove completed file progress entries
		for (const doc of completedFiles) {
			currentProgress.delete(`${doc.metadata.originalFileName}_${Date.now()}`);
		}
	}

	function clearFailed() {
		failedFiles = [];
		// Remove failed file progress entries
		for (const failed of failedFiles) {
			currentProgress.delete(`${failed.file.name}_${Date.now()}`);
		}
	}

	function retryFailed() {
		const filesToRetry = failedFiles.map(f => f.file);
		uploadQueue = [...uploadQueue, ...filesToRetry];
		failedFiles = [];
	}

	function clearAll() {
		uploadQueue = [];
		processingQueue = [];
		completedFiles = [];
		failedFiles = [];
		currentProgress = new Map();
		overallProgress = 0;
		currentFileName = '';
	}

	function removeFromQueue(fileName: string) {
		uploadQueue = uploadQueue.filter(file => file.name !== fileName);
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<div class="bulk-upload-manager">
	<div class="upload-section">
		<DocumentUploadManager
			{allowedTypes}
			{maxFileSize}
			maxFiles={maxTotalFiles}
			allowBulkUpload={true}
			onupload={handleFilesAdded}
			onerror={handleUploadError}
		/>
	</div>

	{#if totalFiles > 0}
		<div class="batch-controls">
			<Card class="batch-stats">
				<h3>Batch Processing Status</h3>
				<div class="stats-grid">
					<div class="stat-item">
						<div class="stat-value">{totalFiles}</div>
						<div class="stat-label">Total Files</div>
					</div>
					<div class="stat-item">
						<div class="stat-value">{remainingCount}</div>
						<div class="stat-label">Pending</div>
					</div>
					<div class="stat-item">
						<div class="stat-value">{completedCount}</div>
						<div class="stat-label">Completed</div>
					</div>
					<div class="stat-item">
						<div class="stat-value">{failedCount}</div>
						<div class="stat-label">Failed</div>
					</div>
				</div>

				{#if isBatchProcessing}
					<div class="processing-status">
						<div class="status-header">
							<span>Processing: {currentFileName}</span>
							<span>{overallProgress}%</span>
						</div>
						<ProgressBar value={overallProgress} class="overall-progress" />
					</div>
				{/if}

				<div class="batch-actions">
					{#if !isBatchProcessing}
						{#if uploadQueue.length > 0}
							<Button variant="primary" onclick={startBatchProcessing}>
								Process {uploadQueue.length} Files
							</Button>
						{/if}
						{#if failedFiles.length > 0}
							<Button variant="secondary" onclick={retryFailed}>
								Retry Failed ({failedFiles.length})
							</Button>
						{/if}
						{#if totalFiles > 0}
							<Button variant="ghost" onclick={clearAll}>
								Clear All
							</Button>
						{/if}
					{:else}
						<Button variant="secondary" onclick={cancelBatchProcessing}>
							Cancel Processing
						</Button>
					{/if}
				</div>
			</Card>
		</div>

		<div class="file-sections">
			{#if uploadQueue.length > 0}
				<Card class="file-section">
					<div class="section-header">
						<h4>Pending Upload ({uploadQueue.length})</h4>
					</div>
					<div class="file-list">
						{#each uploadQueue as file (file.name)}
							<div class="file-item">
								<div class="file-info">
									<div class="file-name">{file.name}</div>
									<div class="file-size">{formatFileSize(file.size)}</div>
								</div>
								{#if !isBatchProcessing}
									<Button
										variant="ghost"
										size="sm"
										onclick={() => removeFromQueue(file.name)}
									>
										Remove
									</Button>
								{/if}
							</div>
						{/each}
					</div>
				</Card>
			{/if}

			{#if processingQueue.length > 0}
				<Card class="file-section">
					<div class="section-header">
						<h4>Currently Processing ({processingQueue.length})</h4>
					</div>
					<div class="file-list">
						{#each processingQueue as file (file.name)}
							{@const progress = currentProgress.get(`${file.name}_${Date.now()}`)}
							<div class="file-item processing">
								<div class="file-info">
									<div class="file-name">{file.name}</div>
									<div class="file-size">{formatFileSize(file.size)}</div>
									{#if progress}
										<div class="file-progress">
											<span class="progress-status">{progress.status}</span>
											<span class="progress-percent">{Math.round(progress.percentage)}%</span>
										</div>
									{/if}
								</div>
								{#if progress}
									<ProgressBar value={progress.percentage} size="sm" />
								{/if}
							</div>
						{/each}
					</div>
				</Card>
			{/if}

			{#if completedFiles.length > 0}
				<Card class="file-section success">
					<div class="section-header">
						<h4>Completed ({completedFiles.length})</h4>
						<Button variant="ghost" size="sm" onclick={clearCompleted}>
							Clear
						</Button>
					</div>
					<div class="file-list">
						{#each completedFiles as doc (doc.id)}
							<div class="file-item completed">
								<div class="file-info">
									<div class="file-name">{doc.title}</div>
									<div class="file-meta">
										{doc.metadata.wordCount} words • {doc.content.length} blocks
									</div>
								</div>
								<div class="success-icon">✓</div>
							</div>
						{/each}
					</div>
				</Card>
			{/if}

			{#if failedFiles.length > 0}
				<Card class="file-section error">
					<div class="section-header">
						<h4>Failed ({failedFiles.length})</h4>
						<Button variant="ghost" size="sm" onclick={clearFailed}>
							Clear
						</Button>
					</div>
					<div class="file-list">
						{#each failedFiles as failed (failed.file.name)}
							<div class="file-item failed">
								<div class="file-info">
									<div class="file-name">{failed.file.name}</div>
									<div class="file-error">{failed.error}</div>
								</div>
								<div class="error-icon">✗</div>
							</div>
						{/each}
					</div>
				</Card>
			{/if}
		</div>
	{/if}
</div>

<style>
	.bulk-upload-manager {
		max-width: 1000px;
		margin: 0 auto;
		padding: 1rem;
	}

	.upload-section {
		margin-bottom: 2rem;
	}

	.batch-controls {
		margin-bottom: 2rem;
	}

	.batch-stats h3 {
		margin: 0 0 1rem 0;
		color: var(--color-text-primary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.stat-item {
		text-align: center;
		padding: 1rem;
		background: var(--color-surface-secondary);
		border-radius: 8px;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: bold;
		color: var(--color-primary);
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.processing-status {
		margin-bottom: 1.5rem;
	}

	.status-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.batch-actions {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.file-sections {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.file-section {
		border-left: 4px solid var(--color-border);
	}

	.file-section.success {
		border-left-color: var(--color-success);
	}

	.file-section.error {
		border-left-color: var(--color-error);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.section-header h4 {
		margin: 0;
		color: var(--color-text-primary);
	}

	.file-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.file-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-surface-secondary);
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.file-item.processing {
		background: var(--color-primary-light);
		border: 1px solid var(--color-primary);
	}

	.file-item.completed {
		background: var(--color-success-light);
		border: 1px solid var(--color-success);
	}

	.file-item.failed {
		background: var(--color-error-light);
		border: 1px solid var(--color-error);
	}

	.file-info {
		flex: 1;
		min-width: 0;
	}

	.file-name {
		font-weight: 500;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-size {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.file-meta {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.file-error {
		font-size: 0.875rem;
		color: var(--color-error);
	}

	.file-progress {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}

	.progress-status {
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}

	.progress-percent {
		color: var(--color-primary);
		font-weight: 500;
	}

	.success-icon,
	.error-icon {
		font-size: 1.25rem;
		font-weight: bold;
		flex-shrink: 0;
	}

	.success-icon {
		color: var(--color-success);
	}

	.error-icon {
		color: var(--color-error);
	}

	@media (max-width: 768px) {
		.bulk-upload-manager {
			padding: 0.5rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.batch-actions {
			flex-direction: column;
		}

		.section-header {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.file-item {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}
	}
</style>