<script lang="ts">
	import type { InteractiveChartBlock, DataFilter } from '$lib/types/web-content.js';
	import { createEventDispatcher } from 'svelte';
	import AdvancedInteractiveChart from './AdvancedInteractiveChart.svelte';
	import DataExplorer from './DataExplorer.svelte';
	import ChartConfigurator from './ChartConfigurator.svelte';
	import DrillDownChart from './DrillDownChart.svelte';

	export let block: InteractiveChartBlock;
	export let editable = false;

	const dispatch = createEventDispatcher();

	// Component state
	let active_view: 'chart' | 'explorer' | 'config' | 'drilldown' = 'chart';
	let show_controls = true;
	let current_data = block.content.data;
	let active_filters: DataFilter[] = block.content.filters || [];
	let current_chart_type = block.content.chartType;
	let chart_config = {
		title: block.content.title || 'Interactive Chart',
		description: block.content.description || '',
		layout: {
			width: 800,
			height: 500,
			margin: { top: 40, right: 40, bottom: 60, left: 60 },
			responsive: true
		},
		styling: {
			theme: 'light',
			colors: ['#0066cc', '#ff6b35', '#28a745', '#ffc107', '#dc3545'],
			fonts: { family: 'system-ui', size: 12 }
		},
		animations: {
			enabled: true,
			duration: 300,
			easing: 'ease-in-out',
			transitions: ['opacity', 'transform']
		},
		parameters: [],
		xAxisLabel: 'X Axis',
		yAxisLabel: 'Y Axis'
	};

	// View options
	const view_options = [
		{
			id: 'chart',
			label: 'Chart View',
			icon: '📊',
			description: 'Interactive chart visualization'
		},
		{
			id: 'explorer',
			label: 'Data Explorer',
			icon: '🔍',
			description: 'Advanced data filtering and analysis'
		},
		{
			id: 'drilldown',
			label: 'Drill Down',
			icon: '🎯',
			description: 'Hierarchical data exploration'
		},
		{
			id: 'config',
			label: 'Configure',
			icon: '⚙️',
			description: 'Chart appearance and behavior settings'
		}
	];

	// Chart type options with advanced features
	const chart_type_options = [
		{
			value: 'line',
			label: 'Line Chart',
			icon: '📈',
			features: ['zoom', 'pan', 'hover', 'selection', 'animation']
		},
		{
			value: 'bar',
			label: 'Bar Chart',
			icon: '📊',
			features: ['drill-down', 'grouping', 'sorting', 'hover', 'selection']
		},
		{
			value: 'scatter',
			label: 'Scatter Plot',
			icon: '⚪',
			features: ['brush-selection', 'zoom', 'clustering', 'regression']
		},
		{
			value: 'heatmap',
			label: 'Heat Map',
			icon: '🔥',
			features: ['color-scale', 'hover', 'zoom', 'clustering']
		}
	];

	// Data processing state
	let processed_data = current_data;
	let data_summary = {
		total_rows: 0,
		filtered_rows: 0,
		selected_rows: 0
	};

	// Update data summary when data changes
	$: {
		if (Array.isArray(processed_data)) {
			data_summary.filtered_rows = processed_data.length;
			data_summary.total_rows = Array.isArray(current_data)
				? current_data.length
				: Object.keys(current_data || {}).length;
		} else if (processed_data && typeof processed_data === 'object') {
			data_summary.filtered_rows = Object.keys(processed_data).length;
			data_summary.total_rows = Object.keys(current_data || {}).length;
		}
	}

	// Event handlers
	function handle_view_change(view: string) {
		active_view = view as any;
		dispatch('viewChange', { view, blockId: block.id });
	}

	function handle_chart_type_change(event: CustomEvent) {
		current_chart_type = event.detail.chartType;
		dispatch('chartTypeChange', {
			chartType: current_chart_type,
			blockId: block.id
		});
	}

	function handle_data_change(event: CustomEvent) {
		const { data, filters } = event.detail;
		processed_data = data;
		active_filters = filters;

		dispatch('dataChange', {
			data: processed_data,
			filters: active_filters,
			blockId: block.id
		});
	}

	function handle_config_change(event: CustomEvent) {
		chart_config = { ...chart_config, ...event.detail.config };
		dispatch('configChange', {
			config: chart_config,
			blockId: block.id
		});
	}

	function handle_chart_interaction(event: CustomEvent) {
		const { type, point, coordinates, zoomLevel } = event.detail;

		// Update selection count for summary
		if (type === 'select' && event.detail.selected) {
			data_summary.selected_rows = event.detail.selected.length;
		}

		dispatch('chartInteraction', {
			type,
			point,
			coordinates,
			zoomLevel,
			blockId: block.id
		});
	}

	function handle_drill_down(event: CustomEvent) {
		dispatch('drillDown', {
			...event.detail,
			blockId: block.id
		});
	}

	function export_chart_data() {
		const export_data = {
			chartType: current_chart_type,
			data: processed_data,
			filters: active_filters,
			config: chart_config,
			summary: data_summary,
			exportedAt: new Date().toISOString()
		};

		const blob = new Blob([JSON.stringify(export_data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `chart-data-${block.id}-${Date.now()}.json`;
		link.click();
		URL.revokeObjectURL(url);

		dispatch('export', {
			format: 'json',
			data: export_data,
			blockId: block.id
		});
	}

	function toggle_fullscreen() {
		const element = document.querySelector(`[data-block-id="${block.id}"]`);
		if (element) {
			if (document.fullscreenElement) {
				document.exitFullscreen();
			} else {
				element.requestFullscreen();
			}
		}

		dispatch('fullscreenToggle', { blockId: block.id });
	}

	function get_chart_features(chart_type: string): string[] {
		const option = chart_type_options.find((opt) => opt.value === chart_type);
		return option?.features || [];
	}

	function get_view_description(view_id: string): string {
		const view = view_options.find((v) => v.id === view_id);
		return view?.description || '';
	}
</script>

<div
	class="advanced-chart-block"
	data-block-id={block.id}
	class:fullscreen={document?.fullscreenElement}
>
	<!-- Block Header -->
	<header class="chart-block-header">
		<div class="header-content">
			<div class="title-section">
				<h3 class="chart-title">{chart_config.title}</h3>
				{#if chart_config.description}
					<p class="chart-description">{chart_config.description}</p>
				{/if}
				<div class="chart-meta">
					<span class="chart-type-badge">{current_chart_type}</span>
					<span class="data-badge"
						>{data_summary.filtered_rows} / {data_summary.total_rows} items</span
					>
					{#if data_summary.selected_rows > 0}
						<span class="selection-badge">{data_summary.selected_rows} selected</span>
					{/if}
				</div>
			</div>

			<div class="header-actions">
				<button
					class="toggle-controls-btn"
					class:active={show_controls}
					on:click={() => (show_controls = !show_controls)}
					title="Toggle controls"
					type="button"
				>
					⚙️
				</button>
				<button
					class="export-btn"
					on:click={export_chart_data}
					title="Export chart data"
					type="button"
				>
					💾
				</button>
				<button
					class="fullscreen-btn"
					on:click={toggle_fullscreen}
					title="Toggle fullscreen"
					type="button"
				>
					⛶
				</button>
			</div>
		</div>

		<!-- View Navigation -->
		{#if show_controls}
			<nav class="view-navigation">
				{#each view_options as view (view.id)}
					<button
						class="view-btn"
						class:active={active_view === view.id}
						on:click={() => handle_view_change(view.id)}
						title={view.description}
						type="button"
					>
						<span class="view-icon">{view.icon}</span>
						<span class="view-label">{view.label}</span>
					</button>
				{/each}
			</nav>
		{/if}
	</header>

	<!-- Main Content Area -->
	<main class="chart-content">
		{#if active_view === 'chart'}
			<div class="chart-view">
				<!-- Chart Type Selector -->
				{#if show_controls}
					<div class="chart-type-controls">
						<div class="type-selector">
							<label class="control-label">Chart Type:</label>
							<div class="type-options">
								{#each chart_type_options as option (option.value)}
									<button
										class="type-option-btn"
										class:active={current_chart_type === option.value}
										on:click={() => {
											current_chart_type = option.value;
											handle_chart_type_change({ detail: { chartType: option.value } });
										}}
										title="{option.label} - Features: {option.features.join(', ')}"
										type="button"
									>
										<span class="type-icon">{option.icon}</span>
										<span class="type-label">{option.label}</span>
									</button>
								{/each}
							</div>
						</div>

						<div class="chart-features">
							<span class="features-label">Features:</span>
							<div class="features-list">
								{#each get_chart_features(current_chart_type) as feature (feature)}
									<span class="feature-tag">{feature}</span>
								{/each}
							</div>
						</div>
					</div>
				{/if}

				<!-- Advanced Interactive Chart -->
				<div class="chart-container">
					<AdvancedInteractiveChart
						data={block.content.data}
						chartType={current_chart_type}
						filters={active_filters}
						interactions={block.content.interactions}
						config={chart_config}
						on:hover={handle_chart_interaction}
						on:select={handle_chart_interaction}
						on:zoom={handle_chart_interaction}
						on:chart-type-change={handle_chart_type_change}
						on:animation-toggle={handle_chart_interaction}
						on:export={handle_chart_interaction}
					/>
				</div>
			</div>
		{:else if active_view === 'explorer'}
			<div class="explorer-view">
				<div class="view-description">
					<h4>Data Explorer</h4>
					<p>{get_view_description('explorer')}</p>
				</div>

				<DataExplorer
					data={Array.isArray(block.content.data.data)
						? block.content.data.data
						: Object.entries(block.content.data.data || {}).map(([k, v]) => ({ key: k, value: v }))}
					filters={active_filters}
					on:dataChange={handle_data_change}
					on:export={handle_chart_interaction}
				/>
			</div>
		{:else if active_view === 'drilldown'}
			<div class="drilldown-view">
				<div class="view-description">
					<h4>Drill-Down Analysis</h4>
					<p>{get_view_description('drilldown')}</p>
				</div>

				<DrillDownChart
					data={block.content.data}
					chartType={current_chart_type}
					hierarchyField="category"
					valueField="value"
					on:drillDown={handle_drill_down}
					on:drillUp={handle_drill_down}
					on:reset={handle_drill_down}
					on:chartInteraction={handle_chart_interaction}
				/>
			</div>
		{:else if active_view === 'config'}
			<div class="config-view">
				<div class="view-description">
					<h4>Chart Configuration</h4>
					<p>{get_view_description('config')}</p>
				</div>

				<ChartConfigurator
					config={chart_config}
					chartType={current_chart_type}
					on:configChange={handle_config_change}
					on:export={handle_chart_interaction}
					on:import={handle_chart_interaction}
					on:error={handle_chart_interaction}
				/>
			</div>
		{/if}
	</main>

	<!-- Source Attribution -->
	{#if block.content.sourceReference}
		<footer class="source-attribution">
			<div class="attribution-content">
				<div class="source-info">
					<strong>Source:</strong>
					<a
						href={block.content.sourceReference.originalUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="source-link"
					>
						{block.content.sourceReference.originalUrl}
					</a>
				</div>

				<div class="transformation-info">
					<strong>Transformation:</strong>
					<span class="transformation-reasoning">
						{block.content.sourceReference.transformationReasoning}
					</span>
				</div>

				<div class="confidence-info">
					<strong>Confidence:</strong>
					<span class="confidence-score">
						{Math.round(block.content.sourceReference.confidence * 100)}%
					</span>
					<div
						class="confidence-bar"
						style="--confidence: {block.content.sourceReference.confidence * 100}%"
					>
						<div class="confidence-fill"></div>
					</div>
				</div>
			</div>
		</footer>
	{/if}
</div>

<style>
	.advanced-chart-block {
		background: var(--block-bg, #ffffff);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		transition: all 0.3s ease;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.advanced-chart-block:hover {
		box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
	}

	.advanced-chart-block.fullscreen {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		z-index: 9999;
		border-radius: 0;
	}

	.chart-block-header {
		background: var(--header-bg, #f8f9fa);
		border-bottom: 1px solid var(--border-light, #e9ecef);
		padding: 1.5rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.title-section {
		flex: 1;
	}

	.chart-title {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary, #1a1a1a);
		line-height: 1.2;
	}

	.chart-description {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		color: var(--text-secondary, #666666);
		line-height: 1.5;
	}

	.chart-meta {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.chart-type-badge,
	.data-badge,
	.selection-badge {
		padding: 0.375rem 0.75rem;
		border-radius: 16px;
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.chart-type-badge {
		background: var(--type-badge-bg, #0066cc);
		color: var(--type-badge-text, #ffffff);
	}

	.data-badge {
		background: var(--data-badge-bg, #28a745);
		color: var(--data-badge-text, #ffffff);
	}

	.selection-badge {
		background: var(--selection-badge-bg, #ff6b35);
		color: var(--selection-badge-text, #ffffff);
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-controls-btn,
	.export-btn,
	.fullscreen-btn {
		width: 40px;
		height: 40px;
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 8px;
		background: var(--button-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.toggle-controls-btn:hover,
	.export-btn:hover,
	.fullscreen-btn:hover {
		background: var(--button-hover-bg, #e9ecef);
		transform: translateY(-1px);
	}

	.toggle-controls-btn.active {
		background: var(--button-active-bg, #0066cc);
		color: var(--button-active-text, #ffffff);
		border-color: var(--button-active-border, #0066cc);
	}

	.view-navigation {
		display: flex;
		gap: 0.25rem;
		background: var(--nav-bg, #ffffff);
		padding: 0.5rem;
		border-radius: 8px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.view-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
		flex: 1;
		min-width: 0;
	}

	.view-btn:hover {
		background: var(--nav-item-hover-bg, #e9ecef);
	}

	.view-btn.active {
		background: var(--nav-item-active-bg, #0066cc);
		color: var(--nav-item-active-text, #ffffff);
		box-shadow: 0 2px 4px rgba(0, 102, 204, 0.2);
	}

	.view-icon {
		font-size: 1.25rem;
	}

	.view-label {
		font-size: 0.8rem;
		font-weight: 600;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		width: 100%;
	}

	.chart-content {
		padding: 1.5rem;
		min-height: 400px;
	}

	.view-description {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--description-bg, #f8f9fa);
		border-radius: 8px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.view-description h4 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: var(--text-primary, #1a1a1a);
	}

	.view-description p {
		margin: 0;
		color: var(--text-secondary, #666666);
		line-height: 1.5;
	}

	.chart-type-controls {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--controls-bg, #f8f9fa);
		border-radius: 8px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.type-selector {
		margin-bottom: 1rem;
	}

	.control-label {
		display: block;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		margin-bottom: 0.75rem;
	}

	.type-options {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 0.75rem;
	}

	.type-option-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--option-bg, #ffffff);
		border: 2px solid var(--border-color, #ced4da);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.type-option-btn:hover {
		background: var(--option-hover-bg, #e9ecef);
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.type-option-btn.active {
		background: var(--option-active-bg, #0066cc);
		color: var(--option-active-text, #ffffff);
		border-color: var(--option-active-border, #0066cc);
		box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
	}

	.type-icon {
		font-size: 1.5rem;
	}

	.type-label {
		font-size: 0.875rem;
		font-weight: 600;
		text-align: center;
	}

	.chart-features {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-light, #e9ecef);
	}

	.features-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		white-space: nowrap;
	}

	.features-list {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.feature-tag {
		padding: 0.25rem 0.5rem;
		background: var(--feature-tag-bg, #e9ecef);
		color: var(--feature-tag-text, #495057);
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.chart-container {
		background: var(--chart-container-bg, #ffffff);
		border-radius: 8px;
		border: 1px solid var(--border-light, #e9ecef);
		overflow: hidden;
	}

	.source-attribution {
		background: var(--attribution-bg, #f8f9fa);
		border-top: 1px solid var(--border-light, #e9ecef);
		padding: 1rem 1.5rem;
	}

	.attribution-content {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 1rem;
		align-items: center;
		font-size: 0.875rem;
	}

	.source-info,
	.transformation-info {
		color: var(--text-secondary, #666666);
		line-height: 1.4;
	}

	.source-info strong,
	.transformation-info strong,
	.confidence-info strong {
		color: var(--text-primary, #1a1a1a);
	}

	.source-link {
		color: var(--link-color, #0066cc);
		text-decoration: none;
		word-break: break-all;
	}

	.source-link:hover {
		text-decoration: underline;
	}

	.transformation-reasoning {
		font-style: italic;
	}

	.confidence-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.confidence-score {
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.confidence-bar {
		width: 80px;
		height: 6px;
		background: var(--confidence-bg, #e9ecef);
		border-radius: 3px;
		overflow: hidden;
		position: relative;
	}

	.confidence-fill {
		height: 100%;
		width: var(--confidence, 0%);
		background: linear-gradient(90deg, #dc3545 0%, #ffc107 50%, #28a745 100%);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	@media (max-width: 768px) {
		.chart-block-header {
			padding: 1rem;
		}

		.header-content {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.chart-title {
			font-size: 1.5rem;
		}

		.chart-meta {
			justify-content: flex-start;
		}

		.header-actions {
			justify-content: flex-end;
		}

		.view-navigation {
			flex-direction: column;
		}

		.view-btn {
			flex-direction: row;
			justify-content: flex-start;
			text-align: left;
		}

		.chart-content {
			padding: 1rem;
		}

		.type-options {
			grid-template-columns: 1fr;
		}

		.chart-features {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.attribution-content {
			grid-template-columns: 1fr;
			gap: 0.75rem;
		}

		.confidence-info {
			justify-content: space-between;
		}
	}

	@media (max-width: 480px) {
		.chart-type-badge,
		.data-badge,
		.selection-badge {
			font-size: 0.7rem;
			padding: 0.25rem 0.5rem;
		}

		.view-icon {
			font-size: 1rem;
		}

		.view-label {
			font-size: 0.75rem;
		}

		.type-option-btn {
			padding: 0.75rem;
		}

		.type-icon {
			font-size: 1.25rem;
		}

		.type-label {
			font-size: 0.8rem;
		}
	}
</style>
