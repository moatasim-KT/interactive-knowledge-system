<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		KnowledgeMap,
		KnowledgeMapNode,
		KnowledgeMapConnection,
		ContentGraph
	} from '../types/relationships.js';
	import type { ContentModule } from '../types/content.js';

	interface Props {
		modules: ContentModule[];
		completedContent: Set<string>;
		currentContent?: string | null;
		width?: number;
		height?: number;
		onNodeClick?: (nodeId: string) => void;
		onNodeHover?: (nodeId: string | null) => void;
	}

	let {
		modules,
		completedContent,
		currentContent = null,
		width = 800,
		height = 600,
		onNodeClick,
		onNodeHover
	}: Props = $props();

	let svg_element;
	let nodes: KnowledgeMapNode[] = $state([]);
	let connections: KnowledgeMapConnection[] = $state([]);
	let hovered_node = $state(null);
	let selected_node = $state(currentContent);

	// Layout configuration
	const node_radius = 20;
	const connection_stroke_width = 2;
	const colors = {
		completed: '#22c55e',
		current: '#3b82f6',
		available: '#f59e0b',
		locked: '#6b7280'
	};

	onMount(() => {
		initialize_map();
	});

	/**
	 * Initialize the knowledge map with nodes and connections
	 */
	function initialize_map() {
		// Create nodes from modules
		nodes = modules.map((module, index) => {
			const status = get_node_status(module.id);
			const angle = (index / modules.length) * 2 * Math.PI;
			const radius = Math.min(width, height) * 0.3;
			const center_x = width / 2;
			const center_y = height / 2;

			return {
				id: module.id,
				contentId: module.id,
				title: module.title,
				type: 'concept',
				status,
				position: {
					x: center_x + Math.cos(angle) * radius,
					y: center_y + Math.sin(angle) * radius
				},
				size: node_radius,
				color: colors[status]
			};
		});

		// Create connections based on relationships
		connections = [];
		let connection_id = 0;

		for (const module of modules) {
			// Create connections for prerequisites
			for (const prereq_id of module.metadata.prerequisites) {
				if (modules.some((m) => m.id === prereq_id)) {
					connections.push({
						id: `conn-${connection_id++}`,
						sourceId: prereq_id,
						targetId: module.id,
						type: 'prerequisite',
						strength: 1.0,
						style: 'solid',
						color: '#6b7280'
					});
				}
			}

			// Create connections for related content (based on shared tags)
			for (const other_module of modules) {
				if (module.id !== other_module.id) {
					const shared_tags = module.metadata.tags.filter((tag) =>
						other_module.metadata.tags.includes(tag)
					);

					if (shared_tags.length >= 2) {
						const strength =
							shared_tags.length /
							Math.max(module.metadata.tags.length, other_module.metadata.tags.length);

						connections.push({
							id: `conn-${connection_id++}`,
							sourceId: module.id,
							targetId: other_module.id,
							type: 'related',
							strength,
							style: 'dashed',
							color: '#94a3b8'
						});
					}
				}
			}
		}

		// Apply force-directed layout
		apply_force_directed_layout();
	}

	/**
	 * Get the status of a node based on completion and prerequisites
	 */
	function get_node_status(node_id): 'locked' | 'available' | 'in-progress' | 'completed' {
		if (completedContent.has(node_id)) {
			return 'completed';
		}

		if (node_id === currentContent) {
			return 'in-progress';
		}

		const module = modules.find((m) => m.id === node_id);
		if (!module) return 'locked';

		// Check if all prerequisites are completed
		const all_prerequisites_met = module.metadata.prerequisites.every((prereq_id) =>
			completedContent.has(prereq_id)
		);

		return all_prerequisites_met ? 'available' : 'locked';
	}

	/**
	 * Apply a simple force-directed layout algorithm
	 */
	function apply_force_directed_layout() {
		const iterations = 100;
		const repulsion_strength = 1000;
		const attraction_strength = 0.1;
		const damping = 0.9;

		for (let iter = 0; iter < iterations; iter++) {
			// Calculate forces
			for (const node of nodes) {
				let fx = 0;
				let fy = 0;

				// Repulsion from other nodes
				for (const other of nodes) {
					if (node.id === other.id) continue;

					const dx = node.position.x - other.position.x;
					const dy = node.position.y - other.position.y;
					const distance = Math.sqrt(dx * dx + dy * dy);

					if (distance > 0) {
						const force = repulsion_strength / (distance * distance);
						fx += (dx / distance) * force;
						fy += (dy / distance) * force;
					}
				}

				// Attraction from connected nodes
				for (const connection of connections) {
					let connected_node;
					let is_source = false;

					if (connection.sourceId === node.id) {
						connected_node = nodes.find((n) => n.id === connection.targetId);
						is_source = true;
					} else if (connection.targetId === node.id) {
						connected_node = nodes.find((n) => n.id === connection.sourceId);
					}

					if (connected_node) {
						const dx = connected_node.position.x - node.position.x;
						const dy = connected_node.position.y - node.position.y;
						const distance = Math.sqrt(dx * dx + dy * dy);

						if (distance > 0) {
							const force = attraction_strength * connection.strength;
							fx += (dx / distance) * force;
							fy += (dy / distance) * force;
						}
					}
				}

				// Apply forces with damping
				node.position.x += fx * damping;
				node.position.y += fy * damping;

				// Keep nodes within bounds
				node.position.x = Math.max(node_radius, Math.min(width - node_radius, node.position.x));
				node.position.y = Math.max(node_radius, Math.min(height - node_radius, node.position.y));
			}
		}
	}

	/**
	 * Handle node click
	 */
	function handle_node_click(node_id) {
		selected_node = node_id;
		onNodeClick?.(node_id);
	}

	/**
	 * Handle node hover
	 */
	function handle_node_hover(node_id) {
		hovered_node = node_id;
		onNodeHover?.(node_id);
	}

	/**
	 * Get connection path for SVG
	 */
	function get_connection_path(connection: KnowledgeMapConnection): string {
		const source_node = nodes.find((n) => n.id === connection.sourceId);
		const target_node = nodes.find((n) => n.id === connection.targetId);

		if (!source_node || !target_node) return '';

		// Calculate arrow position (stop at node edge)
		const dx = target_node.position.x - source_node.position.x;
		const dy = target_node.position.y - source_node.position.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance === 0) return '';

		const unit_x = dx / distance;
		const unit_y = dy / distance;

		const start_x = source_node.position.x + unit_x * node_radius;
		const start_y = source_node.position.y + unit_y * node_radius;
		const end_x = target_node.position.x - unit_x * node_radius;
		const end_y = target_node.position.y - unit_y * node_radius;

		return `M ${start_x} ${start_y} L ${end_x} ${end_y}`;
	}

	/**
	 * Get arrow marker path
	 */
	function get_arrow_path(connection: KnowledgeMapConnection): string {
		const source_node = nodes.find((n) => n.id === connection.sourceId);
		const target_node = nodes.find((n) => n.id === connection.targetId);

		if (!source_node || !target_node) return '';

		const dx = target_node.position.x - source_node.position.x;
		const dy = target_node.position.y - source_node.position.y;
		const distance = Math.sqrt(dx * dx + dy * dy);

		if (distance === 0) return '';

		const unit_x = dx / distance;
		const unit_y = dy / distance;

		const arrow_x = target_node.position.x - unit_x * node_radius;
		const arrow_y = target_node.position.y - unit_y * node_radius;

		const arrow_size = 8;
		const perp_x = -unit_y * arrow_size;
		const perp_y = unit_x * arrow_size;

		return `M ${arrow_x} ${arrow_y} L ${arrow_x - unit_x * arrow_size + perp_x} ${arrow_y - unit_y * arrow_size + perp_y} L ${arrow_x - unit_x * arrow_size - perp_x} ${arrow_y - unit_y * arrow_size - perp_y} Z`;
	}

	/**
	 * Get node title for display
	 */
	function get_node_title(node: KnowledgeMapNode): string {
		const module = modules.find((m) => m.id === node.id);
		return module ? module.title : node.title;
	}

	/**
	 * Get node description for tooltip
	 */
	function get_node_description(node: KnowledgeMapNode): string {
		const module = modules.find((m) => m.id === node.id);
		if (!module) return '';

		const status = get_node_status(node.id);
		const status_text = {
			completed: 'Completed',
			'in-progress': 'In Progress',
			available: 'Available',
			locked: 'Locked'
		}[status];

		return `${module.description}\nStatus: ${status_text}\nDifficulty: ${module.metadata.difficulty}/5\nTags: ${module.metadata.tags.join(', ')}`;
	}
