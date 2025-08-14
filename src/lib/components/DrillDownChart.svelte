<script lang="ts">
	import type { ChartData } from '$lib/types/web-content.js';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		data: ChartData;
		hierarchyField?: string;
		valueField?: string;
		chartType?: 'line' | 'bar' | 'scatter' | 'heatmap';
		ondrillDown?: (event: CustomEvent) => void;
		ondrillUp?: (event: CustomEvent) => void;
		onreset?: (event: CustomEvent) => void;
		onchartInteraction?: (event: CustomEvent) => void;
	}
	import AdvancedInteractiveChart from './AdvancedInteractiveChart.svelte';

	let { 
		data, 
		hierarchyField = '', 
		valueField = 'value', 
		chartType = 'bar',
		ondrillDown,
		ondrillUp,
		onreset,
		onchartInteraction
	}: Props = $props();

	const dispatch = createEventDispatcher();

	// Drill-down state
	let drill_stack = $state<any[]>([]);
	let current_level = $state(0);
	let current_data = $state<any[]>([]);
	let breadcrumbs = $state<string[]>([]);
	let hierarchy_levels = $state<string[]>([]);
	let aggregation_method = $state<'sum' | 'avg' | 'count' | 'min' | 'max'>('sum');

	// Animation state
	let is_transitioning = $state(false);
	let transition_direction = $state<'down' | 'up'>('down');

	// Initialize hierarchy levels from data structure
	$effect(() => {
		if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
			hierarchy_levels = detect_hierarchy_levels(data.data);
			current_data = process_data_for_level(data.data, 0);
		}
	});

	function detect_hierarchy_levels(raw_data: any[]): string[] {
		if (!raw_data.length) return [];

		const sample = raw_data[0];
		const potential_levels: string[] = [];

		// Look for fields that could represent hierarchy levels
		Object.keys(sample).forEach((key) => {
			if (key !== valueField && typeof sample[key] === 'string') {
				// Check if this field has hierarchical structure (contains '/', '.', or similar)
				const value = sample[key];
				if (value.includes('/') || value.includes('.') || value.includes('>')) {
					potential_levels.push(key);
				}
			}
		});

		// If no hierarchical fields found, use all string fields as potential levels
		if (potential_levels.length === 0) {
			Object.keys(sample).forEach((key) => {
				if (key !== valueField && typeof sample[key] === 'string') {
					potential_levels.push(key);
				}
			});
		}

		return potential_levels;
	}

	function process_data_for_level(raw_data: any[], level: number): any[] {
		if (!hierarchy_levels.length || level >= hierarchy_levels.length) {
			return raw_data;
		}

		const hierarchy_field = hierarchy_levels[level];
		const grouped_data = group_by_hierarchy(raw_data, hierarchy_field, level);

		return Object.entries(grouped_data).map(([key, items]) => ({
			x: key,
			y: aggregate_values(items as any[], valueField, aggregation_method),
			label: key,
			count: (items as any[]).length,
			children: items,
			level: level,
			hierarchy_path: [...breadcrumbs, key]
		}));
	}

	function group_by_hierarchy(data: any[], field: string, level: number): { [key: string]: any[] } {
		const groups: { [key: string]: any[] } = {};

		data.forEach((item) => {
			let key = item[field];

			// Handle hierarchical paths (e.g., "category/subcategory/item")
			if (
				typeof key === 'string' &&
				(key.includes('/') || key.includes('.') || key.includes('>'))
			) {
				const separator = key.includes('/') ? '/' : key.includes('.') ? '.' : '>';
				const parts = key.split(separator);
				key = parts[level] || parts[parts.length - 1];
			}

			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(item);
		});

		return groups;
	}

	function aggregate_values(items: any[], field: string, method: string): number {
		const values = items.map((item) => Number(item[field]) || 0);

		switch (method) {
			case 'sum':
				return values.reduce((a, b) => a + b, 0);
			case 'avg':
				return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
			case 'count':
				return values.length;
			case 'min':
				return Math.min(...values);
			case 'max':
				return Math.max(...values);
			default:
				return values.reduce((a, b) => a + b, 0);
		}
	}

	function drill_down(point: any) {
		if (!point.children || point.children.length === 0) return;

		is_transitioning = true;
		transition_direction = 'down';

		// Add current state to drill stack
		drill_stack = [
			...drill_stack,
			{
				data: current_data,
				level: current_level,
				breadcrumbs: [...breadcrumbs]
			}
		];

		// Update state for next level
		current_level += 1;
		breadcrumbs = [...breadcrumbs, point.label];

		// Process data for next level
		if (current_level < hierarchy_levels.length) {
			current_data = process_data_for_level(point.children, current_level);
		} else {
			// At leaf level, show individual items
			current_data = point.children.map((item: any, index: number) => ({
				x: item.name || item.label || `Item ${index + 1}`,
				y: Number(item[valueField]) || 0,
				label: item.name || item.label || `Item ${index + 1}`,
				...item,
				level: current_level,
				hierarchy_path: [...breadcrumbs, item.name || item.label || `Item ${index + 1}`]
			}));
		}

		setTimeout(() => {
			is_transitioning = false;
		}, 300);

		dispatch('drillDown', {
			level: current_level,
			breadcrumbs: breadcrumbs,
			data: current_data,
			point: point
		});
	}

	function drill_up(target_level?: number) {
		if (drill_stack.length === 0) return;

		is_transitioning = true;
		transition_direction = 'up';

		let target_state;

		if (target_level !== undefined && target_level >= 0) {
			// Drill up to specific level
			const target_index = drill_stack.length - (current_level - target_level);
			if (target_index >= 0 && target_index < drill_stack.length) {
				target_state = drill_stack[target_index];
				drill_stack = drill_stack.slice(0, target_index);
			} else {
				target_state = drill_stack[drill_stack.length - 1];
				drill_stack = drill_stack.slice(0, -1);
			}
		} else {
			// Drill up one level
			target_state = drill_stack[drill_stack.length - 1];
			drill_stack = drill_stack.slice(0, -1);
		}

		current_data = target_state.data;
		current_level = target_state.level;
		breadcrumbs = target_state.breadcrumbs;

		setTimeout(() => {
			is_transitioning = false;
		}, 300);

		dispatch('drillUp', {
			level: current_level,
			breadcrumbs: breadcrumbs,
			data: current_data
		});
	}

	function reset_to_root() {
		if (drill_stack.length === 0) return;

		is_transitioning = true;
		transition_direction = 'up';

		current_data = process_data_for_level(data.data, 0);
		current_level = 0;
		breadcrumbs = [];
		drill_stack = [];

		setTimeout(() => {
			is_transitioning = false;
		}, 300);

		dispatch('reset', {
			level: current_level,
			data: current_data
		});
	}

	function handle_chart_interaction(event: CustomEvent | { detail: { type: string; point?: any } }) {
		const { type, point } = 'detail' in event ? event.detail : event;

		if (type === 'click' && point && point.children) {
			drill_down(point);
		}

		dispatch('chartInteraction', event.detail);
	}

	function change_aggregation(method: string) {
		aggregation_method = method as any;

		// Recalculate current level data with new aggregation
		if (drill_stack.length > 0) {
			const parent_data = drill_stack[drill_stack.length - 1];
			current_data = process_data_for_level(parent_data.data, current_level);
		} else {
			current_data = process_data_for_level(data.data, 0);
		}

		dispatch('aggregationChange', { method: aggregation_method, data: current_data });
	}

	function get_level_name(level: number): string {
		if (level < hierarchy_levels.length) {
			return hierarchy_levels[level];
		}
		return 'Items';
	}

	function format_breadcrumb_item(item: string, index: number): string {
		return item.length > 20 ? item.substring(0, 17) + '...' : item;
	}

	// Chart configuration for drill-down (reactive)
	const drill_down_config = $derived(() => ({
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
		xAxisLabel: get_level_name(current_level),
		yAxisLabel: `${aggregation_method.charAt(0).toUpperCase() + aggregation_method.slice(1)} of ${valueField}`
	}));
