<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { MediaFile, MediaUploadOptions } from '$lib/types/media.js';
	import {
		optimizeImage,
		optimizeVideo,
		validateMediaFile,
		formatFileSize
	} from '$lib/utils/mediaOptimization.js';
	import { mediaStorage } from '$lib/storage/mediaStorage.js';

	interface Props {
		accept?: string;
		multiple?: boolean;
		options?: MediaUploadOptions;
		class?: string;
		disabled?: boolean;
	}

	let {
		accept = 'image/*,video/*',
		multiple = false,
		options = {},
		class: className = '',
		disabled = false
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		upload: MediaFile;
		error: string;
		progress: { loaded: number; total: number };
	}>();

	// State
	let is_drag_over = $state(false);
	let is_uploading = $state(false);
	let upload_progress = $state(0);
	let file_input;

	// Default options
	const upload_options = {
		maxSize: 10 * 1024 * 1024, // 10MB
		allowedTypes: ['image/*', 'video/*'],
		quality: 0.8,
		maxWidth: 1920,
		maxHeight: 1080,
		generateThumbnail: true,
		generateWebP: true,
		...options
	};

	async function handle_files(files: FileList) {
		if (disabled || is_uploading) return;

		is_uploading = true;
		upload_progress = 0;

		try {
			const file_array = Array.from(files);
			const total_files = file_array.length;

			for (let i = 0; i < file_array.length; i++) {
				const file = file_array[i];

				// Validate file
				const validation = validateMediaFile(file, upload_options);
				if (!validation.valid) {
					dispatch('error', validation.error || 'Invalid file');
					continue;
				}

				// Process and upload file
				await process_and_upload_file(file);

				// Update progress
				upload_progress = ((i + 1) / total_files) * 100;
				dispatch('progress', { loaded: i + 1, total: total_files });
			}
		} catch (error) {
			dispatch('error', error instanceof Error ? error.message : 'Upload failed');
		} finally {
			is_uploading = false;
			upload_progress = 0;
		}
	}

	async function process_and_upload_file(file: File) {
		const media_file = {
			id: crypto.randomUUID(),
			name: file.name,
			type: file.type.startsWith('image/') ? 'image' : 'video',
			mimeType: file.type,
			size: file.size,
			url: '',
			metadata: {
				created: new Date(),
				modified: new Date()
			}
		};

		let processed_data;

		if (file.type.startsWith('image/')) {
			// Process image
			const optimized = await optimizeImage(file, upload_options);
			processed_data = optimized.original;

			// Store optimized versions
			if (optimized.webp || optimized.thumbnail) {
				media_file.optimized = {};
				if (optimized.webp) media_file.optimized.webp = optimized.webp;
				if (optimized.thumbnail) media_file.thumbnailUrl = optimized.thumbnail;
			}

			// Get image dimensions
			const img = new Image();
			img.onload = () => {
				media_file.metadata.width = img.width;
				media_file.metadata.height = img.height;
			};
			img.src = processed_data;
		} else if (file.type.startsWith('video/')) {
			// Process video
			const optimized = await optimizeVideo(file, upload_options);
			processed_data = optimized.original;

			if (optimized.thumbnail) {
				media_file.thumbnailUrl = optimized.thumbnail;
			}

			// Get video metadata
			const video = document.createElement('video');
			video.onloadedmetadata = () => {
				media_file.metadata.width = video.videoWidth;
				media_file.metadata.height = video.videoHeight;
				media_file.metadata.duration = video.duration;
			};
			video.src = URL.createObjectURL(file);
		}

		// Store in IndexedDB
		await mediaStorage.storeMedia(media_file, processed_data);

		// Set URL for retrieval
		media_file.url = `media://${media_file.id}`;

		dispatch('upload', media_file);
	}

	function handle_file_input(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			handle_files(input.files);
		}
	}

	function handle_drop(event: DragEvent) {
		event.preventDefault();
		is_drag_over = false;

		if (event.dataTransfer?.files) {
			handle_files(event.dataTransfer.files);
		}
	}

	function handle_drag_over(event: DragEvent) {
		event.preventDefault();
		is_drag_over = true;
	}

	function handle_drag_leave() {
		is_drag_over = false;
	}

	function open_file_dialog() {
		if (!disabled && !is_uploading) {
			file_input.click();
		}
	}
</script>

<div
	class="media-upload {className}"
	class:drag-over={isDragOver}
	class:uploading={isUploading}
	class:disabled
	ondrop={handleDrop}
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	onclick={openFileDialog}
	role="button"
	tabindex="0"
	onkeydown={(e) => e.key === 'Enter' && open_file_dialog()}
>
	<input
		bind:this={fileInput}
		type="file"
		{accept}
		{multiple}
		{disabled}
		onchange={handleFileInput}
		class="file-input"
	/>

	{#if isUploading}
		<div class="upload-progress">
			<div class="progress-bar">
				<div class="progress-fill" style="width: {uploadProgress}%"></div>
			</div>
			<div class="progress-text">
				Uploading... {Math.round(upload_progress)}%
			</div>
		</div>
	{:else}
		<div class="upload-content">
			<div class="upload-icon">
				{#if isDragOver}
					📁
				{:else}
					📎
				{/if}
			</div>

			<div class="upload-text">
				{#if isDragOver}
					<strong>Drop files here</strong>
				{:else}
					<strong>Click to upload</strong> or drag and drop
				{/if}
			</div>

			<div class="upload-hint">
				{accept.includes('image') && accept.includes('video')
					? 'Images and videos'
					: accept.includes('image')
						? 'Images only'
						: accept.includes('video')
							? 'Videos only'
							: 'Media files'}
				up to {formatFileSize(upload_options.maxSize || 10485760)}
			</div>
		</div>
	{/if}
</div>

<style>
	.media-upload {
		border: 2px dashed #ddd;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s ease;
		background: #fafafa;
		position: relative;
		min-height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.media-upload:hover:not(.disabled):not(.uploading) {
		border-color: #007bff;
		background: #f8f9ff;
	}

	.media-upload.drag-over {
		border-color: #007bff;
		background: #e3f2fd;
		transform: scale(1.02);
	}

	.media-upload.uploading {
		cursor: not-allowed;
		background: #f5f5f5;
	}

	.media-upload.disabled {
		cursor: not-allowed;
		opacity: 0.6;
		background: #f5f5f5;
	}

	.file-input {
		display: none;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.upload-icon {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.upload-text {
		font-size: 1rem;
		color: #333;
		margin-bottom: 0.25rem;
	}

	.upload-hint {
		font-size: 0.875rem;
		color: #666;
	}

	.upload-progress {
		width: 100%;
		max-width: 300px;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #e9ecef;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #007bff, #0056b3);
		transition: width 0.3s ease;
		border-radius: 4px;
	}

	.progress-text {
		font-size: 0.875rem;
		color: #666;
		font-weight: 500;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.media-upload {
			padding: 1.5rem 1rem;
			min-height: 100px;
		}

		.upload-icon {
			font-size: 1.5rem;
		}

		.upload-text {
			font-size: 0.9rem;
		}

		.upload-hint {
			font-size: 0.8rem;
		}
	}
</style>