</script>

<div class="knowledge-map" style="width: {width}px; height: {height}px;">
	<svg bind:this={svgElement} {width} {height} class="map-svg">
		<!-- Define arrow markers -->
		<defs>
			<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
				<polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
			</marker>
		</defs>

		<!-- Render connections -->
		{#each connections as connection (connection.id)}
			<path
				d={get_connection_path(connection)}
				stroke={connection.color}
				stroke-width={connection_stroke_width * connection.strength}
				stroke-dasharray={connection.style === 'dashed'
					? '5,5'
					: connection.style === 'dotted'
						? '2,2'
						: 'none'}
				fill="none"
				marker-end={connection.type === 'prerequisite' ? 'url(#arrowhead)' : 'none'}
				opacity={hovered_node &&
				(hovered_node === connection.sourceId || hovered_node === connection.targetId)
					? 1
					: 0.6}
			/>
		{/each}

		<!-- Render nodes -->
		{#each nodes as node (node.id)}
			<g class="node-group">
				<circle
					cx={node.position.x}
					cy={node.position.y}
					r={node.size}
					fill={node.color}
					stroke={selected_node === node.id ? '#1f2937' : 'white'}
					stroke-width={selected_node === node.id ? 3 : 2}
					class="node-circle"
					class:hovered={hovered_node === node.id}
					onclick={() => handle_node_click(node.id)}
					onmouseenter={() => handle_node_hover(node.id)}
					onmouseleave={() => handle_node_hover(null)}
				/>

				<!-- Node label -->
				<text
					x={node.position.x}
					y={node.position.y + node.size + 15}
					text-anchor="middle"
					class="node-label"
					class:selected={selected_node === node.id}
				>
					{get_node_title(node).length > 15
						? get_node_title(node).substring(0, 15) + '...'
						: get_node_title(node)}
				</text>

				<!-- Tooltip on hover -->
				{#if hovered_node === node.id}
					<foreignObject
						x={node.position.x + node.size + 10}
						y={node.position.y - 30}
						width="200"
						height="100"
						class="tooltip"
					>
						<div class="tooltip-content">
							<h4>{get_node_title(node)}</h4>
							<p>{get_node_description(node)}</p>
						</div>
					</foreignObject>
				{/if}
			</g>
		{/each}
	</svg>

	<!-- Legend -->
	<div class="legend">
		<div class="legend-item">
			<div class="legend-color" style="background-color: {colors.completed}"></div>
			<span>Completed</span>
		</div>
		<div class="legend-item">
			<div class="legend-color" style="background-color: {colors.current}"></div>
			<span>Current</span>
		</div>
		<div class="legend-item">
			<div class="legend-color" style="background-color: {colors.available}"></div>
			<span>Available</span>
		</div>
		<div class="legend-item">
			<div class="legend-color" style="background-color: {colors.locked}"></div>
			<span>Locked</span>
		</div>
	</div>
</div>

<style>
	.knowledge-map {
		position: relative;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #f9fafb;
		overflow: hidden;
	}

	.map-svg {
		display: block;
	}

	.node-circle {
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.node-circle:hover,
	.node-circle.hovered {
		transform: scale(1.1);
		filter: brightness(1.1);
	}

	.node-label {
		font-size: 12px;
		font-weight: 500;
		fill: #374151;
		pointer-events: none;
		transition: all 0.2s ease;
	}

	.node-label.selected {
		font-weight: 700;
		fill: #1f2937;
	}

	.tooltip {
		pointer-events: none;
		z-index: 10;
	}

	.tooltip-content {
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 8px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		font-size: 12px;
		max-width: 200px;
	}

	.tooltip-content h4 {
		margin: 0 0 4px 0;
		font-weight: 600;
		color: #1f2937;
	}

	.tooltip-content p {
		margin: 0;
		color: #6b7280;
		white-space: pre-line;
	}

	.legend {
		position: absolute;
		top: 10px;
		right: 10px;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		padding: 8px;
		font-size: 12px;
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
		margin-right: 6px;
	}
</style>
