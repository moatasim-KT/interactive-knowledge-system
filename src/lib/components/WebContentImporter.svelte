<script lang="ts">
	import { webContentState, webContentActions } from '$lib/stores/webContentState.svelte.js';
	import { webContentFetcher } from '$lib/services/webContentFetcher.js';
	import { sourceManager } from '$lib/services/sourceManager.js';
	import { createLogger } from '$lib/utils/logger.js';
	import Button from './ui/Button.svelte';
	import Input from './ui/Input.svelte';
	import LoadingSpinner from './ui/LoadingSpinner.svelte';
	import Toast from './ui/Toast.svelte';

	const logger = createLogger('web-content-importer');

	// Component state
	let importUrl = $state('');
	let importOptions = $state({
		extractInteractive: true,
		generateQuizzes: false,
		preserveFormatting: true,
		timeout: 30000
	});
	let isImporting = $state(false);
	let importProgress = $state(0);
	let importStatus = $state('');

	// Batch import state
	let batchUrls = $state('');
	let isBatchImporting = $state(false);
	let batchProgress = $state({ completed: 0, total: 0, failed: 0 });

	// Validation
	function isValidUrl(url: string): boolean {
		try {
			new URL(url);
			return true;
		} catch {
			return false;
		}
	}

	// Single URL import
	async function importSingleUrl() {
		if (!importUrl.trim()) {
			webContentActions.addNotification({
				type: 'warning',
				message: 'Please enter a URL to import'
			});
			return;
		}

		if (!isValidUrl(importUrl)) {
			webContentActions.addNotification({
				type: 'error',
				message: 'Please enter a valid URL'
			});
			return;
		}

		isImporting = true;
		importProgress = 0;
		importStatus = 'Fetching content...';

		try {
			logger.info(`Starting import for URL: ${importUrl}`);

			// Fetch content
			importProgress = 25;
			importStatus = 'Extracting content...';
			const content = await webContentFetcher.fetch(importUrl, {
				timeout: importOptions.timeout,
				extractAssets: true,
				cleanContent: true,
				preserveInteractivity: importOptions.extractInteractive
			});

			if (!content.success) {
				throw new Error('Failed to fetch content');
			}

			// Add to content store
			importProgress = 50;
			importStatus = 'Processing content...';
			webContentActions.addContent(content);

			// Create source entry
			importProgress = 75;
			importStatus = 'Creating source entry...';
			const source = await sourceManager.addSource({
				url: importUrl,
				content: content,
				options: importOptions
			});

			webContentActions.addSource(source);

			// Complete
			importProgress = 100;
			importStatus = 'Import completed successfully';

			webContentActions.addNotification({
				type: 'success',
				message: `Successfully imported content from ${new URL(importUrl).hostname}`
			});

			// Reset form
			importUrl = '';
			setTimeout(() => {
				isImporting = false;
				importProgress = 0;
				importStatus = '';
			}, 1000);

		} catch (error) {
			logger.error('Import failed:', error);
			
			webContentActions.addNotification({
				type: 'error',
				message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			});

			isImporting = false;
			importProgress = 0;
			importStatus = '';
		}
	}

	// Handle URL paste event
	function handleUrlPaste(event: ClipboardEvent) {
		const pastedText = event.clipboardData?.getData('text/plain') || '';
		if (pastedText.includes('\n') || pastedText.includes(',')) {
			event.preventDefault();
			batchUrls = pastedText;
		}
	}

	// Handle drop event
	function handleDrop(event: DragEvent) {
		event.preventDefault();
		// Handle file drops if needed
	}

	// Handle drag over event
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	// Batch URL import
	async function importBatchUrls() {
		const urls = batchUrls
			.split('\n')
			.map(url => url.trim())
			.filter(url => url.length > 0);

		if (urls.length === 0) {
			webContentActions.addNotification({
				type: 'warning',
				message: 'Please enter URLs to import (one per line)'
			});
			return;
		}

		// Validate URLs
		const invalidUrls = urls.filter(url => !isValidUrl(url));
		if (invalidUrls.length > 0) {
			webContentActions.addNotification({
				type: 'error',
				message: `Invalid URLs found: ${invalidUrls.slice(0, 3).join(', ')}${invalidUrls.length > 3 ? '...' : ''}`
			});
			return;
		}

		isBatchImporting = true;
		batchProgress = { completed: 0, total: urls.length, failed: 0 };

		try {
			logger.info(`Starting batch import for ${urls.length} URLs`);

			// Create batch job
			const batchJob = {
				id: `batch_${Date.now()}`,
				urls,
				status: 'processing' as const,
				createdAt: new Date(),
				updatedAt: new Date(),
				progress: 0,
				results: urls.map(url => ({
					url,
					status: 'pending' as const,
					contentId: null,
					error: null
				})),
				options: importOptions
			};

			webContentActions.addBatchJob(batchJob);
			webContentActions.setActiveBatchJob(batchJob);

			// Process URLs with concurrency limit
			const concurrency = 3;
			const results = [];

			for (let i = 0; i < urls.length; i += concurrency) {
				const batch = urls.slice(i, i + concurrency);
				const batchPromises = batch.map(async (url) => {
					try {
						const content = await webContentFetcher.fetch(url, {
							timeout: importOptions.timeout,
							extractAssets: true,
							cleanContent: true,
							preserveInteractivity: importOptions.extractInteractive
						});

						if (content.success) {
							webContentActions.addContent(content);
							
							const source = await sourceManager.addSource({
								url,
								title: content.metadata?.title || new URL(url).hostname,
								domain: new URL(url).hostname,
								metadata: content.metadata || {},
								options: importOptions
							});
							
							webContentActions.addSource(source);
							// Update batch progress
							batchProgress.completed++;
							batchProgress = { ...batchProgress }; // Trigger reactivity

							// Update job status
							const completed = batchProgress.completed + batchProgress.failed;
							const progress = Math.round((completed / batchProgress.total) * 100);

							webContentActions.updateBatchJob(batchJob.id, {
								progress,
								updatedAt: new Date(),
								results: batchJob.results.map(result => 
									result.url === url ? { ...result, status: 'completed', contentId: content.id } : result
								)
							});

							return { success: true, url, contentId: content.id };
						} catch (error) {
							logger.error(`Failed to import ${url}:`, error);
							
							// Update batch progress
							batchProgress.failed++;
							batchProgress = { ...batchProgress }; // Trigger reactivity

							// Update job status
							webContentActions.updateBatchJob(batchJob.id, {
								updatedAt: new Date(),
								results: batchJob.results.map(result => 
									result.url === url ? { ...result, status: 'failed', error: error.message } : result
								)
							});

							return { success: false, url, error: error.message };
						}
					});

					const batch_results = await Promise.all(batchPromises);
					results.push(...batch_results);
				}

				// Wait for all promises to settle
				const batchResults = await Promise.all(batchPromises);
				results.push(...batchResults);
			}

			// Mark job as completed
			webContentActions.updateBatchJob(batchJob.id, {
				status: 'completed',
				updatedAt: new Date(),
				results: batchJob.results.map(result => {
					const resultItem = results.find(r => r.url === result.url);
					return {
						...result,
						status: resultItem?.success ? 'completed' : 'failed',
						contentId: resultItem?.contentId || null,
						error: resultItem?.error || null
					};
				})
			});

			webContentActions.addNotification({
				type: 'success',
				message: `Batch import completed: ${batchProgress.completed} succeeded, ${batchProgress.failed} failed`
			});

		} catch (error) {
			logger.error('Batch import failed:', error);
			webContentActions.addNotification({
				type: 'error',
				message: `Batch import failed: ${error.message}`
			});
		} finally {
			isBatchImporting = false;
		}
	}

	// Handle URL paste
	function handle_url_paste(event: ClipboardEvent) {
		const pasted_text = event.clipboardData?.getData('text') || '';
		if (is_valid_url(pasted_text)) {
			import_url = pasted_text;
		}
	}

	// Handle drag and drop
	function handle_drop(event: DragEvent) {
		event.preventDefault();
		const dropped_text = event.dataTransfer?.getData('text') || '';
		
		if (is_valid_url(dropped_text)) {
			import_url = dropped_text;
		} else {
			// Check if it's multiple URLs
			const lines = dropped_text.split('\n').map(line => line.trim()).filter(line => line);
			const valid_urls = lines.filter(line => is_valid_url(line));
			
			if (valid_urls.length > 1) {
				batch_urls = valid_urls.join('\n');
			} else if (valid_urls.length === 1) {
				import_url = valid_urls[0];
			}
		}
	}

	function handle_drag_over(event: DragEvent) {
		event.preventDefault();
	}
