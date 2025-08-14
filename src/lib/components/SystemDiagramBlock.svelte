<script lang="ts">
	import type { SystemDiagramBlock } from '$lib/types/web-content.js';
	import ParameterControls from './ParameterControls.svelte';

	interface Props {
		block: SystemDiagramBlock;
		editable?: boolean;
		onparameterchange?: (event: CustomEvent) => void;
		onelementclick?: (event: CustomEvent) => void;
		onelementhover?: (event: CustomEvent) => void;
		ondiagramreset?: (event: CustomEvent) => void;
		ondiagramexport?: (event: CustomEvent) => void;
		ondiagramerror?: (event: CustomEvent) => void;
	}

	import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher<{
			parameterChange: { parameter: string; value: any };
			diagramerror: { error: string };
			elementclick: { elementId: string; element: any; state: any; blockId: string };
			elementhover: { elementId: string; element: any; state: any; blockId: string };
			diagramreset: Record<string, never>;
			diagramexport: { format: string };
		}>();

let { 
		block, 
		editable = false
		}: Props = $props();

	let svg_container = $state<SVGSVGElement>();
	let diagram_state = $state({ ...block.content.initialState });
	let selected_element = $state<string | null>(null);
	let hover_element = $state<string | null>(null);

	// Convert parameters to the format expected by ParameterControls
	const parameters = $derived(() => block.content.parameters.map((param) => ({
		name: param.name,
		type: param.type,
		default: param.default,
		description: param.description,
		constraints: {
			min: param.min,
			max: param.max,
			step: param.step,
			options: param.options
		}
	})));

	// Handle parameter changes
	function handle_parameter_change(event: CustomEvent) {
		const { parameter, value } = event.detail;

		// Update diagram parameters
		const param_index = block.content.parameters.findIndex((p) => p.name === parameter);
		if (param_index >= 0) {
			block.content.parameters[param_index].default = value;
		}

		// Update diagram state based on parameter change
		update_diagram_state();
		render_diagram();

		dispatch('parameterChange', { parameter, value });
	}

	// Update diagram state based on current parameters
	function update_diagram_state() {
		const parameter_values = block.content.parameters.reduce(
			(acc, param) => {
				acc[param.name] = param.default;
				return acc;
			},
			{} as Record<string, any>
		);

		// Apply parameter changes to diagram state
		try {
			if (block.content.updateFunction) {
				const update_function = new Function('state', 'parameters', block.content.updateFunction);
				diagram_state = update_function(diagram_state, parameter_values) || diagram_state;
			}
		} catch (error) {
			dispatch('diagramerror', { error: (error as Error).message });
		}
	}

	// Handle element clicks
	function handle_element_click(element_id: string, event: MouseEvent) {
		event.stopPropagation();
		selected_element = selected_element === element_id ? null : element_id;

		// Find element data
		const element = block.content.elements.find((el) => el.id === element_id);
		if (element) {
			dispatch('elementclick', {
				elementId: element_id,
				element,
				state: diagram_state,
				blockId: block.id
			});
		}
	}

	// Handle element hover
	function handle_element_hover(element_id: string | null) {
		hover_element = element_id;

		if (element_id) {
			const element = block.content.elements.find((el) => el.id === element_id);
			if (element) {
							dispatch('elementhover', {
				elementId: element_id,
				element,
				state: diagram_state,
				blockId: block.id
			});
			}
		}
	}

	// Render the diagram
	function render_diagram() {
		if (!svg_container) return;

		// Clear existing content

		while (svg_container.firstChild) {
			// eslint-disable-next-line svelte/no-dom-manipulating
			svg_container.removeChild(svg_container.firstChild);
		}

		// Set up SVG dimensions
		const width = block.content.layout.width;
		const height = block.content.layout.height;
		svg_container.setAttribute('viewBox', `0 0 ${width} ${height}`);

		// Render elements
		block.content.elements.forEach((element) => {
			render_element(element);
		});

		// Render connections
		block.content.connections.forEach((connection) => {
			render_connection(connection);
		});
	}

	// Render a single element
	function render_element(element: any) {
		const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		group.setAttribute('class', `diagram-element element-${element.type}`);
		group.setAttribute('data-element-id', element.id);

		// Apply state-based transformations
		const state_value = diagram_state[element.id];
		const opacity = state_value?.opacity ?? element.style.opacity ?? 1;
		const scale = state_value?.scale ?? element.style.scale ?? 1;

		group.setAttribute('opacity', opacity.toString());
		group.setAttribute(
			'transform',
			`translate(${element.position.x}, ${element.position.y}) scale(${scale})`
		);

		// Create element based on type
		let shape: SVGElement;

		switch (element.type) {
			case 'rectangle':
				shape = create_rectangle(element);
				break;
			case 'circle':
				shape = create_circle(element);
				break;
			case 'text':
				shape = create_text(element);
				break;
			case 'image':
				shape = create_image(element);
				break;
			default:
				shape = create_rectangle(element); // fallback
		}

		// Add interactivity
		shape.style.cursor = 'pointer';
		shape.onclick = (e) => handle_element_click(element.id, e);
		shape.onmouseenter = () => handle_element_hover(element.id);
		shape.onmouseleave = () => handle_element_hover(null);

		// Apply selection and hover styles
		if (selected_element === element.id) {
			shape.setAttribute('stroke', '#0066cc');
			shape.setAttribute('stroke-width', '3');
		}
		if (hover_element === element.id) {
			shape.setAttribute('filter', 'brightness(1.1)');
		}

		group.appendChild(shape);

		// Add label if present
		if (element.label) {
			const label = create_text({
				...element,
				text: element.label,
				position: { x: 0, y: element.size.height + 20 },
				style: { ...element.style, fontSize: 12, textAnchor: 'middle' }
			});
			group.appendChild(label);
		}

		if (svg_container) {
			// eslint-disable-next-line svelte/no-dom-manipulating
			svg_container.appendChild(group);
		}
	}

	// Create rectangle element
	function create_rectangle(element: any): SVGRectElement {
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('width', element.size.width.toString());
		rect.setAttribute('height', element.size.height.toString());
		rect.setAttribute('fill', element.style.fill || '#e9ecef');
		rect.setAttribute('stroke', element.style.stroke || '#6c757d');
		rect.setAttribute('stroke-width', element.style.strokeWidth?.toString() || '1');
		rect.setAttribute('rx', element.style.borderRadius?.toString() || '4');
		return rect;
	}

	// Create circle element
	function create_circle(element: any): SVGCircleElement {
		const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute('cx', (element.size.width / 2).toString());
		circle.setAttribute('cy', (element.size.height / 2).toString());
		circle.setAttribute('r', (Math.min(element.size.width, element.size.height) / 2).toString());
		circle.setAttribute('fill', element.style.fill || '#e9ecef');
		circle.setAttribute('stroke', element.style.stroke || '#6c757d');
		circle.setAttribute('stroke-width', element.style.strokeWidth?.toString() || '1');
		return circle;
	}

	// Create text element
	function create_text(element: any): SVGTextElement {
		const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('x', (element.size?.width / 2 || 0).toString());
		text.setAttribute('y', (element.size?.height / 2 || 0).toString());
		text.setAttribute('text-anchor', element.style.textAnchor || 'middle');
		text.setAttribute('dominant-baseline', 'central');
		text.setAttribute('fill', element.style.fill || '#1a1a1a');
		text.setAttribute('font-size', element.style.fontSize?.toString() || '14');
		text.setAttribute('font-family', element.style.fontFamily || 'Arial, sans-serif');
		text.textContent = element.text || element.label || '';
		return text;
	}

	// Create image element
	function create_image(element: any): SVGImageElement {
		const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
		image.setAttribute('width', element.size.width.toString());
		image.setAttribute('height', element.size.height.toString());
		image.setAttribute('href', element.src || '');
		return image;
	}

	// Render connection between elements
	function render_connection(connection: any) {
		const from_element = block.content.elements.find((el) => el.id === connection.from);
		const to_element = block.content.elements.find((el) => el.id === connection.to);

		if (!from_element || !to_element) return;

		const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

		// Calculate connection points
		const from_x = from_element.position.x + from_element.size.width / 2;
		const from_y = from_element.position.y + from_element.size.height / 2;
		const to_x = to_element.position.x + to_element.size.width / 2;
		const to_y = to_element.position.y + to_element.size.height / 2;

		line.setAttribute('x1', from_x.toString());
		line.setAttribute('y1', from_y.toString());
		line.setAttribute('x2', to_x.toString());
		line.setAttribute('y2', to_y.toString());
		line.setAttribute('stroke', connection.style?.stroke || '#6c757d');
		line.setAttribute('stroke-width', connection.style?.strokeWidth?.toString() || '2');
		line.setAttribute('marker-end', connection.arrow ? 'url(#arrowhead)' : '');

		if (svg_container) {
			// eslint-disable-next-line svelte/no-dom-manipulating
			svg_container.appendChild(line);
		}
	}

	// Reset diagram to initial state
	function reset_diagram() {
		diagram_state = { ...block.content.initialState };
		selected_element = null;
		hover_element = null;
		render_diagram();
		dispatch('diagramreset', {});
	}

	// Export diagram as SVG
	function export_diagram() {
		if (!svg_container) return;

		const svg_data = new XMLSerializer().serializeToString(svg_container);
		const blob = new Blob([svg_data], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = `${block.content.diagramType}-diagram.svg`;
		link.click();

		URL.revokeObjectURL(url);
		dispatch('diagramexport', { format: 'svg' });
	}

	// Initialize diagram on mount
	$effect(() => {
		if (svg_container) {
			render_diagram();
		}
	});

	// Re-render when block content changes
	$effect(() => {
		if (block && svg_container) {
			render_diagram();
		}
	});
</script>

<div class="system-diagram-block" data-block-id={block.id}>
	<header class="diagram-header">
		<div class="diagram-title-section">
			<h3 class="diagram-title">
				{block.content.diagramType} System Diagram
			</h3>
			<div class="diagram-actions">
				<button
					class="action-btn reset-btn"
					onclick={reset_diagram}
					type="button"
					title="Reset diagram"
				>
					🔄 Reset
				</button>
				<button
					class="action-btn export-btn"
					onclick={export_diagram}
					type="button"
					title="Export as SVG"
				>
					📥 Export
				</button>
			</div>
		</div>
		{#if block.content.description}
			<p class="diagram-description">{block.content.description}</p>
		{/if}
	</header>

	<div class="diagram-content">
		<!-- Parameter Controls -->
		{#if parameters.length > 0}
			<div class="parameters-section">
				<h4 class="section-title">Parameters</h4>
				<ParameterControls parameters={parameters()} onParameterChange={(p) => handle_parameter_change(new CustomEvent('parameterchange', { detail: p }))} />
			</div>
		{/if}

		<!-- Diagram Display -->
		<div class="diagram-display">
			<svg
				bind:this={svg_container}
				class="system-diagram-svg"
				width="100%"
				height="400"
				preserveAspectRatio="xMidYMid meet"
			>
				<!-- Arrow marker definition -->
				<defs>
					<marker
						id="arrowhead"
						markerWidth="10"
						markerHeight="7"
						refX="9"
						refY="3.5"
						orient="auto"
					>
						<polygon points="0 0, 10 3.5, 0 7" fill="#6c757d" />
					</marker>
				</defs>
			</svg>
		</div>

		<!-- Element Information Panel -->
		{#if selected_element}
			{@const element = block.content.elements.find((el) => el.id === selected_element)}
			{#if element}
				<div class="element-info-panel">
					<h4 class="info-title">Element Information</h4>
					<div class="info-content">
						<div class="info-item">
							<span class="info-label">ID:</span>
							<span class="info-value">{element.id}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Type:</span>
							<span class="info-value">{element.type}</span>
						</div>
						{#if element.label}
							<div class="info-item">
								<span class="info-label">Label:</span>
								<span class="info-value">{element.label}</span>
							</div>
						{/if}
						{#if element.description}
							<div class="info-item">
								<span class="info-label">Description:</span>
								<span class="info-value">{element.description}</span>
							</div>
						{/if}
						{#if diagram_state[element.id]}
							<div class="info-item">
								<span class="info-label">State:</span>
								<span class="info-value">{JSON.stringify(diagram_state[element.id])}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Source Attribution -->
		{#if block.content.sourceReference}
			<div class="source-attribution">
				<small>
					<strong>Source:</strong>
					<a href={block.content.sourceReference.originalUrl} target="_blank" rel="noopener">
						{block.content.sourceReference.originalUrl}
					</a>
					<br />
					<em>Transformation: {block.content.sourceReference.transformationReasoning}</em>
					<br />
					<span class="confidence-score">
						Confidence: {Math.round(block.content.sourceReference.confidence * 100)}%
					</span>
				</small>
			</div>
		{/if}
	</div>
</div>

<style>
	.system-diagram-block {
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1rem 0;
		background: var(--bg-color, #ffffff);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.diagram-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.diagram-title-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.diagram-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.diagram-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		background: var(--button-bg, #0066cc);
		color: var(--button-text, #ffffff);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.action-btn:hover {
		background: var(--button-hover-bg, #0052a3);
		transform: translateY(-1px);
	}

	.diagram-description {
		margin: 0.5rem 0 0 0;
		color: var(--text-secondary, #666666);
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.diagram-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.parameters-section {
		background: var(--section-bg, #f8f9fa);
		border-radius: 6px;
		padding: 1rem;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.section-title {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.diagram-display {
		background: var(--diagram-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		padding: 1rem;
		min-height: 400px;
	}

	.system-diagram-svg {
		width: 100%;
		height: 100%;
		border-radius: 4px;
	}

	:global(.diagram-element) {
		transition: all 0.2s ease;
	}

	:global(.diagram-element:hover) {
		filter: brightness(1.05);
	}

	.element-info-panel {
		background: var(--info-panel-bg, #f8f9fa);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		padding: 1rem;
	}

	.info-title {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.info-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		padding: 0.25rem 0;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.info-item:last-child {
		border-bottom: none;
	}

	.info-label {
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		min-width: 80px;
	}

	.info-value {
		color: var(--text-secondary, #666666);
		font-family: monospace;
		font-size: 0.9rem;
		word-break: break-all;
		text-align: right;
	}

	.source-attribution {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-light, #e9ecef);
		color: var(--text-secondary, #666666);
		font-size: 0.8rem;
		line-height: 1.4;
	}

	.source-attribution a {
		color: var(--link-color, #0066cc);
		text-decoration: none;
	}

	.source-attribution a:hover {
		text-decoration: underline;
	}

	.confidence-score {
		color: var(--text-muted, #999999);
		font-weight: 500;
	}

	@media (max-width: 768px) {
		.system-diagram-block {
			padding: 1rem;
		}

		.diagram-title-section {
			flex-direction: column;
			align-items: flex-start;
		}

		.diagram-title {
			font-size: 1.25rem;
		}

		.diagram-actions {
			width: 100%;
			justify-content: center;
		}

		.action-btn {
			flex: 1;
		}

		.parameters-section {
			padding: 0.75rem;
		}

		.diagram-display {
			padding: 0.75rem;
			min-height: 300px;
		}

		.info-item {
			flex-direction: column;
			align-items: stretch;
			gap: 0.25rem;
		}

		.info-value {
			text-align: left;
		}
	}
</style>
