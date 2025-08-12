<script lang="ts">
	import type { VisualizationConfig } from '$lib/types/web-content.js';

	interface Props {
		data: any;
		config: VisualizationConfig;
		onInteraction?: (event: { type: string; [key: string]: any }) => void;
	}

	let { data, config, onInteraction }: Props = $props();

	let chart_container = $state<HTMLElement>();
	let is_zoomed = $state(false);
	let zoom_level = $state(1);
	let hovered_point = $state<any>(null);
	let tooltip = $state<{ x: number; y: number; content: string } | null>(null);

	// Chart dimensions
	const width = $derived(() => config.layout?.width || 600);
	const height = $derived(() => config.layout?.height || 400);
	const margin = $derived(() => config.layout?.margin || { top: 20, right: 20, bottom: 40, left: 40 });

	// Calculate inner dimensions
	const inner_width = $derived(() => width() - margin().left - margin().right);
	const inner_height = $derived(() => height() - margin().top - margin().bottom);

	// Sample data processing (this would be more sophisticated in a real implementation)
	const processed_data = $derived(() => process_chart_data(data));

	function process_chart_data(raw_data) {
		if (!raw_data) return [];

		// Handle different data formats
		if (Array.isArray(raw_data)) {
			return raw_data.map((item, index) => ({
				x: item.x || index,
				y: item.y || item.value || item,
				label: item.label || `Point ${index + 1}`,
				...item
			}));
		}

		// Handle object data
		if (typeof raw_data === 'object') {
			return Object.entries(raw_data).map(([key, value]) => ({
				x: key,
				y: value,
				label: key
			}));
		}

		return [];
	}

	// Scale functions (simplified linear scales)
	function create_xscale(data: any[]) {
		if (!data.length) return (x: any) => 0;

		const domain = data.map((d) => d.x);
		const is_numeric = domain.every((x) => typeof x === 'number');

		if (is_numeric) {
			const min = Math.min(...domain);
			const max = Math.max(...domain);
			return (x: number) => ((x - min) / (max - min)) * inner_width();
		} else {
			return (x: any, index: number) => (index / (domain.length - 1)) * inner_width();
		}
	}

	function create_yscale(data: any[]) {
		if (!data.length) return (y: any) => inner_height;

		const values = data.map((d) => d.y).filter((y) => typeof y === 'number');
		const min = Math.min(...values);
		const max = Math.max(...values);

		return (y: number) => inner_height() - ((y - min) / (max - min)) * inner_height();
	}

	const x_scale = $derived(() => create_xscale(processed_data()));
	const y_scale = $derived(() => create_yscale(processed_data()));

	// Handle mouse events
	function handle_mouse_move(event: MouseEvent) {
		if (!chart_container) return;
		const rect = chart_container.getBoundingClientRect();
		const x = event.clientX - rect.left - margin().left;
		const y = event.clientY - rect.top - margin().top;

		// Find closest data point
		const closest = find_closest_point(x, y);
		if (closest) {
			hovered_point = closest;
			tooltip = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
				content: `${closest.label}: ${closest.y}`
			};

			onInteraction?.({
				type: 'hover',
				point: closest,
				coordinates: { x, y }
			});
		}
	}

	function handle_mouse_leave() {
		hovered_point = null;
		tooltip = null;
		onInteraction?.({ type: 'hover-end' });
	}

	function handle_click(event: MouseEvent) {
		if (!chart_container) return;
		const rect = chart_container.getBoundingClientRect();
		const x = event.clientX - rect.left - margin().left;
		const y = event.clientY - rect.top - margin().top;

		const closest = find_closest_point(x, y);
		if (closest) {
			onInteraction?.({
				type: 'click',
				point: closest,
				coordinates: { x, y }
			});
		}
	}

	function handle_wheel(event: WheelEvent) {
		event.preventDefault();

		const delta = event.deltaY > 0 ? 0.9 : 1.1;
		zoom_level = Math.max(0.5, Math.min(3, zoom_level * delta));
		is_zoomed = zoom_level !== 1;

		onInteraction?.({
			type: 'zoom',
			zoomLevel: zoom_level,
			isZoomed: is_zoomed
		});
	}

	function find_closest_point(mouse_x: number, mouse_y: number) {
		const data = processed_data();
		if (!data.length) return null;

		let closest = data[0];
		let min_distance = Infinity;

		data.forEach((point, index) => {
			const px = typeof x_scale() === 'function' ? x_scale()(point.x, index) : x_scale()(point.x);
			const py = y_scale()(point.y);
			const distance = Math.sqrt((mouse_x - px) ** 2 + (mouse_y - py) ** 2);

			if (distance < min_distance) {
				min_distance = distance;
				closest = point;
			}
		});

		return min_distance < 20 ? closest : null;
	}

	function reset_zoom() {
		zoom_level = 1;
		is_zoomed = false;
		onInteraction?.({ type: 'zoom-reset' });
	}

	// Initialize chart when mounted
	$effect(() => {
		if (chart_container) {
			onInteraction?.({ type: 'mount', config });
		}
	});
</script>

<div
	class="interactive-chart"
	bind:this={chart_container}
	onmousemove={handle_mouse_move}
	onmouseleave={handle_mouse_leave}
	onclick={handle_click}
	onwheel={handle_wheel}
	role="img"
	aria-label={config.title || 'Interactive Chart'}
