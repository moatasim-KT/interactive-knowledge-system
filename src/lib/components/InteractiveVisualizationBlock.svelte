<script lang="ts">
	import type { InteractiveVisualizationBlock } from '$lib/types/web-content.js';
	import InteractiveChart from './InteractiveChart.svelte';
	import ParameterControls from './ParameterControls.svelte';
	import DataManipulator from './DataManipulator.svelte';
	import { createEventDispatcher } from 'svelte';

	export let block: InteractiveVisualizationBlock;
	export let editable = false;

	const dispatch = createEventDispatcher();

	let current_data = block.content.data;
	let parameters = block.content.config.parameters || [];
	let filters: any[] = [];

	// Handle parameter changes
	function handle_parameter_change(event: CustomEvent) {
		const { parameter, value } = event.detail;

		// Update the parameter in the config
		const param_index = parameters.findIndex((p) => p.name === parameter);
		if (param_index >= 0) {
			parameters[param_index].default = value;
		}

		// Trigger data update based on parameter change
		update_visualization();

		dispatch('parameterChange', { parameter, value, blockId: block.id });
	}

	// Handle data manipulation (filtering, sorting)
	function handle_data_change(event: CustomEvent) {
		const { data, filters: newFilters } = event.detail;
		current_data = data;
		filters = newFilters;

		dispatch('dataChange', { data, filters, blockId: block.id });
	}

	// Update visualization based on current parameters and data
	function update_visualization() {
		// This would typically involve recalculating data based on parameters
		// For now, we'll just trigger a re-render
		current_data = { ...current_data };
	}

	// Handle chart interactions (hover, zoom, etc.)
	function handle_chart_interaction(event: CustomEvent) {
		dispatch('chartInteraction', { ...event.detail, blockId: block.id });
	}
</script>

<div class="interactive-visualization-block" data-block-id={block.id}>
	<header class="visualization-header">
		<h3 class="visualization-title">{block.content.config.title}</h3>
		{#if block.content.config.description}
			<p class="visualization-description">{block.content.config.description}</p>
		{/if}
	</header>

	<div class="visualization-content">
		<!-- Parameter Controls -->
		{#if parameters.length > 0}
			<div class="parameter-section">
				<ParameterControls {parameters} on:parameterChange={handleParameterChange} />
			</div>
		{/if}

		<!-- Data Manipulation Controls -->
		<div class="data-manipulation-section">
			<DataManipulator data={currentData} {filters} on:dataChange={handleDataChange} />
		</div>

		<!-- Main Visualization -->
		<div class="visualization-display">
			{#if block.content.visualizationType === 'chart'}
				<InteractiveChart
					data={currentData}
					config={block.content.config}
					on:interaction={handleChartInteraction}
				/>
			{:else if block.content.visualizationType === 'neural-network'}
				<!-- Neural network visualization would go here -->
				<div class="placeholder-visualization">
					<p>Neural Network Visualization</p>
					<p>Type: {block.content.visualizationType}</p>
				</div>
			{:else if block.content.visualizationType === 'simulation'}
				<!-- Simulation visualization would go here -->
				<div class="placeholder-visualization">
					<p>Simulation Visualization</p>
					<p>Type: {block.content.visualizationType}</p>
				</div>
			{:else if block.content.visualizationType === 'algorithm'}
				<!-- Algorithm visualization would go here -->
				<div class="placeholder-visualization">
					<p>Algorithm Visualization</p>
					<p>Type: {block.content.visualizationType}</p>
				</div>
			{:else if block.content.visualizationType === 'data-explorer'}
				<!-- Data explorer would go here -->
				<div class="placeholder-visualization">
					<p>Data Explorer</p>
					<p>Type: {block.content.visualizationType}</p>
				</div>
			{:else}
				<div class="unsupported-visualization">
					<p>Unsupported visualization type: {block.content.visualizationType}</p>
				</div>
			{/if}
		</div>

		<!-- Source Attribution -->
		{#if block.content.sourceReference}
			<div class="source-attribution">
				<small>
					Source: <a
						href={block.content.sourceReference.originalUrl}
						target="_blank"
						rel="noopener"
					>
						{block.content.sourceReference.originalUrl}
					</a>
					{#if block.content.sourceReference.transformationReasoning}
						<br />
						<em>Transformation: {block.content.sourceReference.transformationReasoning}</em>
					{/if}
				</small>
			</div>
		{/if}
	</div>
</div>

<style>
	.interactive-visualization-block {
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1rem;
		margin: 1rem 0;
		background: var(--bg-color, #ffffff);
	}

	.visualization-header {
		margin-bottom: 1rem;
	}

	.visualization-title {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.visualization-description {
		margin: 0;
		color: var(--text-secondary, #666666);
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.visualization-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.parameter-section {
		background: var(--bg-secondary, #f8f9fa);
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.data-manipulation-section {
		background: var(--bg-secondary, #f8f9fa);
		padding: 1rem;
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.visualization-display {
		min-height: 300px;
		background: var(--bg-color, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.placeholder-visualization,
	.unsupported-visualization {
		text-align: center;
		color: var(--text-secondary, #666666);
		padding: 2rem;
	}

	.source-attribution {
		padding-top: 1rem;
		border-top: 1px solid var(--border-light, #e9ecef);
		color: var(--text-secondary, #666666);
		font-size: 0.8rem;
	}

	.source-attribution a {
		color: var(--link-color, #0066cc);
		text-decoration: none;
	}

	.source-attribution a:hover {
		text-decoration: underline;
	}

	@media (max-width: 768px) {
		.interactive-visualization-block {
			padding: 0.75rem;
		}

		.parameter-section,
		.data-manipulation-section {
			padding: 0.75rem;
		}

		.visualization-display {
			min-height: 250px;
			padding: 0.75rem;
		}
	}
</style>
