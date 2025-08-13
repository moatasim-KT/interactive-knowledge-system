<script lang="ts">
	import { KnowledgeTree, SearchEngine, ProgressTracker } from '$lib/components';
	import { appState, actions } from '$lib/stores/appState.svelte.ts';
	import type { KnowledgeNode } from '$lib/types/knowledge.ts';

	// Initialize test data
	const testNodes: KnowledgeNode[] = [
		{
			id: 'test-folder',
			title: 'Test Folder',
			type: 'folder',
			metadata: {
				difficulty: 1 as 1 | 2 | 3 | 4 | 5,
				estimatedTime: 0,
				prerequisites: [],
				tags: ['test']
			}
		},
		{
			id: 'test-module',
			title: 'Test Module',
			type: 'module',
			parent: 'test-folder',
			metadata: {
				difficulty: 2 as 1 | 2 | 3 | 4 | 5,
				estimatedTime: 30,
				prerequisites: [],
				tags: ['test', 'module']
			}
		},
		{
			id: 'test-lesson',
			title: 'Test Lesson',
			type: 'lesson',
			parent: 'test-module',
			metadata: {
				difficulty: 1 as 1 | 2 | 3 | 4 | 5,
				estimatedTime: 15,
				prerequisites: [],
				tags: ['test', 'lesson']
			}
		}
	];

	// Add test nodes to app state
	testNodes.forEach(node => {
		actions.addKnowledgeNode(node);
	});

	let selectedNode = $state<KnowledgeNode | null>(null);

	function handleNodeSelect(node: KnowledgeNode) {
		selectedNode = node;
		console.log('Selected node:', node.title);
	}

	function handleSearch(query: string) {
		console.log('Search query:', query);
	}
</script>

<div class="knowledge-test-page">
	<h1>Knowledge Management System Test</h1>

	<div class="test-grid">
		<div class="test-section">
			<h2>Knowledge Tree</h2>
			<div class="component-container">
				<KnowledgeTree showActions={true} onNodeSelect={handleNodeSelect} />
			</div>
		</div>

		<div class="test-section">
			<h2>Search Engine</h2>
			<div class="component-container">
				<SearchEngine placeholder="Search test content..." showFilters={true} maxResults={10} />
			</div>
		</div>

		<div class="test-section">
			<h2>Progress Tracker</h2>
			<div class="component-container">
				{#if selectedNode}
					<ProgressTracker
						moduleId={selectedNode.id}
						userId="test-user"
						autoTrackTime={true}
						showControls={true}
					/>
				{:else}
					<p>Select a node to see progress tracking</p>
				{/if}
			</div>
		</div>

		<div class="test-section">
			<h2>Selected Node Info</h2>
			<div class="component-container">
				{#if selectedNode}
					<div class="node-info">
						<h3>{selectedNode.title}</h3>
						<p><strong>Type:</strong> {selectedNode.type}</p>
						<p><strong>Difficulty:</strong> {selectedNode.metadata.difficulty}/5</p>
						<p><strong>Estimated Time:</strong> {selectedNode.metadata.estimatedTime} minutes</p>
						<p><strong>Tags:</strong> {selectedNode.metadata.tags.join(', ')}</p>
						{#if selectedNode.parent}
							<p><strong>Parent:</strong> {selectedNode.parent}</p>
						{/if}
					</div>
				{:else}
					<p>No node selected</p>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.knowledge-test-page {
		padding: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.test-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-top: 2rem;
	}

	.test-section {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1rem;
		background: #f9f9f9;
	}

	.test-section h2 {
		margin-top: 0;
		color: #333;
		border-bottom: 2px solid #007bff;
		padding-bottom: 0.5rem;
	}

	.component-container {
		background: white;
		border-radius: 4px;
		padding: 1rem;
		min-height: 200px;
		border: 1px solid #ddd;
	}

	.node-info {
		background: #f0f8ff;
		padding: 1rem;
		border-radius: 4px;
		border-left: 4px solid #007bff;
	}

	.node-info h3 {
		margin-top: 0;
		color: #007bff;
	}

	.node-info p {
		margin: 0.5rem 0;
	}

	@media (max-width: 768px) {
		.test-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
