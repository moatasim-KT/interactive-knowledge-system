<script lang="ts">
	import { sourceManager } from '$lib/services/sourceManager.js';
	import { enhancedUrlFetcher } from '$lib/services/EnhancedUrlFetcher.js';
	import type { WebContentSource } from '$lib/types/unified';
	import { createLogger } from '$lib/utils/logger.js';
	import { Button, Card, LoadingSpinner, Input, Badge } from '$lib/components/ui/index.ts';

	const logger = createLogger('content-source-manager');

	let sources = $state<WebContentSource[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let newSourceUrl = $state('');
	let newSourceCategory = $state('web-content');
	let newSourceTags = $state('');
	let selectedSource = $state<WebContentSource | null>(null);
	let isDragging = $state(false);

	$effect(() => {
		loadSources();
	});

	async function loadSources() {
		isLoading = true;
		error = null;
		try {
			const result = await sourceManager.listSources();
			sources = result.sources;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load sources';
			logger.error('Failed to load sources:', e);
		} finally {
			isLoading = false;
		}
	}

	async function addSource() {
		if (!newSourceUrl) {
			alert('URL cannot be empty');
			return;
		}
		isLoading = true;
		error = null;
		try {
			const tagsArray = newSourceTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
			const result = await sourceManager.addSource({
				url: newSourceUrl,
				category: newSourceCategory,
				tags: tagsArray
			});
			if (result.isDuplicate) {
				alert(`Source already exists: ${result.source.title}`);
			} else {
				newSourceUrl = '';
				newSourceCategory = 'web-content';
				newSourceTags = '';
				await loadSources();
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add source';
			logger.error('Failed to add source:', e);
		} finally {
			isLoading = false;
		}
	}

	async function deleteSource(sourceId: string) {
		if (!confirm('Are you sure you want to delete this source?')) return;
		isLoading = true;
		error = null;
		try {
			await sourceManager.removeSource(sourceId);
			await loadSources();
			if (selectedSource?.id === sourceId) {
				selectedSource = null;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete source';
			logger.error('Failed to delete source:', e);
		} finally {
			isLoading = false;
		}
	}

	function viewSourceDetails(source: WebContentSource) {
		selectedSource = source;
	}

	function closeSourceDetails() {
		selectedSource = null;
	}

	function handleOverlayKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
			closeSourceDetails();
		}
	}

	function handleOverlayClick(event: MouseEvent) {
		// Close only when clicking the backdrop, not the dialog content
		if (event.currentTarget === event.target) {
			closeSourceDetails();
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

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
		event.dataTransfer!.dropEffect = 'copy';
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		isLoading = true;
		error = null;

		const urls: string[] = [];
		if (event.dataTransfer && event.dataTransfer.items) {
			for (let i = 0; i < event.dataTransfer.items.length; i++) {
				const item = event.dataTransfer.items[i];
				if (item.kind === 'string' && item.type === 'text/uri-list') {
					const url = await new Promise<string>(resolve => item.getAsString(resolve));
					urls.push(url);
				}
			}
		} else if (event.dataTransfer && event.dataTransfer.getData('text/uri-list')) {
			const urlList = event.dataTransfer.getData('text/uri-list');
			urls.push(...urlList.split(/\r?\n/).filter(url => url.trim() !== ''));
		}

		if (urls.length === 0) {
			alert('No valid URLs found in dropped content.');
			isLoading = false;
			return;
		}

		for (const url of urls) {
			try {
				const fetchedContent = await enhancedUrlFetcher.fetchAndProcess(url);
				const result = await sourceManager.addSource({
					url: fetchedContent.url,
					title: fetchedContent.title,
					category: fetchedContent.metadata.category,
					tags: fetchedContent.metadata.tags,
					metadata: fetchedContent.metadata
				});
			if (result.isDuplicate) {
				alert(`Source already exists: ${result.source.title}`);
			}
			} catch (e) {
				logger.error(`Failed to process dropped URL ${url}:`, e);
				alert(`Failed to add source from ${url}: ${e instanceof Error ? e.message : 'Unknown error'}`);
			}
		}
		await loadSources();
		isLoading = false;
	}

</script>

<div class="content-source-manager">
	<h2>Content Sources</h2>

	<div class="add-source-section">
		<h3>Add New Source</h3>
		<div
			class="drop-zone"
			class:dragging={isDragging}
			role="button"
			tabindex="0"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			Drag and drop URLs here to import
		</div>
		<div class="input-group">
			<Input type="url" placeholder="Enter URL" bind:value={newSourceUrl} />
			<Input type="text" placeholder="Category (e.g., 'news', 'blog')" bind:value={newSourceCategory} />
			<Input type="text" placeholder="Tags (comma-separated)" bind:value={newSourceTags} />
			<Button onclick={addSource} variant="primary" disabled={isLoading}>Add Source</Button>
		</div>
	</div>

	{#if error}
		<div class="error-message">Error: {error}</div>
	{/if}

	{#if isLoading}
		<div class="loading-state">
			<LoadingSpinner />
			<p>Loading content sources...</p>
		</div>
	{:else if sources.length === 0}
		<div class="empty-state">
			<p>No content sources added yet.</p>
		</div>
	{:else}
		<div class="sources-grid">
			{#each sources as source (source.id)}
				<div class="source-card" role="button" tabindex="0" onclick={() => viewSourceDetails(source)} onkeydown={(e) => { const k = (e as KeyboardEvent).key; if (k === 'Enter' || k === ' ') { viewSourceDetails(source); } }}>
					<Card>
						<h4>{source.title}</h4>
						<p class="source-url">{source.url}</p>
						<div class="source-meta">
							<Badge variant="secondary">{source.metadata.category}</Badge>
							<Badge variant="secondary">{source.status}</Badge>
						</div>
						<div class="source-actions">
							<Button variant="danger" size="sm" onclick={(e) => { (e as MouseEvent).stopPropagation(); deleteSource(source.id); }}>Delete</Button>
						</div>
					</Card>
				</div>
			{/each}
		</div>
	{/if}

	{#if selectedSource}
		<div class="source-details-overlay" role="dialog" tabindex="0" onclick={handleOverlayClick} onkeydown={handleOverlayKeydown}>
			<div class="source-details-modal">
				<Card>
					<h3>{selectedSource.title}</h3>
					<p><strong>URL:</strong> <a href={selectedSource.url} target="_blank" rel="noopener noreferrer">{selectedSource.url}</a></p>
					<p><strong>Domain:</strong> {selectedSource.domain}</p>
					<p><strong>Category:</strong> {selectedSource.metadata.category}</p>
					<p><strong>Status:</strong> {selectedSource.status}</p>
					<p><strong>Imported:</strong> {format_date(selectedSource.importDate)}</p>
					<p><strong>Last Checked:</strong> {format_date(selectedSource.lastChecked)}</p>
					{#if selectedSource.metadata.description}
						<p><strong>Description:</strong> {selectedSource.metadata.description}</p>
					{/if}
					{#if selectedSource.metadata.tags && selectedSource.metadata.tags.length > 0}
						<p><strong>Tags:</strong>
							{#each selectedSource.metadata.tags as tag}
								<Badge variant="secondary">{tag}</Badge>
							{/each}
						</p>
					{/if}
					<Button onclick={closeSourceDetails} variant="secondary">Close</Button>
				</Card>
			</div>
		</div>
	{/if}
</div>

<style>
	.content-source-manager {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.content-source-manager h2 {
		text-align: center;
		margin-bottom: 2rem;
		color: #333;
	}

	.add-source-section {
		background: #f8f9fa;
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.add-source-section h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #555;
	}

	.input-group {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.input-group :global(input) {
		flex: 1;
		min-width: 200px;
		padding: 0.6rem 0.8rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.input-group :global(button) {
		padding: 0.6rem 1.2rem;
		font-size: 0.9rem;
	}

	.drop-zone {
		border: 2px dashed #ccc;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		color: #888;
		margin-bottom: 1rem;
		transition: all 0.2s ease-in-out;
	}

	.drop-zone.dragging {
		background: #e6f7ff;
		border-color: #007bff;
		color: #007bff;
	}

	.error-message {
		background: #f8d7da;
		color: #721c24;
		padding: 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
		border: 1px solid #f5c6cb;
		text-align: center;
	}

	.loading-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 200px;
		color: #666;
		font-size: 1.1rem;
	}

	.sources-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.source-card {
		cursor: pointer;
		transition: all 0.2s ease-in-out;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
	}

	.source-card:hover {
		transform: translateY(-5px);
		box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
	}

	.source-card h4 {
		margin-top: 0;
		margin-bottom: 0.5rem;
		color: #007bff;
		font-size: 1.2rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.source-url {
		font-size: 0.9rem;
		color: #555;
		margin-bottom: 1rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.source-meta {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.source-actions {
		text-align: right;
	}

	.source-details-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.source-details-modal {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		max-width: 600px;
		width: 90%;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		position: relative;
	}

	.source-details-modal h3 {
		margin-top: 0;
		color: #333;
		font-size: 1.5rem;
		margin-bottom: 1rem;
	}

	.source-details-modal p {
		margin-bottom: 0.75rem;
		color: #444;
		line-height: 1.4;
	}

	.source-details-modal p strong {
		color: #222;
	}



	.source-details-modal :global(button) {
		margin-top: 1.5rem;
		width: auto;
		float: right;
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.content-source-manager {
			padding: 1rem;
		}

		.input-group {
			flex-direction: column;
			gap: 0.5rem;
		}

		.input-group :global(input),
		.input-group :global(button) {
			width: 100%;
			min-width: unset;
		}

		.sources-grid {
			grid-template-columns: 1fr;
		}

		.source-details-modal {
			padding: 1.5rem;
		}
	}
</style>
