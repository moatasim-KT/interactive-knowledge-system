<script lang="ts">
	import { appState, actions, getProgressStats } from '$lib/stores/appState.svelte.ts';

	// Get derived values
	const progressStatsValue = $derived(() => getProgressStats());
	import type { KnowledgeNode } from '$lib/types/knowledge.ts';

	// Get filtered content for overview
	const allNodes = $derived(() => Array.from(appState.content.nodes.values()));
	const rootNodes = $derived(() => allNodes().filter((node: KnowledgeNode) => !node.parent));
	const recentNodes = $derived(() =>
		allNodes()
			.filter((node: KnowledgeNode) => node.progress?.lastAccessed)
			.sort(
				(a: KnowledgeNode, b: KnowledgeNode) =>
					new Date(b.progress!.lastAccessed).getTime() -
					new Date(a.progress!.lastAccessed).getTime()
			)
			.slice(0, 5)
	);

	function select_node(node: KnowledgeNode) {
		actions.setCurrentNode(node);
	}

	function get_node_type_icon(type: KnowledgeNode['type']): string {
		switch (type) {
			case 'folder':
				return '📁';
			case 'module':
				return '📚';
			case 'lesson':
				return '📄';
			default:
				return '📄';
		}
	}

	function format_date(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

<div class="knowledge-overview">
	<header class="overview-header">
		<h1>Knowledge Base</h1>
		<p>Explore and manage your learning content</p>
	</header>

	<div class="overview-stats">
		<div class="stat-card">
			<div class="stat-icon">📊</div>
			<div class="stat-content">
				<h3>Progress</h3>
				<div class="stat-value">{progressStatsValue().completionRate.toFixed(1)}%</div>
				<div class="stat-label">
					{progressStatsValue().completedModules} of {progressStatsValue().totalModules} completed
				</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">🎯</div>
			<div class="stat-content">
				<h3>Average Score</h3>
				<div class="stat-value">{progressStatsValue().averageScore.toFixed(1)}%</div>
				<div class="stat-label">Across completed modules</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">🔥</div>
			<div class="stat-content">
				<h3>Current Streak</h3>
				<div class="stat-value">{progressStatsValue().currentStreak}</div>
				<div class="stat-label">Days of continuous learning</div>
			</div>
		</div>

		<div class="stat-card">
			<div class="stat-icon">📚</div>
			<div class="stat-content">
				<h3>Total Content</h3>
				<div class="stat-value">{allNodes().length}</div>
				<div class="stat-label">Knowledge nodes</div>
			</div>
		</div>
	</div>

	<div class="overview-sections">
		<section class="overview-section">
			<h2>📁 Root Categories</h2>
			{#if rootNodes().length > 0}
				<div class="node-grid">
					{#each rootNodes() as node (node.id)}
						<button class="node-card" onclick={() => select_node(node)}>
							<div class="node-card-header">
								<span class="node-icon">{get_node_type_icon(node.type)}</span>
								<h3>{node.title}</h3>
							</div>
							<div class="node-card-meta">
								<span class="difficulty">
									{'★'.repeat(node.metadata.difficulty)}{'☆'.repeat(5 - node.metadata.difficulty)}
								</span>
								{#if node.metadata.estimatedTime > 0}
									<span class="time">~{node.metadata.estimatedTime}min</span>
								{/if}
							</div>
							{#if node.metadata.tags.length > 0}
								<div class="node-tags">
									{#each node.metadata.tags.slice(0, 3) as tag}
										<span class="tag">{tag}</span>
									{/each}
								</div>
							{/if}
							{#if node.progress?.completed}
								<div class="completion-badge">✅ Completed</div>
							{/if}
						</button>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<p>No root categories yet. Create your first folder to get started!</p>
				</div>
			{/if}
		</section>

		{#if recentNodes().length > 0}
			<section class="overview-section">
				<h2>🕒 Recently Accessed</h2>
				<div class="recent-list">
					{#each recentNodes() as node (node.id)}
						<button class="recent-item" onclick={() => select_node(node)}>
							<div class="recent-icon">{get_node_type_icon(node.type)}</div>
							<div class="recent-content">
								<h4>{node.title}</h4>
								<p class="recent-meta">
									{node.type} •
									{#if node.progress?.lastAccessed}
										{format_date(new Date(node.progress.lastAccessed))}
									{/if}
									{#if node.progress?.completed}
										• ✅ Completed
									{/if}
								</p>
							</div>
						</button>
					{/each}
				</div>
			</section>
		{/if}

		<section class="overview-section">
			<h2>🔍 Quick Actions</h2>
			<div class="action-grid">
				<button class="action-card" onclick={() => actions.setCurrentView('content')}>
					<div class="action-icon">📝</div>
					<h3>Create Content</h3>
					<p>Add new learning modules and lessons</p>
				</button>

				<button
					class="action-card"
					onclick={() => {
						appState.content.searchQuery = '';
						(document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus();
					}}
				>
					<div class="action-icon">🔍</div>
					<h3>Search Knowledge</h3>
					<p>Find specific content across your knowledge base</p>
				</button>

				<button class="action-card" onclick={() => actions.setCurrentView('progress')}>
					<div class="action-icon">📈</div>
					<h3>View Progress</h3>
					<p>Track your learning achievements and statistics</p>
				</button>

				<button
					class="action-card"
					onclick={() => {
						// Find incomplete modules
						const incomplete = allNodes().filter(
							(node: KnowledgeNode) => node.type !== 'folder' && !node.progress?.completed
						);
						if (incomplete.length > 0) {
							select_node(incomplete[0]);
						}
					}}
				>
					<div class="action-icon">🎯</div>
					<h3>Continue Learning</h3>
					<p>Resume where you left off</p>
				</button>
			</div>
		</section>
	</div>
</div>

<style>
	.knowledge-overview {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
		height: 100%;
		overflow-y: auto;
	}

	.overview-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.overview-header h1 {
		margin: 0 0 0.5rem 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary, #333);
	}

	.overview-header p {
		margin: 0;
		font-size: 1.1rem;
		color: var(--text-secondary, #666);
	}

	.overview-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 3rem;
	}

	.stat-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.stat-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.stat-icon {
		font-size: 2.5rem;
		flex-shrink: 0;
	}

	.stat-content h3 {
		margin: 0 0 0.25rem 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-secondary, #666);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: 700;
		color: var(--primary-color, #2196f3);
		margin-bottom: 0.25rem;
	}

	.stat-label {
		font-size: 0.8rem;
		color: var(--text-secondary, #666);
	}

	.overview-sections {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.overview-section h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #333);
	}

	.node-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.node-card {
		display: flex;
		flex-direction: column;
		padding: 1.5rem;
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.node-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		border-color: var(--primary-color, #2196f3);
	}

	.node-card-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.node-icon {
		font-size: 1.5rem;
	}

	.node-card h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary, #333);
	}

	.node-card-meta {
		display: flex;
		gap: 1rem;
		margin-bottom: 0.75rem;
		font-size: 0.9rem;
	}

	.difficulty {
		color: var(--warning-color, #ff9800);
	}

	.time {
		color: var(--info-color, #2196f3);
	}

	.node-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.tag {
		padding: 0.25rem 0.5rem;
		background: var(--tag-bg, #f0f0f0);
		color: var(--tag-color, #666);
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.completion-badge {
		margin-top: auto;
		padding: 0.5rem;
		background: var(--success-bg, #e8f5e8);
		color: var(--success-color, #4caf50);
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 600;
		text-align: center;
	}

	.recent-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.recent-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.recent-item:hover {
		background: var(--hover-color, #f8f9fa);
		border-color: var(--primary-color, #2196f3);
	}

	.recent-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}

	.recent-content h4 {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #333);
	}

	.recent-meta {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-secondary, #666);
	}

	.action-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.action-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2rem;
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.action-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
		border-color: var(--primary-color, #2196f3);
	}

	.action-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.action-card h3 {
		margin: 0 0 0.5rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary, #333);
	}

	.action-card p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary, #666);
		line-height: 1.4;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		color: var(--text-secondary, #666);
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 12px;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.knowledge-overview {
			padding: 1rem;
		}

		.overview-header h1 {
			font-size: 2rem;
		}

		.overview-stats {
			grid-template-columns: 1fr;
		}

		.node-grid {
			grid-template-columns: 1fr;
		}

		.action-grid {
			grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		}

		.action-card {
			padding: 1.5rem;
		}
	}
</style>
