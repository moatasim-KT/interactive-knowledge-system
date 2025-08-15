<script lang="ts">
	import type { FileValidationResult, UploadProgress } from '$lib/types/content.js';
	import { formatFileSize } from '$lib/utils/fileValidation.js';
	import Button from './ui/Button.svelte';
	import ProgressBar from './ui/ProgressBar.svelte';
	import Card from './ui/Card.svelte';

	type Props = {
		file: File;
		validation?: FileValidationResult;
		progress?: UploadProgress;
		showRemoveButton?: boolean;
		isProcessing?: boolean;
		onremove?: (event: CustomEvent<{ fileName: string }>) => void;
	}

	let {
		file,
		validation = undefined,
		progress = undefined,
		showRemoveButton = true,
		isProcessing = false,
		onremove
	}: Props = $props();

	function handleRemove() {
		onremove?.(new CustomEvent('remove', { detail: { fileName: file.name } }));
	}

	function getFileIcon(fileName: string): string {
		const extension = fileName.split('.').pop()?.toLowerCase();
		switch (extension) {
			case 'pdf':
				return '📄';
			case 'md':
			case 'markdown':
				return '📝';
			case 'txt':
				return '📄';
			case 'docx':
			case 'doc':
				return '📄';
			default:
				return '📄';
		}
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed':
				return 'var(--color-success)';
			case 'error':
				return 'var(--color-error)';
			case 'processing':
			case 'uploading':
				return 'var(--color-primary)';
			default:
				return 'var(--color-text-secondary)';
		}
	}
</script>

<Card class="file-preview-card">
	<div class="file-header">
		<div class="file-icon">
			{getFileIcon(file.name)}
		</div>
		<div class="file-info">
			<div class="file-name" title={file.name}>
				{file.name}
			</div>
			<div class="file-meta">
				{formatFileSize(file.size)} • {file.type || 'Unknown type'}
			</div>
			<div class="file-modified">
				Modified: {new Date(file.lastModified).toLocaleDateString()}
			</div>
		</div>
		{#if showRemoveButton && !isProcessing}
			<Button
				variant="ghost"
				size="sm"
				onclick={handleRemove}
				class="remove-button"
				aria-label="Remove {file.name}"
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</Button>
		{/if}
	</div>

	{#if validation}
		<div class="validation-section">
			{#if validation.errors.length > 0}
				<div class="validation-errors">
					<div class="error-header">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<circle cx="12" cy="12" r="10" />
							<line x1="15" y1="9" x2="9" y2="15" />
							<line x1="9" y1="9" x2="15" y2="15" />
						</svg>
						Validation Errors
					</div>
					<ul class="error-list">
						{#each validation.errors as error}
							<li>{error}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if validation.warnings.length > 0}
				<div class="validation-warnings">
					<div class="warning-header">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						Warnings
					</div>
					<ul class="warning-list">
						{#each validation.warnings as warning}
							<li>{warning}</li>
						{/each}
					</ul>
				</div>
			{/if}

			{#if validation.isValid}
				<div class="validation-success">
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22,4 12,14.01 9,11.01" />
					</svg>
					File is valid and ready for processing
				</div>
			{/if}
		</div>
	{/if}

	{#if validation?.preview}
		<div class="preview-section">
			<div class="preview-header">Preview</div>
			<div class="preview-content">
				{#if validation.preview.type === 'image'}
					<img 
						src={validation.preview.url} 
						alt="File preview" 
						class="preview-image"
						loading="lazy"
					/>
				{:else if validation.preview.type === 'text'}
					<div class="preview-text">
						{validation.preview.content}
					</div>
				{:else}
					<div class="preview-placeholder">
						Preview not available
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if progress}
		<div class="progress-section">
			<div class="progress-header">
				<span class="progress-status" style="color: {getStatusColor(progress.status)}">
					{progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
				</span>
				<span class="progress-percentage">
					{Math.round(progress.percentage)}%
				</span>
			</div>
			
			<ProgressBar 
				value={progress.percentage} 
				class="progress-bar"
				variant={progress.status === 'error' ? 'error' : 'default'}
			/>
			
			{#if progress.message}
				<div class="progress-message">
					{progress.message}
				</div>
			{/if}

			{#if progress.bytesUploaded && progress.totalBytes}
				<div class="progress-bytes">
					{formatFileSize(progress.bytesUploaded)} / {formatFileSize(progress.totalBytes)}
				</div>
			{/if}
		</div>
	{/if}
</Card>

<style>
	.file-preview-card {
		position: relative;
		transition: all 0.2s ease;
	}

	.file-preview-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.file-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.file-icon {
		font-size: 2rem;
		flex-shrink: 0;
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

	.file-meta {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.file-modified {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
	}

	.remove-button {
		flex-shrink: 0;
		color: var(--color-text-secondary);
	}

	.remove-button:hover {
		color: var(--color-error);
	}

	.validation-section {
		margin-bottom: 1rem;
	}

	.validation-errors {
		background: var(--color-error-light);
		border: 1px solid var(--color-error);
		border-radius: 4px;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.error-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: var(--color-error);
		margin-bottom: 0.5rem;
	}

	.error-list {
		margin: 0;
		padding-left: 1.5rem;
		color: var(--color-error);
	}

	.error-list li {
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.validation-warnings {
		background: var(--color-warning-light);
		border: 1px solid var(--color-warning);
		border-radius: 4px;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.warning-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 500;
		color: var(--color-warning);
		margin-bottom: 0.5rem;
	}

	.warning-list {
		margin: 0;
		padding-left: 1.5rem;
		color: var(--color-warning);
	}

	.warning-list li {
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.validation-success {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--color-success);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.preview-section {
		margin-bottom: 1rem;
	}

	.preview-header {
		font-weight: 500;
		color: var(--color-text-primary);
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.preview-content {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		overflow: hidden;
	}

	.preview-image {
		width: 100%;
		height: auto;
		max-height: 200px;
		object-fit: cover;
		display: block;
	}

	.preview-text {
		padding: 0.75rem;
		font-family: monospace;
		font-size: 0.75rem;
		line-height: 1.4;
		color: var(--color-text-secondary);
		background: var(--color-surface-secondary);
		max-height: 120px;
		overflow-y: auto;
		white-space: pre-wrap;
	}

	.preview-placeholder {
		padding: 2rem;
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: 0.875rem;
		background: var(--color-surface-secondary);
	}

	.progress-section {
		border-top: 1px solid var(--color-border);
		padding-top: 1rem;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.progress-status {
		font-size: 0.875rem;
		font-weight: 500;
		text-transform: capitalize;
	}

	.progress-percentage {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-primary);
	}

	.progress-message {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-top: 0.5rem;
	}

	.progress-bytes {
		font-size: 0.75rem;
		color: var(--color-text-tertiary);
		margin-top: 0.25rem;
		text-align: right;
	}

	@media (max-width: 768px) {
		.file-header {
			flex-direction: column;
			gap: 0.5rem;
		}

		.file-icon {
			align-self: flex-start;
		}

		.remove-button {
			position: absolute;
			top: 0.5rem;
			right: 0.5rem;
		}

		.preview-text {
			font-size: 0.7rem;
		}
	}
</style>