<script lang="ts">
	import { EnhancedDocumentProcessor } from '$lib/services/enhancedDocumentProcessor';
	import { validateFile, generateFilePreview } from '$lib/utils/fileValidation';
	import type { UploadProgress, FileValidationResult } from '$lib/types/content';
	import { Button, Card, ProgressBar } from '$lib/components/ui';

	interface Props {
		acceptedTypes?: string[];
		maxFileSize?: number;
		maxFiles?: number;
		allowBulkUpload?: boolean;
		onupload?: (event: CustomEvent<{ files: any[] }> ) => void;
		onerror?: (event: CustomEvent<{ message: string; files: File[] }>) => void;
		onprogress?: (event: CustomEvent<{ progress: UploadProgress }>) => void;
	}

	let {
		acceptedTypes = ['.pdf', '.md', '.markdown'],
		maxFileSize = 50 * 1024 * 1024, // 50MB
		maxFiles = 10,
		allowBulkUpload = true,
		onupload,
		onerror,
		onprogress
	}: Props = $props();

	// Create document processor instance
	const documentProcessor = new EnhancedDocumentProcessor();

	let dragActive = $state(false);
	let fileInput: HTMLInputElement;
	let uploadQueue = $state<File[]>([]);
	let uploadProgress = $state<Map<string, UploadProgress>>(new Map());
	let validationResults = $state<Map<string, FileValidationResult>>(new Map());
	let isProcessing = $state(false);
	let abortController: AbortController | null = null;

	const acceptedTypesString = $derived(acceptedTypes.join(','));

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		const target = event.currentTarget as Element;
		const relatedTarget = event.relatedTarget as Node | null;
		if (!target.contains(relatedTarget)) {
			dragActive = false;
		}
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
		
		const files = Array.from(event.dataTransfer?.files || []);
		await processFiles(files);
	}

	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = Array.from(target.files || []);
		await processFiles(files);
		target.value = '';
	}

	async function processFiles(files: File[]) {
		if (files.length === 0) return;

		// Validate file count
		if (files.length > maxFiles) {
			onerror?.(new CustomEvent('error', {
				detail: {
					message: `Maximum ${maxFiles} files allowed. Selected ${files.length} files.`, 
					files
				}
			}));
			return;
		}

		// Validate each file
		const validationPromises = files.map(async (file) => {
			const result = await validateFile(file, acceptedTypes, maxFileSize);
			validationResults.set(file.name, result);
			return { file, result };
		});

		const validatedFiles = await Promise.all(validationPromises);
		const validFiles = validatedFiles
			.filter(({ result }) => result.isValid)
			.map(({ file }) => file);
		
		const invalidFiles = validatedFiles
			.filter(({ result }) => !result.isValid)
			.map(({ file }) => file);

		if (invalidFiles.length > 0) {
			const invalidMessages = invalidFiles.map(file => {
				const result = validationResults.get(file.name);
				return `${file.name}: ${result?.errors.join(', ')}`;
			});
			
			onerror?.(new CustomEvent('error', {
					detail: {
						message: `Invalid files:\n${invalidMessages.join('\n')}`,
						files: invalidFiles
				}
			}));
		}

		if (validFiles.length > 0) {
			uploadQueue = [...uploadQueue, ...validFiles];
			await generatePreviews(validFiles);
		}
	}

	async function generatePreviews(files: File[]) {
		for (const file of files) {
			try {
				const preview = await generateFilePreview(file);
				const existing = validationResults.get(file.name);
				if (existing) {
					existing.preview = preview;
				}
			} catch (error) {
				console.warn(`Failed to generate preview for ${file.name}:`, error);
			}
		}
	}

	async function startUpload() {
		if (isProcessing || uploadQueue.length === 0) return;

		isProcessing = true;
		abortController = new AbortController();

		try {
			const results = [];
			
			for (const file of uploadQueue) {
				try {
					const progress: UploadProgress = {
						fileId: file.name,
						fileName: file.name,
						percentage: 0,
						status: 'processing',
						message: 'Processing file...'
					};

					uploadProgress.set(file.name, progress);

					// Dispatch progress event
					if (onprogress) {
						onprogress(new CustomEvent('progress', { detail: { progress } }));
					}

					const result = await documentProcessor.processDocument(file);
					
					progress.percentage = 100;
					progress.status = 'completed';
					progress.message = 'Processing complete';
					
					uploadProgress.set(file.name, progress);

					results.push(result);
				} catch (error) {
					const progress: UploadProgress = {
						fileId: file.name,
						fileName: file.name,
						percentage: 0,
						status: 'error',
						message: error instanceof Error ? error.message : 'Processing failed'
					};

					uploadProgress.set(file.name, progress);
				}
			}

			
			if (onupload) {
				onupload(new CustomEvent('upload', { detail: { files: results } }));
			}
			clearQueue();
		} catch (error) {
			if (error instanceof Error && error.name !== 'AbortError') {
				if (onerror) {
						onerror(new CustomEvent('error', {
							detail: {
								message: `Upload failed: ${error.message}`, 
									files: uploadQueue
							}
						}));
				}
			}
		} finally {
			isProcessing = false;
			abortController = null;
		}
	}

	function cancelUpload() {
		if (abortController) {
			abortController.abort();
		}
		isProcessing = false;
	}

	function removeFile(fileName: string) {
		uploadQueue = uploadQueue.filter(file => file.name !== fileName);
		uploadProgress.delete(fileName);
		validationResults.delete(fileName);
	}

	function clearQueue() {
		uploadQueue = [];
		uploadProgress = new Map();
		validationResults = new Map();
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>


<div class="document-upload-manager">
	<div
		class="upload-zone"
		class:drag-active={dragActive}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="button"
		tabindex="0"
		onclick={() => fileInput.click()}
		onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
	>
		<div class="upload-content">
			<svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7,10 12,15 17,10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
			<h3>Drop files here or click to browse</h3>
			<p>
				Supported formats: {acceptedTypes.join(', ')} 
				(Max {formatFileSize(maxFileSize)} per file)
			</p>
			{#if allowBulkUpload}
				<p class="bulk-info">Upload up to {maxFiles} files at once</p>
			{/if}
		</div>
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept={acceptedTypesString}
		multiple={allowBulkUpload}
		onchange={handleFileSelect}
		style="display: none;"
	/>

	{#if uploadQueue.length > 0}
		<div class="upload-queue">
			<div class="queue-header">
				<h4>Upload Queue ({uploadQueue.length} files)</h4>
				<div class="queue-actions">
					{#if !isProcessing}
						<Button variant="secondary" size="sm" onclick={clearQueue}>
							Clear All
						</Button>
						<Button variant="primary" size="sm" onclick={startUpload}>
							Upload Files
						</Button>
					{:else}
						<Button variant="secondary" size="sm" onclick={cancelUpload}>
							Cancel Upload
						</Button>
					{/if}
				</div>
			</div>

			<div class="file-list">
				{#each uploadQueue as file (file.name)}
					{@const validation = validationResults.get(file.name)}
					{@const progress = uploadProgress.get(file.name)}
					
					<Card class="file-item">
						<div class="file-info">
							<div class="file-details">
								<div class="file-name">{file.name}</div>
								<div class="file-meta">
									{formatFileSize(file.size)} • {file.type || 'Unknown type'}
								</div>
								{#if validation?.errors && validation.errors.length > 0}
									<div class="file-errors">
										{validation.errors.join(', ')}
									</div>
								{/if}
							</div>
							
							{#if validation?.preview}
								<div class="file-preview">
									{#if validation.preview.type === 'image'}
										<img src={validation.preview.url} alt="Preview" />
									{:else if validation.preview.type === 'text'}
										<div class="text-preview">{validation.preview.content}</div>
									{/if}
								</div>
							{/if}
						</div>
						
						{#if progress}
							<div class="progress-section">
								<div class="progress-info">
									<span class="progress-status">{progress.status}</span>
									<span class="progress-percent">{Math.round(progress.percentage)}%</span>
								</div>
								<ProgressBar value={progress.percentage} />
								{#if progress.message}
									<div class="progress-message">{progress.message}</div>
								{/if}
							</div>
						{/if}

						{#if !isProcessing}
							<Button
								variant="ghost"
								size="sm"
								onclick={() => removeFile(file.name)}
								class="remove-button"
							>
								Remove
							</Button>
						{/if}
					</Card>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.document-upload-manager {
		width: 100%;
		max-width: 800px;
		margin: 0 auto;
	}

	.upload-zone {
		border: 2px dashed var(--color-border);
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
		background: var(--color-surface);
	}

	.upload-zone:hover,
	.upload-zone.drag-active {
		border-color: var(--color-primary);
		background: var(--color-primary-light);
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.upload-icon {
		width: 48px;
		height: 48px;
		color: var(--color-text-secondary);
	}

	.upload-zone h3 {
		margin: 0;
		color: var(--color-text-primary);
		font-size: 1.25rem;
	}

	.upload-zone p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.875rem;
	}

	.bulk-info {
		font-weight: 500;
		color: var(--color-primary);
	}

	.upload-queue {
		margin-top: 2rem;
	}

	.queue-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.queue-header h4 {
		margin: 0;
		color: var(--color-text-primary);
	}

	.queue-actions {
		display: flex;
		gap: 0.5rem;
	}

	.file-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.file-info {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.file-details {
		flex: 1;
	}

	.file-name {
		font-weight: 500;
		color: var(--color-text-primary);
		margin-bottom: 0.25rem;
	}

	.file-meta {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.file-errors {
		font-size: 0.875rem;
		color: var(--color-error);
		margin-top: 0.25rem;
	}

	.file-preview {
		width: 80px;
		height: 80px;
		border-radius: 4px;
		overflow: hidden;
		background: var(--color-surface-secondary);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.file-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.text-preview {
		padding: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
	}

	.progress-section {
		margin-top: 1rem;
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.progress-status {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}

	.progress-percent {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-primary);
	}

	.progress-message {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-top: 0.25rem;
	}

	@media (max-width: 768px) {
		.upload-zone {
			padding: 1.5rem;
		}

		.queue-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.queue-actions {
			justify-content: center;
		}

		.file-info {
			flex-direction: column;
		}

		.file-preview {
			width: 100%;
			height: 120px;
		}
	}
</style>