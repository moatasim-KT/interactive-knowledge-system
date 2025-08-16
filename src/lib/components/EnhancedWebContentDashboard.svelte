<script lang="ts">
	import { webContentState, webContentActions, getFilteredSources, getContentStats } from '$lib/stores/webContentState.svelte.ts';
	import { appState, actions } from '$lib/stores/appState.svelte.ts';
	import { WebContentImporter, WebContentAnalyzer, WebContentTransformer } from '$lib/components/index.ts';
	import { ErrorBoundary } from '$lib/components/index.ts';
	import { 
		Button, 
		Input, 
		Card, 
		Badge, 
		LoadingSpinner, 
		ResponsiveContainer,
		MobileNavigation,
		ProgressBar,
		Toast,
		ToastContainer
	} from '$lib/components/ui/index.ts';
	import type { KnowledgeNode, WebContentSource } from '$lib/types/unified';

	// Component state
	let activeTab = $state('sources');
	let selectedSourceId = $state<string | null>(null);
	let selectedContentId = $state<string | null>(null);
	let viewMode = $state<'grid' | 'list'>('grid');
	let sortBy = $state<'date' | 'title' | 'status' | 'domain'>('date');
	let sortOrder = $state<'asc' | 'desc'>('desc');
	let showFilters = $state(false);
	let isMobile = $state(false);
	let processingJobs = $state<Array<{
		id: string;
		title: string;
		progress: number;
		status: 'processing' | 'completed' | 'error';
		type: 'import' | 'transform' | 'analyze';
	}>>([]);

	// Computed values
	let filteredSources = getFilteredSources;
	let contentStats = getContentStats;

	// Mobile navigation items
	const mobileNavItems = $derived(() => [
		{ id: 'import', label: 'Import', icon: '📥', active: activeTab === 'import' },
		{ id: 'sources', label: 'Sources', icon: '📚', active: activeTab === 'sources', badge: filteredSources().length },
		{ id: 'analyze', label: 'Analyze', icon: '🔍', active: activeTab === 'analyze' },
		{ id: 'transform', label: 'Transform', icon: '✨', active: activeTab === 'transform' }
	]);

	// Screen size detection
	function updateScreenSize() {
		isMobile = window.innerWidth < 768;
	}

	$effect(() => {
		updateScreenSize();
		window.addEventListener('resize', updateScreenSize);
		
		// Simulate some processing jobs for demo
		processingJobs = [
			{ id: '1', title: 'Processing ML Research Paper', progress: 75, status: 'processing', type: 'import' },
			{ id: '2', title: 'Transforming Web Article', progress: 100, status: 'completed', type: 'transform' }
		];

		return () => window.removeEventListener('resize', updateScreenSize);
	});

	// Handle source selection
	function selectSource(sourceId: string) {
		selectedSourceId = sourceId;
		const source = webContentState.sources.items[sourceId];
		if (source) {
			webContentActions.setCurrentSource(source);
		}
	}

	// Handle content selection
	function selectContent(contentId: string) {
		selectedContentId = contentId;
		const content = webContentState.content.items[contentId];
		if (content) {
			webContentActions.setCurrentContent(content);
		}
	}

	// Handle mobile navigation
	function handleMobileNavigation(event: CustomEvent<{ item: any }>) {
		activeTab = event.detail.item.id;
	}

	// Format date
	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// Get status color
	function getStatusColor(status: WebContentSource['status']): 'success' | 'warning' | 'error' | 'secondary' {
		switch (status) {
			case 'active': return 'success';
			case 'updated': return 'warning';
			case 'error': return 'error';
			case 'removed': return 'secondary';
			default: return 'secondary';
		}
	}

	// Get domain favicon
	function getDomainFavicon(domain: string): string {
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
	}

	// Delete source
	function deleteSource(sourceId: string) {
		if (confirm('Are you sure you want to delete this source?')) {
			webContentActions.removeSource(sourceId);
			if (selectedSourceId === sourceId) {
				selectedSourceId = null;
				selectedContentId = null;
			}
		}
	}

	// Refresh source
	async function refreshSource(sourceId: string) {
		const source = webContentState.sources.items[sourceId];
		if (!source) return;

		webContentActions.setSourcesLoading(true);
		
		try {
			webContentActions.updateSource(sourceId, {
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

	// Sort sources
	function sortSources(sources: WebContentSource[]) {
		return [...sources].sort((a, b) => {
			let comparison = 0;
			
			switch (sortBy) {
				case 'title':
					comparison = a.title.localeCompare(b.title);
					break;
				case 'domain':
					comparison = a.domain.localeCompare(b.domain);
					break;
				case 'status':
					comparison = a.status.localeCompare(b.status);
					break;
				case 'date':
				default:
					comparison = new Date(a.importDate).getTime() - new Date(b.importDate).getTime();
					break;
			}
			
			return sortOrder === 'asc' ? comparison : -comparison;
		});
	}

	// Integration with existing knowledge system
	function integrateWithKnowledge(contentId: string) {
		const content = webContentState.content.items[contentId];
		if (!content) return;

		const knowledgeNode: KnowledgeNode = {
			id: `web-content-${contentId}`,
			title: content.title,
			type: 'module' as const,
            content: [], // ContentBlock[] per type
			relationships: [], // Added missing required relationships property
			prerequisites: [], // Added missing required prerequisites property
			dependents: [], // Added missing required dependents property
			status: 'available', // Added missing required status property
			metadata: {
				difficulty: 'intermediate',
				estimatedTime: content.metadata.readingTime,
				prerequisites: [],
				tags: content.metadata.tags
			}
		};

		actions.addKnowledgeNode(knowledgeNode);

		webContentActions.addNotification({
			type: 'success',
			message: `Integrated "${content.title}" into knowledge system`
		});
	}

	// Get sorted and filtered sources
	const sortedSources = $derived(() => sortSources(filteredSources()));
</script>

<ResponsiveContainer maxWidth="full" padding="md">
	<div class="enhanced-dashboard" class:mobile={isMobile}>
		<!-- Header Section -->
		<header class="dashboard-header">
			<div class="header-content">
				<h1 class="dashboard-title">Interactive Content Hub</h1>
				<p class="dashboard-subtitle">Transform static content into engaging interactive experiences</p>
			</div>
			
			<!-- Stats Overview -->
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-value">{contentStats().totalSources}</div>
					<div class="stat-label">Sources</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{contentStats().totalContent}</div>
					<div class="stat-label">Content Items</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{contentStats().transformationOpportunities}</div>
					<div class="stat-label">Opportunities</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{processingJobs.filter(j => j.status === 'processing').length}</div>
					<div class="stat-label">Active Jobs</div>
				</div>
			</div>
		</header>

		<!-- Processing Jobs Status -->
		{#if processingJobs.length > 0}
			<section class="processing-status">
				<h3 class="processing-title">Processing Status</h3>
				<div class="jobs-list">
					{#each processingJobs as job (job.id)}
						<div class="job-item">
							<div class="job-info">
								<span class="job-title">{job.title}</span>
								<Badge variant={job.status === 'completed' ? 'success' : job.status === 'error' ? 'error' : 'warning'}>
									{job.status}
								</Badge>
							</div>
							{#if job.status === 'processing'}
								<ProgressBar value={job.progress} max={100} class="job-progress" />
							{/if}
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Desktop Navigation -->
		{#if !isMobile}
			<nav class="desktop-tabs">
				{#each mobileNavItems() as item (item.id)}
					<button 
						class="tab-button"
						class:active={activeTab === item.id}
						onclick={() => activeTab = item.id}
						type="button"
					>
						<span class="tab-icon">{item.icon}</span>
						<span class="tab-label">{item.label}</span>
						{#if item.badge}
							<Badge variant="primary" class="tab-badge">{item.badge}</Badge>
						{/if}
					</button>
				{/each}
			</nav>
		{/if}

		<!-- Main Content -->
		<main class="dashboard-content">
			<ErrorBoundary context={{ component: 'EnhancedWebContentDashboard', operation: 'render' }}>
				{#if activeTab === 'import'}
					<section class="content-section">
						<WebContentImporter />
					</section>
				{:else if activeTab === 'sources'}
					<section class="content-section">
						<!-- Sources Header with Controls -->
						<div class="section-header">
							<div class="section-title-group">
								<h2 class="section-title">Content Sources</h2>
								<p class="section-subtitle">Manage and organize your imported content</p>
							</div>
							
							<div class="section-controls">
								<!-- Search -->
								<div class="search-container">
									<Input
										placeholder="Search sources..."
										bind:value={webContentState.ui.searchQuery}
										onchange={() => webContentActions.setSearchQuery(webContentState.ui.searchQuery)}
										class="search-input"
									/>
								</div>

								<!-- View Mode Toggle -->
								<div class="view-toggle">
									<button
										class="view-button"
										class:active={viewMode === 'grid'}
										onclick={() => viewMode = 'grid'}
										aria-label="Grid view"
										type="button"
									>
										⊞
									</button>
									<button
										class="view-button"
										class:active={viewMode === 'list'}
										onclick={() => viewMode = 'list'}
										aria-label="List view"
										type="button"
									>
										☰
									</button>
								</div>

								<!-- Filters Toggle -->
								<Button
									onclick={() => showFilters = !showFilters}
									variant="outline"
									class="filters-toggle"
								>
									🔍 Filters
								</Button>
							</div>
						</div>

						<!-- Advanced Filters -->
						{#if showFilters}
							<div class="filters-panel">
								<div class="filter-group">
									<label for="status-filter">Status:</label>
									<select 
										id="status-filter"
										bind:value={webContentState.ui.filters.status}
										onchange={() => webContentActions.setFilters({ status: webContentState.ui.filters.status })}
									>
										<option value="all">All Status</option>
										<option value="active">Active</option>
										<option value="updated">Updated</option>
										<option value="error">Error</option>
									</select>
								</div>

								<div class="filter-group">
									<label for="sort-by">Sort by:</label>
									<select id="sort-by" bind:value={sortBy}>
										<option value="date">Date</option>
										<option value="title">Title</option>
										<option value="domain">Domain</option>
										<option value="status">Status</option>
									</select>
								</div>

								<div class="filter-group">
									<label for="sort-order">Order:</label>
									<select id="sort-order" bind:value={sortOrder}>
										<option value="desc">Descending</option>
										<option value="asc">Ascending</option>
									</select>
								</div>
							</div>
						{/if}

						<!-- Sources Grid/List -->
						<div class="sources-container" class:list-view={viewMode === 'list'}>
							{#each sortedSources() as source (source.id)}
								<Card class={`source-card ${viewMode}-view ${selectedSourceId === source.id ? 'selected' : ''}`}>
									<div class="source-header">
										<div class="source-info">
											<img 
												src={getDomainFavicon(source.domain)} 
												alt={source.domain}
												class="domain-favicon"
												onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
											/>
											<div class="source-text">
												<h3 class="source-title">{source.title}</h3>
												<p class="source-url">{source.url}</p>
											</div>
										</div>
										<div class="source-actions">
											<Button
												onclick={() => refreshSource(source.id)}
												variant="outline"
												size="sm"
												aria-label="Refresh source"
											>
												🔄
											</Button>
											<Button
												onclick={() => deleteSource(source.id)}
												variant="outline"
												size="sm"
												aria-label="Delete source"
											>
												🗑️
											</Button>
										</div>
									</div>

									<div class="source-meta">
										<Badge variant={getStatusColor(source.status)}>
											{source.status}
										</Badge>
										<span class="source-domain">{source.domain}</span>
										<span class="source-category">{source.metadata.category}</span>
									</div>

									<div class="source-stats">
										<div class="stat">
											<span class="stat-label">Imported:</span>
											<span class="stat-value">{formatDate(source.importDate)}</span>
										</div>
										<div class="stat">
											<span class="stat-label">Last Checked:</span>
											<span class="stat-value">{formatDate(source.lastChecked)}</span>
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
											onclick={() => selectSource(source.id)}
											variant={selectedSourceId === source.id ? 'primary' : 'outline'}
											size="sm"
										>
											{selectedSourceId === source.id ? 'Selected' : 'Select'}
										</Button>
									</div>
								</Card>
							{/each}
						</div>

						{#if sortedSources().length === 0}
							<div class="empty-state">
								<span class="empty-icon">📚</span>
								<h3>No Sources Found</h3>
								<p>Import some web content to get started, or adjust your search filters.</p>
								<Button onclick={() => activeTab = 'import'} variant="primary">
									Import Content
								</Button>
							</div>
						{/if}
					</section>
				{:else if activeTab === 'analyze'}
					<section class="content-section">
						<WebContentAnalyzer contentId={selectedContentId} autoAnalyze={true} />
					</section>
				{:else if activeTab === 'transform'}
					<section class="content-section">
						<div class="transform-header">
							<h2>Content Transformation</h2>
							<p>Transform static content into interactive learning experiences</p>
						</div>

						<div class="transformer-panel">
							<WebContentTransformer contentId={selectedContentId} />
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
												<span class="history-date">{formatDate(transformation.timestamp)}</span>
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
								<Button onclick={() => activeTab = 'analyze'} variant="primary">
									Analyze Content
								</Button>
							</div>
						{/if}
					</section>
				{/if}
			</ErrorBoundary>
		</main>

		<!-- Mobile Navigation -->
		{#if isMobile}
			<MobileNavigation
				items={mobileNavItems()}
				position="bottom"
				variant="tabs"
				on:navigate={handleMobileNavigation}
			/>
		{/if}
	</div>
</ResponsiveContainer>

<ToastContainer />

<style>
	.enhanced-dashboard {
		min-height: 100vh;
		background: var(--color-background, #fafafa);
		color: var(--color-text, #333);
	}

	.enhanced-dashboard.mobile {
		padding-bottom: 80px; /* Space for mobile navigation */
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

	/* Processing Status */
	.processing-status {
		background: white;
		border-radius: 1rem;
		padding: 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.processing-title {
		font-size: 1.2rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--color-text-primary, #333);
	}

	.jobs-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.job-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.job-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.job-title {
		font-weight: 500;
		color: var(--color-text-primary, #333);
	}

	:global(.job-progress) {
		height: 6px;
	}

	/* Desktop Navigation */
	.desktop-tabs {
		display: flex;
		justify-content: center;
		gap: 0.5rem;
		margin-bottom: 2rem;
		background: white;
		padding: 1rem;
		border-radius: 1rem;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
	}

	.tab-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border: none;
		background: transparent;
		border-radius: 0.75rem;
		cursor: pointer;
		font-size: 1rem;
		color: var(--color-text-secondary, #666);
		transition: all 0.2s ease;
		position: relative;
	}

	.tab-button:hover {
		color: var(--color-text-primary, #333);
		background: var(--color-surface-secondary, #f8f9fa);
	}

	.tab-button.active {
		color: var(--color-primary-600, #007bff);
		background: var(--color-primary-50, #f0f8ff);
		font-weight: 600;
	}

	.tab-icon {
		font-size: 1.2rem;
	}

	:global(.tab-badge) {
		margin-left: 0.25rem;
	}

	/* Content Sections */
	.content-section {
		background: white;
		border-radius: 1rem;
		padding: 2rem;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
		margin-bottom: 2rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
		gap: 1rem;
	}

	.section-title-group {
		flex: 1;
	}

	.section-title {
		font-size: 1.8rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
		color: var(--color-text-primary, #333);
	}

	.section-subtitle {
		font-size: 1rem;
		color: var(--color-text-secondary, #666);
		margin: 0;
	}

	.section-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.search-container {
		min-width: 250px;
	}

	:global(.search-input) {
		width: 100%;
	}

	.view-toggle {
		display: flex;
		border: 1px solid var(--color-border, #e0e0e0);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.view-button {
		padding: 0.5rem 0.75rem;
		border: none;
		background: white;
		cursor: pointer;
		font-size: 1.1rem;
		color: var(--color-text-secondary, #666);
		transition: all 0.2s ease;
	}

	.view-button:hover {
		background: var(--color-surface-secondary, #f8f9fa);
	}

	.view-button.active {
		background: var(--color-primary-600, #007bff);
		color: white;
	}

	/* Filters Panel */
	.filters-panel {
		display: flex;
		gap: 1rem;
		padding: 1rem;
		background: var(--color-surface-secondary, #f8f9fa);
		border-radius: 0.5rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 120px;
	}

	.filter-group label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-text-primary, #333);
	}

	.filter-group select {
		padding: 0.5rem;
		border: 1px solid var(--color-border, #ddd);
		border-radius: 0.25rem;
		background: white;
		font-size: 0.9rem;
	}

	/* Sources Container */
	.sources-container {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 1.5rem;
	}

	.sources-container.list-view {
		grid-template-columns: 1fr;
	}

	:global(.source-card) {
		border: 2px solid transparent;
		transition: all 0.2s ease;
		overflow: hidden;
	}

	:global(.source-card:hover) {
		border-color: var(--color-primary-300, #93c5fd);
		box-shadow: 0 8px 25px rgba(0, 123, 255, 0.15);
		transform: translateY(-2px);
	}

	:global(.source-card.selected) {
		border-color: var(--color-primary-600, #007bff);
		background: var(--color-primary-50, #f0f8ff);
	}

	:global(.source-card.list-view) {
		display: flex;
		flex-direction: row;
		align-items: center;
		padding: 1rem;
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

	.source-text {
		flex: 1;
		min-width: 0;
	}

	.source-title {
		margin: 0 0 0.25rem 0;
		color: var(--color-text-primary, #333);
		font-size: 1.1rem;
		line-height: 1.3;
		font-weight: 600;
	}

	.source-url {
		margin: 0;
		color: var(--color-text-secondary, #666);
		font-size: 0.9rem;
		word-break: break-all;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.source-actions {
		display: flex;
		gap: 0.25rem;
		flex-shrink: 0;
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
		background: var(--color-surface-tertiary, #e9ecef);
		border-radius: 12px;
		font-size: 0.8rem;
		color: var(--color-text-secondary, #495057);
		font-weight: 500;
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
		color: var(--color-text-secondary, #666);
		font-weight: 500;
	}

	.stat-value {
		color: var(--color-text-primary, #333);
		font-weight: 600;
	}

	.source-actions-bottom {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	/* Transform Section */
	.transform-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.transform-header h2 {
		margin: 0 0 0.5rem 0;
		color: var(--color-text-primary, #333);
		font-size: 1.8rem;
		font-weight: 700;
	}

	.transform-header p {
		margin: 0;
		color: var(--color-text-secondary, #666);
		font-size: 1rem;
	}

	.transformer-panel {
		margin-bottom: 2rem;
	}

	.transformation-history h3 {
		margin: 0 0 1rem 0;
		color: var(--color-text-primary, #333);
		font-size: 1.4rem;
		font-weight: 600;
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
		background: var(--color-surface-secondary, #f8f9fa);
		border-radius: 0.5rem;
		border: 1px solid var(--color-border, #e0e0e0);
	}

	.history-info h4 {
		margin: 0 0 0.25rem 0;
		color: var(--color-text-primary, #333);
		font-size: 1rem;
		font-weight: 600;
	}

	.history-info p {
		margin: 0 0 0.25rem 0;
		color: var(--color-text-secondary, #666);
		font-size: 0.9rem;
	}

	.history-date {
		font-size: 0.8rem;
		color: var(--color-text-tertiary, #999);
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
		margin: 0 0 2rem 0;
		max-width: 400px;
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

		.section-header {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.section-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.search-container {
			min-width: auto;
		}

		.filters-panel {
			flex-direction: column;
			gap: 1rem;
		}

		.filter-group {
			min-width: auto;
		}

		.sources-container {
			grid-template-columns: 1fr;
			gap: 1rem;
		}

		.source-header {
			flex-direction: column;
			gap: 1rem;
		}

		.source-actions {
			align-self: flex-end;
		}

		.content-section {
			padding: 1rem;
		}

		.processing-status {
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
			font-size: 1.5rem;
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

		:global(.source-card) {
			border-width: 2px;
		}

		.tab-button.active {
			border: 2px solid var(--color-primary-600, #007bff);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.stat-card,
		:global(.source-card),
		.tab-button {
			transition: none;
		}

		.stat-card:hover,
		:global(.source-card:hover) {
			transform: none;
		}
	}
</style>