>
	<!-- Chart Controls -->
	<div class="chart-controls">
		{#if is_zoomed}
			<button class="zoom-reset-btn" onclick={reset_zoom} type="button"> Reset Zoom </button>
		{/if}
		<span class="zoom-indicator">Zoom: {Math.round(zoom_level * 100)}%</span>
	</div>

	<!-- SVG Chart -->
	<svg
		width={width()}
		height={height()}
		class="chart-svg"
		style="transform: scale({zoom_level}); transform-origin: center;"
	>
		<!-- Chart background -->
		<rect
			x={margin().left}
			y={margin().top}
			width={inner_width()}
			height={inner_height()}
			fill="var(--chart-bg, #fafafa)"
			stroke="var(--chart-border, #e1e5e9)"
		/>

		<!-- Grid lines -->
		<g class="grid">
			{#each Array(5) as _, i (i)}
				<line
					x1={margin().left}
					y1={margin().top + (i * inner_height()) / 4}
					x2={margin().left + inner_width()}
					y2={margin().top + (i * inner_height()) / 4}
					stroke="var(--grid-color, #e9ecef)"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}
			{#each Array(5) as _, i (i)}
				<line
					x1={margin().left + (i * inner_width()) / 4}
					y1={margin().top}
					x2={margin().left + (i * inner_width()) / 4}
					y2={margin().top + inner_height()}
					stroke="var(--grid-color, #e9ecef)"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}
		</g>

		<!-- Data points and lines -->
		<g class="data-layer" transform="translate({margin().left}, {margin().top})">
			<!-- Line chart -->
			{#if processed_data().length > 1}
				<path
					d={processed_data()
						.map((point, index) => {
							const x = typeof x_scale() === 'function' ? x_scale()(point.x, index) : x_scale()(point.x);
							const y = y_scale()(point.y);
							return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
						})
						.join(' ')}
					fill="none"
					stroke="var(--chart-line-color, #0066cc)"
					stroke-width="2"
				/>
			{/if}

			<!-- Data points -->
			{#each processed_data() as point, index (point.label || index)}
				{@const x = typeof x_scale() === 'function' ? x_scale()(point.x, index) : x_scale()(point.x)}
				{@const y = y_scale()(point.y)}
				<circle
					cx={x}
					cy={y}
					r={hovered_point === point ? 6 : 4}
					fill={hovered_point === point
						? 'var(--chart-point-hover, #ff6b35)'
						: 'var(--chart-point-color, #0066cc)'}
					stroke="var(--chart-point-stroke, #ffffff)"
					stroke-width="2"
					class="data-point"
					class:hovered={hovered_point === point}
				/>
			{/each}
		</g>

		<!-- Axes -->
		<g class="axes">
			<!-- X-axis -->
			<line
				x1={margin().left}
				y1={margin().top + inner_height()}
				x2={margin().left + inner_width()}
				y2={margin().top + inner_height()}
				stroke="var(--axis-color, #333333)"
				stroke-width="2"
			/>

			<!-- Y-axis -->
			<line
				x1={margin().left}
				y1={margin().top}
				x2={margin().left}
				y2={margin().top + inner_height()}
				stroke="var(--axis-color, #333333)"
				stroke-width="2"
			/>
		</g>
	</svg>

	<!-- Tooltip -->
	{#if tooltip}
		<div class="chart-tooltip" style="left: {tooltip.x + 10}px; top: {tooltip.y - 10}px;">
			{tooltip.content}
		</div>
	{/if}
</div>

<style>
	.interactive-chart {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		background: var(--chart-container-bg, #ffffff);
		border-radius: 6px;
		padding: 1rem;
		cursor: crosshair;
	}

	.chart-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: var(--controls-bg, #f8f9fa);
		border-radius: 4px;
		font-size: 0.875rem;
	}

	.zoom-reset-btn {
		background: var(--button-bg, #0066cc);
		color: var(--button-text, #ffffff);
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background-color 0.2s;
	}

	.zoom-reset-btn:hover {
		background: var(--button-hover-bg, #0052a3);
	}

	.zoom-indicator {
		color: var(--text-secondary, #666666);
		font-size: 0.8rem;
	}

	.chart-svg {
		transition: transform 0.2s ease;
		overflow: visible;
	}

	.data-point {
		transition:
			r 0.2s ease,
			fill 0.2s ease;
		cursor: pointer;
	}

	.data-point:hover {
		r: 6;
	}

	.chart-tooltip {
		position: absolute;
		background: var(--tooltip-bg, rgba(0, 0, 0, 0.8));
		color: var(--tooltip-text, #ffffff);
		padding: 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		pointer-events: none;
		z-index: 10;
		white-space: nowrap;
	}

	.chart-tooltip::before {
		content: '';
		position: absolute;
		top: 100%;
		left: 10px;
		border: 4px solid transparent;
		border-top-color: var(--tooltip-bg, rgba(0, 0, 0, 0.8));
	}

	@media (max-width: 768px) {
		.interactive-chart {
			padding: 0.5rem;
		}

		.chart-controls {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.zoom-reset-btn {
			align-self: flex-start;
		}
	}
</style>
