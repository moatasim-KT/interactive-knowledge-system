<script lang="ts">
	import { appState, actions } from '$lib/stores/appState.svelte.js';
	import type { KnowledgeNode } from '$lib/types/knowledge';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	interface Props {
		nodes?: KnowledgeNode[];
		showActions?: boolean;
		onNodeSelect?: (node: KnowledgeNode) => void;
		onNodeAdd?: (parentId: string | null) => void;
		onNodeDelete?: (nodeId: string) => void;
		onNodeMove?: (nodeId: string, newParentId: string | null) => void;
	}

	let { 
		nodes = [], 
		showActions = true, 
		onNodeSelect,
		onNodeAdd,
		onNodeDelete,
		onNodeMove
	}: Props = $props();

	// Track expanded state for each node
	let expanded_nodes = $state(new Set<string>());

	// Track drag and drop state
	let dragged_node = $state<KnowledgeNode | null>(null);
	let drop_target = $state<string | null>(null);

	// Get nodes from app state if not provided
	const tree_nodes = $derived(() => {
		if (nodes.length > 0) return nodes;
		return build_hierarchy(Array.from(appState.content.nodes.values()));
	});

	// Build hierarchical structure from flat array
	function build_hierarchy(flat_nodes: KnowledgeNode[]): KnowledgeNode[] {
		const node_map = new Map<string, KnowledgeNode>();
		const root_nodes: KnowledgeNode[] = [];

		// First pass: create map of all nodes
		flat_nodes.forEach((node: KnowledgeNode) => {
			node_map.set(node.id, { ...node, children: [] });
		});

		// Second pass: build hierarchy
		flat_nodes.forEach((node: KnowledgeNode) => {
			const node_with_children = node_map.get(node.id)!;
			if (node.parent) {
				const parent = node_map.get(node.parent);
				if (parent) {
					parent.children = parent.children || [];
					parent.children.push(node_with_children);
				} else {
					// Parent not found, treat as root
					root_nodes.push(node_with_children);
				}
			} else {
				root_nodes.push(node_with_children);
			}
		});

		return root_nodes;
	}

	// Toggle node expansion
	function toggle_expanded(node_id: string) {
		if (expanded_nodes.has(node_id)) {
			expanded_nodes.delete(node_id);
		} else {
			expanded_nodes.add(node_id);
		}
		expanded_nodes = new Set(expanded_nodes); // Trigger reactivity
	}

	// Handle node selection
	function select_node(node: KnowledgeNode) {
		actions.setCurrentNode(node);

		// Update URL to reflect current node
		const url = `/knowledge/${node.id}`;
		goto(url, { replaceState: true });

		// Call custom handler if provided
		dispatch('nodeselect', node);
		onNodeSelect?.(node);
	}

	// Handle adding new node
	function add_node(parent_id: string | null | undefined, type: KnowledgeNode['type'] = 'lesson') {
		const new_node: KnowledgeNode = { // Explicitly type new_node
			id: crypto.randomUUID(),
			title: 'New ' + type.charAt(0).toUpperCase() + type.slice(1),
			type,
			parent: parent_id || undefined,
			metadata: {
				difficulty: 1, // Changed to 1 to match the literal type '1 | 2 | 3 | 4 | 5'
				estimatedTime: 15,
				prerequisites: [],
				tags: []
			}
		};

		actions.addKnowledgeNode(new_node);

		// Expand parent if adding child
		if (parent_id) {
			expanded_nodes.add(parent_id);
			expanded_nodes = new Set(expanded_nodes);
		}

		// Call custom handler if provided
		dispatch('nodeadd', parent_id ?? null); // Ensure parent_id is string | null
	}

	// Handle node deletion
	function delete_node(node_id: string) {
		if (confirm('Are you sure you want to delete this node and all its children?')) {
			// Find and delete all children recursively
			const delete_recursively = (id: string) => {
				const node = appState.content.nodes.get(id);
				if (node?.children) {
					node.children.forEach((child) => delete_recursively(child.id));
				}
				actions.removeKnowledgeNode(id);
			};

			delete_recursively(node_id);

			// Clear current node if it was deleted
			if (appState.content.currentNode?.id === node_id) {
				actions.setCurrentNode(null);
				goto('/knowledge', { replaceState: true });
			}

			// Call custom handler if provided
			dispatch('nodedelete', node_id);
		}
	}

	// Drag and drop handlers
	function handle_drag_start(event: DragEvent, node: KnowledgeNode) {
		if (!event.dataTransfer) return;

		dragged_node = node;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', node.id);

		// Add visual feedback
		const target = event.target as HTMLElement;
		target.style.opacity = '0.5';
	}

	function handle_drag_end(event: DragEvent) {
		dragged_node = null;
		drop_target = null;

		// Reset visual feedback
		const target = event.target as HTMLElement;
		target.style.opacity = '';
	}

	function handle_drag_over(event: DragEvent, target_node_id: string) {
		event.preventDefault();
		if (!dragged_node || dragged_node.id === target_node_id) return;

		drop_target = target_node_id;
		event.dataTransfer!.dropEffect = 'move';
	}

	function handle_drag_leave() {
		drop_target = null;
	}

	function handle_drop(event: DragEvent, target_node_id: string) {
		event.preventDefault();

		if (dragged_node === null || dragged_node.id === target_node_id) {
			return;
		}

		const target_node = appState.content.nodes.get(target_node_id);
		if (!target_node) return;

		// Prevent dropping a parent onto its own child
		if (is_descendant(target_node_id, dragged_node.id)) {
			actions.addNotification({
				type: 'error',
				message: 'Cannot move a node into its own descendant'
			});
			return;
		}

		// Update the dragged node's parent
		const new_parent = target_node.type === 'folder' ? target_node_id : target_node.parent;
		actions.updateKnowledgeNode(dragged_node.id, { parent: new_parent });

		// Expand target if it's a folder
		if (target_node.type === 'folder') {
			expanded_nodes.add(target_node_id);
			expanded_nodes = new Set(expanded_nodes);
		}

		// Call custom handler if provided
		dispatch('nodemove', { nodeId: dragged_node.id, newParentId: new_parent || null });

		dragged_node = null;
		drop_target = null;
	}

	// Check if nodeId is a descendant of ancestorId
	function is_descendant(node_id: string, ancestor_id: string): boolean {
		const node = appState.content.nodes.get(node_id);
		if (!node || !node.parent) return false;
		if (node.parent === ancestor_id) return true;
		return is_descendant(node.parent, ancestor_id);
	}

	// Get node icon based on type and state
	function get_node_icon(node: KnowledgeNode): string {
		if (node.type === 'folder') {
			return expanded_nodes.has(node.id) ? '📂' : '📁';
		}
		return node.type === 'module' ? '📚' : '📄';
	}

	// Get node depth for indentation
	function get_node_depth(node: KnowledgeNode): number {
		let depth = 0;
		let current = node;
		while (current.parent) {
			depth++;
			const parent = appState.content.nodes.get(current.parent);
			if (!parent) break;
			current = parent;
		}
		return depth;
	}
