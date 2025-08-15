<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import type { ContentModule } from '../types/content.js';
	import type {
		DependencyChain,
		ContentLink,
		RelationshipType
	} from '../types/relationships.js';
	import { relationshipService } from '../services/relationshipService.js';
	import { relationshipStorage } from '../storage/relationshipStorage.js';

	const dispatch = createEventDispatcher();

	interface Props {
		contentId?: string | null;
		modules: ContentModule[];
		completedContent: Set<string>;
		showPrerequisites?: boolean;
		showDependents?: boolean;
		showCircularDependencies?: boolean;
		maxDepth?: number;
		interactive?: boolean;
		expandAll?: boolean;
	}

	let {
		contentId = null,
		modules,
		completedContent,
		showPrerequisites = true,
		showDependents = true,
		showCircularDependencies = true,
		maxDepth = 5,
		interactive = true,
		expandAll = false
	}: Props = $props();

	interface ChainNode {
		id: string;
		title: string;
		level: number;
		status: 'completed' | 'current' | 'available' | 'locked';
		isExpanded: boolean;
		children: ChainNode[];
		parents: ChainNode[];
		linkType?: RelationshipType;
		linkStrength?: number;
		isCircular?: boolean;
		module?: ContentModule;
	}

	// State
	let dependencyChain = $state<DependencyChain | null>(null);
	let prerequisiteTree = $state<ChainNode | null>(null);
	let dependentTree = $state<ChainNode | null>(null);
	let circularDependencies = $state<string[][]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let selectedNodeId = $state<string | null>(null);
	let expandedNodes = $state<Set<string>>(new Set());

	// View options
	let showOnlyBlocked = $state(false);
	let showOnlyMissing = $state(false);
	let highlightCriticalPath = $state(true);

	onMount(async () => {
		if (contentId) {
			await analyzeDependencies();
		}
	});

	/**
	 * Analyze dependencies for the current content
	 */
	async function analyzeDependencies() {
		if (!contentId) return;

		loading = true;
		error = null;

		try {
			// Get dependency chain analysis
			dependencyChain = await relationshipStorage.analyzeDependencyChain(
				contentId,
				completedContent
			);

			// Build prerequisite tree
			if (showPrerequisites) {
				prerequisiteTree = await buildPrerequisiteTree(contentId);
			}

			// Build dependent tree
			if (showDependents) {
				dependentTree = await buildDependentTree(contentId);
			}

			// Check for circular dependencies
			if (showCircularDependencies) {
				circularDependencies = await relationshipStorage.findCircularDependencies();
			}

			// Auto-expand if requested
			if (expandAll) {
				expandAllNodes();
			}

		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to analyze dependencies';
			console.error('Dependency analysis error:', err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Build prerequisite tree recursively
	 */
	async function buildPrerequisiteTree(
		nodeId: string,
		level: number = 0,
		visited: Set<string> = new Set()
	): Promise<ChainNode | null> {
		if (visited.has(nodeId) || level > maxDepth) {
			return null;
		}

		visited.add(nodeId);
		const module = modules.find(m => m.id === nodeId);
		if (!module) return null;

		const node: ChainNode = {
			id: nodeId,
			title: module.title,
			level,
			status: getNodeStatus(nodeId),
			isExpanded: expandedNodes.has(nodeId),
			children: [],
			parents: [],
			module
		};

		// Get prerequisite links
		const incomingLinks = await relationshipStorage.getIncomingLinks(nodeId);
		const prerequisiteLinks = incomingLinks.filter(link =>
			link.type === 'prerequisite' || link.type === 'sequence'
		);

		// Build children (prerequisites)
		for (const link of prerequisiteLinks) {
			const childNode = await buildPrerequisiteTree(
				link.sourceId,
				level + 1,
				new Set(visited)
			);

			if (childNode) {
				childNode.linkType = link.type;
				childNode.linkStrength = link.strength;
				childNode.isCircular = isCircularDependency(link.sourceId, nodeId);
				node.children.push(childNode);
				childNode.parents.push(node);
			}
		}

		return node;
	}

	/**
	 * Build dependent tree recursively
	 */
	async function buildDependentTree(
		nodeId: string,
		level: number = 0,
		visited: Set<string> = new Set()
	): Promise<ChainNode | null> {
		if (visited.has(nodeId) || level > maxDepth) {
			return null;
		}

		visited.add(nodeId);
		const module = modules.find(m => m.id === nodeId);
		if (!module) return null;

		const node: ChainNode = {
			id: nodeId,
			title: module.title,
			level,
			status: getNodeStatus(nodeId),
			isExpanded: expandedNodes.has(nodeId),
			children: [],
			parents: [],
			module
		};

		// Get dependent links
		const outgoingLinks = await relationshipStorage.getOutgoingLinks(nodeId);
		const dependentLinks = outgoingLinks.filter(link =>
			link.type === 'prerequisite' || link.type === 'sequence'
		);

		// Build children (dependents)
		for (const link of dependentLinks) {
			const childNode = await buildDependentTree(
				link.targetId,
				level + 1,
				new Set(visited)
			);

			if (childNode) {
				childNode.linkType = link.type;
				childNode.linkStrength = link.strength;
				childNode.isCircular = isCircularDependency(nodeId, link.targetId);
				node.children.push(childNode);
				childNode.parents.push(node);
			}
		}

		return node;
	}

	/**
	 * Check if there's a circular dependency between two nodes
	 */
	function isCircularDependency(sourceId: string, targetId: string): boolean {
		return circularDependencies.some(cycle =>
			cycle.includes(sourceId) && cycle.includes(targetId)
		);
	}

	/**
	 * Get node status based on completion and prerequisites
	 */
	function getNodeStatus(nodeId: string): 'completed' | 'current' | 'available' | 'locked' {
		if (completedContent.has(nodeId)) {
			return 'completed';
		}

		if (nodeId === contentId) {
			return 'current';
		}

		// Check if prerequisites are met
		const module = modules.find(m => m.id === nodeId);
		if (!module) return 'locked';

		const allPrerequisitesMet = module.metadata.prerequisites.every(prereqId =>
			completedContent.has(prereqId)
		);

		return allPrerequisitesMet ? 'available' : 'locked';
	}

	/**
	 * Toggle node expansion
	 */
	function toggleNodeExpansion(nodeId: string) {
		if (expandedNodes.has(nodeId)) {
			expandedNodes.delete(nodeId);
		} else {
			expandedNodes.add(nodeId);
		}
		expandedNodes = new Set(expandedNodes); // Trigger reactivity
	}

	/**
	 * Expand all nodes
	 */
	function expandAllNodes() {
		const collectNodeIds = (node: ChainNode | null): string[] => {
			if (!node) return [];
			const ids = [node.id];
			node.children.forEach(child => {
				ids.push(...collectNodeIds(child));
			});
			return ids;
		};

		const allNodeIds = [
			...collectNodeIds(prerequisiteTree),
			...collectNodeIds(dependentTree)
		];

		expandedNodes = new Set(allNodeIds);
	}

	/**
	 * Collapse all nodes
	 */
	function collapseAllNodes() {
		expandedNodes = new Set();
	}

	/**
	 * Handle node selection
	 */
	function selectNode(nodeId: string) {
		selectedNodeId = nodeId;
		dispatch('nodeselect', { nodeId });

		if (interactive) {
			// Optionally navigate to analyze dependencies of selected node
			// contentId = nodeId;
			// analyzeDependencies();
		}
	}

	/**
	 * Handle node navigation
	 */
	function navigateToNode(nodeId: string) {
		dispatch('navigate', { nodeId });
	}

	/**
	 * Get missing prerequisites for current content
	 */
	function getMissingPrerequisites(): string[] {
		if (!dependencyChain) return [];
		return dependencyChain.prerequisites.filter(id => !completedContent.has(id));
	}

	/**
	 * Get blocked dependents (cannot access due to current not being completed)
	 */
	function getBlockedDependents(): string[] {
		if (!dependencyChain || !contentId || completedContent.has(contentId)) return [];
		return dependencyChain.dependents;
	}

	/**
	 * Filter nodes based on current view options
	 */
	function shouldShowNode(node: ChainNode): boolean {
		if (showOnlyBlocked && node.status !== 'locked') return false;
		if (showOnlyMissing && completedContent.has(node.id)) return false;
		return true;
	}

	/**
	 * Get appropriate icon for node status
	 */
	function getStatusIcon(status: string): string {
		switch (status) {
			case 'completed': return '✅';
			case 'current': return '📍';
			case 'available': return '🟢';
			case 'locked': return '🔒';
			default: return '⚪';
		}
	}

	/**
	 * Get color for link type
	 */
	function getLinkColor(linkType?: RelationshipType): string {
		switch (linkType) {
			case 'prerequisite': return '#ef4444';
			case 'sequence': return '#3b82f6';
			case 'dependent': return '#f97316';
			default: return '#6b7280';
		}
	}

	// Reactive updates
	$effect(() => {
		if (contentId) {
			analyzeDependencies();
		}
	});
</script>

<div class="dependency-chain-viewer">
	<!-- Header -->
	<div class="header">
		<h3>Dependency Analysis</h3>
		{#if contentId}
			{@const currentModule = modules.find(m => m.id === contentId)}
			<div class="current-content">
				<span class="content-title">{currentModule?.title || 'Unknown Content'}</span>
				{#if dependencyChain}
					<div class="chain-info">
						<span class="depth">Depth: {dependencyChain.depth}</span>
						<span class="access-status" class:can-access={dependencyChain.canAccess}>
							{dependencyChain.canAccess ? '✅ Accessible' : '🔒 Blocked'}
						</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Analyzing dependencies...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if error}
		<div class="error">
			<p>{error}</p>
			<button class="btn btn-primary" onclick={() => analyzeDependencies()}>
				Retry
			</button>
		</div>
	{/if}

	<!-- Controls -->
	{#if !loading && !error}
		<div class="controls">
			<div class="view-options">
				<label>
					<input type="checkbox" bind:checked={showOnlyBlocked} />
					Show only blocked content
				</label>
				<label>
					<input type="checkbox" bind:checked={showOnlyMissing} />
					Show only missing prerequisites
				</label>
				<label>
					<input type="checkbox" bind:checked={highlightCriticalPath} />
					Highlight critical path
				</label>
			</div>

			<div class="expansion-controls">
				<button class="btn btn-secondary" onclick={expandAllNodes}>
					Expand All
				</button>
				<button class="btn btn-secondary" onclick={collapseAllNodes}>
					Collapse All
				</button>
			</div>
		</div>
	{/if}

	<!-- Summary Information -->
	{#if dependencyChain && !loading && !error}
		<div class="summary">
			<div class="summary-item">
				<span class="label">Prerequisites:</span>
				<span class="value">{dependencyChain.prerequisites.length}</span>
				{#if getMissingPrerequisites().length > 0}
					<span class="missing">({getMissingPrerequisites().length} missing)</span>
				{/if}
			</div>

			<div class="summary-item">
				<span class="label">Dependents:</span>
				<span class="value">{dependencyChain.dependents.length}</span>
				{#if getBlockedDependents().length > 0}
					<span class="blocked">({getBlockedDependents().length} blocked)</span>
				{/if}
			</div>

			{#if circularDependencies.length > 0}
				<div class="summary-item warning">
					<span class="label">⚠️ Circular Dependencies:</span>
					<span class="value">{circularDependencies.length}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Trees Container -->
	<div class="trees-container">
		<!-- Prerequisites Tree -->
		{#if showPrerequisites && prerequisiteTree && !loading}
			<div class="tree-section">
				<h4>Prerequisites Chain</h4>
				<div class="tree-description">
					Content that must be completed before accessing the target
				</div>
				<div class="tree">
					{#snippet renderNode(node: ChainNode, isLast: boolean = false)}
						<div class="node-wrapper" class:should-show={shouldShowNode(node)}>
							<div
								class="tree-node"
								class:selected={selectedNodeId === node.id}
								class:circular={node.isCircular}
								class:critical-path={highlightCriticalPath && node.status === 'locked'}
							>
								<div class="node-content" onclick={() => selectNode(node.id)}>
									<div class="node-line" class:last={isLast}>
										{#if node.children.length > 0}
											<button
												class="expand-button"
												onclick={(e) => {
													e.stopPropagation();
													toggleNodeExpansion(node.id);
												}}
											>
												{expandedNodes.has(node.id) ? '−' : '+'}
											</button>
										{:else}
											<span class="leaf-indicator">•</span>
										{/if}

										<div class="node-info">
											<div class="node-header">
												<span class="status-icon">{getStatusIcon(node.status)}</span>
												<span class="node-title">{node.title}</span>
												{#if node.isCircular}
													<span class="circular-warning" title="Circular dependency detected">🔄</span>
												{/if}
											</div>

											<div class="node-meta">
												<span class="level">Level {node.level}</span>
												{#if node.linkType}
													<span
														class="link-type"
														style="color: {getLinkColor(node.linkType)}"
													>
														{node.linkType}
													</span>
												{/if}
												{#if node.linkStrength}
													<span class="link-strength">
														{Math.round(node.linkStrength * 100)}%
													</span>
												{/if}
											</div>

											{#if interactive}
												<div class="node-actions">
													<button
														class="action-btn"
														onclick={(e) => {
															e.stopPropagation();
															navigateToNode(node.id);
														}}
													>
														View
													</button>
												</div>
											{/if}
										</div>
									</div>
								</div>

								<!-- Children -->
								{#if node.children.length > 0 && expandedNodes.has(node.id)}
									<div class="children">
										{#each node.children as child, index (child.id)}
											{@render renderNode(child, index === node.children.length - 1)}
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/snippet}

					{@render renderNode(prerequisiteTree)}
				</div>
			</div>
		{/if}

		<!-- Dependents Tree -->
		{#if showDependents && dependentTree && !loading}
			<div class="tree-section">
				<h4>Dependents Chain</h4>
				<div class="tree-description">
					Content that depends on the target being completed
				</div>
				<div class="tree">
					{#snippet renderDependentNode(node: ChainNode, isLast: boolean = false)}
						<div class="node-wrapper" class:should-show={shouldShowNode(node)}>
							<div
								class="tree-node"
								class:selected={selectedNodeId === node.id}
								class:circular={node.isCircular}
							>
								<div class="node-content" onclick={() => selectNode(node.id)}>
									<div class="node-line" class:last={isLast}>
										{#if node.children.length > 0}
											<button
												class="expand-button"
												onclick={(e) => {
													e.stopPropagation();
													toggleNodeExpansion(node.id);
												}}
											>
												{expandedNodes.has(node.id) ? '−' : '+'}
											</button>
										{:else}
											<span class="leaf-indicator">•</span>
										{/if}

										<div class="node-info">
											<div class="node-header">
												<span class="status-icon">{getStatusIcon(node.status)}</span>
												<span class="node-title">{node.title}</span>
												{#if node.isCircular}
													<span class="circular-warning" title="Circular dependency detected">🔄</span>
												{/if}
											</div>

											<div class="node-meta">
												<span class="level">Level {node.level}</span>
												{#if node.linkType}
													<span
														class="link-type"
														style="color: {getLinkColor(node.linkType)}"
													>
														{node.linkType}
													</span>
												{/if}
											</div>

											{#if interactive}
												<div class="node-actions">
													<button
														class="action-btn"
														onclick={(e) => {
															e.stopPropagation();
															navigateToNode(node.id);
														}}
													>
														View
													</button>
												</div>
											{/if}
										</div>
									</div>
								</div>

								<!-- Children -->
								{#if node.children.length > 0 && expandedNodes.has(node.id)}
									<div class="children">
										{#each node.children as child, index (child.id)}
											{@render renderDependentNode(child, index === node.children.length - 1)}
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/snippet}

					{@render renderDependentNode(dependentTree)}
				</div>
			</div>
		{/if}
	</div>

	<!-- Circular Dependencies Section -->
	{#if showCircularDependencies && circularDependencies.length > 0 && !loading}
		<div class="circular-dependencies">
			<h4>⚠️ Circular Dependencies Detected</h4>
			<div class="warning-message">
				These circular dependencies may prevent proper prerequisite enforcement.
			</div>
			{#each circularDependencies as cycle, index}
				<div class="cycle">
					<span class="cycle-label">Cycle {index + 1}:</span>
					<div class="cycle-nodes">
						{#each cycle as nodeId, i}
							{@const module = modules.find(m => m.id === nodeId)}
							<span class="cycle-node" onclick={() => selectNode(nodeId)}>
								{module?.title || nodeId}
							</span>
							{#if i < cycle.length - 1}
								<span class="cycle-arrow">→</span>
							{/if}
						{/each}
						<span class="cycle-arrow">→</span>
						<span class="cycle-node cycle-start">{modules.find(m => m.id === cycle[0])?.title || cycle[0]}</span>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dependency-chain-viewer {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 20px;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.header {
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid #e5e7eb;
	}

	.header h3 {
		margin: 0 0 8px 0;
		color: #1f2937;
		font-size: 18px;
		font-weight: 600;
	}

	.current-content {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.content-title {
		font-weight: 500;
		color: #374151;
		font-size: 14px;
	}

	.chain-info {
		display: flex;
		gap: 16px;
		font-size: 12px;
	}

	.depth {
		color: #6b7280;
	}

	.access-status {
		font-weight: 500;
		color: #dc2626;
	}

	.access-status.can-access {
		color: #059669;
	}

	.loading, .error {
		text-align: center;
		padding: 40px;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding: 12px;
		background: #f9fafb;
		border-radius: 6px;
	}

	.view-options {
		display: flex;
		gap: 16px;
		font-size: 12px;
	}

	.view-options label {
		display: flex;
		align-items: center;
		gap: 4px;
		cursor: pointer;
	}

	.expansion-controls {
		display: flex;
		gap: 8px;
	}

	.summary {
		display: flex;
		gap: 24px;
		margin-bottom: 20px;
		padding: 12px;
		background: #f3f4f6;
		border-radius: 6px;
		font-size: 12px;
	}

	.summary-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.summary-item.warning {
		color: #dc2626;
	}

	.label {
		font-weight: 500;
		color: #374151;
	}

	.value {
		font-weight: 600;
		color: #1f2937;
	}

	.missing {
		color: #dc2626;
		font-weight: 500;
	}

	.blocked {
		color: #f59e0b;
		font-weight: 500;
	}

	.trees-container {
		display: flex;
		gap: 20px;
	}

	.tree-section {
		flex: 1;
		min-width: 0;
	}

	.tree-section h4 {
		margin: 0 0 8px 0;
		color: #1f2937;
		font-size: 16px;
		font-weight: 600;
	}

	.tree-description {
		color: #6b7280;
		font-size: 12px;
		margin-bottom: 16px;
	}

	.tree {
		border-left: 2px solid #e5e7eb;
		padding-left: 8px;
	}

	.node-wrapper {
		margin: 2px 0;
	}

	.node-wrapper:not(.should-show) {
		opacity: 0.3;
	}

	.tree-node {
		position: relative;
	}

	.tree-node.selected {
		background: #dbeafe;
		border-radius: 4px;
	}

	.tree-node.circular {
		border-left: 3px solid #dc2626;
		padding-left: 8px;
	}

	.tree-node.critical-path {
		background: #fef3c7;
		border-radius: 4px;
	}

	.node-content {
		cursor: pointer;
		padding: 8px;
		border-radius: 4px;
		transition: background-color 0.2s ease;
	}

	.node-content:hover {
		background: #f9fafb;
	}

	.node-line {
		display: flex;
		align-items: flex-start;
		gap: 8px;
		position: relative;
	}

	.node-line::before {
		content: '';
		position: absolute;
		left: -16px;
		top: 20px;
		width: 12px;
		height: 1px;
		background: #e5e7eb;
	}

	.node-line.last::after {
		content: '';
		position: absolute;
		left: -18px;
		top: 20px;
		width: 2px;
		height: 100%;
		background: white;
	}

	.expand-button {
		width: 16px;
		height: 16px;
		border: 1px solid #d1d5db;
		background: white;
		border-radius: 2px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 10px;
		cursor: pointer;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.expand-button:hover {
		background: #f3f4f6;
	}

	.leaf-indicator {
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9ca3af;
		font-size: 10px;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.node-info {
		flex: 1;
		min-width: 0;
	}

	.node-header {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 4px;
	}

	.status-icon {
		font-size: 14px;
		flex-shrink: 0;
	}

	.node-title {
		font-weight: 500;
		color: #1f2937;
		font-size: 14px;
	}

	.circular-warning {
		color: #dc2626;
		font-size: 12px;
	}

	.node-meta {
		display: flex;
		gap: 8px;
		font-size: 11px;
		color: #6b7280;
	}

	.level {
		color: #9ca3af;
	}

	.link-type {
		font-weight: 500;
	}

	.link-strength {
		color: #374151;
	}

	.node-actions {
		margin-top: 4px;
	}

	.action-btn {
		background: #3b82f6;
		color: white;
		border: none;
		border-radius: 3px;
		padding: 2px 6px;
		font-size: 10px;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.action-btn:hover {
		background: #2563eb;
	}

	.children {
		margin-left: 24px;
		border-left: 1px solid #e5e7eb;
		padding-left: 8px;
		margin-top: 4px;
	}

	.circular-dependencies {
		margin-top: 24px;
		padding: 16px;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
	}

	.circular-dependencies h4 {
		margin: 0 0 8px 0;
		color: #dc2626;
		font-size: 14px;
		font-weight: 600;
	}

	.warning-message {
		color: #991b1b;
		font-size: 12px;
		margin-bottom: 12px;
	}

	.cycle {
		margin-bottom: 8px;
		padding: 8px;
		background: white;
		border-radius: 4px;
		border: 1px solid #fecaca;
	}

	.cycle-label {
		font-weight: 600;
		color: #dc2626;
		margin-right: 8px;
		font-size: 12px;
	}

	.cycle-nodes {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 4px;
	}

	.cycle-node {
		background: #fee2e2;
		color: #dc2626;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 11px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.cycle-node:hover {
		background: #fecaca;
	}

	.cycle-node.cycle-start {
		background: #dc2626;
		color: white;
	}

	.cycle-arrow {
		color: #dc2626;
		font-weight: bold;
		font-size: 12px;
	}

	.btn {
		padding: 6px 12px;
		border: none;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover {
		background: #4b5563;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.trees-container {
			flex-direction: column;
		}

		.controls {
			flex-direction: column;
			gap: 12px;
			align-items: stretch;
		}

		.view-options {
			flex-direction: column;
			gap: 8px;
		}

		.summary {
			flex-direction: column;
			gap: 8px;
		}

		.cycle-nodes {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
