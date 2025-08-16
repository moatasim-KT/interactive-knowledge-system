<script lang="ts">
	import type { WebContentSource, BatchProcessingJob } from '$lib/types/unified';
	import { processingPipeline } from '$lib/services/processingPipeline.ts';
	import { webContentActions } from '$lib/stores/webContentState.svelte.ts';
	import { Button, Input, LoadingSpinner } from '$lib/components/ui/index.ts';
	import { ErrorBoundary, LoadingFallback, FallbackComponent } from './index.js';
	import { errorHandler } from '../utils/errorHandler.js';

	interface Props {
		allowBatchImport?: boolean;
		onImportSuccess?: (source: WebContentSource | BatchProcessingJob) => void;
		onImportError?: (error: string) => void;
	}

	let { allowBatchImport = true, onImportSuccess = () => {}, onImportError = () => {} }: Props = $props();

	let single_url = $state('');
	let batch_urls_input = $state('');
	let is_importing = $state(false);
	let error = $state<string | null>(null);
	let import_progress = $state({
		total: 0,
		completed: 0,
		failed: 0,
		overallProgress: 0,
		currentStage: 'Idle'
	});
	let batch_job_id = $state<string | null>(null);

	// Import options
	let skip_processing = $state(false);
	let enable_ai_enhancements = $state(false);

	async function handle_single_import() {
		error = null;
		if (!single_url.trim()) {
			error = 'URL cannot be empty.';
			return;
		}
		if (!validate_url(single_url)) {
			error = 'Invalid URL format.';
			return;
		}

		is_importing = true;
		import_progress = { total: 1, completed: 0, failed: 0, overallProgress: 0, currentStage: 'Starting' };

		const result = await errorHandler.handleAsync(
			() => processingPipeline.startProcessing([single_url], {
				skipProcessing: skip_processing,
				enableAiEnhancements: enable_ai_enhancements
			}),
			{
				operation: 'single-import',
				component: 'WebContentImporter',
				metadata: { url: single_url }
			},
			{
				showToast: true,
				retryable: true,
				maxRetries: 2,
				onError: (err) => {
					error = errorHandler.getUserFriendlyMessage(err, { 
						operation: 'single-import', 
						component: 'WebContentImporter' 
					});
					onImportError(error);
				}
			}
		);

		if (result.success) {
			batch_job_id = result.data.id;
		} else {
			onImportError(error || 'Unknown error during import');
		}

		is_importing = false;
	}

	async function handle_batch_import() {
		error = null;
		const urls = batch_urls_input.split('\n').map((url) => url.trim()).filter((url) => url && validate_url(url));

		if (urls.length === 0) {
			error = 'No valid URLs found for batch import.';
			return;
		}

		is_importing = true;
		import_progress = { total: urls.length, completed: 0, failed: 0, overallProgress: 0, currentStage: 'Starting Batch' };

		const result = await errorHandler.handleAsync(
			() => processingPipeline.startBatchProcessing(urls, {
				skipProcessing: skip_processing,
				enableAiEnhancements: enable_ai_enhancements
			}),
			{
				operation: 'batch-import',
				component: 'WebContentImporter',
				metadata: { urlCount: urls.length }
			},
			{
				showToast: true,
				retryable: true,
				maxRetries: 1,
				onError: (err) => {
					error = errorHandler.getUserFriendlyMessage(err, { 
						operation: 'batch-import', 
						component: 'WebContentImporter' 
					});
					onImportError(error);
				}
			}
		);

		if (result.success) {
			batch_job_id = result.data.id;
		} else {
			onImportError(error || 'Unknown error during batch import');
		}

		is_importing = false;
	}

	function validate_url(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	// Subscribe to pipeline progress updates
	$effect(() => {
		const unsubscribe = processingPipeline.onProgressUpdate((progress) => {
			if (batch_job_id && progress.jobId === batch_job_id) {
				import_progress = progress;
			} else if (!batch_job_id && progress.total === 1) {
				// Single import progress
				import_progress = progress;
			}
		});

		const unsubscribeComplete = processingPipeline.onJobComplete((job) => {
			if (job.id === batch_job_id) {
				import_progress = {
					total: job.total,
					completed: job.completed,
					failed: job.failed,
					overallProgress: 100,
					currentStage: 'Completed'
				};
				batch_job_id = null; // Clear batch job ID
				onImportSuccess(job);
			} else if (!batch_job_id && job.total === 1 && job.completed === 1) {
				// Single import success
				onImportSuccess(job);
			}
		});

		const unsubscribeError = processingPipeline.onJobError((jobId, err) => {
			if (jobId === batch_job_id || (!batch_job_id && import_progress.total === 1)) {
				error = err.message;
				onImportError(err.message);
			}
		});

		return () => {
			unsubscribe();
			unsubscribeComplete();
			unsubscribeError();
		};
	});
</script>


<ErrorBoundary 
	context={{ component: 'WebContentImporter', operation: 'render' }}
	showDetails={false}
	enableRetry={true}
>
	<div class="web-content-importer">
	<div class="importer-section">
		<h3 class="section-title">Import Web Content</h3>

		<!-- Single URL Import -->
		<div class="url-input-section">
			<label for="single-url">Import Single URL:</label>
			<div class="url-input-container">
				<Input
					id="single-url"
					type="url"
					placeholder="Enter URL to import (e.g., https://example.com/article)"
					bind:value={single_url}
					disabled={is_importing}
					class="flex-1"
				/>
				<Button onclick={handle_single_import} disabled={is_importing || !single_url.trim()}>
					{#if is_importing && import_progress.total === 1}
						<LoadingSpinner size="sm" class="mr-2" /> Importing...
					{:else}
						Import
					{/if}
				</Button>
			</div>
		</div>

		{#if allowBatchImport}
			<div class="divider">OR</div>

			<!-- Batch URL Import -->
			<div class="batch-input-section">
				<label for="batch-urls">Batch Import URLs (one per line):</label>
				<textarea
					id="batch-urls"
					placeholder="Enter multiple URLs, one per line"
					rows="8"
					bind:value={batch_urls_input}
					disabled={is_importing}
				></textarea>
				<Button onclick={handle_batch_import} disabled={is_importing || !batch_urls_input.trim()}>
					{#if is_importing && batch_job_id}
						<LoadingSpinner size="sm" class="mr-2" /> Batch Importing...
					{:else}
						Batch Import
					{/if}
				</Button>
			</div>
		{/if}

		<!-- Import Options -->
		<div class="import-options">
			<h3>Import Options</h3>
			<div class="options-grid">
				<label class="option-item">
					<input type="checkbox" bind:checked={skip_processing} disabled={is_importing} />
					<span>Skip advanced processing (faster import)</span>
				</label>
				<label class="option-item">
					<input type="checkbox" bind:checked={enable_ai_enhancements} disabled={is_importing} />
					<span>Enable AI content enhancements</span>
				</label>
			</div>
		</div>

		<!-- Progress Display -->
		{#if is_importing || import_progress.completed > 0 || import_progress.failed > 0}
			<div class="import-progress">
				<h3>Import Progress</h3>
				<div class="progress-bar">
					<div class="progress-fill" style="width: {import_progress.overallProgress}%;"></div>
				</div>
				<p class="progress-status">
					{import_progress.currentStage} ({import_progress.completed} / {import_progress.total} completed, {import_progress.failed} failed)
				</p>
				<div class="progress-stats">
					<span class="stat success">Success: {import_progress.completed}</span>
					<span class="stat error">Failed: {import_progress.failed}</span>
					<span class="stat">Total: {import_progress.total}</span>
				</div>
			</div>
		{/if}

		<!-- Error Display -->
		{#if error}
			<div class="error-message">
				⚠️ {error}
			</div>
		{/if}
	</div>
</div>
</ErrorBoundary>

<style>
	.web-content-importer {
		background: var(--bg-color, #ffffff);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 12px;
		padding: 1.5rem;
		margin: 1rem;
		font-family: system-ui, -apple-system, sans-serif;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
	}

	.importer-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary, #1a1a1a);
		margin-bottom: 1rem;
	}

	.url-input-section label,
	.batch-input-section label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.url-input-container {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		padding: 1rem;
		border: 2px dashed var(--border-light, #e9ecef);
		border-radius: 8px;
		transition: border-color 0.2s;
	}

	.url-input-container:hover {
		border-color: var(--primary-color, #007bff);
	}

	.batch-input-section textarea {
		width: 100%;
		padding: 1rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 8px;
		font-family: monospace;
		font-size: 0.9rem;
		resize: vertical;
		margin-bottom: 1rem;
		background: var(--input-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
	}

	.batch-input-section textarea:focus {
		outline: none;
		border-color: var(--input-focus-border, #007bff);
		box-shadow: 0 0 0 2px var(--input-focus-shadow, rgba(0, 123, 255, 0.25));
	}

	.divider {
		text-align: center;
		margin: 1.5rem 0;
		color: var(--text-secondary, #666666);
		position: relative;
	}

	.divider::before,
	.divider::after {
		content: '';
		position: absolute;
		top: 50%;
		width: 40%;
		height: 1px;
		background: var(--border-light, #e9ecef);
	}

	.divider::before {
		left: 0;
	}

	.divider::after {
		right: 0;
	}

	.import-progress {
		padding: 1.5rem;
		background: var(--progress-bg, #f8f9fa);
		border-radius: 8px;
		border: 1px solid var(--border-light, #e0e0e0);
	}

	.progress-bar {
		width: 100%;
		height: 10px;
		background: var(--progress-bar-bg, #e0e0e0);
		border-radius: 5px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--primary-color, #007bff), var(--primary-dark-color, #0056b3));
		transition: width 0.3s ease;
		border-radius: 5px;
	}

	.progress-status {
		margin: 0 0 1rem 0;
		font-size: 0.95rem;
		color: var(--text-primary, #333);
		text-align: center;
		font-weight: 500;
	}

	.progress-stats {
		display: flex;
		justify-content: space-around;
		margin-bottom: 1rem;
		font-size: 0.85rem;
		gap: 0.5rem;
	}

	.stat {
		padding: 0.4rem 0.8rem;
		border-radius: 16px;
		background: var(--stat-bg, #f0f0f0);
		color: var(--text-secondary, #666);
		font-weight: 600;
	}

	.stat.success {
		background: var(--success-light, #d4edda);
		color: var(--success-dark, #155724);
	}

	.stat.error {
		background: var(--error-light, #f8d7da);
		color: var(--error-dark, #721c24);
	}

	.import-options {
		padding: 1.5rem;
		background: var(--options-bg, #f8f9fa);
		border-radius: 8px;
		border: 1px solid var(--border-light, #e0e0e0);
	}

	.import-options h3 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #333);
		font-size: 1.1rem;
	}

	.options-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.error-message {
		padding: 1rem;
		background: var(--error-light, #f8d7da);
		border: 1px solid var(--error-dark, #f5c6cb);
		border-radius: 8px;
		color: var(--error-dark, #721c24);
		font-size: 0.9rem;
		font-weight: 500;
		text-align: center;
	}

	@media (max-width: 768px) {
		.web-content-importer {
			padding: 1rem;
			margin: 0.5rem;
		}

		.url-input-container {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
		}

		.options-grid {
			grid-template-columns: 1fr;
		}

		.progress-stats {
			flex-direction: column;
			gap: 0.5rem;
			align-items: flex-start;
		}
	}
</style>
