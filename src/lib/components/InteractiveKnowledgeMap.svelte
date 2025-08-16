<script lang="ts">
	import { select, type Selection } from 'd3-selection';
	import { zoom, type ZoomBehavior } from 'd3-zoom';
	import { drag } from 'd3-drag';
	import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
	import { scaleOrdinal, scaleLinear } from 'd3-scale';
	import { schemeCategory10 } from 'd3-scale-chromatic';
	import type {
		KnowledgeMap,
		KnowledgeMapNode,
		KnowledgeMapConnection,
		RelationshipType,
		ContentModule,
		GraphVisualizationOptions
	} from '$lib/types/unified';
	import { difficultyToRank } from '$lib/types/unified';
	import { enhancedRelationshipService } from '../services/enhancedRelationshipService.js';

	// Props
	interface Props {
		modules: ContentModule[];
		completedContent?: Set<string>;
		currentContent?: string;
		userProgress?: Map<string, { completed: boolean; score?: number; timeSpent?: number }>;
		width?: number;
		height?: number;
		options?: Partial<GraphVisualizationOptions>;
	}

	// UI callbacks
	interface Callbacks {
		onNodeSelected?: (payload: { node: KnowledgeMapNode }) => void;
		onPathRequested?: (payload: { targetId: string }) => void;
		onPrerequisiteCheck?: (payload: { nodeId: string }) => void;
		onLayoutChanged?: (payload: { layout: string }) => void;
	}

	// Initialize props using $props once
	let {
		modules,
		completedContent = new Set(),
		currentContent,
		userProgress,
		width = 1200,
		height = 800,
		options = {},
		onNodeSelected = () => {},
		onPathRequested = () => {},
		onPrerequisiteCheck = () => {},
		onLayoutChanged = () => {}
	}: Props & Callbacks = $props();

	// Component state - properly declared with $state()
	let container: HTMLDivElement;
	let svg: Selection<SVGSVGElement, unknown, null, undefined>;
	let g: Selection<SVGGElement, unknown, null, undefined>;
	let simulation: any;
	let knowledgeMap = $state<KnowledgeMap | null>(null);
	let selectedNode = $state<KnowledgeMapNode | null>(null);
	let highlightedPath = $state<string[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	
	// Derived selected module for details panel
	let selectedModule = $derived(selectedNode ? modules.find((m) => m.id === selectedNode.contentId) : undefined);

	// Visualization options with defaults - fixed type issues
	const visualOptions: GraphVisualizationOptions = {
		layout: 'force-directed',
		width,
		height,
		colorScheme: 'by-progress',
		nodeColorBy: 'status',
		edgeColorBy: 'type',
		showConnections: true,
		clustered: false,
		...options
	};

	// Filter state
	let filters = $state({
		showCompleted: true,
		showLocked: true,
		showInProgress: true,
		difficultyRange: [0, 10] as [number, number],
		relationshipTypes: [] as RelationshipType[],
		searchTerm: '',
		selectedTags: [] as string[]
	});

	// UI state
	let showFilters = $state(false);
	let showNodeDetails = $state(false);
	let showLegend = $state(true);
	let zoomLevel = $state(1 as number);
	
	// Additional visualization options for internal use
	let showLabels = $state(true);
	let animateLayout = $state(true);

	// Scales and colors
	const colorScale = scaleOrdinal(schemeCategory10);
	const sizeScale = scaleLinear().domain([1, 20]).range([8, 40]);

	$effect(() => {
		const initializeAsync = async () => {
			try {
				await initializeVisualization();
				setupEventListeners();
			} catch (err) {
				error = err instanceof Error ? err.message : 'Failed to initialize visualization';
				isLoading = false;
			}
		};

		initializeAsync();

		return () => {
			if (simulation) {
				simulation.stop();
			}
			cleanup();
		};
	});

	async function initializeVisualization() {
		// Generate knowledge map
		knowledgeMap = await enhancedRelationshipService.generateInteractiveKnowledgeMap(
			modules,
			visualOptions,
			userProgress
		);

		// Create SVG
		createSVG();

		// Apply filters
		const { filteredNodes, filteredConnections } = applyFilters();

		// Create force simulation
		setupForceSimulation(filteredNodes, filteredConnections);

		// Render visualization
		renderVisualization(filteredNodes, filteredConnections);

		isLoading = false;
	}

	function createSVG() {
		svg = select(container)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.attr('viewBox', `0 0 ${width} ${height}`)
			.style('background-color', '#f8f9fa');

		// Add zoom behavior
		const zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> = zoom<SVGSVGElement, unknown>()
			.scaleExtent([0.1, 5])
			.on('zoom', (event) => {
				g.attr('transform', event.transform);
				zoomLevel = event.transform.k;
			});

		svg.call(zoomBehavior);

		// Create main group
		g = svg.append('g');

		// Add definitions for arrowheads
		const defs = svg.append('defs');

		// Arrowhead markers for different relationship types
		const arrowTypes = [
			{ id: 'prerequisite', color: '#dc3545' },
			{ id: 'related', color: '#007bff' },
			{ id: 'similar', color: '#28a745' },
			{ id: 'sequence', color: '#6f42c1' }
		];

		arrowTypes.forEach(({ id, color }) => {
			defs.append('marker')
				.attr('id', `arrow-${id}`)
				.attr('viewBox', '0 -5 10 10')
				.attr('refX', 20)
				.attr('refY', 0)
				.attr('markerWidth', 6)
				.attr('markerHeight', 6)
				.attr('orient', 'auto')
				.append('path')
				.attr('d', 'M0,-5L10,0L0,5')
				.attr('fill', color)
				.attr('opacity', 0.7);
		});

		// Add gradient definitions for nodes
		const gradient = defs.append('radialGradient')
			.attr('id', 'nodeGradient');

		gradient.append('stop')
			.attr('offset', '0%')
			.attr('stop-color', '#ffffff')
			.attr('stop-opacity', 0.3);

		gradient.append('stop')
			.attr('offset', '100%')
			.attr('stop-color', '#000000')
			.attr('stop-opacity', 0.1);
	}

	function applyFilters() {
		if (!knowledgeMap) return { filteredNodes: [], filteredConnections: [] };

		let filteredNodes = knowledgeMap.nodes.filter(node => {
			// Status filter
			if (!filters.showCompleted && node.status === 'completed') return false;
			if (!filters.showLocked && node.status === 'locked') return false;
			if (!filters.showInProgress && node.status === 'in-progress') return false;

			// Difficulty filter
			const module = modules.find(m => m.id === node.contentId);
			if (module) {
                const difficulty = difficultyToRank(module.metadata.difficulty);
                if (difficulty < filters.difficultyRange[0] || difficulty > filters.difficultyRange[1]) {
					return false;
				}
			}

			// Search filter
			if (filters.searchTerm && !node.title.toLowerCase().includes(filters.searchTerm.toLowerCase())) {
				return false;
			}

			// Tag filter
			if (filters.selectedTags.length > 0) {
				const module = modules.find(m => m.id === node.contentId);
				if (module && !filters.selectedTags.some(tag => module.metadata.tags.includes(tag))) {
					return false;
				}
			}

			return true;
		});

		const nodeIds = new Set(filteredNodes.map(n => n.id));

		let filteredConnections = knowledgeMap.connections.filter(conn => {
			// Only show connections between visible nodes
			if (!nodeIds.has(conn.sourceId) || !nodeIds.has(conn.targetId)) return false;

			// Relationship type filter
			if (filters.relationshipTypes.length > 0 && !filters.relationshipTypes.includes(conn.type)) {
				return false;
			}

			return true;
		});

		return { filteredNodes, filteredConnections };
	}

	function setupForceSimulation(nodes: KnowledgeMapNode[], connections: KnowledgeMapConnection[]) {
		simulation = forceSimulation(nodes)
			.force('link', forceLink(connections)
				.id((d: any) => d.id)
				.distance(d => 100 / (d.strength || 0.5))
				.strength(d => d.strength || 0.5)
			)
			.force('charge', forceManyBody()
				.strength(d => -300 * Math.sqrt((d as any).size || 20))
			)
			.force('center', forceCenter(width / 2, height / 2))
			.force('collision', forceCollide()
				.radius(d => ((d as any).size || 20) + 5)
			)
			.alpha(1)
			.alphaDecay(0.02);
	}

	function renderVisualization(nodes: KnowledgeMapNode[], connections: KnowledgeMapConnection[]) {
		// Clear existing elements
		g.selectAll('*').remove();

		// Render connections first (so they appear behind nodes)
		renderConnections(connections);

		// Render nodes
		renderNodes(nodes);

		// Add labels if enabled
		if (showLabels) {
			renderLabels(nodes);
		}

		// Start simulation
		if (animateLayout && simulation) {
			simulation.on('tick', () => {
				updatePositions();
			});
		} else {
			// Static positioning
			updatePositions();
		}
	}

	function renderConnections(connections: KnowledgeMapConnection[]) {
		const linkGroup = g.append('g').attr('class', 'links');

		const links = linkGroup
			.selectAll('.link')
			.data(connections)
			.enter()
			.append('line')
			.attr('class', 'link')
			.style('stroke', d => d.color)
			.style('stroke-width', d => Math.max(1, d.strength * 4))
			.style('stroke-dasharray', d => d.style === 'dashed' ? '5,5' : d.style === 'dotted' ? '2,2' : 'none')
			.style('opacity', d => Math.max(0.3, d.strength))
			.attr('marker-end', d => `url(#arrow-${d.type})`);

		// Add hover effects
		links
			.on('mouseover', function(event, d) {
				select(this)
					.style('stroke-width', Math.max(3, d.strength * 6))
					.style('opacity', 1);

				showConnectionTooltip(event, d);
			})
			.on('mouseout', function(event, d) {
				select(this)
					.style('stroke-width', Math.max(1, d.strength * 4))
					.style('opacity', Math.max(0.3, d.strength));

				hideTooltip();
			});
	}

	function renderNodes(nodes: KnowledgeMapNode[]) {
		const nodeGroup = g.append('g').attr('class', 'nodes');

		const nodeElements = nodeGroup
			.selectAll('.node')
			.data(nodes)
			.enter()
			.append('g')
			.attr('class', 'node')
			.style('cursor', 'pointer');

		// Node circles
		nodeElements
			.append('circle')
			.attr('r', d => (d as any).size)
			.style('fill', d => getNodeFillColor(d))
			.style('stroke', d => getNodeStrokeColor(d))
			.style('stroke-width', d => d.id === selectedNode?.id ? 3 : 1.5)
			.style('filter', 'url(#nodeGradient)');

		// Node icons/symbols based on type
		nodeElements
			.append('text')
			.attr('text-anchor', 'middle')
			.attr('dy', '0.35em')
			.style('font-size', d => `${(d as any).size * 0.6}px`)
			.style('fill', '#ffffff')
			.style('font-weight', 'bold')
			.style('pointer-events', 'none')
			.text(d => getNodeIcon(d.type as string));

		// Add interaction behaviors
		nodeElements.call(
			drag<SVGGElement, KnowledgeMapNode>()
				.on('start', dragStarted)
				.on('drag', dragged)
				.on('end', dragEnded)
		);

		// Click and hover events
		nodeElements
			.on('click', (event, d) => {
				selectNode(d);
				onNodeSelected({ node: d });
			})
			.on('mouseover', function(event, d) {
				highlightConnectedNodes(d);
				showNodeTooltip(event, d);
			})
			.on('mouseout', function(event, d) {
				clearHighlights();
				hideTooltip();
			})
			.on('contextmenu', (event, d) => {
				event.preventDefault();
				showContextMenu(event, d);
			});
	}

	function renderLabels(nodes: KnowledgeMapNode[]) {
		const labelGroup = g.append('g').attr('class', 'labels');

		labelGroup
			.selectAll('.label')
			.data(nodes)
			.enter()
			.append('text')
			.attr('class', 'label')
			.attr('text-anchor', 'middle')
			.attr('dy', d => ((d as any).size + 15))
			.style('font-size', '12px')
			.style('fill', '#333')
			.style('font-weight', '500')
			.style('pointer-events', 'none')
			.style('text-shadow', '1px 1px 2px rgba(255,255,255,0.8)')
			.text(d => truncateText(d.title, 20));
	}

	function updatePositions() {
		// Update link positions
		g.selectAll('.link')
			.attr('x1', d => (d as any).source.x)
			.attr('y1', d => (d as any).source.y)
			.attr('x2', d => (d as any).target.x)
			.attr('y2', d => (d as any).target.y);

		// Update node positions
		g.selectAll('.node')
			.attr('transform', d => `translate(${(d as any).x},${(d as any).y})`);

		// Update label positions
		g.selectAll('.label')
			.attr('x', d => (d as any).x)
			.attr('y', d => (d as any).y);
	}

	function getNodeFillColor(node: KnowledgeMapNode): string {
		switch (node.status) {
			case 'completed':
				return '#28a745';
			case 'in-progress':
				return '#ffc107';
			case 'locked':
				return '#6c757d';
			default:
				return '#007bff';
		}
	}

	function getNodeStrokeColor(node: KnowledgeMapNode): string {
		if (currentContent && node.id === currentContent) return '#dc3545';
		if (highlightedPath.includes(node.id)) return '#fd7e14';
		if (selectedNode && node.id === selectedNode.id) return '#20c997';
		return '#ffffff';
	}

	function getNodeIcon(type: string): string {
		switch (type) {
			case 'concept': return '●';
			case 'skill': return '◆';
			case 'topic': return '■';
			case 'milestone': return '★';
			default: return '○';
		}
	}

	function selectNode(node: KnowledgeMapNode) {
		selectedNode = node;
		showNodeDetails = true;

		// Update node stroke colors
		g.selectAll('.node circle')
			.style('stroke-width', d => (d as any).id === node.id ? 3 : 1.5);

		// Check prerequisites
		onPrerequisiteCheck({ nodeId: node.id });
	}

	function highlightConnectedNodes(node: KnowledgeMapNode) {
		if (!knowledgeMap) return;

		// Find connected nodes
		const connectedNodes = new Set<string>();
		knowledgeMap.connections.forEach(conn => {
			if (conn.sourceId === node.id) connectedNodes.add(conn.targetId);
			if (conn.targetId === node.id) connectedNodes.add(conn.sourceId);
		});

		// Highlight connected nodes
		g.selectAll('.node')
			.style('opacity', d => connectedNodes.has((d as any).id) || (d as any).id === node.id ? 1 : 0.3);

		// Highlight connected links
		g.selectAll('.link')
			.style('opacity', d => (d as any).sourceId === node.id || (d as any).targetId === node.id ? 1 : 0.1);
	}

	function clearHighlights() {
		g.selectAll('.node').style('opacity', 1);
		g.selectAll('.link').style('opacity', d => Math.max(0.3, (d as any).strength));
	}

	function showNodeTooltip(event: MouseEvent, node: KnowledgeMapNode) {
		const module = modules.find(m => m.id === node.contentId);
		if (!module) return;

		const tooltip = select('body').append('div')
			.attr('class', 'knowledge-map-tooltip')
			.style('position', 'absolute')
			.style('background', 'rgba(0, 0, 0, 0.9)')
			.style('color', 'white')
			.style('padding', '10px')
			.style('border-radius', '5px')
			.style('font-size', '12px')
			.style('pointer-events', 'none')
			.style('z-index', '1000')
			.style('max-width', '250px');

		tooltip.html(`
			<strong>${node.title}</strong><br>
			<small>Type: ${node.type}</small><br>
			<small>Status: ${node.status}</small><br>
			<small>Difficulty: ${(module as any).metadata.difficulty}</small><br>
			<small>Tags: ${(module as any).metadata.tags.join(', ')}</small>
		`);

		tooltip
			.style('left', `${event.pageX + 10}px`)
			.style('top', `${event.pageY - 10}px`);
	}

	function showConnectionTooltip(event: MouseEvent, connection: KnowledgeMapConnection) {
		const tooltip = select('body').append('div')
			.attr('class', 'knowledge-map-tooltip')
			.style('position', 'absolute')
			.style('background', 'rgba(0, 0, 0, 0.9)')
			.style('color', 'white')
			.style('padding', '8px')
			.style('border-radius', '5px')
			.style('font-size', '11px')
			.style('pointer-events', 'none')
			.style('z-index', '1000');

		tooltip.html(`
			<strong>${connection.type}</strong><br>
			<small>Strength: ${Math.round(connection.strength * 100)}%</small>
		`);

		tooltip
			.style('left', `${event.pageX + 10}px`)
			.style('top', `${event.pageY - 10}px`);
	}

	function hideTooltip() {
		select('body').selectAll('.knowledge-map-tooltip').remove();
	}

	function showContextMenu(event: MouseEvent, node: KnowledgeMapNode) {
		// Context menu implementation would go here
		console.log('Context menu for node:', node.title);
	}

	function dragStarted(event: any, d: KnowledgeMapNode) {
		if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
		(d as any).fx = (d as any).x;
		(d as any).fy = (d as any).y;
	}

	function dragged(event: any, d: KnowledgeMapNode) {
		(d as any).fx = event.x;
		(d as any).fy = event.y;
	}

	function dragEnded(event: any, d: KnowledgeMapNode) {
		if (!event.active && simulation) simulation.alphaTarget(0);
		(d as any).fx = null;
		(d as any).fy = null;
	}

	function truncateText(text: string, maxLength: number): string {
		return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
	}

	async function changeLayout(newLayout: GraphVisualizationOptions['layout']) {
		visualOptions.layout = newLayout;
		await initializeVisualization();
		onLayoutChanged({ layout: newLayout });
	}

	async function applyFiltersAndRefresh() {
		if (!knowledgeMap) return;

		const { filteredNodes, filteredConnections } = applyFilters();
		setupForceSimulation(filteredNodes, filteredConnections);
		renderVisualization(filteredNodes, filteredConnections);
	}

	function resetZoom() {
		if (svg) {
			svg.transition().duration(750).call(
				zoom<SVGSVGElement, unknown>().transform as any,
				{ k: 1, x: 0, y: 0 }
			);
		}
	}

	function fitToView() {
		if (!g || !knowledgeMap) return;

		const bounds = g.node()?.getBBox();
		if (!bounds) return;

		const fullWidth = bounds.width;
		const fullHeight = bounds.height;
		const scale = Math.min(width / fullWidth, height / fullHeight) * 0.8;
		const translate = [width / 2 - scale * (bounds.x + fullWidth / 2), height / 2 - scale * (bounds.y + fullHeight / 2)];

		if (svg) {
			svg.transition().duration(750).call(
				zoom<SVGSVGElement, unknown>().transform as any,
				{ k: scale, x: translate[0], y: translate[1] }
			);
		}
	}

	function setupEventListeners() {
		window.addEventListener('resize', handleResize);
	}

	function handleResize() {
		// Handle responsive resizing
		const containerRect = container.getBoundingClientRect();
		width = containerRect.width;
		height = containerRect.height;

		if (svg) {
			svg.attr('width', width).attr('height', height);
		}
	}

	function cleanup() {
		window.removeEventListener('resize', handleResize);
		select('body').selectAll('.knowledge-map-tooltip').remove();
	}

	// Get unique tags from all modules
	$effect(() => {
		const allTags = modules.flatMap(m => m.metadata.tags);
		const uniqueTags = Array.from(new Set(allTags)).sort();
		// Store uniqueTags for filter UI
	});

	// Reactively update visualization when data changes
	$effect(() => {
		if (modules.length > 0 && container) {
			initializeVisualization();
		}
	});
</script>

<div class="knowledge-map-container" bind:this={container}>
	{#if isLoading}
		<div class="loading-overlay">
			<div class="spinner"></div>
			<p>Loading knowledge map...</p>
		</div>
	{/if}

	{#if error}
		<div class="error-overlay">
			<h3>Error Loading Knowledge Map</h3>
			<p>{error}</p>
			<button onclick={() => { error = null; initializeVisualization(); }}>
				Retry
			</button>
		</div>
	{/if}

	<!-- Controls Panel -->
	<div class="controls-panel" class:expanded={showFilters}>
		<div class="control-header">
			<h3>Knowledge Map Controls</h3>
			<button
				class="toggle-btn"
				onclick={() => showFilters = !showFilters}
			>
				{showFilters ? '−' : '+'}
			</button>
		</div>

		{#if showFilters}
			<div class="controls-content">
				<!-- Layout Controls -->
				<div class="control-group">
					<label for="layout-select">Layout</label>
					<select 
						id="layout-select"
						onchange={(e) => changeLayout((e.target as HTMLSelectElement).value as GraphVisualizationOptions['layout'])}
					>
						<option value="force-directed">Force Directed</option>
						<option value="hierarchical">Hierarchical</option>
						<option value="circular">Circular</option>
						<option value="grid">Grid</option>
						<option value="radial">Radial</option>
					</select>
				</div>

				<!-- Status Filters -->
				<div class="control-group">
					<fieldset>
						<legend>Show Content</legend>
						<div class="checkbox-group">
							<label>
								<input type="checkbox" bind:checked={filters.showCompleted} onchange={applyFiltersAndRefresh}>
								Completed
							</label>
							<label>
								<input type="checkbox" bind:checked={filters.showInProgress} onchange={applyFiltersAndRefresh}>
								In Progress
							</label>
							<label>
								<input type="checkbox" bind:checked={filters.showLocked} onchange={applyFiltersAndRefresh}>
								Locked
							</label>
						</div>
					</fieldset>
				</div>

				<!-- Search -->
				<div class="control-group">
					<label for="search-input">Search</label>
					<input
						id="search-input"
						type="text"
						placeholder="Search content..."
						bind:value={filters.searchTerm}
						oninput={applyFiltersAndRefresh}
					>
				</div>

				<!-- Difficulty Range -->
				<div class="control-group">
					<label for="difficulty-min">Difficulty: {filters.difficultyRange[0]} - {filters.difficultyRange[1]}</label>
					<input
						id="difficulty-min"
						type="range"
						min="0"
						max="10"
						bind:value={filters.difficultyRange[0]}
						onchange={applyFiltersAndRefresh}
					>
					<input
						id="difficulty-max"
						type="range"
						min="0"
						max="10"
						bind:value={filters.difficultyRange[1]}
						onchange={applyFiltersAndRefresh}
					>
				</div>

				<!-- View Controls -->
				<div class="control-group">
					<fieldset>
						<legend>View Options</legend>
						<div class="checkbox-group">
							<label>
								<input type="checkbox" bind:checked={showLegend}>
									Show Legend
								</label>
							<label>
								<input type="checkbox" bind:checked={showLabels} onchange={applyFiltersAndRefresh}>
									Show Labels
								</label>
							<label>
								<input type="checkbox" bind:checked={animateLayout}>
									Animate Layout
								</label>
						</div>
					</fieldset>
				</div>

				<!-- Action Buttons -->
				<div class="control-group">
					<button onclick={resetZoom} class="control-btn">Reset Zoom</button>
					<button onclick={fitToView} class="control-btn">Fit to View</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Legend -->
	{#if showLegend}
		<div class="legend">
			<h4>Legend</h4>
			<div class="legend-section">
				<h5>Node Status</h5>
				<div class="legend-item">
					<div class="legend-circle completed"></div>
					<span>Completed</span>
				</div>
				<div class="legend-item">
					<div class="legend-circle in-progress"></div>
					<span>In Progress</span>
				</div>
				<div class="legend-item">
					<div class="legend-circle available"></div>
					<span>Available</span>
				</div>
				<div class="legend-item">
					<div class="legend-circle locked"></div>
					<span>Locked</span>
				</div>
			</div>
			<div class="legend-section">
				<h5>Relationship Types</h5>
				<div class="legend-item">
					<div class="legend-line prerequisite"></div>
					<span>Prerequisite</span>
				</div>
				<div class="legend-item">
					<div class="legend-line related"></div>
					<span>Related</span>
				</div>
				<div class="legend-item">
					<div class="legend-line similar"></div>
					<span>Similar</span>
				</div>
				<div class="legend-item">
					<div class="legend-line sequence"></div>
					<span>Sequence</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Node Details Panel -->
	{#if showNodeDetails && selectedNode}
		<div class="node-details-panel">
			<div class="panel-header">
				<h3>{selectedNode.title}</h3>
				<button onclick={() => showNodeDetails = false}>×</button>
			</div>
			<div class="panel-content">
				{#if selectedModule}
					<div class="detail-item">
						<strong>Type:</strong> {selectedNode.type}
					</div>
					<div class="detail-item">
						<strong>Status:</strong> {selectedNode.status}
					</div>
					<div class="detail-item">
						<strong>Difficulty:</strong> {selectedModule.metadata.difficulty}
					</div>
					<div class="detail-item">
						<strong>Estimated Time:</strong> {selectedModule.metadata.estimatedTime}min
					</div>
					<div class="detail-item">
						<strong>Tags:</strong> {selectedModule.metadata.tags.join(', ')}
					</div>
					{#if selectedModule.metadata.description}
						<div class="detail-item">
							<strong>Description:</strong> {selectedModule.metadata.description}
						</div>
					{/if}
				{/if}
				<div class="panel-actions">
					<button onclick={() => onPathRequested({ targetId: selectedNode.id })}>
						Show Learning Path
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Zoom Level Indicator -->
	<div class="zoom-indicator">
		Zoom: {Math.round(zoomLevel * 100)}%
	</div>
</div>

<style>
	.knowledge-map-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
		border-radius: 8px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
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
		z-index: 1000;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #e9ecef;
		border-top: 4px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-overlay {
		background: rgba(248, 249, 250, 0.95);
		color: #dc3545;
		text-align: center;
	}

	.error-overlay h3 {
		margin-bottom: 8px;
		font-size: 18px;
	}

	.error-overlay p {
		margin-bottom: 16px;
		opacity: 0.8;
	}

	.error-overlay button {
		padding: 8px 16px;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
	}

	.error-overlay button:hover {
		background: #0056b3;
	}

	/* Controls Panel */
	.controls-panel {
		position: absolute;
		top: 16px;
		left: 16px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		min-width: 250px;
		max-width: 350px;
		max-height: 80vh;
		overflow-y: auto;
		z-index: 100;
		transition: all 0.3s ease;
	}

	.controls-panel:not(.expanded) {
		min-width: auto;
		width: auto;
	}

	.control-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid #e9ecef;
		background: #f8f9fa;
		border-radius: 8px 8px 0 0;
	}

	.control-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #495057;
	}

	.toggle-btn {
		background: #007bff;
		color: white;
		border: none;
		border-radius: 50%;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		font-size: 14px;
		font-weight: bold;
	}

	.toggle-btn:hover {
		background: #0056b3;
	}

	.controls-content {
		padding: 16px;
	}

	.control-group {
		margin-bottom: 20px;
	}

	.control-group label {
		display: block;
		font-weight: 600;
		color: #495057;
		margin-bottom: 8px;
		font-size: 14px;
	}

	.control-group select,
	.control-group input[type="text"],
	.control-group input[type="range"] {
		width: 100%;
		padding: 6px 8px;
		border: 1px solid #ced4da;
		border-radius: 4px;
		font-size: 13px;
	}

	.checkbox-group {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.checkbox-group label {
		display: flex;
		align-items: center;
		font-weight: normal;
		margin-bottom: 0;
		cursor: pointer;
	}

	.checkbox-group input[type="checkbox"] {
		width: auto;
		margin-right: 8px;
	}

	.control-btn {
		background: #28a745;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 8px 12px;
		font-size: 13px;
		cursor: pointer;
		margin-right: 8px;
		margin-bottom: 8px;
	}

	.control-btn:hover {
		background: #1e7e34;
	}

	/* Legend */
	.legend {
		position: absolute;
		bottom: 16px;
		left: 16px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		padding: 16px;
		max-width: 200px;
		z-index: 100;
	}

	.legend h4 {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: #495057;
	}

	.legend-section {
		margin-bottom: 12px;
	}

	.legend-section h5 {
		margin: 0 0 8px 0;
		font-size: 12px;
		font-weight: 600;
		color: #6c757d;
		text-transform: uppercase;
	}

	.legend-item {
		display: flex;
		align-items: center;
		margin-bottom: 6px;
		font-size: 12px;
	}

	.legend-circle {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		margin-right: 8px;
		border: 1px solid #dee2e6;
	}

	.legend-circle.completed { background: #28a745; }
	.legend-circle.in-progress { background: #ffc107; }
	.legend-circle.available { background: #007bff; }
	.legend-circle.locked { background: #6c757d; }

	.legend-line {
		width: 20px;
		height: 2px;
		margin-right: 8px;
	}

	.legend-line.prerequisite { background: #dc3545; }
	.legend-line.related { background: #007bff; }
	.legend-line.similar { background: #28a745; }
	.legend-line.sequence { background: #6f42c1; }

	/* Node Details Panel */
	.node-details-panel {
		position: absolute;
		top: 16px;
		right: 16px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		width: 300px;
		max-height: 80vh;
		overflow-y: auto;
		z-index: 100;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		border-bottom: 1px solid #e9ecef;
		background: #f8f9fa;
		border-radius: 8px 8px 0 0;
	}

	.panel-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #495057;
	}

	.panel-header button {
		background: none;
		border: none;
		font-size: 18px;
		color: #6c757d;
		cursor: pointer;
		padding: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.panel-header button:hover {
		color: #495057;
	}

	.panel-content {
		padding: 16px;
	}

	.detail-item {
		margin-bottom: 12px;
		font-size: 14px;
		line-height: 1.4;
	}

	.detail-item strong {
		color: #495057;
	}

	.panel-actions {
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px solid #e9ecef;
	}

	.panel-actions button {
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 8px 16px;
		font-size: 14px;
		cursor: pointer;
		width: 100%;
	}

	.panel-actions button:hover {
		background: #0056b3;
	}

	/* Zoom Indicator */
	.zoom-indicator {
		position: absolute;
		bottom: 16px;
		right: 16px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		z-index: 100;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.controls-panel {
			position: static;
			margin-bottom: 16px;
			width: 100%;
			max-width: none;
		}

		.legend {
			position: static;
			margin-top: 16px;
			max-width: none;
		}

		.node-details-panel {
			position: static;
			width: 100%;
			max-width: none;
			margin-top: 16px;
		}

		.zoom-indicator {
			position: static;
			margin-top: 16px;
			display: inline-block;
		}
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.controls-panel,
		.spinner {
			transition: none;
			animation: none;
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: high) {
		.knowledge-map-container {
			background: #ffffff;
			border: 2px solid #000000;
		}

		.controls-panel,
		.legend,
		.node-details-panel {
			border: 2px solid #000000;
		}

		.legend-circle,
		.legend-line {
			border: 1px solid #000000;
		}
	}

	/* Print styles */
	@media print {
		.controls-panel,
		.node-details-panel,
		.zoom-indicator {
			display: none;
		}

		.knowledge-map-container {
			box-shadow: none;
			border: 1px solid #000000;
		}
	}
</style>