</script>

<div class="drill-down-chart">
	<!-- Header Controls -->
	<div class="drill-down-header">
		<div class="header-info">
			<h3 class="chart-title">Drill-Down Analysis</h3>
			<div class="level-info">
				<span class="current-level">Level {current_level + 1}: {get_level_name(current_level)}</span
				>
				<span class="data-count">({current_data.length} items)</span>
			</div>
		</div>

		<div class="header-controls">
			<div class="aggregation-control">
				<label for="aggregation-method">Aggregation:</label>
				<select
					id="aggregation-method"
					value={aggregation_method}
					onchange={(e) => change_aggregation(e.currentTarget.value)}
					class="aggregation-select"
				>
					<option value="sum">Sum</option>
					<option value="avg">Average</option>
					<option value="count">Count</option>
					<option value="min">Minimum</option>
					<option value="max">Maximum</option>
				</select>
			</div>

			<div class="navigation-controls">
				<button
					class="drill-up-btn"
					disabled={drill_stack.length === 0}
					onclick={() => drill_up()}
					type="button"
				>
					↑ Up
				</button>
				<button
					class="reset-btn"
					disabled={drill_stack.length === 0}
					onclick={reset_to_root}
					type="button"
				>
					🏠 Root
				</button>
			</div>
		</div>
	</div>

	<!-- Breadcrumb Navigation -->
	{#if breadcrumbs.length > 0}
		<div class="breadcrumb-nav">
			<button class="breadcrumb-item root" onclick={reset_to_root} type="button"> 🏠 Root </button>

			{#each breadcrumbs as crumb, index (index)}
				<span class="breadcrumb-separator">›</span>
				<button
					class="breadcrumb-item"
					class:active={index === breadcrumbs.length - 1}
					onclick={() => drill_up(index)}
					type="button"
				>
					{format_breadcrumb_item(crumb, index)}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Chart Container -->
	<div
		class="chart-container"
		class:transitioning={is_transitioning}
		class:drill-down={transition_direction === 'down'}
		class:drill-up={transition_direction === 'up'}
	>
		<AdvancedInteractiveChart
			data={{ ...data, data: current_data }}
			{chartType}
			config={drill_down_config}
			onHover={(p) => handle_chart_interaction({ detail: { type: 'hover', ...p } })}
			onSelect={(p) => handle_chart_interaction({ detail: { type: 'select', ...p } })}
			onZoom={(p) => handle_chart_interaction({ detail: { type: 'zoom', ...p } })}
		/>

		<!-- Drill-down hint -->
		{#if current_level < hierarchy_levels.length}
			<div class="drill-hint">
				<span class="hint-icon">👆</span>
				<span class="hint-text"
					>Click on bars to drill down to {get_level_name(current_level + 1)}</span
				>
			</div>
		{/if}
	</div>

	<!-- Data Summary -->
	<div class="data-summary">
		<div class="summary-stats">
			<div class="stat-item">
				<span class="stat-label">Total Items:</span>
				<span class="stat-value">{current_data.length}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Current Level:</span>
				<span class="stat-value">{get_level_name(current_level)}</span>
			</div>
			<div class="stat-item">
				<span class="stat-label">Aggregation:</span>
				<span class="stat-value"
					>{aggregation_method.charAt(0).toUpperCase() + aggregation_method.slice(1)}</span
				>
			</div>
			{#if current_data.length > 0}
				{@const total_value = current_data.reduce((sum, item) => sum + item.y, 0)}
				<div class="stat-item">
					<span class="stat-label">Total Value:</span>
					<span class="stat-value">{total_value.toLocaleString()}</span>
				</div>
			{/if}
		</div>

		<!-- Level Indicators -->
		{#if hierarchy_levels.length > 1}
			<div class="level-indicators">
				<span class="indicators-label">Hierarchy:</span>
				<div class="indicators">
					{#each hierarchy_levels as level, index (index)}
						<div
							class="level-indicator"
							class:active={index === current_level}
							class:completed={index < current_level}
						>
							<span class="level-number">{index + 1}</span>
							<span class="level-name">{level}</span>
						</div>
						{#if index < hierarchy_levels.length - 1}
							<span class="level-separator">→</span>
						{/if}
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Detailed Data Table -->
	{#if current_data.length > 0}
		<div class="data-table-section">
			<div class="table-header">
				<h4>Current Level Data</h4>
				<span class="table-info"
					>Showing {current_data.length} items at level {current_level + 1}</span
				>
			</div>

			<div class="table-container">
				<table class="data-table">
					<thead>
						<tr>
							<th>Name</th>
							<th class="numeric">Value ({aggregation_method})</th>
							<th class="numeric">Count</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each current_data as item, index (item.label || index)}
							<tr class="data-row" class:has-children={item.children && item.children.length > 0}>
								<td class="name-cell">
									<span class="item-name">{item.label}</span>
									{#if item.children && item.children.length > 0}
										<span class="children-indicator">({item.children.length} items)</span>
									{/if}
								</td>
								<td class="numeric value-cell">
									{item.y.toLocaleString()}
								</td>
								<td class="numeric count-cell">
									{item.count || 1}
								</td>
								<td class="actions-cell">
									{#if item.children && item.children.length > 0}
										<button class="drill-down-btn" onclick={() => drill_down(item)} type="button">
											🔍 Drill Down
										</button>
									{:else}
										<span class="no-action">Leaf node</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<style>
	.drill-down-chart {
		background: var(--chart-bg, #ffffff);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.drill-down-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.header-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.chart-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.level-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.current-level {
		font-size: 1rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.data-count {
		font-size: 0.875rem;
		color: var(--text-secondary, #666666);
		background: var(--badge-bg, #e9ecef);
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
	}

	.header-controls {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.aggregation-control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.aggregation-control label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.aggregation-select {
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		font-size: 0.875rem;
		min-width: 120px;
	}

	.navigation-controls {
		display: flex;
		gap: 0.5rem;
	}

	.drill-up-btn,
	.reset-btn {
		padding: 0.5rem 1rem;
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 4px;
		background: var(--button-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.drill-up-btn:hover:not(:disabled),
	.reset-btn:hover:not(:disabled) {
		background: var(--button-hover-bg, #e9ecef);
	}

	.drill-up-btn:disabled,
	.reset-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.breadcrumb-nav {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		padding: 0.75rem;
		background: var(--breadcrumb-bg, #f8f9fa);
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
		overflow-x: auto;
	}

	.breadcrumb-item {
		background: transparent;
		border: none;
		color: var(--link-color, #0066cc);
		cursor: pointer;
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: background-color 0.2s;
		white-space: nowrap;
	}

	.breadcrumb-item:hover {
		background: var(--breadcrumb-hover-bg, #e9ecef);
	}

	.breadcrumb-item.root {
		font-weight: 600;
	}

	.breadcrumb-item.active {
		color: var(--text-primary, #1a1a1a);
		background: var(--breadcrumb-active-bg, #ffffff);
		cursor: default;
	}

	.breadcrumb-separator {
		color: var(--text-secondary, #666666);
		font-size: 0.875rem;
	}

	.chart-container {
		position: relative;
		margin-bottom: 1.5rem;
		transition: all 0.3s ease;
	}

	.chart-container.transitioning {
		opacity: 0.7;
	}

	.chart-container.drill-down {
		transform: translateX(-10px);
	}

	.chart-container.drill-up {
		transform: translateX(10px);
	}

	.drill-hint {
		position: absolute;
		top: 10px;
		right: 10px;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--hint-bg, rgba(0, 102, 204, 0.1));
		color: var(--hint-text, #0066cc);
		border-radius: 6px;
		font-size: 0.875rem;
		border: 1px solid var(--hint-border, rgba(0, 102, 204, 0.2));
	}

	.hint-icon {
		font-size: 1rem;
	}

	.data-summary {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--summary-bg, #f8f9fa);
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.summary-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 1rem;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: var(--stat-bg, #ffffff);
		border-radius: 4px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.stat-label {
		font-size: 0.875rem;
		color: var(--text-secondary, #666666);
	}

	.stat-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.level-indicators {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.indicators-label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.indicators {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.level-indicator {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.level-indicator.active {
		background: var(--indicator-active-bg, #0066cc);
		color: var(--indicator-active-text, #ffffff);
	}

	.level-indicator.completed {
		background: var(--indicator-completed-bg, #28a745);
		color: var(--indicator-completed-text, #ffffff);
	}

	.level-number {
		font-size: 0.8rem;
		font-weight: 600;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--level-number-bg, rgba(255, 255, 255, 0.2));
		border-radius: 50%;
	}

	.level-name {
		font-size: 0.75rem;
		text-align: center;
		max-width: 80px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.level-separator {
		color: var(--text-secondary, #666666);
		font-size: 1rem;
	}

	.data-table-section {
		background: var(--table-section-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		overflow: hidden;
	}

	.table-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--table-header-bg, #f8f9fa);
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.table-header h4 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--text-primary, #1a1a1a);
	}

	.table-info {
		font-size: 0.875rem;
		color: var(--text-secondary, #666666);
	}

	.table-container {
		overflow-x: auto;
		max-height: 400px;
		overflow-y: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.data-table th {
		background: var(--table-header-bg, #f8f9fa);
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--border-light, #e9ecef);
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.data-table th.numeric {
		text-align: right;
	}

	.data-table td {
		padding: 0.75rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
		color: var(--text-primary, #1a1a1a);
	}

	.data-table td.numeric {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.data-row.has-children {
		background: var(--row-drillable-bg, #f8f9fa);
	}

	.data-row.has-children:hover {
		background: var(--row-drillable-hover-bg, #e9ecef);
	}

	.name-cell {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.item-name {
		font-weight: 500;
	}

	.children-indicator {
		font-size: 0.8rem;
		color: var(--text-secondary, #666666);
	}

	.drill-down-btn {
		background: var(--button-primary-bg, #0066cc);
		color: var(--button-primary-text, #ffffff);
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background-color 0.2s;
	}

	.drill-down-btn:hover {
		background: var(--button-primary-hover-bg, #0052a3);
	}

	.no-action {
		font-size: 0.8rem;
		color: var(--text-secondary, #666666);
		font-style: italic;
	}

	@media (max-width: 768px) {
		.drill-down-chart {
			padding: 1rem;
		}

		.drill-down-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.header-controls {
			flex-direction: column;
			gap: 1rem;
		}

		.aggregation-control {
			flex-direction: row;
			align-items: center;
		}

		.level-info {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.breadcrumb-nav {
			padding: 0.5rem;
		}

		.summary-stats {
			grid-template-columns: 1fr;
		}

		.level-indicators {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.indicators {
			flex-wrap: wrap;
		}

		.table-header {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.data-table th,
		.data-table td {
			padding: 0.5rem;
		}

		.name-cell {
			min-width: 120px;
		}
	}
</style>
