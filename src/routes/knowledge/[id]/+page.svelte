<script lang="ts">
	import { page } from '$app/stores';
	import { appState, actions } from '$lib/stores/appState.svelte.ts';
	import { goto } from '$app/navigation';
	import type { KnowledgeNode } from '$lib/types/unified';

	// Get current node from URL parameter
	const node_id = $derived(() => $page.params.id);
	const current_node = $derived(() => {
		const id = node_id();
		return id ? appState.content.nodes.get(id) : null;
	});

	// Get related nodes
	const parent_node = $derived(() => {
		const node = current_node();
		return node?.parent ? appState.content.nodes.get(node.parent) : null;
	});

	const child_nodes = $derived(() => {
		const node = current_node();
		if (!node) return [];

		return Array.from(appState.content.nodes.values())
			.filter((n) => n.parent === node.id)
			.sort((a, b) => a.title.localeCompare(b.title));
	});

	const sibling_nodes = $derived(() => {
		const node = current_node();
		if (!node) return [];

		return Array.from(appState.content.nodes.values())
			.filter((n) => n.parent === node.parent && n.id !== node.id)
			.sort((a, b) => a.title.localeCompare(b.title));
	});

	const prerequisite_nodes = $derived(() => {
		const node = current_node();
		if (!node || !node.metadata.prerequisites.length) return [];

		return node.metadata.prerequisites
			.map((id) => appState.content.nodes.get(id))
			.filter(Boolean) as KnowledgeNode[];
	});

	const dependent_nodes = $derived(() => {
		const node = current_node();
		if (!node) return [];

		return Array.from(appState.content.nodes.values()).filter((n) =>
			n.metadata.prerequisites.includes(node.id)
		);
	});

	// Handle node not found
	$effect(() => {
		const id = node_id();
		if (id && !current_node()) {
			// Node doesn't exist, redirect to knowledge overview
			goto('/knowledge');
		}
	});

	function navigate_to_node(node: KnowledgeNode) {
		actions.setCurrentNode(node);
		goto(`/knowledge/${node.id}`);
	}

	function mark_as_completed() {
		const node = current_node();
		if (!node) return;

		const score = Math.floor(Math.random() * 30) + 70; // Random score between 70-100
		actions.markModuleCompleted(node.id, score);

		actions.addNotification({
			type: 'success',
			message: `Completed "${node.title}" with ${score}% score!`
		});
	}

	function toggle_bookmark() {
		const node = current_node();
		if (!node) return;

		const current_progress = appState.progress.userProgress.get(node.id);
		const is_bookmarked = current_progress?.bookmarked || false;

		actions.updateUserProgress(node.id, {
			userId: appState.user.id,
			moduleId: node.id,
			status: current_progress?.status || 'not-started',
			timeSpent: current_progress?.timeSpent || 0,
			lastAccessed: new Date(),
			attempts: current_progress?.attempts || 0,
			bookmarked: !is_bookmarked,
			notes: current_progress?.notes || ''
		});

		actions.addNotification({
			type: 'info',
			message: `${is_bookmarked ? 'Removed from' : 'Added to'} bookmarks`
		});
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

    function get_difficulty_stars(level: 'beginner' | 'intermediate' | 'advanced'): string {
        const rank = level === 'beginner' ? 1 : level === 'intermediate' ? 2 : 3;
        return '★'.repeat(rank) + '☆'.repeat(3 - rank);
    }

	function format_date(date: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	}
</script>

{#if current_node()}
	{@const node = current_node()!}
	{@const progress = appState.progress.userProgress.get(node.id)}

	<div class="node-detail">
		<header class="node-header">
			<div class="breadcrumb">
				<button onclick={() => goto('/knowledge')}> 🏠 Knowledge Base </button>
				{#if parent_node()}
					<span class="separator">›</span>
					<button onclick={() => navigate_to_node(parent_node()!)}>
						{get_node_type_icon(parent_node()!.type)}
						{parent_node()!.title}
					</button>
				{/if}
				<span class="separator">›</span>
				<span class="current">{get_node_type_icon(node.type)} {node.title}</span>
			</div>

			<div class="node-actions">
				<button
					class="bookmark-btn"
					class:bookmarked={progress?.bookmarked}
					onclick={toggle_bookmark}
					title={progress?.bookmarked ? 'Remove bookmark' : 'Add bookmark'}
				>
					{progress?.bookmarked ? '🔖' : '📑'}
				</button>

				{#if node.type !== 'folder'}
					<button
						class="complete-btn"
						class:completed={progress?.status === 'completed'}
						onclick={mark_as_completed}
						disabled={progress?.status === 'completed'}
					>
						{progress?.status === 'completed' ? '✅ Completed' : '✓ Mark Complete'}
					</button>
				{/if}
			</div>
		</header>

		<div class="node-content">
			<div class="node-main">
				<div class="node-title-section">
					<h1>
						<span class="node-icon">{get_node_type_icon(node.type)}</span>
						{node.title}
					</h1>

					{#if progress?.status === 'completed'}
						<div class="completion-badge">
							✅ Completed
							{#if progress.score}
								<span class="score">({progress.score}%)</span>
							{/if}
						</div>
					{/if}
				</div>

				<div class="node-metadata">
					<div class="metadata-item">
						<span class="label">Type:</span>
						<span class="value">{node.type.charAt(0).toUpperCase() + node.type.slice(1)}</span>
					</div>

					<div class="metadata-item">
						<span class="label">Difficulty:</span>
						<span class="value difficulty">{get_difficulty_stars(node.metadata.difficulty)}</span>
					</div>

					{#if node.metadata.estimatedTime > 0}
						<div class="metadata-item">
							<span class="label">Estimated Time:</span>
							<span class="value">{node.metadata.estimatedTime} minutes</span>
						</div>
					{/if}

					{#if node.metadata.tags.length > 0}
						<div class="metadata-item">
							<span class="label">Tags:</span>
							<div class="tags">
								{#each node.metadata.tags as tag}
									<span class="tag">{tag}</span>
								{/each}
							</div>
						</div>
					{/if}

					{#if progress?.lastAccessed}
						<div class="metadata-item">
							<span class="label">Last Accessed:</span>
							<span class="value">{format_date(new Date(progress.lastAccessed))}</span>
						</div>
					{/if}
				</div>

				{#if node.type === 'folder'}
					<div class="folder-content">
						<h2>Contents</h2>
						{#if child_nodes().length > 0}
							<div class="child-nodes">
								{#each child_nodes() as child (child.id)}
									<button class="child-node" onclick={() => navigate_to_node(child)}>
										<div class="child-header">
											<span class="child-icon">{get_node_type_icon(child.type)}</span>
											<h3>{child.title}</h3>
											{#if appState.progress.userProgress.get(child.id)?.status === 'completed'}
												<span class="completed-indicator">✅</span>
											{/if}
										</div>
										<div class="child-meta">
											<span class="difficulty">{get_difficulty_stars(child.metadata.difficulty)}</span
											>
											{#if child.metadata.estimatedTime > 0}
												<span class="time">~{child.metadata.estimatedTime}min</span>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						{:else}
							<div class="empty-folder">
								<p>This folder is empty. Add some content to get started!</p>
							</div>
						{/if}
					</div>
				{:else}
					<div class="lesson-content">
						<h2>Content</h2>
						{#if node.id === 'ml-fundamentals'}
							<div class="interactive-article-preview">
								<div class="article-description">
									<p>
										<strong>Interactive Machine Learning Fundamentals</strong> - A comprehensive guide featuring:
									</p>
									<ul class="feature-list">
										<li>🧠 Interactive neural network visualization with adjustable parameters</li>
										<li>📊 Data exploration charts with filtering capabilities</li>
										<li>⚙️ Algorithm simulations (Gradient Descent & K-Means)</li>
										<li>🧩 Interactive quizzes with immediate feedback</li>
										<li>📱 Mobile-responsive design</li>
									</ul>
								</div>
								
								<div class="article-actions">
									<button 
										class="start-article-btn"
										onclick={() => {
											actions.startModule(node.id);
											goto('/articles/machine-learning');
										}}
									>
										🚀 Start Interactive Learning
									</button>
									
									<button 
										class="preview-btn"
										onclick={() => window.open('/articles/machine-learning', '_blank')}
									>
										👁️ Preview Article
									</button>
								</div>
								
								<div class="learning-objectives">
									<h3>Learning Objectives</h3>
									<ul>
										<li>Understand neural network architecture and activation functions</li>
										<li>Explore data patterns through interactive visualization</li>
										<li>Watch optimization algorithms converge step-by-step</li>
										<li>Experience unsupervised learning with clustering</li>
										<li>Test knowledge with interactive assessments</li>
									</ul>
								</div>
							</div>
						{:else}
							<div class="content-placeholder">
								<p>This is where the actual lesson content would be displayed.</p>
								<p>In a full implementation, this would show:</p>
								<ul>
									<li>Rich text content with formatting</li>
									<li>Interactive elements (quizzes, exercises)</li>
									<li>Media content (images, videos)</li>
									<li>Code examples with syntax highlighting</li>
									<li>Progress tracking within the lesson</li>
								</ul>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<aside class="node-sidebar">
				{#if prerequisite_nodes().length > 0}
					<div class="sidebar-section">
						<h3>📋 Prerequisites</h3>
						<div class="related-nodes">
							{#each prerequisite_nodes() as prereq (prereq.id)}
								<button class="related-node" onclick={() => navigate_to_node(prereq)}>
									<span class="related-icon">{get_node_type_icon(prereq.type)}</span>
									<span class="related-title">{prereq.title}</span>
									{#if appState.progress.userProgress.get(prereq.id)?.status === 'completed'}
										<span class="completed-indicator">✅</span>
									{:else}
										<span class="incomplete-indicator">⏳</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if dependent_nodes().length > 0}
					<div class="sidebar-section">
						<h3>🔗 What's Next</h3>
						<div class="related-nodes">
							{#each dependent_nodes() as dependent (dependent.id)}
								<button class="related-node" onclick={() => navigate_to_node(dependent)}>
									<span class="related-icon">{get_node_type_icon(dependent.type)}</span>
									<span class="related-title">{dependent.title}</span>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if sibling_nodes().length > 0}
					<div class="sidebar-section">
						<h3>📚 Related Content</h3>
						<div class="related-nodes">
							{#each sibling_nodes().slice(0, 5) as sibling (sibling.id)}
								<button class="related-node" onclick={() => navigate_to_node(sibling)}>
									<span class="related-icon">{get_node_type_icon(sibling.type)}</span>
									<span class="related-title">{sibling.title}</span>
									{#if appState.progress.userProgress.get(sibling.id)?.status === 'completed'}
										<span class="completed-indicator">✅</span>
									{/if}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if progress}
					<div class="sidebar-section">
						<h3>📊 Progress</h3>
						<div class="progress-info">
							<div class="progress-item">
								<span class="progress-label">Status:</span>
								<span class="progress-value status-{progress.status}">
									{progress.status.replace('-', ' ')}
								</span>
							</div>
							{#if progress.score}
								<div class="progress-item">
									<span class="progress-label">Score:</span>
									<span class="progress-value">{progress.score}%</span>
								</div>
							{/if}
							<div class="progress-item">
								<span class="progress-label">Time Spent:</span>
								<span class="progress-value">{progress.timeSpent}min</span>
							</div>
							<div class="progress-item">
								<span class="progress-label">Attempts:</span>
								<span class="progress-value">{progress.attempts}</span>
							</div>
						</div>
					</div>
				{/if}
			</aside>
		</div>
	</div>
{:else}
	<div class="loading">
		<p>Loading knowledge node...</p>
	</div>
{/if}

<style>
	.node-detail {
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-color, #ffffff);
	}

	.node-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		border-bottom: 1px solid var(--border-color, #e0e0e0);
		background: var(--header-bg, #f8f9fa);
	}

	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
	}

	.breadcrumb button {
		background: none;
		border: none;
		color: var(--primary-color, #2196f3);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s;
	}

	.breadcrumb button:hover {
		background: var(--hover-color, #f0f0f0);
	}

	.separator {
		color: var(--text-secondary, #666);
	}

	.current {
		font-weight: 600;
		color: var(--text-primary, #333);
	}

	.node-actions {
		display: flex;
		gap: 0.5rem;
	}

	.bookmark-btn {
		padding: 0.5rem;
		border: 1px solid var(--border-color, #e0e0e0);
		background: var(--bg-color, #ffffff);
		border-radius: 6px;
		cursor: pointer;
		font-size: 1.2rem;
		transition: all 0.2s;
	}

	.bookmark-btn:hover {
		background: var(--hover-color, #f0f0f0);
	}

	.bookmark-btn.bookmarked {
		background: var(--warning-bg, #fff3cd);
		border-color: var(--warning-color, #ff9800);
	}

	.complete-btn {
		padding: 0.5rem 1rem;
		border: 1px solid var(--success-color, #4caf50);
		background: var(--success-color, #4caf50);
		color: white;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s;
	}

	.complete-btn:hover:not(:disabled) {
		background: var(--success-dark, #45a049);
	}

	.complete-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.complete-btn.completed {
		background: var(--success-bg, #e8f5e8);
		color: var(--success-color, #4caf50);
	}

	.node-content {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.node-main {
		flex: 1;
		padding: 2rem;
		overflow-y: auto;
	}

	.node-title-section {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 2rem;
	}

	.node-title-section h1 {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0;
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary, #333);
	}

	.node-icon {
		font-size: 2rem;
	}

	.completion-badge {
		padding: 0.75rem 1rem;
		background: var(--success-bg, #e8f5e8);
		color: var(--success-color, #4caf50);
		border-radius: 8px;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.score {
		font-size: 0.9rem;
		opacity: 0.8;
	}

	.node-metadata {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: var(--card-bg, #f8f9fa);
		border-radius: 12px;
	}

	.metadata-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-secondary, #666);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.value {
		font-size: 1rem;
		color: var(--text-primary, #333);
	}

	.difficulty {
		color: var(--warning-color, #ff9800);
		font-size: 1.2rem;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		padding: 0.25rem 0.75rem;
		background: var(--primary-color, #2196f3);
		color: white;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.folder-content,
	.lesson-content {
		margin-top: 2rem;
	}

	.folder-content h2,
	.lesson-content h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #333);
	}

	.child-nodes {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.child-node {
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

	.child-node:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
		border-color: var(--primary-color, #2196f3);
	}

	.child-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.child-icon {
		font-size: 1.25rem;
	}

	.child-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary, #333);
		flex: 1;
	}

	.completed-indicator,
	.incomplete-indicator {
		font-size: 0.9rem;
	}

	.child-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.9rem;
	}

	.content-placeholder {
		padding: 2rem;
		background: var(--card-bg, #f8f9fa);
		border-radius: 12px;
		border: 2px dashed var(--border-color, #e0e0e0);
	}

	.content-placeholder ul {
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	.content-placeholder li {
		margin: 0.5rem 0;
		color: var(--text-secondary, #666);
	}

	.interactive-article-preview {
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
		border: 2px solid var(--primary-color, #2196f3);
		border-radius: 16px;
		padding: 2rem;
		margin-bottom: 2rem;
	}

	.article-description {
		margin-bottom: 2rem;
	}

	.article-description p {
		font-size: 1.1rem;
		color: var(--text-primary, #333);
		margin-bottom: 1rem;
	}

	.feature-list {
		list-style: none;
		padding: 0;
		margin: 1rem 0;
	}

	.feature-list li {
		padding: 0.5rem 0;
		font-size: 1rem;
		color: var(--text-primary, #333);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.article-actions {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
		flex-wrap: wrap;
	}

	.start-article-btn {
		background: linear-gradient(135deg, #2196f3, #1976d2);
		color: white;
		border: none;
		padding: 1rem 2rem;
		border-radius: 12px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
	}

	.start-article-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
		background: linear-gradient(135deg, #1976d2, #1565c0);
	}

	.preview-btn {
		background: var(--card-bg, #ffffff);
		color: var(--text-primary, #333);
		border: 2px solid var(--border-color, #e0e0e0);
		padding: 1rem 2rem;
		border-radius: 12px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.preview-btn:hover {
		border-color: var(--primary-color, #2196f3);
		background: var(--hover-color, #f0f8ff);
		transform: translateY(-1px);
	}

	.learning-objectives {
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 12px;
		padding: 1.5rem;
	}

	.learning-objectives h3 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #333);
		font-size: 1.2rem;
		font-weight: 600;
	}

	.learning-objectives ul {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.learning-objectives li {
		padding: 0.5rem 0;
		color: var(--text-primary, #333);
		position: relative;
		padding-left: 1.5rem;
	}

	.learning-objectives li::before {
		content: '🎯';
		position: absolute;
		left: 0;
		top: 0.5rem;
	}

	.empty-folder {
		text-align: center;
		padding: 3rem;
		color: var(--text-secondary, #666);
		background: var(--card-bg, #f8f9fa);
		border-radius: 12px;
	}

	.node-sidebar {
		width: 300px;
		padding: 2rem;
		background: var(--sidebar-bg, #f8f9fa);
		border-left: 1px solid var(--border-color, #e0e0e0);
		overflow-y: auto;
	}

	.sidebar-section {
		margin-bottom: 2rem;
	}

	.sidebar-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #333);
	}

	.related-nodes {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.related-node {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--card-bg, #ffffff);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.related-node:hover {
		background: var(--hover-color, #f0f0f0);
		border-color: var(--primary-color, #2196f3);
	}

	.related-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.related-title {
		flex: 1;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary, #333);
	}

	.progress-info {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.progress-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.progress-label {
		font-size: 0.8rem;
		color: var(--text-secondary, #666);
	}

	.progress-value {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary, #333);
	}

	.status-completed {
		color: var(--success-color, #4caf50);
	}

	.status-in-progress {
		color: var(--warning-color, #ff9800);
	}

	.status-not-started {
		color: var(--text-secondary, #666);
	}

	.loading {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
		font-size: 1.2rem;
		color: var(--text-secondary, #666);
	}

	/* Responsive design */
	@media (max-width: 1024px) {
		.node-content {
			flex-direction: column;
		}

		.node-sidebar {
			width: 100%;
			border-left: none;
			border-top: 1px solid var(--border-color, #e0e0e0);
		}
	}

	@media (max-width: 768px) {
		.node-header {
			flex-direction: column;
			gap: 1rem;
			align-items: flex-start;
		}

		.node-main {
			padding: 1rem;
		}

		.node-sidebar {
			padding: 1rem;
		}

		.node-title-section {
			flex-direction: column;
			gap: 1rem;
		}

		.node-title-section h1 {
			font-size: 2rem;
		}

		.node-metadata {
			grid-template-columns: 1fr;
		}

		.child-nodes {
			grid-template-columns: 1fr;
		}

		.article-actions {
			flex-direction: column;
		}

		.start-article-btn,
		.preview-btn {
			width: 100%;
			text-align: center;
		}

		.interactive-article-preview {
			padding: 1.5rem;
		}
	}
</style>
