<script lang="ts">

	import { systemIntegrationService, type IntegrationPipeline, type DocumentTransformationResult } from '$lib/services/systemIntegrationService.js';
	import { webContentState, webContentActions } from '$lib/stores/webContentState.svelte.js';
	import { appState, actions } from '$lib/stores/appState.svelte.js';
	import { 
		Button, 
		Card, 
		ProgressBar, 
		Badge, 
		LoadingSpinner,
		ResponsiveContainer,
		Toast,
		ToastContainer
	} from '$lib/components/ui/index.js';
	import { DocumentUploadManager } from '$lib/components/index.js';
	import { ErrorBoundary } from '$lib/components/index.js';

	// Component state
	let activePipelines = $state<IntegrationPipeline[]>([]);
	let recentResults = $state<DocumentTransformationResult[]>([]);
	let isProcessing = $state(false);
	let selectedFiles = $state<File[]>([]);
	let urlInput = $state('');
	let processingMode = $state<'single' | 'batch'>('single');
	let showAdvancedOptions = $state(false);
	let isMobile = $state(false);

	// Advanced options
	let advancedOptions = $state({
		enableProgressTracking: true,
		enableErrorRecovery: true,
		enableCaching: true,
		enableMobileOptimization: true,
		batchSize: 5,
		maxConcurrentOperations: 3
	});

	// Statistics
	let stats = $state({
		totalProcessed: 0,
		successfulTransformations: 0,
		failedTransformations: 0,
		averageProcessingTime: 0,
		knowledgeNodesCreated: 0
	});

	$effect(() => {
		updateScreenSize();
		window.addEventListener('resize', updateScreenSize);
		
		// Start polling for pipeline updates
		const pollInterval = setInterval(updatePipelines, 1000);
		
		// Load initial data
		updatePipelines();
		updateStats();

		return () => {
			window.removeEventListener('resize', updateScreenSize);
			clearInterval(pollInterval);
		};
	});

	function updateScreenSize() {
		isMobile = window.innerWidth < 768;
	}

	function updatePipelines() {
		activePipelines = systemIntegrationService.getActivePipelines();
	}

	function updateStats() {
		// Calculate statistics from recent results
		const successful = recentResults.filter(r => r.success).length;
		const failed = recentResults.filter(r => !r.success).length;
		const totalTime = recentResults.reduce((sum, r) => sum + r.processingTime, 0);

		stats = {
			totalProcessed: recentResults.length,
			successfulTransformations: successful,
			failedTransformations: failed,
			averageProcessingTime: recentResults.length > 0 ? Math.round(totalTime / recentResults.length) : 0,
			knowledgeNodesCreated: successful
		};
	}

	async function processUrl() {
		if (!urlInput.trim()) {
			actions.addNotification({
				type: 'error',
				message: 'Please enter a valid URL'
			});
			return;
		}

		isProcessing = true;

		try {
			const result = await systemIntegrationService.processWebContentPipeline(urlInput.trim());
			
			recentResults = [result, ...recentResults.slice(0, 9)]; // Keep last 10 results
			updateStats();

			if (result.success) {
				actions.addNotification({
					type: 'success',
					message: `Successfully processed content from ${urlInput}`
				});
				urlInput = '';
			} else {
				actions.addNotification({
					type: 'error',
					message: `Failed to process URL: ${result.errors.join(', ')}`
				});
			}
		} catch (error) {
			actions.addNotification({
				type: 'error',
				message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		} finally {
			isProcessing = false;
		}
	}

	async function processFiles(files: File[]) {
		if (files.length === 0) return;

		isProcessing = true;

		try {
			if (processingMode === 'batch' && files.length > 1) {
				// Batch processing
				const inputs = files.map(file => ({ input: file, type: detectFileType(file) }));
				const results = await systemIntegrationService.processBatchDocuments(inputs);
				
				recentResults = [...results, ...recentResults.slice(0, 10 - results.length)];
				
				const successful = results.filter(r => r.success).length;
				actions.addNotification({
					type: successful === results.length ? 'success' : 'warning',
					message: `Batch processing completed: ${successful}/${results.length} successful`
				});
			} else {
				// Single file processing
				for (const file of files) {
					const fileType = detectFileType(file);
					const result = await systemIntegrationService.processDocumentPipeline(file, fileType);
					
					recentResults = [result, ...recentResults.slice(0, 9)];
					
					if (result.success) {
						actions.addNotification({
							type: 'success',
							message: `Successfully processed "${file.name}"`
						});
					} else {
						actions.addNotification({
							type: 'error',
							message: `Failed to process "${file.name}": ${result.errors.join(', ')}`
						});
					}
				}
			}

			updateStats();
		} catch (error) {
			actions.addNotification({
				type: 'error',
				message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		} finally {
			isProcessing = false;
		}
	}

	function detectFileType(file: File): 'pdf' | 'markdown' | 'html' | undefined {
		const extension = file.name.split('.').pop()?.toLowerCase();
		switch (extension) {
			case 'pdf': return 'pdf';
			case 'md':
			case 'markdown': return 'markdown';
			case 'html':
			case 'htm': return 'html';
			default: return undefined;
		}
	}

	function cancelPipeline(pipelineId: string) {
		const success = systemIntegrationService.cancelPipeline(pipelineId);
		if (success) {
			actions.addNotification({
				type: 'info',
				message: 'Pipeline cancelled successfully'
			});
		}
	}

	function formatDuration(ms: number): string {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}m`;
	}

	function formatDate(date: Date): string {
		return date.toLocaleString();
	}

	function getStatusColor(status: string): 'success' | 'warning' | 'error' | 'secondary' {
		switch (status) {
			case 'completed': return 'success';
			case 'running': return 'warning';
			case 'error': return 'error';
			default: return 'secondary';
		}
	}

	// Handle file upload from DocumentUploadManager
	function handleFileUpload(files: any[]) {
		// Convert the processed documents back to files for our processing
		// In a real implementation, you'd want to process the already-processed documents
		actions.addNotification({
			type: 'info',
			message: `Received ${files.length} files for processing`
		});
	}

	function handleFileError(detail: { message: string; files: File[] }) {
		actions.addNotification({
			type: 'error',
			message: detail.message
		});
	}
</script>

<ResponsiveContainer maxWidth="full" padding="md">
	<div class="system-integration-dashboard" class:mobile={isMobile}>
		<!-- Header -->
		<header class="dashboard-header">
			<div class="header-content">
				<h1 class="dashboard-title">System Integration Hub</h1>
				<p class="dashboard-subtitle">
					Orchestrate document processing, transformation, and knowledge base integration
				</p>
			</div>

			<!-- Statistics Overview -->
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-value">{stats.totalProcessed}</div>
					<div class="stat-label">Total Processed</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.successfulTransformations}</div>
					<div class="stat-label">Successful</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{stats.knowledgeNodesCreated}</div>
					<div class="stat-label">Knowledge Nodes</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{formatDuration(stats.averageProcessingTime)}</div>
					<div class="stat-label">Avg. Time</div>
				</div>
			</div>
		</header>

		<div class="dashboard-content">
			<ErrorBoundary context={{ component: 'SystemIntegrationDashboard', operation: 'render' }}>
				<!-- Input Section -->
				<section class="input-section">
					<Card class="input-card">
						<h2 class="section-title">Process Content</h2>
						
						<!-- URL Input -->
						<div class="url-input-group">
							<h3>From URL</h3>
							<div class="url-input-container">
								<input
									type="url"
									bind:value={urlInput}
									placeholder="Enter URL to process..."
									class="url-input"
									disabled={isProcessing}
								/>
								<Button
									onclick={processUrl}
									disabled={isProcessing || !urlInput.trim()}
									variant="primary"
								>
									{#if isProcessing}
										<LoadingSpinner size="sm" />
									{:else}
										Process URL
									{/if}
								</Button>
							</div>
						</div>

						<!-- File Upload -->
						<div class="file-upload-group">
							<h3>From Files</h3>
							<DocumentUploadManager
								acceptedTypes={['.pdf', '.md', '.markdown', '.html', '.htm']}
								maxFileSize={50 * 1024 * 1024}
								maxFiles={10}
								allowBulkUpload={true}
								onupload={handleFileUpload}
								onerror={handleFileError}
							/>
						</div>

						<!-- Processing Options -->
						<div class="processing-options">
							<div class="option-group">
								<label>
									<input
										type="radio"
										bind:group={processingMode}
										value="single"
									/>
									Process files individually
								</label>
								<label>
									<input
										type="radio"
										bind:group={processingMode}
										value="batch"
									/>
									Batch processing
								</label>
							</div>

							<Button
								onclick={() => showAdvancedOptions = !showAdvancedOptions}
								variant="outline"
								size="sm"
							>
								{showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
							</Button>
						</div>

						<!-- Advanced Options -->
						{#if showAdvancedOptions}
							<div class="advanced-options">
								<h4>Advanced Configuration</h4>
								<div class="options-grid">
									<label class="checkbox-label">
										<input
											type="checkbox"
											bind:checked={advancedOptions.enableProgressTracking}
										/>
										Enable Progress Tracking
									</label>
									<label class="checkbox-label">
										<input
											type="checkbox"
											bind:checked={advancedOptions.enableErrorRecovery}
										/>
										Enable Error Recovery
									</label>
									<label class="checkbox-label">
										<input
											type="checkbox"
											bind:checked={advancedOptions.enableCaching}
										/>
										Enable Caching
									</label>
									<label class="checkbox-label">
										<input
											type="checkbox"
											bind:checked={advancedOptions.enableMobileOptimization}
										/>
										Mobile Optimization
									</label>
								</div>
								<div class="number-inputs">
									<label>
										Batch Size:
										<input
											type="number"
											bind:value={advancedOptions.batchSize}
											min="1"
											max="20"
											class="number-input"
										/>
									</label>
									<label>
										Max Concurrent Operations:
										<input
											type="number"
											bind:value={advancedOptions.maxConcurrentOperations}
											min="1"
											max="10"
											class="number-input"
										/>
									</label>
								</div>
							</div>
						{/if}
					</Card>
				</section>

				<!-- Active Pipelines -->
				{#if activePipelines.length > 0}
					<section class="pipelines-section">
						<h2 class="section-title">Active Pipelines</h2>
						<div class="pipelines-grid">
							{#each activePipelines as pipeline (pipeline.id)}
								<Card class="pipeline-card">
									<div class="pipeline-header">
										<div class="pipeline-info">
											<h3 class="pipeline-name">{pipeline.name}</h3>
											<Badge variant={getStatusColor(pipeline.status)}>
												{pipeline.status}
											</Badge>
										</div>
										{#if pipeline.status === 'running'}
											<Button
												onclick={() => cancelPipeline(pipeline.id)}
												variant="outline"
												size="sm"
											>
												Cancel
											</Button>
										{/if}
									</div>

									<div class="pipeline-progress">
										<div class="progress-info">
											<span>Overall Progress</span>
											<span>{pipeline.progress}%</span>
										</div>
										<ProgressBar value={pipeline.progress} max={100} />
									</div>

									<div class="pipeline-steps">
										{#each pipeline.steps as step (step.id)}
											<div class="step-item" class:active={step.status === 'running'}>
												<div class="step-info">
													<span class="step-name">{step.name}</span>
													<Badge variant={getStatusColor(step.status)} size="sm">
														{step.status}
													</Badge>
												</div>
												{#if step.status === 'running'}
													<div class="step-progress">
														<ProgressBar value={step.progress} max={100} size="sm" />
													</div>
												{/if}
											</div>
										{/each}
									</div>

									<div class="pipeline-meta">
										{#if pipeline.startTime}
											<span class="meta-item">
												Started: {formatDate(pipeline.startTime)}
											</span>
										{/if}
										{#if pipeline.endTime}
											<span class="meta-item">
												Completed: {formatDate(pipeline.endTime)}
											</span>
										{/if}
										{#if pipeline.error}
											<span class="meta-item error">
												Error: {pipeline.error}
											</span>
										{/if}
									</div>
								</Card>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Recent Results -->
				{#if recentResults.length > 0}
					<section class="results-section">
						<h2 class="section-title">Recent Results</h2>
						<div class="results-grid">
							{#each recentResults as result, index (index)}
								<Card class="result-card {result.success ? 'success' : 'error'}">
									<div class="result-header">
										<div class="result-info">
											<h3 class="result-title">
												{result.originalDocument.title || 'Untitled Document'}
											</h3>
											<Badge variant={result.success ? 'success' : 'error'}>
												{result.success ? 'Success' : 'Failed'}
											</Badge>
										</div>
										<span class="processing-time">
											{formatDuration(result.processingTime)}
										</span>
									</div>

									{#if result.success}
										<div class="result-details">
											<div class="detail-item">
												<span class="detail-label">Knowledge Node:</span>
												<span class="detail-value">{result.knowledgeNode.id}</span>
											</div>
											<div class="detail-item">
												<span class="detail-label">Interactive Elements:</span>
												<span class="detail-value">
													{result.interactiveArticle.content?.length || 0}
												</span>
											</div>
											<div class="detail-item">
												<span class="detail-label">Relationships:</span>
												<span class="detail-value">
													{result.integrationResult.relationships?.length || 0}
												</span>
											</div>
										</div>
									{:else}
										<div class="result-errors">
											{#each result.errors as error}
												<div class="error-message">{error}</div>
											{/each}
										</div>
									{/if}
								</Card>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Empty State -->
				{#if activePipelines.length === 0 && recentResults.length === 0 && !isProcessing}
					<div class="empty-state">
						<div class="empty-icon">🚀</div>
						<h3>Ready to Process Content</h3>
						<p>
							Upload documents or enter URLs to start transforming static content 
							into interactive knowledge base articles.
						</p>
					</div>
				{/if}
			</ErrorBoundary>
		</div>
	</div>
</ResponsiveContainer>

<ToastContainer />

<style>
	.system-integration-dashboard {
		min-height: 100vh;
		background: var(--color-background, #fafafa);
		color: var(--color-text, #333);
	}

	/* Header Styles */
	.dashboard-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 2rem 0;
		margin-bottom: 2rem;
		border-radius: 0 0 1rem 1rem;
	}

	.header-content {
		text-align: center;
		margin-bottom: 2rem;
	}

	.dashboard-title {
		font-size: 2.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.dashboard-subtitle {
		font-size: 1.1rem;
		opacity: 0.9;
		margin: 0;
		font-weight: 300;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.stat-card {
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
		border-radius: 1rem;
		padding: 1.5rem;
		text-align: center;
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: transform 0.2s ease;
	}

	.stat-card:hover {
		transform: translateY(-2px);
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		display: block;
	}

	.stat-label {
		font-size: 0.9rem;
		opacity: 0.8;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	/* Content Styles */
	.dashboard-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.section-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--color-text-primary, #333);
	}

	/* Input Section */
	:global(.input-card) {
		padding: 2rem;
	}

	.url-input-group,
	.file-upload-group {
		margin-bottom: 2rem;
	}

	.url-input-group h3,
	.file-upload-group h3 {
		margin: 0 0 1rem 0;
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--color-text-primary, #333);
	}

	.url-input-container {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.url-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 0.5rem;
		font-size: 1rem;
		background: white;
	}

	.url-input:focus {
		outline: none;
		border-color: var(--color-primary, #007bff);
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}

	.processing-options {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--color-border, #eee);
	}

	.option-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.option-group label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.advanced-options {
		margin-top: 1rem;
		padding: 1rem;
		background: var(--color-surface-secondary, #f8f9fa);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border, #eee);
	}

	.advanced-options h4 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.options-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		cursor: pointer;
	}

	.number-inputs {
		display: flex;
		gap: 1rem;
	}

	.number-inputs label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.number-input {
		padding: 0.5rem;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 0.25rem;
		width: 80px;
	}

	/* Pipeline Styles */
	.pipelines-grid,
	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 1rem;
	}

	.pipeline-card,
	.result-card {
		border: 1px solid var(--color-border, #eee);
		transition: all 0.2s ease;
	}

	.pipeline-card:hover,
	.result-card:hover {
		border-color: var(--color-primary-300, #93c5fd);
		box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
	}

	.pipeline-header,
	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.pipeline-info,
	.result-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pipeline-name,
	.result-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text-primary, #333);
	}

	.pipeline-progress {
		margin-bottom: 1rem;
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
		font-size: 0.9rem;
		color: var(--color-text-secondary, #666);
	}

	.pipeline-steps {
		margin-bottom: 1rem;
	}

	.step-item {
		padding: 0.5rem;
		border-radius: 0.25rem;
		margin-bottom: 0.5rem;
		transition: background-color 0.2s ease;
	}

	.step-item.active {
		background: var(--color-primary-50, #f0f8ff);
		border: 1px solid var(--color-primary-200, #bfdbfe);
	}

	.step-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.step-name {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.step-progress {
		margin-top: 0.25rem;
	}

	.pipeline-meta {
		font-size: 0.8rem;
		color: var(--color-text-secondary, #666);
		border-top: 1px solid var(--color-border, #eee);
		padding-top: 0.5rem;
	}

	.meta-item {
		display: block;
		margin-bottom: 0.25rem;
	}

	.meta-item.error {
		color: var(--color-error, #dc3545);
	}

	.processing-time {
		font-size: 0.9rem;
		color: var(--color-text-secondary, #666);
		font-weight: 500;
	}

	/* Result Styles */
	.result-card.success {
		border-left: 4px solid var(--color-success, #28a745);
	}

	.result-card.error {
		border-left: 4px solid var(--color-error, #dc3545);
	}

	.result-details {
		margin-top: 1rem;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0;
		font-size: 0.9rem;
	}

	.detail-label {
		color: var(--color-text-secondary, #666);
		font-weight: 500;
	}

	.detail-value {
		color: var(--color-text-primary, #333);
		font-weight: 600;
	}

	.result-errors {
		margin-top: 1rem;
	}

	.error-message {
		padding: 0.5rem;
		background: var(--color-error-light, #f8d7da);
		color: var(--color-error-dark, #721c24);
		border-radius: 0.25rem;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	/* Empty State */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		color: var(--color-text-secondary, #666);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-state h3 {
		margin: 0 0 1rem 0;
		color: var(--color-text-primary, #333);
		font-size: 1.4rem;
		font-weight: 600;
	}

	.empty-state p {
		margin: 0;
		max-width: 500px;
		line-height: 1.5;
	}

	/* Mobile Responsive */
	@media (max-width: 768px) {
		.dashboard-title {
			font-size: 2rem;
		}

		.dashboard-subtitle {
			font-size: 1rem;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 0.75rem;
		}

		.stat-card {
			padding: 1rem;
		}

		.stat-value {
			font-size: 1.5rem;
		}

		.url-input-container {
			flex-direction: column;
			align-items: stretch;
		}

		.processing-options {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.pipelines-grid,
		.results-grid {
			grid-template-columns: 1fr;
		}

		.pipeline-header,
		.result-header {
			flex-direction: column;
			gap: 1rem;
		}

		.number-inputs {
			flex-direction: column;
		}

		:global(.input-card) {
			padding: 1rem;
		}
	}

	@media (max-width: 480px) {
		.stats-grid {
			grid-template-columns: 1fr;
		}

		.dashboard-header {
			padding: 1.5rem 0;
		}

		.section-title {
			font-size: 1.3rem;
		}

		.empty-state {
			padding: 2rem 1rem;
		}

		.empty-icon {
			font-size: 3rem;
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: high) {
		.stat-card {
			border: 2px solid rgba(255, 255, 255, 0.5);
		}

		.pipeline-card,
		.result-card {
			border-width: 2px;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.stat-card,
		.pipeline-card,
		.result-card,
		.step-item {
			transition: none;
		}

		.stat-card:hover {
			transform: none;
		}
	}
</style>