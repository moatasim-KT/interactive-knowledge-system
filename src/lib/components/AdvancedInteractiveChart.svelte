<script lang="ts">
	import type { ChartData, DataFilter, ChartInteraction } from '$lib/types/web-content.js';
	import { createEventDispatcher, onMount } from 'svelte';

	export let data: ChartData;
	export let chartType: 'line' | 'bar' | 'scatter' | 'heatmap' = 'line';
	export let filters: DataFilter[] = [];
	export let interactions: ChartInteraction[] = [];
	export let config: any = {};

	const dispatch = createEventDispatcher();

	// Chart state
	let chart_container: HTMLDivElement;
	let svg_element: SVGSVGElement;
	let is_zoomed = false;
	let zoom_level = 1;
	let pan_offset = { x: 0, y: 0 };
	let hovered_point: any = null;
	let selected_points: any[] = [];
	let tooltip: { x: number; y: number; content: string } | null = null;
	let animation_enabled = config.animations?.enabled ?? true;
	let current_chart_type = chartType;

	// Chart dimensions
	let width = config.layout?.width || 800;
	let height = config.layout?.height || 500;
	let margin = config.layout?.margin || { top: 40, right: 40, bottom: 60, left: 60 };

	// Calculate inner dimensions
	// eslint-disable-next-line svelte/no-immutable-reactive-statements
	$: inner_width = width - margin.left - margin.right;
	// eslint-disable-next-line svelte/no-immutable-reactive-statements
	$: inner_height = height - margin.top - margin.bottom;

	// Process and filter data
	let processed_data: any[] = [];
	$: processed_data = process_chart_data(data, filters);

	// Chart type options
	const chart_types = [
		{ value: 'line', label: 'Line Chart', icon: '📈' },
		{ value: 'bar', label: 'Bar Chart', icon: '📊' },
		{ value: 'scatter', label: 'Scatter Plot', icon: '⚪' },
		{ value: 'heatmap', label: 'Heat Map', icon: '🔥' }
	];

	// Color schemes
	const color_schemes = {
		default: ['#0066cc', '#ff6b35', '#28a745', '#ffc107', '#dc3545'],
		viridis: ['#440154', '#31688e', '#35b779', '#fde725'],
		plasma: ['#0d0887', '#7e03a8', '#cc4778', '#f89441', '#f0f921'],
		cool: ['#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b']
	};

	let current_color_scheme = 'default';
	$: colors = color_schemes[current_color_scheme] || color_schemes.default;

	function process_chart_data(raw_data: ChartData, active_filters: DataFilter[]): any[] {
		if (!raw_data?.data) return [];

		let processed = Array.isArray(raw_data.data)
			? [...raw_data.data]
			: Object.entries(raw_data.data).map(([key, value]) => ({ x: key, y: value }));

		// Apply filters
		active_filters.forEach((filter) => {
			if (!filter.active) return;

			processed = processed.filter((item) => {
				const field_value = item[filter.field];

				switch (filter.operator) {
					case 'equals':
						return field_value === filter.value;
					case 'contains':
						return String(field_value).toLowerCase().includes(String(filter.value).toLowerCase());
					case 'greater':
						return Number(field_value) > Number(filter.value);
					case 'less':
						return Number(field_value) < Number(filter.value);
					case 'between':
						if (Array.isArray(filter.value) && filter.value.length === 2) {
							const val = Number(field_value);
							return val >= Number(filter.value[0]) && val <= Number(filter.value[1]);
						}
						return true;
					default:
						return true;
				}
			});
		});

		return processed;
	}

	// Scale functions
	function create_scales(data: any[]): {
		x_scale: (x: any, index?: number) => number;
		y_scale: (y: number) => number;
	} {
		if (!data.length) return { x_scale: () => 0, y_scale: () => inner_height };

		const x_values = data.map((d) => d.x);
		const y_values = data.map((d) => d.y).filter((y) => typeof y === 'number');

		const x_is_numeric = x_values.every((x) => typeof x === 'number');

		let x_scale: (x: any, index?: number) => number;
		let y_scale: (y: number) => number;

		if (x_is_numeric) {
			const x_min = Math.min(...x_values);
			const x_max = Math.max(...x_values);
			x_scale = (x: number) => ((x - x_min) / (x_max - x_min)) * inner_width;
		} else {
			x_scale = (x: any, index: number) => (index / Math.max(1, x_values.length - 1)) * inner_width;
		}

		const y_min = Math.min(...y_values);
		const y_max = Math.max(...y_values);
		y_scale = (y: number) => inner_height - ((y - y_min) / (y_max - y_min)) * inner_height;

		return { x_scale, y_scale };
	}

	$: ({ x_scale, y_scale } = create_scales(processed_data));

	// Chart rendering functions
	function render_line_chart(
		data: any[],
		x_scale: (x: any, index?: number) => number,
		y_scale: (y: number) => number
	): string {
		if (data.length < 2) return '';

		return data
			.map((point, index) => {
				const x = typeof x_scale === 'function' ? x_scale(point.x, index) : x_scale(point.x);
				const y = y_scale(point.y);
				return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
			})
			.join(' ');
	}

	function get_bar_width(): number {
		return Math.max(10, (inner_width / Math.max(1, processed_data.length)) * 0.8);
	}

	// Event handlers
	function handle_mouse_move(event: MouseEvent) {
		if (!chart_container) return;

		const rect = chart_container.getBoundingClientRect();
		const x = (event.clientX - rect.left - margin.left) / zoom_level - pan_offset.x;
		const y = (event.clientY - rect.top - margin.top) / zoom_level - pan_offset.y;

		const closest = find_closest_point(x, y);
		if (closest) {
			hovered_point = closest;
			tooltip = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top,
				content: format_tooltip_content(closest)
			};

			dispatch('hover', { point: closest, coordinates: { x, y } });
		}
	}

	function handle_mouse_leave() {
		hovered_point = null;
		tooltip = null;
		dispatch('hover-end');
	}

	function handle_click(event: MouseEvent) {
		if (!chart_container) return;

		const rect = chart_container.getBoundingClientRect();
		const x = (event.clientX - rect.left - margin.left) / zoom_level - pan_offset.x;
		const y = (event.clientY - rect.top - margin.top) / zoom_level - pan_offset.y;

		const closest = find_closest_point(x, y);
		if (closest) {
			// Toggle selection
			const index = selected_points.findIndex((p) => p === closest);
			if (index >= 0) {
				selected_points = selected_points.filter((_, i) => i !== index);
			} else {
				selected_points = [...selected_points, closest];
			}

			dispatch('select', { point: closest, selected: selected_points });
		}
	}

	function handle_wheel(event: WheelEvent) {
		event.preventDefault();

		const delta = event.deltaY > 0 ? 0.9 : 1.1;
		const new_zoom = Math.max(0.5, Math.min(5, zoom_level * delta));

		if (new_zoom !== zoom_level) {
			zoom_level = new_zoom;
			is_zoomed = zoom_level !== 1;
			dispatch('zoom', { zoomLevel: zoom_level, isZoomed: is_zoomed });
		}
	}

	function find_closest_point(mouse_x: number, mouse_y: number) {
		if (!processed_data.length) return null;

		let closest = processed_data[0];
		let min_distance = Infinity;

		processed_data.forEach((point, index) => {
			const px = typeof x_scale === 'function' ? x_scale(point.x, index) : x_scale(point.x);
			const py = y_scale(point.y);
			const distance = Math.sqrt((mouse_x - px) ** 2 + (mouse_y - py) ** 2);

			if (distance < min_distance) {
				min_distance = distance;
				closest = point;
			}
		});

		return min_distance < 30 ? closest : null;
	}

	function format_tooltip_content(point: any): string {
		return `${point.label || 'Point'}: ${point.y}${point.unit || ''}`;
	}

	function reset_zoom() {
		zoom_level = 1;
		is_zoomed = false;
		pan_offset = { x: 0, y: 0 };
		dispatch('zoom-reset');
	}

	function change_chart_type(new_type: string) {
		current_chart_type = new_type as any;
		dispatch('chart-type-change', { chartType: new_type });
	}

	function toggle_animation() {
		animation_enabled = !animation_enabled;
		dispatch('animation-toggle', { enabled: animation_enabled });
	}

	function export_chart() {
		if (!svg_element) return;

		const svg_data = new XMLSerializer().serializeToString(svg_element);
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		const img = new Image();

		img.onload = () => {
			canvas.width = width;
			canvas.height = height;
			ctx?.drawImage(img, 0, 0);

			const link = document.createElement('a');
			link.download = `chart-${Date.now()}.png`;
			link.href = canvas.toDataURL();
			link.click();
		};

		img.src = 'data:image/svg+xml;base64,' + btoa(svg_data);
		dispatch('export', { format: 'png' });
	}

	onMount(() => {
		dispatch('mount', { config, chartType: current_chart_type });
	});
