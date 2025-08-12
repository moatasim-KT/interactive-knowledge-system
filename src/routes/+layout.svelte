<script lang="ts">
	import {
		appState,
		actions,
		getFilteredContent,
		getProgressStats
	} from '$lib/stores/appState.svelte.ts';
	import '$lib/stores/effects.svelte.ts'; // Import effects to activate them
	import type { KnowledgeNode } from '$lib/types/index';
	import { goto } from '$app/navigation';
	import { ResponsiveLayout, Grid } from '$lib/components/layout';
	import { 
		ToastContainer, 
		Button, 
		Card, 
		Input, 
		Badge, 
		ProgressBar, 
		Tooltip 
	} from '$lib/components/ui';
	import { SyncStatus, ErrorBoundary } from '$lib/components';
	import { syncService } from '$lib/services/syncService';
	import '$lib/styles/design-system.css';

	// Svelte 5 props
	interface Props {
		children?: import('svelte').Snippet;
	}
	
	let { children }: Props = $props();

	// Get derived values using $derived
	const filteredContentValue = $derived(() => getFilteredContent());
	const progressStatsValue = $derived(() => getProgressStats());

	// Initialize sync service
	syncService.initialize();

	// Initialize some sample data for demonstration
	const sample_node: KnowledgeNode = {
		id: 'sample-1',
		title: 'Introduction to TypeScript',
		type: 'module' as const,
		metadata: {
			difficulty: 2,
			estimatedTime: 30,
			prerequisites: [],
			tags: ['typescript', 'programming', 'basics']
		},
		progress: {
			completed: false,
			lastAccessed: new Date()
		}
	};

	// Add sample data to state
	actions.addKnowledgeNode(sample_node);

	let sidebarOpen = $state(true);
	let searchQuery = $state('');

	function toggleTheme() {
		const html = document.documentElement;
		const current_theme = html.getAttribute('data-theme');
		const new_theme = current_theme === 'dark' ? 'light' : 'dark';
		html.setAttribute('data-theme', new_theme);
		localStorage.setItem('theme', new_theme);
	}

	// Initialize theme from localStorage
	if (typeof window !== 'undefined') {
		const saved_theme = localStorage.getItem('theme') || 'light';
		document.documentElement.setAttribute('data-theme', saved_theme);
	}
</script>

