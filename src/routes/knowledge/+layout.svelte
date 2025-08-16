<script lang="ts">
	import { appState, actions } from '$lib/stores/appState.svelte.ts';
	import { KnowledgeTree } from '$lib/components';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { DifficultyLevel } from '$lib/types/unified';
	
	interface Props {
		children: any;
	}

	let { children }: Props = $props();

	// Initialize with some sample data if empty
	$effect(() => {
		if (appState.content.nodes.size === 0) {
			// Create sample knowledge structure
			const sample_nodes = [
				{
					id: 'programming-basics',
					title: 'Programming Basics',
					type: 'folder' as const,
                    metadata: {
                        difficulty: 'beginner' as DifficultyLevel,
						estimatedTime: 0,
						prerequisites: [],
						tags: ['programming', 'basics']
					}
				},
				{
					id: 'javascript-fundamentals',
					title: 'JavaScript Fundamentals',
					type: 'module' as const,
					parent: 'programming-basics',
                    metadata: {
                        difficulty: 'intermediate' as DifficultyLevel,
						estimatedTime: 45,
						prerequisites: [],
						tags: ['javascript', 'fundamentals']
					}
				},
				{
					id: 'variables-and-types',
					title: 'Variables and Data Types',
					type: 'lesson' as const,
					parent: 'javascript-fundamentals',
                    metadata: {
                        difficulty: 'beginner' as DifficultyLevel,
						estimatedTime: 15,
						prerequisites: [],
						tags: ['javascript', 'variables', 'types']
					}
				},
				{
					id: 'functions-basics',
					title: 'Functions Basics',
					type: 'lesson' as const,
					parent: 'javascript-fundamentals',
                    metadata: {
                        difficulty: 'intermediate' as DifficultyLevel,
						estimatedTime: 20,
						prerequisites: ['variables-and-types'],
						tags: ['javascript', 'functions']
					}
				},
				{
					id: 'web-development',
					title: 'Web Development',
					type: 'folder' as const,
                    metadata: {
                        difficulty: 'advanced' as DifficultyLevel,
						estimatedTime: 0,
						prerequisites: ['programming-basics'],
						tags: ['web', 'development']
					}
				},
				{
					id: 'html-css-basics',
					title: 'HTML & CSS Basics',
					type: 'module' as const,
					parent: 'web-development',
                    metadata: {
                        difficulty: 'intermediate' as DifficultyLevel,
						estimatedTime: 60,
						prerequisites: [],
						tags: ['html', 'css', 'web']
					}
				}
			];

			sample_nodes.forEach((node) => {
				actions.addKnowledgeNode(node);
			});
		}
	});

	// Handle node selection from URL
	$effect(() => {
		const node_id = $page.params.id;
		if (node_id && node_id !== appState.content.currentNode?.id) {
			const node = appState.content.nodes.get(node_id);
			if (node) {
				actions.setCurrentNode(node);
			}
		}
	});

	// Handle navigation when current node changes
	$effect(() => {
		const current_node = appState.content.currentNode;
		const current_path = $page.url.pathname;

		if (current_node && !current_path.includes(current_node.id)) {
			goto(`/knowledge/${current_node.id}`, { replaceState: true });
		} else if (!current_node && current_path !== '/knowledge') {
			goto('/knowledge', { replaceState: true });
		}
	});
</script>

<div class="knowledge-layout">
	<aside class="knowledge-sidebar">
		<KnowledgeTree
			showActions={true}
			onNodeSelect={(node) => {
				// Additional handling if needed
				console.log('Node selected:', node.title);
			}}
			onNodeAdd={(parent_id) => {
				console.log('Node added to parent:', parent_id);
			}}
			onNodeDelete={(node_id) => {
				console.log('Node deleted:', node_id);
			}}
			onNodeMove={(node_id, new_parent_id) => {
				console.log('Node moved:', node_id, 'to parent:', new_parent_id);
			}}
		/>
	</aside>

	<main class="knowledge-content">
		{@render children()}
	</main>
</div>

<style>
	.knowledge-layout {
		display: flex;
		height: calc(100vh - 80px);
		background: var(--bg-color, #ffffff);
	}

	.knowledge-sidebar {
		width: 350px;
		min-width: 300px;
		max-width: 500px;
		border-right: 1px solid var(--border-color, #e0e0e0);
		background: var(--sidebar-bg, #f8f9fa);
		overflow: hidden;
		resize: horizontal;
	}

	.knowledge-content {
		flex: 1;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.knowledge-layout {
			flex-direction: column;
		}

		.knowledge-sidebar {
			width: 100%;
			max-height: 40vh;
			resize: vertical;
		}

		.knowledge-content {
			flex: 1;
			min-height: 60vh;
		}
	}
</style>
