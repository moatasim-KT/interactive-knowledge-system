<script lang="ts">
	import type { InteractiveVisualizationBlock, DataFilter } from '$lib/types/web-content.js';
	import type { ContentBlock } from '$lib/types/content.js';
	import InteractiveChart from './InteractiveChart.svelte';
	import ParameterControls from './ParameterControls.svelte';
	import DataManipulator from './DataManipulator.svelte';
	import NeuralNetworkVisualizer from './NeuralNetworkVisualizer.svelte';
	import SimulationBlock from './SimulationBlock.svelte';
	import DataExplorer from './DataExplorer.svelte';
	interface Props {
		block: InteractiveVisualizationBlock;
		editable?: boolean;
		// Svelte 5 event callback props
		onupdate?: (data: Partial<ContentBlock>) => void;
		onparameterchange?: (data: { parameter: string; value: any }) => void;
		ondatachange?: (data: { data: any; filters: DataFilter[]; sort: { field: string; direction: 'asc' | 'desc' }; search: string }) => void;
		onchartinteraction?: (data: any) => void;
	}

	let { 
		block, 
		editable = false,
		onupdate,
		onparameterchange,
		ondatachange,
		onchartinteraction
	}: Props = $props();

	let current_data = $state(block.content.data);
	let parameters = $state(block.content.config.parameters || []);
	let filters = $state<any[]>([]);

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

		onparameterchange?.({ parameter, value });
	}

	// Handle data manipulation (filtering, sorting)
	function handle_data_change(event: CustomEvent<{ data: any; filters: DataFilter[]; sort: { field: string; direction: 'asc' | 'desc' }; search: string }>) {
		const { data, filters: newFilters, sort, search } = event.detail;
		current_data = data;
		filters = newFilters;

		ondatachange?.({ data, filters: newFilters, sort, search });
	}

	// Update visualization based on current parameters and data
	function update_visualization() {
		// This would typically involve recalculating data based on parameters
		// For now, we'll just trigger a re-render
		current_data = { ...current_data };
	}

	// Handle chart interactions (hover, zoom, etc.)
	function handle_chart_interaction(event: any) {
		onchartinteraction?.(event.detail);
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
				<ParameterControls {parameters} onParameterChange={(p) => handle_parameter_change(new CustomEvent('parameterchange', { detail: p }))} />
			</div>
		{/if}

		<!-- Data Manipulation Controls -->
		<div class="data-manipulation-section">
			<DataManipulator data={current_data} {filters} onDataChange={(p) => handle_data_change(new CustomEvent('datachange', { detail: p }))} />
		</div>

		<!-- Main Visualization -->
		<div class="visualization-display">
			{#if block.content.visualizationType === 'chart'}
				<InteractiveChart
					data={current_data}
					config={block.content.config}
					oninteraction={handle_chart_interaction}
				/>
			{:else if block.content.visualizationType === 'neural-network'}
				<NeuralNetworkVisualizer
					inputSize={block.content.config.parameters?.find(p => p.name === 'inputSize')?.default || 3}
					outputSize={block.content.config.parameters?.find(p => p.name === 'outputSize')?.default || 2}
					hiddenLayers={block.content.config.parameters?.find(p => p.name === 'hiddenLayers')?.default || 2}
					neuronsPerHidden={block.content.config.parameters?.find(p => p.name === 'neuronsPerHidden')?.default || 5}
					activation={block.content.config.parameters?.find(p => p.name === 'activation')?.default || 'relu'}
				/>
			{:else if block.content.visualizationType === 'simulation'}
				<SimulationBlock
					block={{
						id: block.id + '-sim',
						type: 'simulation',
						metadata: {
							created: new Date(),
							modified: new Date(),
							version: 1
						},
						content: {
							simulationType: block.content.config.title || 'Generic Simulation',
							parameters: block.content.config.parameters as any || [],
							initialState: block.content.data || {},
							stepFunction: 'return state;', // Default no-op function
							visualization: {
								type: 'generic',
								width: 600,
								height: 400,
								interactive: true,
								config: {}
							},
							sourceReference: block.content.sourceReference
						}
					}}
					editable={editable}
				/>
			{:else if block.content.visualizationType === 'algorithm'}
				<div class="algorithm-visualization">
					<h4>Algorithm Visualization</h4>
					<div class="algorithm-content">
						<p><strong>Algorithm:</strong> {block.content.config.title}</p>
						{#if block.content.config.description}
							<p><strong>Description:</strong> {block.content.config.description}</p>
						{/if}
						<div class="algorithm-steps">
							<h5>Steps:</h5>
							<ol>
								{#each (block.content.data?.steps || ['Step 1', 'Step 2', 'Step 3']) as step, index (index)}
									<li>{step}</li>
								{/each}
							</ol>
						</div>
						{#if block.content.data?.complexity}
							<p><strong>Time Complexity:</strong> {block.content.data.complexity}</p>
						{/if}
					</div>
				</div>
			{:else if block.content.visualizationType === 'data-explorer'}
				<DataExplorer
					data={current_data}
					title={block.content.config.title}
					description={block.content.config.description}
				/>
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

	.unsupported-visualization {
		text-align: center;
		color: var(--text-secondary, #666666);
		padding: 2rem;
	}

	.algorithm-visualization {
		padding: 1.5rem;
		background: var(--algorithm-bg, #f8f9fa);
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.algorithm-visualization h4 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
		font-size: 1.2rem;
	}

	.algorithm-content p {
		margin: 0.5rem 0;
		color: var(--text-primary, #1a1a1a);
	}

	.algorithm-steps {
		margin: 1rem 0;
	}

	.algorithm-steps h5 {
		margin: 0 0 0.5rem 0;
		color: var(--text-primary, #1a1a1a);
		font-size: 1rem;
	}

	.algorithm-steps ol {
		margin: 0;
		padding-left: 1.5rem;
	}

	.algorithm-steps li {
		margin: 0.25rem 0;
		color: var(--text-primary, #1a1a1a);
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

	/* Mobile responsive design */
	@media (max-width: 768px) {
		.interactive-visualization-block {
			padding: 0.75rem;
			margin: 0.5rem 0;
			border-radius: 6px;
		}

		.visualization-header {
			margin-bottom: 0.75rem;
		}

		.visualization-title {
			font-size: 1.1rem;
			line-height: 1.3;
		}

		.visualization-description {
			font-size: 0.85rem;
		}

		.visualization-content {
			gap: 0.75rem;
		}

		.parameter-section,
		.data-manipulation-section {
			padding: 0.75rem;
			border-radius: 4px;
		}

		.visualization-display {
			min-height: 250px;
			padding: 0.75rem;
			border-radius: 4px;
			overflow-x: auto;
			-webkit-overflow-scrolling: touch;
		}

		.algorithm-visualization {
			padding: 1rem;
		}

		.algorithm-visualization h4 {
			font-size: 1.1rem;
		}

		.algorithm-steps ol {
			padding-left: 1rem;
		}

		.source-attribution {
			font-size: 0.75rem;
			line-height: 1.3;
		}
	}

	/* Touch-friendly interactions */
	@media (hover: none) and (pointer: coarse) {
		.interactive-visualization-block {
			/* Optimize for touch devices */
			user-select: none;
			-webkit-tap-highlight-color: transparent;
		}

		.visualization-display {
			/* Better touch scrolling */
			touch-action: pan-x pan-y;
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: high) {
		.interactive-visualization-block {
			border-width: 2px;
		}

		.parameter-section,
		.data-manipulation-section,
		.visualization-display {
			border-width: 2px;
		}
	}
</style>