<ErrorBoundary>
<ResponsiveLayout bind:sidebarOpen>
	{#snippet header()}
		<div class="flex items-center justify-between p-4">
			<div class="flex items-center gap-4">
				<h1 class="text-xl font-bold text-text-primary">Interactive Knowledge System</h1>
			</div>

			<div class="flex items-center gap-4">
				<!-- Search Bar -->
				<div class="hidden md:block">
					<Input
						type="search"
						placeholder="Search knowledge base..."
						bind:value={searchQuery}
						size="sm"
						class="w-64"
					/>
				</div>

				<!-- Status Indicators -->
				<div class="flex items-center gap-3">
					<Tooltip content={appState.sync.isOnline ? 'Connected to server' : 'Working offline'}>
						<Badge
							variant={appState.sync.isOnline ? 'success' : 'error'}
							size="sm"
							class="animate-fade-in"
						>
							<div
								class="w-2 h-2 rounded-full mr-1"
								class:bg-success-500={appState.sync.isOnline}
								class:bg-error-500={!appState.sync.isOnline}
							></div>
							{appState.sync.isOnline ? 'Online' : 'Offline'}
						</Badge>
					</Tooltip>

					{#if appState.sync.isSyncing}
						<Badge variant="primary" size="sm" class="animate-pulse">
							<div class="w-3 h-3 mr-1 animate-spin">
								<svg fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							Syncing
						</Badge>
					{/if}
				</div>

				<!-- Theme Toggle -->
				<Tooltip content="Toggle theme">
					<Button
						variant="ghost"
						size="sm"
						onclick={toggleTheme}
						class="hover:scale-105 transition-transform"
					>
						<svg
							class="w-4 h-4 transition-transform duration-300"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
								clip-rule="evenodd"
							/>
						</svg>
					</Button>
				</Tooltip>
			</div>
		</div>
	{/snippet}

	{#snippet sidebar()}
		<div class="flex flex-col h-full">
			<!-- Mobile Search -->
			<div class="p-4 border-b border-border md:hidden">
				<Input type="search" placeholder="Search..." bind:value={searchQuery} size="sm" />
			</div>

			<!-- Navigation -->
			<nav class="p-4 border-b border-border">
				<h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
					Navigation
				</h3>
				<div class="space-y-1">
					<Button
						variant={appState.ui.currentView === 'dashboard' ? 'primary' : 'ghost'}
						size="sm"
						fullWidth
						onclick={() => actions.setCurrentView('dashboard')}
						class="justify-start"
					>
						📊 Dashboard
					</Button>
					<Button
						variant={appState.ui.currentView === 'content' ? 'primary' : 'ghost'}
						size="sm"
						fullWidth
						onclick={() => actions.setCurrentView('content')}
						class="justify-start"
					>
						📚 Content
					</Button>
					<Button
						variant={appState.ui.currentView === 'progress' ? 'primary' : 'ghost'}
						size="sm"
						fullWidth
						onclick={() => actions.setCurrentView('progress')}
						class="justify-start"
					>
						📈 Progress
					</Button>
				</div>
			</nav>

			<!-- Sync Status -->
			<div class="p-4 border-b border-border">
				<SyncStatus />
			</div>

			<!-- Knowledge Tree -->
			<div class="flex-1 p-4 overflow-y-auto">
				<h3 class="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
					Quick Access
				</h3>

				<Button
					variant="ghost"
					size="sm"
					fullWidth
					onclick={() => goto('/knowledge')}
					class="justify-start mb-2"
				>
					🏠 Knowledge Base
				</Button>

				<div class="space-y-1">
					{#each filteredContentValue().slice(0, 8) as node (node.id)}
						<Card
							interactive
							padding="sm"
							class="text-sm animate-slide-in-left transition-all hover:scale-[1.02] hover:-translate-y-0.5 group"
							onclick={() => {
								actions.setCurrentNode(node);
								goto(`/knowledge/${node.id}`);
								if (window.innerWidth < 1024) sidebarOpen = false;
							}}
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2 min-w-0">
									<span class="text-base transition-transform group-hover:scale-110">
										{node.type === 'folder' ? '📁' : node.type === 'module' ? '📚' : '📄'}
									</span>
									<span class="truncate font-medium">{node.title}</span>
								</div>
								<div class="flex items-center gap-2">
									{#if node.progress?.completed}
										<Badge variant="success" size="sm" class="animate-scale-in">✓</Badge>
									{:else if node.progress?.score}
										<ProgressBar
											value={node.progress.score}
											size="sm"
											class="w-12"
											variant="default"
										/>
									{/if}
								</div>
							</div>
						</Card>
					{/each}
				</div>

				{#if filteredContentValue().length > 8}
					<Button
						variant="outline"
						size="sm"
						fullWidth
						onclick={() => goto('/knowledge')}
						class="mt-3"
					>
						View All ({filteredContentValue().length - 8} more)
					</Button>
				{/if}
			</div>
		</div>
	{/snippet}

	<!-- Main Content -->
	<div class="p-4 md:p-6 lg:p-8">
		<ErrorBoundary>
			{#if appState.ui.currentView === 'dashboard'}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<h2 class="text-2xl font-bold text-text-primary">Dashboard</h2>
				</div>

				<Grid cols={{ sm: 2, lg: 4 }} gap={6}>
					<Card
						variant="elevated"
						padding="lg"
						class="animate-slide-in-up hover:scale-105 transition-all duration-300 group"
					>
						<div class="text-center">
							<div class="text-3xl font-bold text-primary-600 mb-2 group-hover:animate-pulse">
								{progressStatsValue().totalModules}
							</div>
							<div class="text-sm text-text-secondary">Total Modules</div>
						</div>
					</Card>

					<Card
						variant="elevated"
						padding="lg"
						class="animate-slide-in-up hover:scale-105 transition-all duration-300 group"
					>
						<div class="text-center">
							<div class="text-3xl font-bold text-success-600 mb-2 group-hover:animate-bounce">
								{progressStatsValue().completedModules}
							</div>
							<div class="text-sm text-text-secondary">Completed</div>
						</div>
					</Card>

					<Card
						variant="elevated"
						padding="lg"
						class="animate-slide-in-up hover:scale-105 transition-all duration-300 group"
					>
						<div class="text-center">
							<div class="text-3xl font-bold text-warning-600 mb-2 group-hover:animate-wiggle">
								{progressStatsValue().completionRate.toFixed(1)}%
							</div>
							<div class="text-sm text-text-secondary">Completion Rate</div>
							<div class="mt-2">
								<ProgressBar
									value={progressStatsValue().completionRate}
									variant="warning"
									size="sm"
									animated
									striped
								/>
							</div>
						</div>
					</Card>

					<Card
						variant="elevated"
						padding="lg"
						class="animate-slide-in-up hover:scale-105 transition-all duration-300 group"
					>
						<div class="text-center">
							<div class="text-3xl font-bold text-error-600 mb-2 group-hover:animate-heartbeat">
								{progressStatsValue().currentStreak}
							</div>
							<div class="text-sm text-text-secondary">Day Streak</div>
							{#if progressStatsValue().currentStreak > 0}
								<div class="mt-2">
									<Badge variant="error" size="sm" class="animate-glow">🔥 On Fire!</Badge>
								</div>
							{/if}
						</div>
					</Card>
				</Grid>
			</div>
		{:else if appState.ui.currentView === 'content'}
			<div class="space-y-6">
				<h2 class="text-2xl font-bold text-text-primary">Content</h2>

				{#if appState.content.currentNode}
					<Card variant="elevated" padding="lg">
						<div class="space-y-4">
							<h3 class="text-xl font-semibold">{appState.content.currentNode.title}</h3>

							<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
								<div>
									<span class="text-text-secondary">Type:</span>
									<span class="ml-2 font-medium capitalize"
										>{appState.content.currentNode.type}</span
									>
								</div>
								<div>
									<span class="text-text-secondary">Difficulty:</span>
									<span class="ml-2 font-medium"
										>{appState.content.currentNode.metadata.difficulty}/5</span
									>
								</div>
								<div>
									<span class="text-text-secondary">Time:</span>
									<span class="ml-2 font-medium"
										>{appState.content.currentNode.metadata.estimatedTime}min</span
									>
								</div>
								<div>
									<span class="text-text-secondary">Tags:</span>
									<span class="ml-2 font-medium"
										>{appState.content.currentNode.metadata.tags.join(', ') || 'None'}</span
									>
								</div>
							</div>

							<Button
								variant="primary"
								onclick={() => actions.markModuleCompleted(appState.content.currentNode!.id, 85)}
							>
								Mark as Completed (85% score)
							</Button>
						</div>
					</Card>
				{:else}
					<Card padding="lg">
						<div class="text-center py-8">
							<div class="text-4xl mb-4">📚</div>
							<h3 class="text-lg font-medium mb-2">No Content Selected</h3>
							<p class="text-text-secondary mb-4">
								Select a node from the knowledge tree to view its content.
							</p>
							<Button variant="primary" onclick={() => goto('/knowledge')}>
								Browse Knowledge Base
							</Button>
						</div>
					</Card>
				{/if}
			</div>
		{:else if appState.ui.currentView === 'progress'}
			<div class="space-y-6">
				<h2 class="text-2xl font-bold text-text-primary">Progress</h2>

				<Card variant="elevated" padding="lg">
					<h3 class="text-lg font-semibold mb-4">Learning Statistics</h3>
					<div class="space-y-3">
						<div class="flex justify-between">
							<span class="text-text-secondary">Total Modules:</span>
							<span class="font-medium">{progressStatsValue().totalModules}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-text-secondary">Completed:</span>
							<span class="font-medium text-success-600">{progressStatsValue().completedModules}</span
							>
						</div>
						<div class="flex justify-between">
							<span class="text-text-secondary">Average Score:</span>
							<span class="font-medium">{progressStatsValue().averageScore.toFixed(1)}%</span>
						</div>
						<div class="flex justify-between">
							<span class="text-text-secondary">Current Streak:</span>
							<span class="font-medium text-warning-600"
								>{progressStatsValue().currentStreak} days</span
							>
						</div>
					</div>
				</Card>
			</div>
		{/if}
		</ErrorBoundary>
	</div>

	<ErrorBoundary>
		{@render children?.()}
	</ErrorBoundary>
</ResponsiveLayout>
</ErrorBoundary>

<!-- Toast Notifications -->
<ToastContainer position="top-right" />

<style>
	/* Custom color utilities for dynamic classes */
	:global(.text-success-600) {
		color: var(--color-success-600);
	}
	:global(.text-error-600) {
		color: var(--color-error-600);
	}
	:global(.text-primary-600) {
		color: var(--color-primary-600);
	}
	:global(.text-warning-600) {
		color: var(--color-warning-600);
	}
	:global(.text-text-primary) {
		color: var(--color-text-primary);
	}
	:global(.text-text-secondary) {
		color: var(--color-text-secondary);
	}

	:global(.bg-success-500) {
		background-color: var(--color-success-500);
	}
	:global(.bg-error-500) {
		background-color: var(--color-error-500);
	}

	:global(.border-border) {
		border-color: var(--color-border);
	}

	/* Spacing utilities */
	:global(.space-y-1 > * + *) {
		margin-top: 0.25rem;
	}
	:global(.space-y-3 > * + *) {
		margin-top: 0.75rem;
	}
	:global(.space-y-4 > * + *) {
		margin-top: 1rem;
	}
	:global(.space-y-6 > * + *) {
		margin-top: 1.5rem;
	}

	/* Layout utilities */
	:global(.justify-start) {
		justify-content: flex-start;
	}
	:global(.justify-between) {
		justify-content: space-between;
	}
	:global(.items-center) {
		align-items: center;
	}
	:global(.flex) {
		display: flex;
	}
	:global(.grid) {
		display: grid;
	}
	:global(.hidden) {
		display: none;
	}
	:global(.truncate) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	:global(.min-w-0) {
		min-width: 0;
	}

	/* Text utilities */
	:global(.text-xs) {
		font-size: 0.75rem;
	}
	:global(.text-sm) {
		font-size: 0.875rem;
	}
	:global(.text-base) {
		font-size: 1rem;
	}
	:global(.text-lg) {
		font-size: 1.125rem;
	}
	:global(.text-xl) {
		font-size: 1.25rem;
	}
	:global(.text-2xl) {
		font-size: 1.5rem;
	}
	:global(.text-3xl) {
		font-size: 1.875rem;
	}
	:global(.text-4xl) {
		font-size: 2.25rem;
	}

	:global(.font-medium) {
		font-weight: 500;
	}
	:global(.font-semibold) {
		font-weight: 600;
	}
	:global(.font-bold) {
		font-weight: 700;
	}

	:global(.uppercase) {
		text-transform: uppercase;
	}
	:global(.capitalize) {
		text-transform: capitalize;
	}
	:global(.tracking-wide) {
		letter-spacing: 0.025em;
	}
	:global(.text-center) {
		text-align: center;
	}

	/* Sizing utilities */
	:global(.w-2) {
		width: 0.5rem;
	}
	:global(.w-4) {
		width: 1rem;
	}
	:global(.w-64) {
		width: 16rem;
	}
	:global(.h-2) {
		height: 0.5rem;
	}
	:global(.h-4) {
		height: 1rem;
	}

	/* Border utilities */
	:global(.rounded-full) {
		border-radius: 9999px;
	}

	/* Responsive utilities */
	@media (min-width: 768px) {
		:global(.md\:block) {
			display: block;
		}
		:global(.md\:hidden) {
			display: none;
		}
		:global(.md\:grid-cols-4) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		:global(.md\:p-6) {
			padding: 1.5rem;
		}
	}

	@media (min-width: 1024px) {
		:global(.lg\:p-8) {
			padding: 2rem;
		}
	}

	/* Gap utilities */
	:global(.gap-1) {
		gap: 0.25rem;
	}
	:global(.gap-2) {
		gap: 0.5rem;
	}
	:global(.gap-4) {
		gap: 1rem;
	}
	:global(.gap-6) {
		gap: 1.5rem;
	}

	/* Margin utilities */
	:global(.mb-2) {
		margin-bottom: 0.5rem;
	}
	:global(.mb-3) {
		margin-bottom: 0.75rem;
	}
	:global(.mb-4) {
		margin-bottom: 1rem;
	}
	:global(.ml-2) {
		margin-left: 0.5rem;
	}
	:global(.mt-3) {
		margin-top: 0.75rem;
	}

	/* Padding utilities */
	:global(.p-4) {
		padding: 1rem;
	}
	:global(.py-8) {
		padding-top: 2rem;
		padding-bottom: 2rem;
	}
</style>
