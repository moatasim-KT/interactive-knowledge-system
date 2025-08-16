<script lang="ts">
    import type { MediaFile } from '$lib/types/unified';
    import type { MediaStorageQuota } from '$lib/storage/mediaStorage';
	import { mediaStorage } from '$lib/storage/mediaStorage.js';
	import { formatFileSize } from '$lib/utils/mediaOptimization.js';
	import MediaUpload from './MediaUpload.svelte';
	import LazyMedia from './LazyMedia.svelte';

	interface Props {
		class?: string;
		allowUpload?: boolean;
		allowDelete?: boolean;
		filterType?: 'image' | 'video' | 'all';
		onupload?: (file: MediaFile) => void;
		onerror?: (message: string) => void;
		onselect?: (file: MediaFile) => void;
		ondelete?: (fileId: string) => void;
	}

	let {
		class: className = '',
		allowUpload = true,
		allowDelete = true,
		filterType = 'all',
		onupload = () => {},
		onerror = () => {},
		onselect = () => {},
		ondelete = () => {}
	}: Props = $props();

	// State
	let media_files = $state<MediaFile[]>([]);
	let filtered_files = $state<MediaFile[]>([]);
	let selected_file = $state<MediaFile | null>(null);
    let storage_quota = $state<MediaStorageQuota>({ used: 0, available: 0, total: 0, remaining: 0 } as any);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let search_query = $state('');
	let sort_by = $state<'name' | 'date' | 'size' | 'type'>('date');
	let sort_order = $state<'asc' | 'desc'>('desc');

	$effect(() => {
		load_media_files();
		load_storage_quota();
	});

	async function load_media_files() {
		try {
			isLoading = true;
			await mediaStorage.init();

			const files = await mediaStorage.listMedia(filterType === 'all' ? undefined : filterType);

			media_files = files;
			update_filtered_files();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load media files';
		} finally {
			isLoading = false;
		}
	}

	async function load_storage_quota() {
		try {
			storage_quota = await mediaStorage.getStorageQuota();
		} catch {
			// Silently handle storage quota errors
		}
	}

	function update_filtered_files() {
		let filtered = [...media_files];

		// Apply search filter
		if (search_query.trim()) {
			const query = search_query.toLowerCase();
			filtered = filtered.filter(
				(file) => file.name.toLowerCase().includes(query) || file.type.toLowerCase().includes(query)
			);
		}

		// Apply sorting
		filtered.sort((a, b) => {
			let comparison = 0;

			switch (sort_by) {
				case 'name':
					comparison = a.name.localeCompare(b.name);
					break;
				case 'date':
					comparison = a.metadata.created.getTime() - b.metadata.created.getTime();
					break;
				case 'size':
					comparison = a.size - b.size;
					break;
				case 'type':
					comparison = a.type.localeCompare(b.type);
					break;
			}

			return sort_order === 'asc' ? comparison : -comparison;
		});

		filtered_files = filtered;
	}

	// Reactive updates
	$effect(() => {
		if (search_query || sort_by || sort_order) {
			update_filtered_files();
		}
	});

	async function handle_upload(media_file: MediaFile) {
		media_files = [...media_files, media_file];
		update_filtered_files();
		await load_storage_quota();
		onupload(media_file);
	}

	function handle_upload_error(message: string) {
		error = message;
		setTimeout(() => (error = null), 5000);
		onerror(message);
	}

	async function delete_file(file: MediaFile) {
		if (!allowDelete) return;

		if (confirm(`Are you sure you want to delete "${file.name}"?`)) {
			try {
				await mediaStorage.deleteMedia(file.id);
				media_files = media_files.filter((f) => f.id !== file.id);
				update_filtered_files();
				await load_storage_quota();

				if (selected_file?.id === file.id) {
					selected_file = null;
				}

				ondelete(file.id);
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to delete file';
			}
		}
	}

	function select_file(file: MediaFile) {
		selected_file = file;
		onselect(file);
	}

	async function cleanupOldFiles() {
		if (confirm('This will delete media files older than 30 days. Continue?')) {
			try {
				const deleted_count = await mediaStorage.cleanup(30);
				await load_media_files();
				await load_storage_quota();
				alert(`Cleaned up ${deleted_count} old files`);
			} catch (err) {
				error = err instanceof Error ? err.message : 'Cleanup failed';
			}
		}
	}

	function format_date(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}

	let storagePercentage = $derived(
		storage_quota.total > 0 ? (storage_quota.used / storage_quota.total) * 100 : 0
	);
</script>

