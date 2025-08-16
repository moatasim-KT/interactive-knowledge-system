<script lang="ts">
    import type { ContentModule, KnowledgeMap, KnowledgeMapNode, KnowledgeMapConnection, RelationshipType, GraphLayout } from '../types/unified';
    import { difficultyToRank } from '$lib/types/unified';
	import { relationshipService } from '../services/relationshipService.js';

	type Props = {
		modules: ContentModule[];
		completedContent: Set<string>;
		currentContent?: string | null;
		width?: number;
		height?: number;
		interactive?: boolean;
		showControls?: boolean;
		showMinimap?: boolean;
		enableClustering?: boolean;
		highlightPath?: boolean;
		exportable?: boolean;
		onNodeSelect?: (nodeId: string) => void;
		onNodeOpen?: (nodeId: string) => void;
		onNodeHover?: (nodeId: string | null) => void;
		onConnectionSelect?: (connectionId: string) => void;
		onBackgroundClick?: () => void;
		onLayoutChange?: (layout: string) => void;
	};

	let {
		modules,
		completedContent,
		currentContent = null,
		width = 1200,
		height = 800,
		interactive = true,
		showControls = true,
		showMinimap = true,
		enableClustering = false,
		highlightPath = true,
		exportable = true,
		onNodeSelect,
		onNodeOpen,
		onNodeHover,
		onConnectionSelect,
		onBackgroundClick,
		onLayoutChange
	}: Props = $props();

	// State
	let knowledgeMap = $state<KnowledgeMap | null>(null);
	let selectedNode = $state<string | null>(currentContent);
	let hoveredNode = $state<string | null>(null);
	let selectedConnection = $state<string | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// View state
	let zoom = $state(1);
	let pan = $state({ x: 0, y: 0 });
	let isDragging = $state(false);
	let dragStart = $state({ x: 0, y: 0 });
	let isNodeDragging = $state(false);
	let draggedNode = $state<string | null>(null);

	// Layout and filters
	let currentLayout = $state<GraphLayout['type']>('force-directed');
	let showCompleted = $state(true);
	let showLocked = $state(true);
	let difficultyFilter = $state<[number, number]>([1, 5]);
	let tagFilter = $state<string[]>([]);
	let searchQuery = $state('');
	let showConnectionLabels = $state(false);
	let connectionTypeFilter = $state<RelationshipType[]>([]);

	// References
	let svgElement: SVGSVGElement = $state();
	let containerElement: HTMLDivElement = $state();

	// A11y: ids for form controls
	const layoutSelectId = 'layout-select';
	const searchInputId = 'search-input';
	const diffMinId = 'difficulty-min';
	const diffMaxId = 'difficulty-max';
	const showCompletedId = 'filter-completed';
	const showLockedId = 'filter-locked';
	const showConnLabelsId = 'filter-conn-labels';
	function connectionTypeId(value: string) {
		return `conn-type-${value}`;
	}

	// Available layouts
    const layouts: Array<{ value: GraphLayout['type']; label: string; description: string }> = [
		{ value: 'force-directed', label: 'Force Directed', description: 'Organic, physics-based layout' },
		{ value: 'hierarchical', label: 'Hierarchical', description: 'Level-based prerequisite structure' },
		{ value: 'circular', label: 'Circular', description: 'Nodes arranged in a circle' },
        { value: 'grid', label: 'Grid', description: 'Uniform grid arrangement' },
        { value: 'tree', label: 'Tree', description: 'Tree structure' },
	];

	// Connection types for filtering
	const connectionTypes: Array<{ value: RelationshipType; label: string; color: string }> = [
		{ value: 'prerequisite', label: 'Prerequisites', color: '#ef4444' },
		{ value: 'sequence', label: 'Sequences', color: '#3b82f6' },
		{ value: 'related', label: 'Related', color: '#6b7280' },
		{ value: 'similar', label: 'Similar', color: '#a855f7' },
		{ value: 'practice', label: 'Practice', color: '#f97316' }
	];

	$effect(() => {
		(async () => {
			await generateMap();
			setupEventListeners();
		})();
	});

	/**
	 * Generate the knowledge map
	 */
	async function generateMap() {
		loading = true;
		error = null;

		try {
			const layoutConfig: GraphLayout = {
				name: currentLayout,
				type: currentLayout,
				width,
				height,
				options: { nodeSpacing: 80, levelSpacing: 120 }
			};

			knowledgeMap = await relationshipService.generateKnowledgeMap(
				modules,
				completedContent,
				currentContent || undefined,
				{
					layout: layoutConfig,
					showClusters: enableClustering,
					showProgress: true,
					highlightPath
				}
			);

			// Apply filters
			applyFilters();

		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to generate map';
			console.error('Map generation error:', err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Apply current filters to the knowledge map
	 */
	function applyFilters() {
		if (!knowledgeMap) return;

		// Filter nodes
		knowledgeMap.nodes = knowledgeMap.nodes.filter(node => {
			const module = modules.find(m => m.id === node.contentId);
			if (!module) return false;

			// Completion filter
			if (!showCompleted && completedContent.has(node.id)) return false;
			if (!showLocked && node.status === 'locked') return false;

			// Difficulty filter
            if (difficultyToRank(module.metadata.difficulty) < difficultyFilter[0] ||
                difficultyToRank(module.metadata.difficulty) > difficultyFilter[1]) return false;

			// Tag filter
			if (tagFilter.length > 0 &&
				!tagFilter.some(tag => module.metadata.tags.includes(tag))) return false;

			// Search filter
			if (searchQuery &&
				!node.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
				!module.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;

			return true;
		});

		// Filter connections
		if (connectionTypeFilter.length > 0) {
			knowledgeMap.connections = knowledgeMap.connections.filter(conn =>
				connectionTypeFilter.includes(conn.type)
			);
		}

		// Remove connections to filtered-out nodes
		const nodeIds = new Set(knowledgeMap.nodes.map(n => n.id));
		knowledgeMap.connections = knowledgeMap.connections.filter(conn =>
			nodeIds.has(conn.sourceId) && nodeIds.has(conn.targetId)
		);
	}

	/**
	 * Setup event listeners for interactions
	 */
	function setupEventListeners() {
		if (!interactive) return;

		// Keyboard shortcuts
		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'r':
					if (e.ctrlKey || e.metaKey) {
						e.preventDefault();
						regenerateLayout();
					}
					break;
				case '=':
				case '+':
					e.preventDefault();
					zoomIn();
					break;
				case '-':
					e.preventDefault();
					zoomOut();
					break;
				case '0':
					e.preventDefault();
					resetView();
					break;
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	}

	/**
	 * Handle node interactions
	 */
	function handleNodeClick(nodeId: string, event: MouseEvent) {
		event.stopPropagation();

		if (selectedNode === nodeId) {
			// Double click - open content
			onNodeOpen?.(nodeId);
		} else {
			selectedNode = nodeId;
			onNodeSelect?.(nodeId);
		}
	}

	function handleNodeMouseEnter(nodeId: string) {
		if (!isNodeDragging) {
			hoveredNode = nodeId;
			onNodeHover?.(nodeId);
		}
	}

	function handleNodeMouseLeave() {
		if (!isNodeDragging) {
			hoveredNode = null;
			onNodeHover?.(null);
		}
	}

	function handleNodeDragStart(nodeId: string, event: MouseEvent) {
		if (!interactive) return;

		event.preventDefault();
		isNodeDragging = true;
		draggedNode = nodeId;

		const handleMouseMove = (e: MouseEvent) => {
			if (!knowledgeMap || !draggedNode) return;

			const node = knowledgeMap.nodes.find(n => n.id === draggedNode);
			if (!node) return;

			const rect = svgElement.getBoundingClientRect();
			node.position.x = (e.clientX - rect.left - pan.x) / zoom;
			node.position.y = (e.clientY - rect.top - pan.y) / zoom;

			// Trigger reactivity
			knowledgeMap = { ...knowledgeMap };
		};

		const handleMouseUp = () => {
			isNodeDragging = false;
			draggedNode = null;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	/**
	 * Handle connection interactions
	 */
	function handleConnectionClick(connectionId: string, event: MouseEvent) {
		event.stopPropagation();
		selectedConnection = connectionId;
		onConnectionSelect?.(connectionId);
	}

	/**
	 * Handle canvas interactions
	 */
	function handleCanvasMouseDown(event: MouseEvent) {
		if (event.button !== 0) return; // Only left mouse button

		isDragging = true;
		dragStart = { x: event.clientX - pan.x, y: event.clientY - pan.y };

		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging) return;
			pan = {
				x: e.clientX - dragStart.x,
				y: e.clientY - dragStart.y
			};
		};

		const handleMouseUp = () => {
			isDragging = false;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};

		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	function handleCanvasClick(event: MouseEvent) {
		if (event.target === svgElement) {
			selectedNode = null;
			selectedConnection = null;
			onBackgroundClick?.();
		}
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();

		const delta = -event.deltaY / 1000;
		const newZoom = Math.max(0.1, Math.min(3, zoom + delta));

		// Zoom towards mouse position
		const rect = svgElement.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		const zoomFactor = newZoom / zoom;
		pan.x = mouseX - (mouseX - pan.x) * zoomFactor;
		pan.y = mouseY - (mouseY - pan.y) * zoomFactor;

		zoom = newZoom;
	}

	/**
	 * View controls
	 */
	function zoomIn() {
		zoom = Math.min(3, zoom * 1.2);
	}

	function zoomOut() {
		zoom = Math.max(0.1, zoom / 1.2);
	}

	function resetView() {
		zoom = 1;
		pan = { x: 0, y: 0 };
	}

	function centerOnNode(nodeId: string) {
		if (!knowledgeMap) return;

		const node = knowledgeMap.nodes.find(n => n.id === nodeId);
		if (!node) return;

		pan = {
			x: width / 2 - node.position.x * zoom,
			y: height / 2 - node.position.y * zoom
		};
	}

	/**
	 * Layout controls
	 */
	async function changeLayout(newLayout: GraphLayout['type']) {
		currentLayout = newLayout;
		await generateMap();
	}

	async function regenerateLayout() {
		relationshipService.clearCaches();
		await generateMap();
	}

	/**
	 * Export functionality
	 */
	function exportAsSVG() {
		if (!svgElement) return;

		const svgData = new XMLSerializer().serializeToString(svgElement);
		const blob = new Blob([svgData], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = 'knowledge-map.svg';
		link.click();

		URL.revokeObjectURL(url);
	}

	function exportAsPNG() {
		if (!svgElement) return;

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d')!;
		const svgData = new XMLSerializer().serializeToString(svgElement);
		const img = new Image();

		img.onload = () => {
			ctx.drawImage(img, 0, 0);
			const link = document.createElement('a');
			link.href = canvas.toDataURL('image/png');
			link.download = 'knowledge-map.png';
			link.click();
		};

		img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
	}

	/**
	 * Helper functions
	 */
	function getNodeRadius(node: KnowledgeMapNode): number {
		return Math.max(15, Math.min(40, node.size));
	}

	function getConnectionPath(connection: KnowledgeMapConnection): string {
		if (!knowledgeMap) return '';

		const source = knowledgeMap.nodes.find(n => n.id === connection.sourceId);
		const target = knowledgeMap.nodes.find(n => n.id === connection.targetId);

		if (!source || !target) return '';

		const sourceRadius = getNodeRadius(source);
		const targetRadius = getNodeRadius(target);

		const dx = target.position.x - source.position.x;
		const dy = target.position.y - source.position.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance === 0) return '';

		const unitX = dx / distance;
		const unitY = dy / distance;

		const startX = source.position.x + unitX * sourceRadius;
		const startY = source.position.y + unitY * sourceRadius;
		const endX = target.position.x - unitX * targetRadius;
		const endY = target.position.y - unitY * targetRadius;

		return `M ${startX} ${startY} L ${endX} ${endY}`;
	}

	function getArrowPath(connection: KnowledgeMapConnection): string {
		if (!knowledgeMap || !['prerequisite', 'sequence'].includes(connection.type)) return '';

		const source = knowledgeMap.nodes.find(n => n.id === connection.sourceId);
		const target = knowledgeMap.nodes.find(n => n.id === connection.targetId);

		if (!source || !target) return '';

		const dx = target.position.x - source.position.x;
		const dy = target.position.y - source.position.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance === 0) return '';

		const unitX = dx / distance;
		const unitY = dy / distance;
		const targetRadius = getNodeRadius(target);

		const arrowX = target.position.x - unitX * targetRadius;
		const arrowY = target.position.y - unitY * targetRadius;
		const arrowSize = 8;

		const perpX = -unitY * arrowSize;
		const perpY = unitX * arrowSize;

		return `M ${arrowX} ${arrowY} L ${arrowX - unitX * arrowSize + perpX} ${arrowY - unitY * arrowSize + perpY} L ${arrowX - unitX * arrowSize - perpX} ${arrowY - unitY * arrowSize - perpY} Z`;
	}

	function getNodeTitle(node: KnowledgeMapNode): string {
		const maxLength = 20;
		return node.title.length > maxLength ?
			node.title.substring(0, maxLength) + '...' :
			node.title;
	}

	function getNodeTitleById(id: string): string {
		if (!knowledgeMap) return id;
		const node = knowledgeMap.nodes.find((n) => n.id === id);
		return node ? node.title : id;
	}

	function getNodeDescription(node: KnowledgeMapNode): string {
		const module = modules.find(m => m.id === node.contentId);
		if (!module) return node.title;

		return `${module.description}
                        Difficulty: ${module.metadata.difficulty}
Tags: ${module.metadata.tags.join(', ')}
Estimated time: ${module.metadata.estimatedTime} min`;
	}

	// Reactive updates
	$effect(() => {
		if (currentContent !== selectedNode) {
			selectedNode = currentContent;
		}
	});

	$effect(() => {
		applyFilters();
	});

	// A11y: keyboard activation helper and non-mouse activators
	function onKeyActivate(e: KeyboardEvent, action: () => void) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			action();
		}
	}

	function handleNodeActivate(nodeId: string) {
		if (selectedNode === nodeId) {
			onNodeOpen?.(nodeId);
		} else {
			selectedNode = nodeId;
			onNodeSelect?.(nodeId);
		}
	}

	function handleConnectionActivate(connectionId: string) {
		selectedConnection = connectionId;
		onConnectionSelect?.(connectionId);
	}
</script>

<div class="knowledge-map-container" bind:this={containerElement}>
	<!-- Loading State -->
	{#if loading}
		<div class="loading-overlay">
			<div class="loading-spinner"></div>
			<p>Generating knowledge map...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if error}
		<div class="error-overlay">
			<div class="error-content">
				<h3>Error Loading Map</h3>
				<p>{error}</p>
				<button class="btn btn-primary" onclick={() => generateMap()}>
					Retry
				</button>
			</div>
		</div>
	{/if}

	<!-- Controls Panel -->
	{#if showControls && !loading && !error}
		<div class="controls-panel">
			<div class="control-group">
				<label for={layoutSelectId}>Layout:</label>
				<select id={layoutSelectId} bind:value={currentLayout} onchange={() => changeLayout(currentLayout)}>
					{#each layouts as layout}
						<option value={layout.value}>{layout.label}</option>
					{/each}
				</select>
			</div>

			<div class="control-group">
				<label for={searchInputId}>Search:</label>
				<input
					id={searchInputId}
					type="text"
					placeholder="Search content..."
					bind:value={searchQuery}
				/>
			</div>

			<div class="control-group">
				<span class="group-label">Difficulty Range:</span>
				<input
					id={diffMinId}
					type="range"
					min="1"
					max="5"
					bind:value={difficultyFilter[0]}
					class="range-input"
					aria-label="Minimum difficulty"
				/>
				<span>{difficultyFilter[0]} - {difficultyFilter[1]}</span>
				<input
					id={diffMaxId}
					type="range"
					min="1"
					max="5"
					bind:value={difficultyFilter[1]}
					class="range-input"
					aria-label="Maximum difficulty"
				/>
			</div>

			<div class="control-group">
				<label for={showCompletedId}>
					<input id={showCompletedId} type="checkbox" bind:checked={showCompleted} />
					Show Completed
				</label>
				<label for={showLockedId}>
					<input id={showLockedId} type="checkbox" bind:checked={showLocked} />
					Show Locked
				</label>
				<label for={showConnLabelsId}>
					<input id={showConnLabelsId} type="checkbox" bind:checked={showConnectionLabels} />
					Connection Labels
				</label>
			</div>

			<div class="control-group">
				<span class="group-label">Connection Types:</span>
				{#each connectionTypes as connType}
					<label class="connection-filter" for={connectionTypeId(connType.value)}>
						<input
							id={connectionTypeId(connType.value)}
							type="checkbox"
							checked={connectionTypeFilter.includes(connType.value)}
							onchange={(e) => {
								if ((e.currentTarget as HTMLInputElement).checked) {
									connectionTypeFilter = [...connectionTypeFilter, connType.value];
								} else {
									connectionTypeFilter = connectionTypeFilter.filter(t => t !== connType.value);
								}
							}}
						/>
						<span class="connection-color" style="background-color: {connType.color}"></span>
						{connType.label}
					</label>
				{/each}
			</div>

			<div class="control-group">
				<button class="btn btn-secondary" onclick={regenerateLayout}>
					🔄 Regenerate
				</button>
				<button class="btn btn-secondary" onclick={resetView}>
					🎯 Reset View
				</button>
				{#if exportable}
					<button class="btn btn-secondary" onclick={exportAsSVG}>
						💾 Export SVG
					</button>
					<button class="btn btn-secondary" onclick={exportAsPNG}>
						📷 Export PNG
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Main SVG Canvas -->
	{#if knowledgeMap && !loading && !error}
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<svg
			bind:this={svgElement}
			{width}
			{height}
			class="knowledge-map-svg"
			onmousedown={handleCanvasMouseDown}
			onclick={handleCanvasClick}
			onwheel={handleWheel}
			role="application"
			aria-label="Knowledge map canvas"
			tabindex="0"
			onkeydown={(e) => onKeyActivate(e, () => onBackgroundClick?.())}
		>
			<!-- Definitions -->
			<defs>
				<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
					<polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
				</marker>
				<filter id="glow">
					<feGaussianBlur stdDeviation="3" result="coloredBlur"/>
					<feMerge>
						<feMergeNode in="coloredBlur"/>
						<feMergeNode in="SourceGraphic"/>
					</feMerge>
				</filter>
			</defs>

			<!-- Main group with zoom and pan transform -->
			<g transform="translate({pan.x},{pan.y}) scale({zoom})">
				<!-- Render connections -->
				{#each knowledgeMap.connections as connection (connection.id)}
					<g class="connection-group">
						<path
							stroke={connection.type === 'prerequisite' ? '#ef4444' : connection.type === 'sequence' ? '#3b82f6' : connection.type === 'related' ? '#6b7280' : connection.type === 'similar' ? '#a855f7' : '#f97316'}
							stroke-width={selectedConnection === connection.id ? 3 : 2}
							fill="none"
							d={getConnectionPath(connection)}
							marker-end={['prerequisite', 'sequence'].includes(connection.type) ? 'url(#arrowhead)' : 'none'}
							class="connection-line"
							class:selected={selectedConnection === connection.id}
							onclick={(e) => handleConnectionClick(connection.id, e)}
							onkeydown={(e) => onKeyActivate(e, () => handleConnectionActivate(connection.id))}
							tabindex="0"
							role="button"
							aria-label={`Select connection ${getNodeTitleById(connection.sourceId)} to ${getNodeTitleById(connection.targetId)}`}
							opacity={hoveredNode && (hoveredNode === connection.sourceId || hoveredNode === connection.targetId) ? 1 : 0.7}
						/>

						{#if showConnectionLabels}
							<text
								x={(knowledgeMap.nodes.find(n => n.id === connection.sourceId)?.position.x + knowledgeMap.nodes.find(n => n.id === connection.targetId)?.position.x) / 2 || 0}
								y={(knowledgeMap.nodes.find(n => n.id === connection.sourceId)?.position.y + knowledgeMap.nodes.find(n => n.id === connection.targetId)?.position.y) / 2 || 0}
								text-anchor="middle"
								class="connection-label"
								font-size="10"
								fill="#6b7280"
							>
								{connection.type}
							</text>
						{/if}
					</g>
				{/each}

				<!-- Render nodes -->
				{#each knowledgeMap.nodes as node (node.id)}
					<g class="node-group">
						<!-- Node circle -->
						<circle
							cx={node.position.x}
							cy={node.position.y}
							r={getNodeRadius(node)}
							fill={node.color}
							stroke={selectedNode === node.id ? '#1f2937' : hoveredNode === node.id ? '#4b5563' : '#ffffff'}
							stroke-width={selectedNode === node.id ? 3 : 2}
							class="node-circle"
							class:hovered={hoveredNode === node.id}
							class:selected={selectedNode === node.id}
							class:completed={node.status === 'completed'}
							class:locked={node.status === 'locked'}
							onclick={(e) => handleNodeClick(node.id, e)}
							onkeydown={(e) => onKeyActivate(e, () => handleNodeActivate(node.id))}
							tabindex="0"
							role="button"
							aria-label={`Node ${getNodeTitle(node)}. ${selectedNode === node.id ? 'Press Enter to open' : 'Press Enter to select'}`}
							onmouseenter={() => handleNodeMouseEnter(node.id)}
							onmouseleave={() => handleNodeMouseLeave()}
							onmousedown={(e) => handleNodeDragStart(node.id, e)}
							style="cursor: {interactive ? 'pointer' : 'default'}"
							filter={selectedNode === node.id ? 'url(#glow)' : 'none'}
						/>

						<!-- Node label -->
						<text
							x={node.position.x}
							y={node.position.y + getNodeRadius(node) + 15}
							text-anchor="middle"
							class="node-label"
							class:selected={selectedNode === node.id}
							font-size="12"
							fill="#374151"
						>
							{getNodeTitle(node)}
						</text>

						<!-- Progress indicator for completed nodes -->
						{#if node.status === 'completed'}
							<circle
								cx={node.position.x + getNodeRadius(node) - 5}
								cy={node.position.y - getNodeRadius(node) + 5}
								r="8"
								fill="#22c55e"
								stroke="white"
								stroke-width="2"
							/>
							<text
								x={node.position.x + getNodeRadius(node) - 5}
								y={node.position.y - getNodeRadius(node) + 9}
								text-anchor="middle"
								font-size="10"
								fill="white"
								font-weight="bold"
							>
								✓
							</text>
						{/if}

						<!-- Lock indicator for locked nodes -->
						{#if node.status === 'locked'}
							<circle
								cx={node.position.x + getNodeRadius(node) - 5}
								cy={node.position.y - getNodeRadius(node) + 5}
								r="8"
								fill="#6b7280"
								stroke="white"
								stroke-width="2"
							/>
							<text
								x={node.position.x + getNodeRadius(node) - 5}
								y={node.position.y - getNodeRadius(node) + 9}
								text-anchor="middle"
								font-size="10"
								fill="white"
								font-weight="bold"
							>
								🔒
							</text>
						{/if}
					</g>
				{/each}
			</g>

			<!-- Tooltip for hovered node -->
			{#if hoveredNode && knowledgeMap}
				{@const node = knowledgeMap.nodes.find(n => n.id === hoveredNode)}
				{#if node}
					<foreignObject
						x={node.position.x * zoom + pan.x + getNodeRadius(node) + 10}
						y={node.position.y * zoom + pan.y - 40}
						width="250"
						height="120"
						class="tooltip"
					>
						<div class="tooltip-content">
							<h4>{node.title}</h4>
							<p>{getNodeDescription(node)}</p>
						</div>
					</foreignObject>
				{/if}
			{/if}
		</svg>
	{/if}

	<!-- View Controls -->
	{#if !loading && !error}
		<div class="view-controls">
			<button class="view-btn" onclick={zoomIn} title="Zoom In">+</button>
			<button class="view-btn" onclick={zoomOut} title="Zoom Out">−</button>
			<button class="view-btn" onclick={resetView} title="Reset View">⌂</button>
			<div class="zoom-indicator">
				{Math.round(zoom * 100)}%
			</div>
		</div>
	{/if}

	<!-- Minimap -->
	{#if showMinimap && knowledgeMap && !loading && !error}
		<div class="minimap">
			<svg width="150" height="120" class="minimap-svg" role="img" aria-label="Knowledge map minimap">
				<rect width="150" height="120" fill="#f3f4f6" stroke="#d1d5db" />
				<!-- Simplified nodes -->
				{#each knowledgeMap.nodes as node}
					<circle
						cx={node.position.x * (150 / width)}
						cy={node.position.y * (120 / height)}
						r="2"
						fill={node.color}
						onclick={() => centerOnNode(node.id)}
						onkeydown={(e) => onKeyActivate(e, () => centerOnNode(node.id))}
						tabindex="0"
						role="button"
						aria-label={`Center view on ${getNodeTitle(node)}`}
						style="cursor: pointer"
					/>
				{/each}
				<!-- Viewport indicator -->
				<rect
					x={-pan.x * (150 / width) / zoom}
					y={-pan.y * (120 / height) / zoom}
					width={150 / zoom}
					height={120 / zoom}
					fill="none"
					stroke="#3b82f6"
					stroke-width="2"
					opacity="0.5"
				/>
			</svg>
		</div>
	{/if}

	<!-- Legend -->
	<div class="legend">
		<h4>Legend</h4>
		<div class="legend-item">
			<div class="legend-color" style="background-color: #22c55e"></div>
			<span>Completed</span>
		</div>
		<div class="legend-item">
			<div class="legend-color" style="background-color: #3b82f6"></div>
			<span>Current</span>
		</div>
		<div class="legend-item">
			<div class="legend-color" style="background-color: #f59e0b"></div>
			<span>Available</span>
		</div>
		<div class="legend-item">
			<div class="legend-color" style="background-color: #6b7280"></div>
			<span>Locked</span>
		</div>
	</div>
</div>

<style>
	.knowledge-map-container {
		position: relative;
		width: 100%;
		height: 100%;
		background: #fafafa;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		overflow: hidden;
	}

	.loading-overlay,
	.error-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.9);
		z-index: 100;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e5e7eb;
		border-top: 4px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-content {
		text-align: center;
		max-width: 400px;
		padding: 20px;
	}

	.error-content h3 {
		color: #dc2626;
		margin-bottom: 8px;
	}

	.error-content p {
		color: #6b7280;
		margin-bottom: 16px;
	}

	.controls-panel {
		position: absolute;
		top: 10px;
		left: 10px;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 16px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		z-index: 10;
		max-width: 300px;
		max-height: calc(100% - 20px);
		overflow-y: auto;
	}

	.control-group {
		margin-bottom: 16px;
	}

	.control-group:last-child {
		margin-bottom: 0;
	}

	.control-group label {
		display: block;
		font-size: 12px;
		font-weight: 500;
		color: #374151;
		margin-bottom: 4px;
	}

	.control-group input,
	.control-group select {
		width: 100%;
		padding: 6px 8px;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 12px;
	}

	.range-input {
		width: 60px !important;
		display: inline-block !important;
		margin: 0 4px;
	}

	.connection-filter {
		display: flex !important;
		align-items: center;
		margin-bottom: 4px;
		font-size: 11px !important;
	}

	.connection-filter input {
		width: auto !important;
		margin-right: 6px;
	}

	.connection-color {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		margin-right: 6px;
	}

	.knowledge-map-svg {
		display: block;
		cursor: grab;
		background: #ffffff;
	}

	.knowledge-map-svg:active {
		cursor: grabbing;
	}

	.node-circle {
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.node-circle:hover,
	.node-circle.hovered {
		stroke-width: 3;
		filter: brightness(1.1);
	}

	.node-circle.selected {
		stroke-width: 4;
		filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
	}

	.node-circle.completed {
		stroke: #22c55e;
	}

	.node-circle.locked {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.node-label {
		font-family: system-ui, -apple-system, sans-serif;
		font-weight: 500;
		pointer-events: none;
		user-select: none;
	}

	.node-label.selected {
		font-weight: 700;
		fill: #1f2937;
	}

	.connection-line {
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.connection-line:hover {
		stroke-width: 3;
		opacity: 1 !important;
	}

	.connection-line.selected {
		stroke-width: 4;
		filter: drop-shadow(0 0 4px rgba(59, 130, 246, 0.5));
	}

	.connection-label {
		font-family: system-ui, -apple-system, sans-serif;
		pointer-events: none;
		user-select: none;
	}

	.view-controls {
		position: absolute;
		bottom: 20px;
		right: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		z-index: 10;
	}

	.view-btn {
		width: 40px;
		height: 40px;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		font-weight: bold;
		color: #374151;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
	}

	.view-btn:hover {
		background: #f3f4f6;
		border-color: #9ca3af;
	}

	.zoom-indicator {
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 12px;
		font-weight: 500;
		color: #374151;
		text-align: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.minimap {
		position: absolute;
		bottom: 20px;
		left: 20px;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		overflow: hidden;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		z-index: 10;
	}

	.minimap-svg {
		display: block;
	}

	.legend {
		position: absolute;
		top: 10px;
		right: 10px;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		z-index: 10;
		font-size: 12px;
	}

	.legend h4 {
		margin: 0 0 8px 0;
		font-size: 13px;
		font-weight: 600;
		color: #1f2937;
	}

	.legend-item {
		display: flex;
		align-items: center;
		margin-bottom: 4px;
	}

	.legend-item:last-child {
		margin-bottom: 0;
	}

	.legend-color {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		margin-right: 8px;
		border: 1px solid #d1d5db;
	}

	.tooltip {
		pointer-events: none;
		z-index: 20;
	}

	.tooltip-content {
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		font-size: 12px;
		max-width: 250px;
	}

	.tooltip-content h4 {
		margin: 0 0 6px 0;
		font-size: 13px;
		font-weight: 600;
		color: #1f2937;
	}

	.tooltip-content p {
		margin: 0;
		color: #6b7280;
		white-space: pre-line;
		line-height: 1.4;
	}

	.btn {
		padding: 8px 12px;
		border: none;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-right: 8px;
		margin-bottom: 4px;
	}

	.btn:last-child {
		margin-right: 0;
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
		.controls-panel {
			position: relative;
			top: 0;
			left: 0;
			max-width: none;
			margin-bottom: 10px;
			border-radius: 0;
		}

		.legend {
			position: relative;
			top: 0;
			right: 0;
			margin-bottom: 10px;
			border-radius: 0;
		}

		.minimap {
			display: none;
		}

		.view-controls {
			flex-direction: row;
			bottom: 10px;
			right: 10px;
		}
	}
</style>