</script>

<div
	class="advanced-interactive-chart"
	bind:this={chart_container}
	on:mousemove={handle_mouse_move}
	on:mouseleave={handle_mouse_leave}
	on:click={handle_click}
	on:wheel={handle_wheel}
	role="img"
	aria-label="Advanced Interactive Chart"
>
	<!-- Chart Controls -->
	<div class="chart-controls">
		<div class="control-group">
			<label class="control-label">Chart Type:</label>
			<div class="chart-type-selector">
				{#each chart_types as type (type.value)}
					<button
						class="chart-type-btn"
						class:active={current_chart_type === type.value}
						on:click={() => change_chart_type(type.value)}
						title={type.label}
						type="button"
					>
						<span class="chart-icon">{type.icon}</span>
						<span class="chart-label">{type.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="control-group">
			<label class="control-label">Color Scheme:</label>
			<select bind:value={current_color_scheme} class="color-scheme-select">
				{#each Object.keys(color_schemes) as scheme (scheme)}
					<option value={scheme}>{scheme.charAt(0).toUpperCase() + scheme.slice(1)}</option>
				{/each}
			</select>
		</div>

		<div class="control-group">
			<button
				class="control-btn"
				class:active={animation_enabled}
				on:click={toggle_animation}
				title="Toggle animations"
				type="button"
			>
				🎬 Animate
			</button>

			{#if is_zoomed}
				<button class="control-btn" on:click={reset_zoom} title="Reset zoom" type="button">
					🔍 Reset Zoom
				</button>
			{/if}

			<button class="control-btn" on:click={export_chart} title="Export chart" type="button">
				💾 Export
			</button>
		</div>

		<div class="zoom-info">
			<span class="zoom-indicator">Zoom: {Math.round(zoom_level * 100)}%</span>
			{#if selected_points.length > 0}
				<span class="selection-indicator">Selected: {selected_points.length}</span>
			{/if}
		</div>
	</div>

	<!-- SVG Chart -->
	<svg
		bind:this={svg_element}
		{width}
		{height}
		class="chart-svg"
		class:animated={animation_enabled}
		style="transform: scale({zoom_level}) translate({pan_offset.x}px, {pan_offset.y}px);"
	>
		<!-- Definitions for gradients and patterns -->
		<defs>
			<linearGradient id="chart-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
				<stop offset="0%" style="stop-color:{colors[0]};stop-opacity:0.8" />
				<stop offset="100%" style="stop-color:{colors[0]};stop-opacity:0.1" />
			</linearGradient>
		</defs>

		<!-- Chart background -->
		<rect
			x={margin.left}
			y={margin.top}
			width={inner_width}
			height={inner_height}
			fill="var(--chart-bg, #fafafa)"
			stroke="var(--chart-border, #e1e5e9)"
			rx="4"
		/>

		<!-- Grid lines -->
		<g class="grid" opacity="0.3">
			{#each Array(6) as _, i (i)}
				<line
					x1={margin.left}
					y1={margin.top + (i * inner_height) / 5}
					x2={margin.left + inner_width}
					y2={margin.top + (i * inner_height) / 5}
					stroke="var(--grid-color, #e9ecef)"
					stroke-width="1"
				/>
			{/each}
			{#each Array(6) as _, i (i)}
				<line
					x1={margin.left + (i * inner_width) / 5}
					y1={margin.top}
					x2={margin.left + (i * inner_width) / 5}
					y2={margin.top + inner_height}
					stroke="var(--grid-color, #e9ecef)"
					stroke-width="1"
				/>
			{/each}
		</g>

		<!-- Data visualization -->
		<g class="data-layer" transform="translate({margin.left}, {margin.top})">
			{#if current_chart_type === 'line' && processed_data.length > 1}
				<!-- Line chart -->
				<path
					d={render_line_chart(processed_data, x_scale, y_scale)}
					fill="none"
					stroke={colors[0]}
					stroke-width="3"
					class="line-path"
					class:animated={animation_enabled}
				/>

				<!-- Area fill -->
				<path
					d={render_line_chart(processed_data, x_scale, y_scale) +
						` L ${x_scale(processed_data[processed_data.length - 1].x, processed_data.length - 1)} ${inner_height} L ${x_scale(processed_data[0].x, 0)} ${inner_height} Z`}
					fill="url(#chart-gradient)"
					opacity="0.3"
					class="area-fill"
					class:animated={animation_enabled}
				/>
			{:else if current_chart_type === 'bar'}
				<!-- Bar chart -->
				{#each processed_data as point, index (point.id || index)}
					{@const x = typeof x_scale === 'function' ? x_scale(point.x, index) : x_scale(point.x)}
					{@const y = y_scale(point.y)}
					{@const bar_width = get_bar_width()}
					<rect
						x={x - bar_width / 2}
						{y}
						width={bar_width}
						height={inner_height - y}
						fill={colors[index % colors.length]}
						stroke={selected_points.includes(point) ? '#000' : 'none'}
						stroke-width="2"
						class="bar-rect"
						class:hovered={hovered_point === point}
						class:selected={selected_points.includes(point)}
						class:animated={animation_enabled}
					/>
				{/each}
			{:else if current_chart_type === 'scatter'}
				<!-- Scatter plot -->
				{#each processed_data as point, index (point.id || index)}
					{@const x = typeof x_scale === 'function' ? x_scale(point.x, index) : x_scale(point.x)}
					{@const y = y_scale(point.y)}
					<circle
						cx={x}
						cy={y}
						r={selected_points.includes(point) ? 8 : hovered_point === point ? 6 : 4}
						fill={colors[index % colors.length]}
						stroke={selected_points.includes(point) ? '#000' : '#fff'}
						stroke-width="2"
						class="scatter-point"
						class:hovered={hovered_point === point}
						class:selected={selected_points.includes(point)}
						class:animated={animation_enabled}
					/>
				{/each}
			{:else if current_chart_type === 'heatmap'}
				<!-- Heatmap -->
				{#each processed_data as point, index (point.id || index)}
					{@const x =
						(index % Math.ceil(Math.sqrt(processed_data.length))) *
						(inner_width / Math.ceil(Math.sqrt(processed_data.length)))}
					{@const y =
						Math.floor(index / Math.ceil(Math.sqrt(processed_data.length))) *
						(inner_height / Math.ceil(Math.sqrt(processed_data.length)))}
					{@const cell_size =
						Math.min(inner_width, inner_height) / Math.ceil(Math.sqrt(processed_data.length))}
					{@const intensity =
						Math.abs(point.y) / Math.max(...processed_data.map((p) => Math.abs(p.y)))}
					<rect
						{x}
						{y}
						width={cell_size}
						height={cell_size}
						fill={colors[0]}
						opacity={intensity}
						stroke="#fff"
						stroke-width="1"
						class="heatmap-cell"
						class:hovered={hovered_point === point}
						class:animated={animation_enabled}
					/>
				{/each}
			{/if}

			<!-- Data points for line chart -->
			{#if current_chart_type === 'line'}
				{#each processed_data as point, index (point.id || index)}
					{@const x = typeof x_scale === 'function' ? x_scale(point.x, index) : x_scale(point.x)}
					{@const y = y_scale(point.y)}
					<circle
						cx={x}
						cy={y}
						r={selected_points.includes(point) ? 6 : hovered_point === point ? 5 : 3}
						fill={colors[0]}
						stroke="#fff"
						stroke-width="2"
						class="data-point"
						class:hovered={hovered_point === point}
						class:selected={selected_points.includes(point)}
						class:animated={animation_enabled}
					/>
				{/each}
			{/if}
		</g>

		<!-- Axes -->
		<g class="axes">
			<!-- X-axis -->
			<line
				x1={margin.left}
				y1={margin.top + inner_height}
				x2={margin.left + inner_width}
				y2={margin.top + inner_height}
				stroke="var(--axis-color, #333)"
				stroke-width="2"
			/>

			<!-- Y-axis -->
			<line
				x1={margin.left}
				y1={margin.top}
				x2={margin.left}
				y2={margin.top + inner_height}
				stroke="var(--axis-color, #333)"
				stroke-width="2"
			/>

			<!-- Axis labels -->
			<text
				x={margin.left + inner_width / 2}
				y={height - 10}
				text-anchor="middle"
				class="axis-label"
			>
				{config.xAxisLabel || 'X Axis'}
			</text>

			<text
				x={15}
				y={margin.top + inner_height / 2}
				text-anchor="middle"
				transform="rotate(-90, 15, {margin.top + inner_height / 2})"
				class="axis-label"
			>
				{config.yAxisLabel || 'Y Axis'}
			</text>
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
	.advanced-interactive-chart {
		position: relative;
		display: flex;
		flex-direction: column;
		background: var(--chart-container-bg, #ffffff);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		cursor: crosshair;
	}

	.chart-controls {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--controls-bg, #f8f9fa);
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.control-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		white-space: nowrap;
	}

	.chart-type-selector {
		display: flex;
		gap: 0.25rem;
	}

	.chart-type-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem;
		background: var(--button-bg, #ffffff);
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.75rem;
	}

	.chart-type-btn:hover {
		background: var(--button-hover-bg, #e9ecef);
	}

	.chart-type-btn.active {
		background: var(--button-active-bg, #0066cc);
		color: var(--button-active-text, #ffffff);
		border-color: var(--button-active-border, #0066cc);
	}

	.chart-icon {
		font-size: 1.2rem;
	}

	.chart-label {
		font-size: 0.7rem;
		white-space: nowrap;
	}

	.color-scheme-select {
		padding: 0.4rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-size: 0.875rem;
	}

	.control-btn {
		background: var(--button-secondary-bg, #6c757d);
		color: var(--button-secondary-text, #ffffff);
		border: none;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background-color 0.2s;
		white-space: nowrap;
	}

	.control-btn:hover {
		background: var(--button-secondary-hover-bg, #5a6268);
	}

	.control-btn.active {
		background: var(--button-success-bg, #28a745);
	}

	.zoom-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--text-secondary, #666666);
	}

	.chart-svg {
		transition: transform 0.3s ease;
		overflow: visible;
	}

	.chart-svg.animated .line-path,
	.chart-svg.animated .area-fill,
	.chart-svg.animated .bar-rect,
	.chart-svg.animated .scatter-point,
	.chart-svg.animated .heatmap-cell,
	.chart-svg.animated .data-point {
		transition: all 0.3s ease;
	}

	.data-point,
	.scatter-point {
		cursor: pointer;
	}

	.data-point:hover,
	.scatter-point:hover,
	.bar-rect:hover,
	.heatmap-cell:hover {
		filter: brightness(1.2);
	}

	.data-point.selected,
	.scatter-point.selected,
	.bar-rect.selected {
		filter: brightness(1.3) drop-shadow(0 0 4px rgba(0, 0, 0, 0.5));
	}

	.axis-label {
		font-size: 0.875rem;
		fill: var(--text-primary, #1a1a1a);
		font-weight: 500;
	}

	.chart-tooltip {
		position: absolute;
		background: var(--tooltip-bg, rgba(0, 0, 0, 0.9));
		color: var(--tooltip-text, #ffffff);
		padding: 0.75rem;
		border-radius: 6px;
		font-size: 0.875rem;
		pointer-events: none;
		z-index: 10;
		white-space: nowrap;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.chart-tooltip::before {
		content: '';
		position: absolute;
		top: 100%;
		left: 15px;
		border: 6px solid transparent;
		border-top-color: var(--tooltip-bg, rgba(0, 0, 0, 0.9));
	}

	@media (max-width: 768px) {
		.advanced-interactive-chart {
			padding: 1rem;
		}

		.chart-controls {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.control-group {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.chart-type-selector {
			justify-content: space-between;
		}

		.chart-type-btn {
			flex: 1;
		}

		.zoom-info {
			align-items: center;
		}
	}
</style>