<div class="media-manager {className}">
	<!-- Header -->
	<div class="manager-header">
		<h3>Media Manager</h3>

		<div class="storage-info">
			<div class="storage-bar">
				<div
					class="storage-fill"
					style="width: {storagePercentage}%"
					class:warning={storagePercentage > 80}
					class:danger={storagePercentage > 95}
				></div>
			</div>
			<div class="storage-text">
				{formatFileSize(storage_quota.used)} / {formatFileSize(storage_quota.total)} used
			</div>
		</div>
	</div>

	<!-- Controls -->
	<div class="manager-controls">
		<div class="search-sort">
			<input
				type="text"
				placeholder="Search media files..."
				bind:value={search_query}
				class="search-input"
			/>

			<select bind:value={sort_by} class="sort-select">
				<option value="date">Sort by Date</option>
				<option value="name">Sort by Name</option>
				<option value="size">Sort by Size</option>
				<option value="type">Sort by Type</option>
			</select>

			<button
				onclick={() => (sort_order = sort_order === 'asc' ? 'desc' : 'asc')}
				class="sort-order-btn"
				title="Toggle sort order"
			>
				{sort_order === 'asc' ? '↑' : '↓'}
			</button>
		</div>

		<div class="action-buttons">
			<button onclick={cleanupOldFiles} class="cleanup-btn"> 🧹 Cleanup </button>
		</div>
	</div>

	<!-- Upload Area -->
	{#if allowUpload}
		<div class="upload-section">
			<MediaUpload
				accept={filterType === 'all' ? 'image/*,video/*' : `${filterType}/*`}
				multiple={true}
				onupload={handle_upload}
				onerror={handle_upload_error}
			/>
		</div>
	{/if}

	<!-- Error Display -->
	{#if error}
		<div class="error-message">
			⚠️ {error}
		</div>
	{/if}

	<!-- Media Grid -->
	<div class="media-grid">
		{#if isLoading}
			<div class="loading-state">
				<div class="spinner"></div>
				<p>Loading media files...</p>
			</div>
		{:else if filtered_files.length === 0}
			<div class="empty-state">
				<div class="empty-icon">📁</div>
				<p>No media files found</p>
				{#if search_query}
					<button onclick={() => (search_query = '')} class="clear-search-btn">
						Clear search
					</button>
				{/if}
			</div>
		{:else}
			{#each filtered_files as file (file.id)}
				<div
					class="media-item"
					class:selected={selected_file?.id === file.id}
					role="button"
					onclick={() => select_file(file)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							select_file(file);
						}
					}}
					aria-label={`Select ${file.name}`}
					tabindex="0"
				>
					<div class="media-preview">
						{#if file.thumbnailUrl}
							<LazyMedia src={file.thumbnailUrl} alt={file.name} type="image" class="thumbnail" />
						{:else}
							<div class="file-icon">
								{file.type === 'image' ? '🖼️' : '🎥'}
							</div>
						{/if}
					</div>

					<div class="media-info">
						<div class="file-name" title={file.name}>
							{file.name}
						</div>
						<div class="file-details">
							<span class="file-size">{formatFileSize(file.size)}</span>
							<span class="file-date">{format_date(file.metadata.created)}</span>
						</div>
						{#if file.metadata.width && file.metadata.height}
							<div class="file-dimensions">
								{file.metadata.width} × {file.metadata.height}
								{#if file.metadata.duration}
									• {Math.round(file.metadata.duration)}s
								{/if}
							</div>
						{/if}
					</div>

					{#if allowDelete}
						<button
							onclick={(e) => {
								e.stopPropagation();
								delete_file(file);
							}}
							class="delete-btn"
							title="Delete file"
						>
							🗑️
						</button>
					{/if}
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	.media-manager {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.manager-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.manager-header h3 {
		margin: 0;
		color: #333;
	}

	.storage-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-width: 200px;
	}

	.storage-bar {
		flex: 1;
		height: 8px;
		background: #e9ecef;
		border-radius: 4px;
		overflow: hidden;
	}

	.storage-fill {
		height: 100%;
		background: #28a745;
		transition: all 0.3s ease;
	}

	.storage-fill.warning {
		background: #ffc107;
	}

	.storage-fill.danger {
		background: #dc3545;
	}

	.storage-text {
		font-size: 0.8rem;
		color: #666;
		white-space: nowrap;
	}

	.manager-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.search-sort {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 300px;
	}

	.search-input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.sort-select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		font-size: 0.9rem;
	}

	.sort-order-btn {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		font-size: 1rem;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.sort-order-btn:hover {
		background: #f8f9fa;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.cleanup-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #6c757d;
		border-radius: 4px;
		background: white;
		color: #6c757d;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.cleanup-btn:hover {
		background: #6c757d;
		color: white;
	}

	.upload-section {
		margin-bottom: 1.5rem;
	}

	.error-message {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		border: 1px solid #f5c6cb;
	}

	.media-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
		min-height: 200px;
	}

	.loading-state,
	.empty-state {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		color: #666;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.clear-search-btn {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		border: 1px solid #007bff;
		border-radius: 4px;
		background: white;
		color: #007bff;
		cursor: pointer;
	}

	.clear-search-btn:hover {
		background: #007bff;
		color: white;
	}

	.media-item {
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		background: white;
	}

	.media-item:hover {
		border-color: #007bff;
		box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
	}

	.media-item.selected {
		border-color: #007bff;
		background: #f8f9ff;
	}

	.media-preview {
		width: 100%;
		height: 120px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f8f9fa;
		border-radius: 4px;
		margin-bottom: 0.75rem;
		overflow: hidden;
	}

	.media-preview :global(.thumbnail) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.file-icon {
		font-size: 2rem;
		color: #666;
	}

	.media-info {
		text-align: center;
	}

	.file-name {
		font-weight: 500;
		color: #333;
		margin-bottom: 0.25rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.file-details {
		font-size: 0.8rem;
		color: #666;
		margin-bottom: 0.25rem;
	}

	.file-dimensions {
		font-size: 0.75rem;
		color: #999;
	}

	.delete-btn {
		position: absolute;
		top: 0.5rem;
		right: 0.5rem;
		background: rgba(220, 53, 69, 0.9);
		border: none;
		border-radius: 50%;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.2s ease;
		font-size: 0.8rem;
	}

	.media-item:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		background: #dc3545;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.media-manager {
			padding: 1rem;
		}

		.manager-header {
			flex-direction: column;
			align-items: stretch;
		}

		.manager-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.search-sort {
			min-width: auto;
		}

		.media-grid {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 0.75rem;
		}

		.media-item {
			padding: 0.75rem;
		}

		.media-preview {
			height: 100px;
		}
	}
</style>
