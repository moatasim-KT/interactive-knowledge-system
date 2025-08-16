<script lang="ts">
	import type { InteractiveVisualizationBlock, DataFilter, Parameter } from '$lib/types/unified';
	import InteractiveChart from './InteractiveChart.svelte';
	import ParameterControls from './ParameterControls.svelte';
	import SimulationBlock from './SimulationBlock.svelte';
	import SystemDiagramBlock from './SystemDiagramBlock.svelte';
	import NeuralNetworkVisualizer from './NeuralNetworkVisualizer.svelte';
	import DataExplorer from './DataExplorer.svelte';
	import SimulationManager from './SimulationManager.svelte';
	import { Card, Badge, Button } from '$lib/components/ui/index.ts';

	interface Props {
		block: InteractiveVisualizationBlock;
		editable?: boolean;
		onParameterChange?: (event: { parameter: string; value: any; allValues: Record<string, any> }) => void;
		onSimulationUpdate?: (event: { data: any; parameters: Parameter[] }) => void;
	}

	let { 
		block, 
		editable = false,
		onParameterChange,
		onSimulationUpdate
	}: Props = $props();

	let current_data = $state<any>(block.content.data);
	let current_parameters = $state<Parameter[]>(block.content.config.parameters || []);
	let simulation_state = $state<any>({});
	let is_running = $state(false);
	let current_step = $state(0);

	// Ensure all parameters have required description
	const parameters = $derived(() => 
		block.content.config.parameters?.map(p => ({
			...p,
			description: p.description || `Parameter: ${p.name}`,
			constraints: p.constraints || {}
		})) || []
	);

	// Handle parameter changes
	function handle_parameter_change(event: { parameter: string; value: any; allValues: Record<string, any> }) {
		const { parameter, value, allValues } = event;
		
		// Update the parameter in the current parameters
		const param_index = current_parameters.findIndex((p) => p.name === parameter);
		if (param_index >= 0) {
			current_parameters[param_index] = { ...current_parameters[param_index], default: value };
		}
		
		onParameterChange?.(event);
	}

	// Handle simulation updates
	function handle_simulation_update(event: { data: any; parameters: Parameter[] }) {
		current_data = event.data;
		current_parameters = event.parameters;
		simulation_state = event.data;
		onSimulationUpdate?.(event);
	}

	// Get visualization type display name
	function get_visualization_type_display_name(type: string): string {
		const type_names: Record<string, string> = {
			'neural-network': 'Neural Network',
			'chart': 'Interactive Chart',
			'simulation': 'Simulation',
			'algorithm': 'Algorithm Visualizer',
			'data-explorer': 'Data Explorer'
		};
		return type_names[type] || type;
	}

	// Start simulation
	function start_simulation() {
		is_running = true;
		current_step = 0;
		// In a real implementation, this would start the simulation
		// For now, we'll just update the state
		simulation_state = { running: true };
	}

	// Stop simulation
	function stop_simulation() {
		is_running = false;
		simulation_state = { ...simulation_state, running: false };
	}

	// Reset simulation
	function reset_simulation() {
		is_running = false;
		current_step = 0;
		simulation_state = { running: false };
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
		{#if parameters().length > 0}
			<div class="parameter-section">
				<ParameterControls parameters={parameters()} onParameterChange={handle_parameter_change} />
			</div>
		{/if}

		<!-- Main Visualization -->
		<div class="visualization-display">
			{#if block.content.visualizationType === 'chart'}
				<InteractiveChart
					data={current_data}
					config={block.content.config}
					oninteraction={() => {}}
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

		.parameter-section {
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
		.visualization-display {
			border-width: 2px;
		}
	}
</style>