</script>

<div class="knowledge-tree">
	<div class="tree-header">
		<h3>Knowledge Tree</h3>
		{#if showActions}
			<div class="tree-actions">
				<button class="add-btn" onclick={() => add_node(null, 'folder')} title="Add Root Folder">
					📁+
				</button>
				<button class="add-btn" onclick={() => add_node(null, 'module')} title="Add Root Module">
					📚+
				</button>
			</div>
		{/if}
	</div>

	<div class="tree-content">
		{#each tree_nodes() as node (node.id)} <!-- Call tree_nodes() here -->
			{@render TreeNode(node, 0)}
		{/each}

		{#if tree_nodes().length === 0} <!-- Call tree_nodes() here -->
			<div class="empty-state">
				<p>No knowledge nodes yet.</p>
				{#if showActions}
					<button onclick={() => add_node(null, 'folder')}> Create your first folder </button>
				{/if}
			</div>
		{/if}
	</div>
</div>

{#snippet TreeNode(node: KnowledgeNode, depth: number)}
	<div
		class="tree-node"
		class:current={appState.content.currentNode?.id === node.id}
		class:drop-target={drop_target === node.id}
		style="--depth: {depth}"
		draggable={showActions}
		role={showActions ? 'treeitem' : 'none'}
		aria-label={showActions ? `Draggable ${node.type}: ${node.title}` : undefined}
		ondragstart={(e) => handle_drag_start(e, node)}
		ondragend={handle_drag_end}
		ondragover={(e) => handle_drag_over(e, node.id)}
		ondragleave={handle_drag_leave}
		ondrop={(e) => handle_drop(e, node.id)}
	>
		<div class="node-content">
			<div class="node-main">
				{#if node.children && node.children.length > 0}
					<button
						class="expand-btn"
						onclick={() => toggle_expanded(node.id)}
						aria-label={expanded_nodes.has(node.id) ? 'Collapse' : 'Expand'}
					>
						{expanded_nodes.has(node.id) ? '▼' : '▶'}
					</button>
				{:else}
					<span class="expand-spacer"></span>
				{/if}

				<button
					class="node-btn"
					onclick={() => select_node(node)}
					title={`${node.type}: ${node.title}`}
				>
					<span class="node-icon">{get_node_icon(node)}</span>
					<span class="node-title">
						{node.title}
					</span>
				</button>

				{#if node.progress?.completed}
					<span class="completion-badge" title="Completed">✅</span>
				{/if}
			</div>

			{#if showActions}
				<div class="node-actions">
					{#if node.type === 'folder'}
						<button
							class="action-btn"
							onclick={() => add_node(node.id, 'folder')}
							title="Add Subfolder"
						>
							📁+
						</button>
						<button
							class="action-btn"
							onclick={() => add_node(node.id, 'module')}
							title="Add Module"
						>
							📚+
						</button>
					{/if}
					{#if node.type !== 'folder' || !node.children || node.children.length === 0}
						<button
							class="action-btn"
							onclick={() => add_node(node.parent || null, 'lesson')}
							title="Add Lesson"
						>
							📄+
						</button>
					{/if}
					<button
						class="action-btn delete-btn"
						onclick={() => delete_node(node.id)}
						title="Delete Node"
					>
						🗑️
					</button>
				</div>
			{/if}
		</div>

		<div class="node-meta">
			<span class="difficulty">Difficulty: {node.metadata.difficulty}/5</span>
			<span class="time">~{node.metadata.estimatedTime}min</span>
			{#if node.metadata.tags.length > 0}
				<span class="tags">{node.metadata.tags.slice(0, 2).join(', ')}</span>
			{/if}
		</div>
	</div>

	{#if node.children && node.children.length > 0 && expanded_nodes.has(node.id)}
		<div class="children">
			{#each node.children as child (child.id)}
				{@render TreeNode(child, depth + 1)}
			{/each}
		</div>
	{/if}
{/snippet}

<style>
	.knowledge-tree {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-surface);
	}

	.tree-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.tree-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.tree-actions {
		display: flex;
		gap: 0.25rem;
	}

	.add-btn,
	.action-btn {
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		border-radius: var(--radius-base);
		cursor: pointer;
		font-size: 0.8rem;
		transition: all var(--transition-fast);
	}

	.add-btn:hover,
	.action-btn:hover {
		background: var(--color-surface-secondary);
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.delete-btn:hover {
		background: #fee;
		border-color: #fcc;
	}

	.tree-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem 0;
	}

	.tree-node {
		margin: 0.125rem 0;
		padding-left: calc(var(--depth) * 1.5rem);
		border-radius: var(--radius-base);
		transition: all var(--transition-fast);
		animation: fadeIn var(--transition-base) ease-out;
	}

	.tree-node:hover {
		background: var(--color-surface-secondary);
		transform: translateX(2px);
	}

	.tree-node.current {
		background: var(--color-primary-50);
		border-left: 3px solid var(--color-primary-500);
		box-shadow: var(--shadow-sm);
	}

	.tree-node.drop-target {
		background: var(--color-success-50);
		border: 2px dashed var(--color-success-500);
		animation: pulse 1s infinite;
	}

	.node-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.25rem 0.5rem;
	}

	.node-main {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
		min-width: 0;
	}

	.expand-btn {
		width: 1.5rem;
		height: 1.5rem;
		border: none;
		background: transparent;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 2px;
		font-size: 0.8rem;
	}

	.expand-btn:hover {
		background: var(--hover-color, #f0f0f0);
	}

	.expand-spacer {
		width: 1.5rem;
		height: 1.5rem;
	}

	.node-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0.5rem;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: 4px;
		flex: 1;
		min-width: 0;
		text-align: left;
	}

	.node-btn:hover {
		background: var(--hover-color, #f0f0f0);
	}

	.node-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}

	.node-title {
		font-size: 0.9rem;
		/* truncate: true; */ /* Removed as it's not a standard CSS property */
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.completion-badge {
		font-size: 0.8rem;
		flex-shrink: 0;
	}

	.node-actions {
		display: flex;
		gap: 0.25rem;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.tree-node:hover .node-actions {
		opacity: 1;
	}

	.node-meta {
		display: flex;
		gap: 0.5rem;
		padding: 0 0.5rem 0.25rem 3rem;
		font-size: 0.75rem;
		color: var(--text-secondary, #666);
	}

	.difficulty {
		color: var(--warning-color, #ff9800);
	}

	.time {
		color: var(--info-color, #2196f3);
	}

	.tags {
		color: var(--success-color, #4caf50);
		font-style: italic;
	}

	.children {
		margin-left: 0;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
		color: var(--text-secondary, #666);
	}

	.empty-state button {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		background: var(--primary-color, #2196f3);
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	/* Drag and drop visual feedback */
	.tree-node[draggable='true'] {
		cursor: grab;
	}

	.tree-node[draggable='true']:active {
		cursor: grabbing;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.tree-node {
			padding-left: calc(var(--depth) * 1rem);
		}

		.node-meta {
			padding-left: 2rem;
			flex-wrap: wrap;
		}

		.node-actions {
			opacity: 1; /* Always show on mobile */
		}
	}
</style>
