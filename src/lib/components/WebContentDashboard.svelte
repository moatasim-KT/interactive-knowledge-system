<script lang="ts">
	import { webContentState, webContentActions, getFilteredSources, getContentStats } from '$lib/stores/webContentState.svelte.ts';
	import { appState, actions } from '$lib/stores/appState.svelte.ts';
    import { WebContentImporter, WebContentAnalyzer, WebContentTransformer } from '$lib/components/index.ts';
    import { ErrorBoundary } from '$lib/components/index.ts';
	import { Button, Input, Card, Badge, LoadingSpinner } from '$lib/components/ui/index.ts';
	import type { KnowledgeNode } from '$lib/types/knowledge.ts';
	import type { WebContentSource } from '$lib/types/web-content.ts';

	// Component state
	let active_tab = $state<'import' | 'sources' | 'analyze' | 'transform'>('sources');
	let selected_source_id = $state<string | null>(null);
	let selected_content_id = $state<string | null>(null);

	// Computed values (use accessors directly)
	let filtered_sources = getFilteredSources;
	let content_stats = getContentStats;

	// Handle source selection
	function select_source(source_id: string): void {
		selected_source_id = source_id;
		const source = webContentState.sources.items[source_id];
		if (source) {
			webContentActions.setCurrentSource(source);
		}
	}

	// Handle content selection
	function select_content(content_id: string): void {
		selected_content_id = content_id;
		const content = webContentState.content.items[content_id];
		if (content) {
			webContentActions.setCurrentContent(content);
		}
	}

	// Format date
	function format_date(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Get status color
	function get_status_color(
		status: WebContentSource['status']
	): 'success' | 'warning' | 'error' | 'secondary' {
		switch (status) {
			case 'active': return 'success';
			case 'updated': return 'warning';
			case 'error': return 'error';
			case 'removed': return 'secondary';
			default: return 'secondary';
		}
	}

	// Get domain favicon
	function get_domain_favicon(domain: string): string {
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
	}

	// Delete source
	function delete_source(source_id: string): void {
		if (confirm('Are you sure you want to delete this source?')) {
			webContentActions.removeSource(source_id);
			if (selected_source_id === source_id) {
				selected_source_id = null;
				selected_content_id = null;
			}
		}
	}

	// Refresh source
	async function refresh_source(source_id: string): Promise<void> {
		const source = webContentState.sources.items[source_id];
		if (!source) return;

		webContentActions.setSourcesLoading(true);
		
		try {
			// This would trigger a re-fetch of the source content
			// For now, just update the last checked time
			webContentActions.updateSource(source_id, {
				lastChecked: new Date(),
				status: 'active'
			});

			webContentActions.addNotification({
				type: 'success',
				message: `Refreshed source: ${source.title}`
			});
		} catch (error) {
			webContentActions.addNotification({
				type: 'error',
				message: `Failed to refresh source: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		} finally {
			webContentActions.setSourcesLoading(false);
		}
	}

	// Integration with existing knowledge system
	function integrate_with_knowledge(content_id: string): void {
		const content = webContentState.content.items[content_id];
		if (!content) return;

		// Create a KnowledgeNode compliant with types
		const knowledge_node: KnowledgeNode = {
			id: `web-content-${content_id}`,
			title: content.title,
			type: 'module' as const,
			metadata: {
				difficulty: 3 as 1 | 2 | 3 | 4 | 5,
				estimatedTime: content.metadata.readingTime,
				prerequisites: [],
				tags: content.metadata.tags
			}
		};

		// Add to the main knowledge system
		actions.addKnowledgeNode(knowledge_node);

		webContentActions.addNotification({
			type: 'success',
			message: `Integrated "${content.title}" into knowledge system`
		});
	}
</script>

<div class="web-content-dashboard">
	<div class="dashboard-header">
		<h1>Web Content Sourcing</h1>
		<div class="stats-overview">
			<div class="stat-item">
				<span class="stat-value">{content_stats().totalSources}</span>
				<span class="stat-label">Sources</span>
			</div>
			<div class="stat-item">
				<span class="stat-value">{content_stats().totalContent}</span>
				<span class="stat-label">Content Items</span>
			</div>
			<div class="stat-item">
				<span class="stat-value">{content_stats().transformationOpportunities}</span>
				<span class="stat-label">Opportunities</span>
			</div>
			<div class="stat-item">
				<span class="stat-value">{content_stats().activeJobs}</span>
				<span class="stat-label">Active Jobs</span>
			</div>
		</div>
	</div>

	<div class="dashboard-tabs">
		<button 
			class="tab-button"
			class:active={active_tab === 'import'}
			onclick={() => active_tab = 'import'}
		>
			📥 Import
		</button>
		<button 
			class="tab-button"
			class:active={active_tab === 'sources'}
			onclick={() => active_tab = 'sources'}
		>
			📚 Sources
		</button>
		<button 
			class="tab-button"
			class:active={active_tab === 'analyze'}
			onclick={() => active_tab = 'analyze'}
		>
			🔍 Analyze
		</button>
		<button 
			class="tab-button"
			class:active={active_tab === 'transform'}
			onclick={() => active_tab = 'transform'}
		>
			✨ Transform
		</button>
	</div>

    <div class="dashboard-content">
        <ErrorBoundary context={{ component: 'WebContentDashboard', operation: 'render' }}>
        {#if active_tab === 'import'}
            <WebContentImporter />
        {:else if active_tab === 'sources'}
			<div class="sources-section">
				<div class="sources-header">
					<h2>Content Sources</h2>
					<div class="sources-controls">
						<Input
							placeholder="Search sources..."
							bind:value={webContentState.ui.searchQuery}
							onchange={() => webContentActions.setSearchQuery(webContentState.ui.searchQuery)}
						/>
						<select 
							bind:value={webContentState.ui.filters.status}
							onchange={() => webContentActions.setFilters({ status: webContentState.ui.filters.status })}
						>
							<option value="all">All Status</option>
							<option value="active">Active</option>
							<option value="updated">Updated</option>
							<option value="error">Error</option>
						</select>
					</div>
				</div>

				<div class="sources-grid">
					{#each filtered_sources() as source (source.id)}
						<Card class={`source-card ${selected_source_id === source.id ? 'selected' : ''}`}>
							<div class="source-header">
								<div class="source-info">
									<img 
										src={get_domain_favicon(source.domain)} 
										alt={source.domain}
										class="domain-favicon"
										onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
									/>
									<div>
										<h3 class="source-title">{source.title}</h3>
										<p class="source-url">{source.url}</p>
									</div>
								</div>
								<div class="source-actions">
									<Button
										onclick={() => refresh_source(source.id)}
										variant="outline"
										size="sm"
									>
										🔄
									</Button>
									<Button
										onclick={() => delete_source(source.id)}
										variant="outline"
										size="sm"
									>
										🗑️
									</Button>
								</div>
							</div>

							<div class="source-meta">
								<Badge variant={get_status_color(source.status)}>
									{source.status}
								</Badge>
								<span class="source-domain">{source.domain}</span>
								<span class="source-category">{source.metadata.category}</span>
							</div>

							<div class="source-stats">
								<div class="stat">
									<span class="stat-label">Imported:</span>
									<span class="stat-value">{format_date(source.importDate)}</span>
								</div>
								<div class="stat">
									<span class="stat-label">Last Checked:</span>
									<span class="stat-value">{format_date(source.lastChecked)}</span>
								</div>
								{#if source.usage.timesReferenced > 0}
									<div class="stat">
										<span class="stat-label">References:</span>
										<span class="stat-value">{source.usage.timesReferenced}</span>
									</div>
								{/if}
							</div>

							<div class="source-actions-bottom">
								<Button
									onclick={() => select_source(source.id)}
									variant={selected_source_id === source.id ? 'primary' : 'outline'}
									size="sm"
								>
									{selected_source_id === source.id ? 'Selected' : 'Select'}
								</Button>
							</div>
						</Card>
					{/each}
				</div>

				{#if filtered_sources().length === 0}
					<div class="empty-state">
						<span class="empty-icon">📚</span>
						<h3>No Sources Found</h3>
						<p>Import some web content to get started, or adjust your search filters.</p>
						<Button onclick={() => active_tab = 'import'} variant="primary">
							Import Content
						</Button>
					</div>
				{/if}
			</div>
        {:else if active_tab === 'analyze'}
			<WebContentAnalyzer contentId={selected_content_id} autoAnalyze={true} />
        {:else if active_tab === 'transform'}
			<div class="transform-section">
				<div class="transform-header">
					<h2>Content Transformation</h2>
					<p>Transform static content into interactive learning experiences</p>
				</div>

                <div class="transformer-panel">
                    <!-- Optional transformer UI -->
                    <WebContentTransformer contentId={selected_content_id} />
                </div>

				{#if webContentState.transformation.transformationHistory.length > 0}
					<div class="transformation-history">
						<h3>Recent Transformations</h3>
						<div class="history-list">
							{#each webContentState.transformation.transformationHistory.slice(-5) as transformation (transformation.id || transformation.timestamp)}
								<div class="history-item">
									<div class="history-info">
										<h4>{transformation.title}</h4>
										<p>Type: {transformation.type}</p>
										<span class="history-date">{format_date(transformation.timestamp)}</span>
									</div>
									<Badge variant="success">Completed</Badge>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<div class="empty-state">
						<span class="empty-icon">✨</span>
						<h3>No Transformations Yet</h3>
						<p>Analyze your content first to discover transformation opportunities.</p>
						<Button onclick={() => active_tab = 'analyze'} variant="primary">
							Analyze Content
						</Button>
                </div>
        {/if}
            </div>
        {/if}
        </ErrorBoundary>
	</div>
</div>

<style>
	.web-content-dashboard {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	.dashboard-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.dashboard-header h1 {
		margin: 0 0 1rem 0;
		color: #333;
		font-size: 2.2rem;
	}

	.stats-overview {
		display: flex;
		justify-content: center;
		gap: 2rem;
		margin-top: 1rem;
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
		min-width: 100px;
	}

	.stat-value {
		font-size: 1.8rem;
		font-weight: 700;
		color: #007bff;
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.9rem;
		color: #666;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.dashboard-tabs {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
		border-bottom: 1px solid #e0e0e0;
		padding-bottom: 1rem;
	}

	.tab-button {
		padding: 0.75rem 1.5rem;
		border: none;
		background: transparent;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		color: #666;
		transition: all 0.2s;
		border: 1px solid transparent;
	}

	.tab-button:hover {
		color: #333;
		background: #f8f9fa;
		border-color: #e0e0e0;
	}

	.tab-button.active {
		color: #007bff;
		background: #f0f8ff;
		border-color: #007bff;
		font-weight: 600;
	}

	.dashboard-content {
		min-height: 600px;
	}

	.sources-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.sources-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.sources-header h2 {
		margin: 0;
		color: #333;
		font-size: 1.6rem;
	}

	.sources-controls {
		display: flex;
		gap: 1rem;
		align-items: center;
	}

	.sources-controls select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
	}

	.sources-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 1rem;
	}

	:global(.source-card) {
		border: 2px solid transparent;
		transition: all 0.2s;
	}

	:global(.source-card:hover) {
		border-color: #007bff;
		box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
	}

	:global(.source-card.selected) {
		border-color: #007bff;
		background: #f0f8ff;
	}

	.source-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.source-info {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		flex: 1;
	}

	.domain-favicon {
		width: 24px;
		height: 24px;
		flex-shrink: 0;
		border-radius: 4px;
	}

	.source-title {
		margin: 0 0 0.25rem 0;
		color: #333;
		font-size: 1.1rem;
		line-height: 1.3;
	}

	.source-url {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
		word-break: break-all;
	}

	.source-actions {
		display: flex;
		gap: 0.25rem;
	}

	.source-meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.source-domain,
	.source-category {
		padding: 0.25rem 0.5rem;
		background: #e9ecef;
		border-radius: 12px;
		font-size: 0.8rem;
		color: #495057;
	}

	.source-stats {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-bottom: 1rem;
		font-size: 0.9rem;
	}

	.stat {
		display: flex;
		justify-content: space-between;
	}

	.stat-label {
		color: #666;
	}

	.stat-value {
		color: #333;
		font-weight: 500;
	}

	.source-actions-bottom {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.transform-section {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

.transformer-panel { margin-bottom: 1rem; }

	.transform-header {
		text-align: center;
	}

	.transform-header h2 {
		margin: 0 0 0.5rem 0;
		color: #333;
		font-size: 1.6rem;
	}

	.transform-header p {
		margin: 0;
		color: #666;
	}

	.transformation-history h3 {
		margin: 0 0 1rem 0;
		color: #333;
		font-size: 1.4rem;
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.history-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
	}

	.history-info h4 {
		margin: 0 0 0.25rem 0;
		color: #333;
		font-size: 1rem;
	}

	.history-info p {
		margin: 0 0 0.25rem 0;
		color: #666;
		font-size: 0.9rem;
	}

	.history-date {
		font-size: 0.8rem;
		color: #999;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
		color: #666;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		margin: 0 0 1rem 0;
		color: #333;
		font-size: 1.4rem;
	}

	.empty-state p {
		margin: 0 0 2rem 0;
		max-width: 400px;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		.web-content-dashboard {
			padding: 1rem;
		}

		.stats-overview {
			grid-template-columns: repeat(2, 1fr);
			gap: 1rem;
		}

		.dashboard-tabs {
			flex-wrap: wrap;
			justify-content: center;
		}

		.sources-header {
			flex-direction: column;
			align-items: stretch;
		}

		.sources-controls {
			flex-direction: column;
		}

		.sources-grid {
			grid-template-columns: 1fr;
		}

		.source-header {
			flex-direction: column;
			gap: 1rem;
		}

		.source-actions {
			align-self: flex-end;
		}
	}
</style>