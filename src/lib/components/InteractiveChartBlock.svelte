<script lang="ts">
	import type { InteractiveChartBlock } from '$lib/types/web-content.js';
	import InteractiveChart from './InteractiveChart.svelte';
	import DataManipulator from './DataManipulator.svelte';
	import { createEventDispatcher } from 'svelte';

	export let block: InteractiveChartBlock;
	export let editable = false;

	const dispatch = createEventDispatcher();

	let current_data = block.content.data;
	let active_filters = block.content.filters || [];
	let chart_config = {
		...block.content,
		layout: {
			width: 600,
			height: 400,
			margin: { top: 20, right: 20, bottom: 40, left: 40 },
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
		}
	};

	// Handle data manipulation changes
	function handle_data_change(event: CustomEvent) {
		const { data, filters } = event.detail;
		current_data = data;
		active_filters = filters;

		dispatch('dataChange', {
			data,
			filters,
			blockId: block.id
		});
	}

	// Handle chart interactions
	function handle_chart_interaction(event: CustomEvent) {
		const { type, point, coordinates, zoomLevel } = event.detail;

		// Execute any defined interactions for this chart
		block.content.interactions?.forEach((interaction) => {
			if (interaction.event === type) {
				try {
					// In a real implementation, this would safely execute the interaction effect
					// For now, we'll just dispatch the interaction
					dispatch('interactionExecuted', { interaction: interaction.parameter, point });
				} catch (error) {
					dispatch('interactionError', {
						error: (error as Error).message,
						interaction: interaction.parameter
					});
				}
			}
		});

		dispatch('chartInteraction', {
			type,
			point,
			coordinates,
			zoomLevel,
			blockId: block.id
		});
	}

	// Get chart type display name
	function get_chart_type_display_name(type: string): string {
		const type_names = {
			line: 'Line Chart',
			bar: 'Bar Chart',
			scatter: 'Scatter Plot',
			heatmap: 'Heat Map',
			network: 'Network Diagram'
		};
		return type_names[type] || type;
	}
</script>

<div class="interactive-chart-block" data-block-id={block.id}>
	<header class="chart-header">
		<div class="chart-title-section">
			<h3 class="chart-title">
				{get_chart_type_display_name(block.content.chartType)}
			</h3>
			<span class="chart-type-badge">{block.content.chartType}</span>
		</div>
		{#if block.content.sourceReference}
			<div class="chart-description">
				<p>Interactive chart generated from web content</p>
			</div>
		{/if}
	</header>

	<div class="chart-content">
		<!-- Data Manipulation Controls -->
		<div class="data-controls-section">
			<DataManipulator
				data={block.content.data}
				filters={activeFilters}
				on:dataChange={handleDataChange}
			/>
		</div>

		<!-- Chart Display -->
		<div class="chart-display-section">
			<InteractiveChart
				data={currentData}
				config={chartConfig}
				on:interaction={handleChartInteraction}
			/>
		</div>

		<!-- Chart Information -->
		<div class="chart-info">
			<div class="chart-stats">
				<span class="stat-item">
					<strong>Data Points:</strong>
					{Array.isArray(current_data)
						? current_data.length
						: Object.keys(current_data || {}).length}
				</span>
				<span class="stat-item">
					<strong>Chart Type:</strong>
					{get_chart_type_display_name(block.content.chartType)}
				</span>
				{#if active_filters.length > 0}
					<span class="stat-item">
						<strong>Active Filters:</strong>
						{active_filters.filter((f) => f.active).length}
					</span>
				{/if}
			</div>

			{#if block.content.interactions && block.content.interactions.length > 0}
				<div class="interactions-info">
					<h5>Available Interactions:</h5>
					<ul class="interactions-list">
						{#each block.content.interactions as interaction (interaction.parameter)}
							<li class="interaction-item">
								<strong>{interaction.event}:</strong>
								{interaction.parameter}
								{#if interaction.debounce}
									<small>(debounced: {interaction.debounce}ms)</small>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

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
	.interactive-chart-block {
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1rem 0;
		background: var(--bg-color, #ffffff);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.chart-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.chart-title-section {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.chart-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.chart-type-badge {
		background: var(--badge-bg, #e9ecef);
		color: var(--badge-text, #495057);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.chart-description {
		color: var(--text-secondary, #666666);
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.chart-description p {
		margin: 0;
	}

	.chart-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.data-controls-section {
		background: var(--section-bg, #f8f9fa);
		border-radius: 6px;
		padding: 1rem;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.chart-display-section {
		background: var(--chart-bg, #ffffff);
		border-radius: 6px;
		padding: 1rem;
		border: 1px solid var(--border-light, #e9ecef);
		min-height: 400px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.chart-info {
		background: var(--info-bg, #f8f9fa);
		border-radius: 6px;
		padding: 1rem;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.chart-stats {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.stat-item {
		font-size: 0.9rem;
		color: var(--text-primary, #1a1a1a);
	}

	.interactions-info {
		border-top: 1px solid var(--border-light, #e9ecef);
		padding-top: 1rem;
	}

	.interactions-info h5 {
		margin: 0 0 0.5rem 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.interactions-list {
		margin: 0;
		padding-left: 1.5rem;
		list-style-type: disc;
	}

	.interaction-item {
		font-size: 0.8rem;
		color: var(--text-secondary, #666666);
		margin-bottom: 0.25rem;
	}

	.interaction-item strong {
		color: var(--text-primary, #1a1a1a);
	}

	.interaction-item small {
		color: var(--text-muted, #999999);
		font-style: italic;
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
		.interactive-chart-block {
			padding: 1rem;
		}

		.chart-title-section {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.chart-title {
			font-size: 1.25rem;
		}

		.data-controls-section,
		.chart-display-section,
		.chart-info {
			padding: 0.75rem;
		}

		.chart-display-section {
			min-height: 300px;
		}

		.chart-stats {
			flex-direction: column;
			gap: 0.5rem;
		}

		.interactions-list {
			padding-left: 1rem;
		}
	}
</style>