</script>

<div class="web-content-importer">
	<div class="importer-header">
		<h2>Import Web Content</h2>
		<p>Import content from web pages and transform it into interactive learning materials</p>
	</div>

	<div class="importer-tabs">
		<button 
			class="tab-button"
			class:active={webContentState.ui.activeView === 'single'}
			onclick={() => webContentActions.setActiveView('single')}
		>
			Single URL
		</button>
		<button 
			class="tab-button"
			class:active={webContentState.ui.activeView === 'batch'}
			onclick={() => webContentActions.setActiveView('batch')}
		>
			Batch Import
		</button>
	</div>

	{#if webContentState.ui.activeView === 'single'}
		<div class="single-import-section">
			<div class="url-input-section">
				<label for="import-url">URL to Import</label>
				<div 
					class="url-input-container"
					on:drop={handleDrop}
					on:dragover={handleDragOver}
				>
					<Input
						id="import-url"
						bind:value={importUrl}
						placeholder="https://example.com/article"
						disabled={isImporting}
						on:paste={handleUrlPaste}
					/>
					<Button
						on:click={importSingleUrl}
						disabled={is_importing || !import_url.trim()}
						variant="primary"
					>
						{#if isImporting}
							<LoadingSpinner size="sm" />
							Import
						{:else}
							Import
						{/if}
					</Button>
				</div>
			</div>

			{#if isImporting}
				<div class="import-progress">
					<div class="progress-bar">
						<div class="progress-fill" style="width: {importProgress}%"></div>
					</div>
					<p class="progress-status">{importStatus}</p>
				</div>
			{/if}

			<div class="import-options">
				<h3>Import Options</h3>
				<div class="options-grid">
					<label class="option-item">
						<input
							type="checkbox"
							bind:checked={import_options.extractInteractive}
							disabled={isImporting}
						/>
						Extract interactive elements
					</label>
					<label class="option-item">
						<input
							type="checkbox"
							bind:checked={import_options.generateQuizzes}
							disabled={isImporting}
						/>
						Generate quizzes from content
					</label>
					<label class="option-item">
						<input
							type="checkbox"
							bind:checked={import_options.preserveFormatting}
							disabled={isImporting}
						/>
						Preserve original formatting
					</label>
				</div>
			</div>
		</div>
	{:else}
		<div class="batch-import-section">
			<div class="batch-input-section">
				<label for="batch-urls">URLs to Import (one per line)</label>
				<textarea
					id="batch-urls"
					bind:value={batchUrls}
					placeholder="https://example.com/article1&#10;https://example.com/article2&#10;https://example.com/article3"
					disabled={isBatchImporting}
					rows="8"
				></textarea>
				<Button
					on:click={importBatchUrls}
					disabled={is_batch_importing || !batch_urls.trim()}
					variant="primary"
				>
					{#if isBatchImporting}
						<LoadingSpinner size="sm" />
						Import Batch
					{:else}
						Import Batch
					{/if}
				</Button>
			</div>

			{#if isBatchImporting}
				<div class="batch-progress">
					<div class="progress-stats">
						<span class="stat">Total: {batch_progress.total}</span>
						<span class="stat success">Completed: {batch_progress.completed}</span>
						<span class="stat error">Failed: {batch_progress.failed}</span>
					</div>
					<div class="progress-bar">
						<div 
							class="progress-fill" 
							style="width: {batch_progress.total > 0 ? ((batch_progress.completed + batch_progress.failed) / batch_progress.total) * 100 : 0}%"
						></div>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Notifications -->
	{#each webContentState.ui.notifications as notification (notification.id)}
		<Toast
			type={notification.type}
			message={notification.message}
			on:close={() => webContentActions.removeNotification(notification.id)}
		/>
	{/each}
</div>

<style>
	.web-content-importer {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		background: #fff;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.importer-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.importer-header h2 {
		margin: 0 0 0.5rem 0;
		color: #333;
		font-size: 1.8rem;
	}

	.importer-header p {
		margin: 0;
		color: #666;
		font-size: 1rem;
	}

	.importer-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.tab-button {
		padding: 0.75rem 1.5rem;
		border: none;
		background: transparent;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-size: 1rem;
		color: #666;
		transition: all 0.2s;
	}

	.tab-button:hover {
		color: #333;
		background: #f8f9fa;
	}

	.tab-button.active {
		color: #007bff;
		border-bottom-color: #007bff;
		background: #f0f8ff;
	}

	.single-import-section,
	.batch-import-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.url-input-section label,
	.batch-input-section label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: #333;
	}

	.url-input-container {
		display: flex;
		gap: 1rem;
		align-items: flex-end;
		padding: 1rem;
		border: 2px dashed #ddd;
		border-radius: 8px;
		transition: border-color 0.2s;
	}

	.url-input-container:hover {
		border-color: #007bff;
	}

	.batch-input-section textarea {
		width: 100%;
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 8px;
		font-family: monospace;
		font-size: 0.9rem;
		resize: vertical;
		margin-bottom: 1rem;
	}

	.batch-input-section textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}

	.import-progress,
	.batch-progress {
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #e0e0e0;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #007bff, #0056b3);
		transition: width 0.3s ease;
	}

	.progress-status {
		margin: 0;
		font-size: 0.9rem;
		color: #666;
		text-align: center;
	}

	.progress-stats {
		display: flex;
		justify-content: space-between;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.stat {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		background: #f0f0f0;
	}

	.stat.success {
		background: #d4edda;
		color: #155724;
	}

	.stat.error {
		background: #f8d7da;
		color: #721c24;
	}

	.import-options {
		padding: 1.5rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
	}

	.import-options h3 {
		margin: 0 0 1rem 0;
		color: #333;
		font-size: 1.1rem;
	}

	.options-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.option-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		font-size: 0.9rem;
		color: #555;
	}

	.option-item input[type="checkbox"] {
		margin: 0;
	}

	@media (max-width: 768px) {
		.web-content-importer {
			padding: 1rem;
			margin: 1rem;
		}

		.url-input-container {
			flex-direction: column;
			align-items: stretch;
		}

		.options-grid {
			grid-template-columns: 1fr;
		}

		.progress-stats {
			flex-direction: column;
			gap: 0.5rem;
		}
	}
</style>