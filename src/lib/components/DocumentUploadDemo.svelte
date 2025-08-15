<script lang="ts">
	import DocumentUploadManager from './DocumentUploadManager.svelte';
	import BulkUploadManager from './BulkUploadManager.svelte';
	import type { ProcessedDocument } from '$lib/types/content.js';

	let showBulkUpload = $state(false);
	let uploadedDocuments = $state<ProcessedDocument[]>([]);
	let errorMessage = $state('');

	function handleUpload(event: CustomEvent<{ files: ProcessedDocument[] }>) {
		uploadedDocuments = [...uploadedDocuments, ...event.detail.files];
		console.log('Documents uploaded:', event.detail.files);
	}

	function handleError(event: CustomEvent<{ message: string }>) {
		errorMessage = event.detail.message;
		console.error('Upload error:', event.detail.message);
	}

	function handleBatchComplete(event: CustomEvent<{ results: ProcessedDocument[]; errors: string[] }>) {
		uploadedDocuments = [...uploadedDocuments, ...event.detail.results];
		if (event.detail.errors.length > 0) {
			errorMessage = `Some files failed: ${event.detail.errors.join(', ')}`;
		}
		console.log('Batch complete:', event.detail);
	}

	function clearError() {
		errorMessage = '';
	}

	function clearDocuments() {
		uploadedDocuments = [];
	}
</script>

<div class="document-upload-demo">
	<div class="demo-header">
		<h2>Document Upload & Management Demo</h2>
		<div class="demo-controls">
			<button 
				class="toggle-button" 
				class:active={!showBulkUpload}
				onclick={() => showBulkUpload = false}
			>
				Single Upload
			</button>
			<button 
				class="toggle-button" 
				class:active={showBulkUpload}
				onclick={() => showBulkUpload = true}
			>
				Bulk Upload
			</button>
		</div>
	</div>

	{#if errorMessage}
		<div class="error-message">
			<span>{errorMessage}</span>
			<button onclick={clearError} class="close-button">×</button>
		</div>
	{/if}

	<div class="upload-section">
		{#if showBulkUpload}
			<BulkUploadManager
				maxConcurrentUploads={2}
				allowedTypes={['.pdf', '.md', '.markdown']}
				maxFileSize={25 * 1024 * 1024}
				maxTotalFiles={20}
				on:batchComplete={handleBatchComplete}
				on:batchError={handleError}
			/>
		{:else}
			<DocumentUploadManager
				acceptedTypes={['.pdf', '.md', '.markdown']}
				maxFileSize={25 * 1024 * 1024}
				maxFiles={5}
				allowBulkUpload={true}
				on:upload={handleUpload}
				on:error={handleError}
			/>
		{/if}
	</div>

	{#if uploadedDocuments.length > 0}
		<div class="results-section">
			<div class="results-header">
				<h3>Uploaded Documents ({uploadedDocuments.length})</h3>
				<button onclick={clearDocuments} class="clear-button">
					Clear All
				</button>
			</div>
			
			<div class="documents-grid">
				{#each uploadedDocuments as doc (doc.id)}
					<div class="document-card">
						<div class="document-header">
							<h4>{doc.title}</h4>
							<span class="document-type">{doc.metadata.originalFormat}</span>
						</div>
						<div class="document-stats">
							<div class="stat">
								<span class="stat-label">Words:</span>
								<span class="stat-value">{doc.metadata.wordCount}</span>
							</div>
							<div class="stat">
								<span class="stat-label">Blocks:</span>
								<span class="stat-value">{doc.content.length}</span>
							</div>
							<div class="stat">
								<span class="stat-label">Sections:</span>
								<span class="stat-value">{doc.structure.sections.length}</span>
							</div>
						</div>
						<div class="document-meta">
							<div class="meta-item">
								<strong>Original:</strong> {doc.metadata.originalFileName}
							</div>
							<div class="meta-item">
								<strong>Processed:</strong> {doc.metadata.processedAt.toLocaleString()}
							</div>
							<div class="meta-item">
								<strong>Processing Time:</strong> {doc.metadata.processingTime}ms
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.document-upload-demo {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.demo-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 2px solid var(--color-border);
	}

	.demo-header h2 {
		margin: 0;
		color: var(--color-text-primary);
	}

	.demo-controls {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-button {
		padding: 0.5rem 1rem;
		border: 2px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toggle-button:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.toggle-button.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: white;
	}

	.error-message {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--color-error-light);
		border: 1px solid var(--color-error);
		color: var(--color-error);
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 2rem;
	}

	.close-button {
		background: none;
		border: none;
		color: var(--color-error);
		font-size: 1.5rem;
		cursor: pointer;
		padding: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.upload-section {
		margin-bottom: 3rem;
	}

	.results-section {
		border-top: 2px solid var(--color-border);
		padding-top: 2rem;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.results-header h3 {
		margin: 0;
		color: var(--color-text-primary);
	}

	.clear-button {
		padding: 0.5rem 1rem;
		background: var(--color-error);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.clear-button:hover {
		background: var(--color-error-dark);
	}

	.documents-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
		gap: 1.5rem;
	}

	.document-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		padding: 1.5rem;
		transition: box-shadow 0.2s ease;
	}

	.document-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.document-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.document-header h4 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 1.1rem;
		flex: 1;
		margin-right: 1rem;
	}

	.document-type {
		background: var(--color-primary-light);
		color: var(--color-primary);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
	}

	.document-stats {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border);
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: bold;
		color: var(--color-primary);
	}

	.document-meta {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.meta-item {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.meta-item strong {
		color: var(--color-text-primary);
	}

	@media (max-width: 768px) {
		.document-upload-demo {
			padding: 1rem;
		}

		.demo-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.documents-grid {
			grid-template-columns: 1fr;
		}

		.document-stats {
			justify-content: space-around;
		}

		.results-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}
	}
</style>