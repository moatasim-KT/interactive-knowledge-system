<script lang="ts">
	import type { SimulationBlock } from '$lib/types/unified';
	import ParameterControls from './ParameterControls.svelte';
	import {
		exportSimulationResults,
		exportSimulationReport,
		type SimulationResult
	} from '$lib/utils/simulationExport.js';


	interface Props {
		block: SimulationBlock;
		editable?: boolean;
		onparameterchange?: (detail: { parameter: string, value: any, blockId: string }) => void;
		onsimulationstart?: (detail: { blockId: string }) => void;
		onsimulationpause?: (detail: { blockId: string }) => void;
		onsimulationstop?: (detail: { blockId: string }) => void;
		onsimulationreset?: (detail: { blockId: string }) => void;
		onsimulationstep?: (detail: { step: number, state: Record<string, any>, blockId: string }) => void;
		onsimulationerror?: (detail: { error: string, step: number }) => void;
		onsimulationexport?: (detail: { format: string, blockId: string }) => void;
		onsimulationreportexport?: (detail: { blockId: string }) => void;
	}

	let { 
		block, 
		editable = false,
		onparameterchange = () => {},
		onsimulationstart = () => {},
		onsimulationpause = () => {},
		onsimulationstop = () => {},
		onsimulationreset = () => {},
		onsimulationstep = () => {},
		onsimulationerror = () => {},
		onsimulationexport = () => {},
		onsimulationreportexport = () => {}
	}: Props = $props();

	let simulation_state = $state<Record<string, any>>({ ...block.content.initialState });
	let is_running = $state<boolean>(false);
	let is_paused = $state<boolean>(false);
	let animation_id = $state<number | null>(null);
	let step_count = $state<number>(0);
	let simulation_speed = $state<number>(1);
	let auto_run = $state<boolean>(false);
	let simulation_results = $state<SimulationResult[]>([]);

	// Convert parameters to the format expected by ParameterControls
    const parameters = $derived(() => block.content.parameters.map((param) => ({
        name: param.name,
        type: (['number','boolean','string','select','slider','dropdown','toggle','text'].includes(param.type) ? param.type : 'text') as 'number'|'boolean'|'string'|'select'|'slider'|'dropdown'|'toggle'|'text',
        default: param.default,
        description: param.description,
        constraints: {
            min: param.min,
            max: param.max,
            step: param.step,
            options: param.options
        }
    })) as unknown as import('$lib/types/unified').Parameter[]);

	// Handle parameter changes
	function handle_parameter_change(event: CustomEvent) {
		const { parameter, value } = event.detail;

		// Update simulation parameters
		const param_index = block.content.parameters.findIndex((p) => p.name === parameter);
		if (param_index >= 0) {
			block.content.parameters[param_index].default = value;
		}

		// Reset simulation with new parameters if running
		if (is_running) {
			reset_simulation();
			if (auto_run) {
				start_simulation();
			}
		}

		onparameterchange({ parameter, value, blockId: block.id });
	}

	// Simulation control functions
	function start_simulation() {
		if (is_running && !is_paused) return;

		is_running = true;
		is_paused = false;

		run_simulation_step();
		onsimulationstart({ blockId: block.id });
	}

	function pause_simulation() {
		is_paused = true;
		if (animation_id) {
			cancelAnimationFrame(animation_id);
			animation_id = null;
		}
		onsimulationpause({ blockId: block.id });
	}

	function stop_simulation() {
		is_running = false;
		is_paused = false;
		if (animation_id) {
			cancelAnimationFrame(animation_id);
			animation_id = null;
		}
		onsimulationstop({ blockId: block.id });
	}

	function reset_simulation() {
		stop_simulation();
		simulation_state = { ...block.content.initialState };
		step_count = 0;
		simulation_results = [];
		onsimulationreset({ blockId: block.id });
	}

	// Export simulation results
	function export_results(format: 'json' | 'csv' = 'json') {
		if (simulation_results.length === 0) {
			alert('No simulation data to export. Run the simulation first.');
			return;
		}

		const parameter_values = block.content.parameters.reduce(
			(acc, param) => {
				acc[param.name] = param.default;
				return acc;
			},
			{} as Record<string, any>
		);

		exportSimulationResults(
			block.content.simulationType,
			parameter_values,
			simulation_results,
			format
		);

		onsimulationexport({ format, blockId: block.id });
	}

	// Export simulation report
	function export_report() {
		if (simulation_results.length === 0) {
			alert('No simulation data to export. Run the simulation first.');
			return;
		}

		const parameter_values = block.content.parameters.reduce(
			(acc, param) => {
				acc[param.name] = param.default;
				return acc;
			},
			{} as Record<string, any>
		);

		exportSimulationReport(block.content.simulationType, parameter_values, simulation_results);

		onsimulationreportexport({ blockId: block.id });
	}

	function step_simulation() {
		if (is_running && !is_paused) return;

		execute_simulation_step();
		onsimulationstep({ 
			step: step_count,
			state: simulation_state,
			blockId: block.id
		});
	}

	// Execute a single simulation step
	function execute_simulation_step() {
		try {
			// In a real implementation, this would safely execute the step function
			// For now, we'll simulate a simple state update
			const step_function = new Function('state', 'parameters', 'step', block.content.stepFunction);
			const parameter_values = block.content.parameters.reduce(
				(acc, param) => {
					acc[param.name] = param.default;
					return acc;
				},
				{} as Record<string, any>
			);

			simulation_state =
				step_function(simulation_state, parameter_values, step_count) || simulation_state;

			// Record result for export
			simulation_results.push({
				step: step_count,
				time: step_count * 0.016, // Assuming 60 FPS
				state: { ...simulation_state },
				timestamp: Date.now()
			});

			step_count++;
		} catch (error) {
			onsimulationerror({ error: (error as Error).message, step: step_count });
			stop_simulation();
		}
	}

	// Animation loop for continuous simulation
	function run_simulation_step() {
		if (!is_running || is_paused) return;

		execute_simulation_step();

		// Continue animation based on speed
		const delay = Math.max(16, 1000 / (60 * simulation_speed)); // 60 FPS max, adjusted by speed
		setTimeout(() => {
			if (is_running && !is_paused) {
				animation_id = requestAnimationFrame(run_simulation_step);
			}
		}, delay);
	}

	// Handle speed changes
	function handle_speed_change(event: Event) {
		const target = event.target as HTMLInputElement;
		simulation_speed = parseFloat(target.value);
	}

	// Handle auto-run toggle
	function handle_auto_run_toggle() {
		auto_run = !auto_run;
		if (auto_run && !is_running) {
			start_simulation();
		} else if (!auto_run && is_running) {
			stop_simulation();
		}
	}

	// Cleanup on component destroy
	$effect(() => {
		return () => {
			if (animation_id) {
				cancelAnimationFrame(animation_id);
			}
		};
	});

	// Format simulation state for display
	function format_state_value(value: any): string {
		if (typeof value === 'number') {
			return value.toFixed(3);
		}
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}
</script>

<div class="simulation-block" data-block-id={block.id}>
	<header class="simulation-header">
		<div class="simulation-title-section">
			<h3 class="simulation-title">
				{block.content.simulationType} Simulation
			</h3>
			<div class="simulation-status">
				<span class="status-indicator" class:running={is_running} class:paused={is_paused}>
					{is_running ? (is_paused ? 'Paused' : 'Running') : 'Stopped'}
				</span>
				<span class="step-counter">Step: {step_count}</span>
			</div>
		</div>
	</header>

	<div class="simulation-content">
		<!-- Parameter Controls -->
        {#if parameters().length > 0}
			<div class="parameters-section">
                <ParameterControls parameters={parameters()} onParameterChange={(p) => handle_parameter_change(new CustomEvent('parameterchange', { detail: p }))} />
			</div>
		{/if}

		<!-- Simulation Controls -->
		<div class="controls-section">
			<div class="playback-controls">
				<button
					class="control-btn start-btn"
					class:active={is_running && !is_paused}
					onclick={start_simulation}
					disabled={is_running && !is_paused}
					type="button"
					title="Start simulation"
				>
					▶️ Start
				</button>

				<button
					class="control-btn pause-btn"
					class:active={is_paused}
					onclick={pause_simulation}
					disabled={!is_running}
					type="button"
					title="Pause simulation"
				>
					⏸️ Pause
				</button>

				<button
					class="control-btn stop-btn"
					onclick={stop_simulation}
					disabled={!is_running}
					type="button"
					title="Stop simulation"
				>
					⏹️ Stop
				</button>

				<button
					class="control-btn reset-btn"
					onclick={reset_simulation}
					type="button"
					title="Reset simulation"
				>
					🔄 Reset
				</button>

				<button
					class="control-btn export-btn"
					onclick={() => export_results('json')}
					type="button"
					title="Export results as JSON"
					disabled={simulation_results.length === 0}
				>
					📊 Export JSON
				</button>

				<button
					class="control-btn export-btn"
					onclick={() => export_results('csv')}
					type="button"
					title="Export results as CSV"
					disabled={simulation_results.length === 0}
				>
					📈 Export CSV
				</button>

				<button
					class="control-btn report-btn"
					onclick={export_report}
					type="button"
					title="Export simulation report"
					disabled={simulation_results.length === 0}
				>
					📋 Report
				</button>

				<button
					class="control-btn step-btn"
					onclick={step_simulation}
					disabled={is_running && !is_paused}
					type="button"
					title="Execute single step"
				>
					⏭️ Step
				</button>
			</div>

			<div class="simulation-settings">
				<div class="speed-control">
					<label for="speed-{block.id}">Speed:</label>
					<input
						id="speed-{block.id}"
						type="range"
						min="0.1"
						max="5"
						step="0.1"
						bind:value={simulation_speed}
						oninput={handle_speed_change}
						class="speed-slider"
					/>
					<span class="speed-value">{simulation_speed.toFixed(1)}x</span>
				</div>

				<div class="auto-run-control">
					<label class="auto-run-label">
						<input
							type="checkbox"
							bind:checked={auto_run}
							onchange={handle_auto_run_toggle}
							class="auto-run-checkbox"
						/>
						Auto-run on parameter change
					</label>
				</div>
			</div>
		</div>

		<!-- Simulation Visualization -->
		<div class="visualization-section">
			<div class="visualization-container">
				{#if block.content.visualization}
					<!-- Custom visualization would be rendered here -->
					<div class="simulation-display">
						<h4>Simulation Visualization</h4>
						<div class="visualization-placeholder">
							<p>Visualization Type: {block.content.visualization.type}</p>
							<p>
								Dimensions: {block.content.visualization.width} × {block.content.visualization
									.height}
							</p>
							<p>Interactive: {block.content.visualization.interactive ? 'Yes' : 'No'}</p>
						</div>
					</div>
				{:else}
					<div class="no-visualization">
						<p>No visualization configured for this simulation.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Simulation State Display -->
		<div class="state-section">
			<h4 class="state-title">Current State</h4>
			<div class="state-display">
				{#each Object.entries(simulation_state) as [key, value] (key)}
					<div class="state-item">
						<span class="state-key">{key}:</span>
						<span class="state-value">{format_state_value(value)}</span>
					</div>
				{/each}
			</div>
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
	.simulation-block {
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1rem 0;
		background: var(--bg-color, #ffffff);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.simulation-header {
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.simulation-title-section {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.simulation-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.simulation-status {
		display: flex;
		align-items: center;
		gap: 1rem;
		font-size: 0.9rem;
	}

	.status-indicator {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		background: var(--status-stopped-bg, #6c757d);
		color: var(--status-stopped-text, #ffffff);
	}

	.status-indicator.running {
		background: var(--status-running-bg, #28a745);
		color: var(--status-running-text, #ffffff);
	}

	.status-indicator.paused {
		background: var(--status-paused-bg, #ffc107);
		color: var(--status-paused-text, #000000);
	}

	.step-counter {
		color: var(--text-secondary, #666666);
		font-weight: 500;
	}

	.simulation-content {
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

	.controls-section {
		background: var(--controls-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		padding: 1rem;
	}

	.playback-controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.control-btn {
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

	.control-btn:hover:not(:disabled) {
		background: var(--button-hover-bg, #0052a3);
		transform: translateY(-1px);
	}

	.control-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		transform: none;
	}

	.control-btn.active {
		background: var(--button-active-bg, #28a745);
	}

	.simulation-settings {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		align-items: center;
		padding-top: 1rem;
		border-top: 1px solid var(--border-light, #e9ecef);
	}

	.speed-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.9rem;
	}

	.speed-slider {
		width: 120px;
		height: 6px;
		border-radius: 3px;
		background: var(--slider-track, #e9ecef);
		outline: none;
		appearance: none;
	}

	.speed-slider::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--slider-thumb, #0066cc);
		cursor: pointer;
		border: 2px solid var(--slider-thumb-border, #ffffff);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.speed-value {
		min-width: 2.5rem;
		text-align: center;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.auto-run-control {
		font-size: 0.9rem;
	}

	.auto-run-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
		color: var(--text-primary, #1a1a1a);
	}

	.auto-run-checkbox {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.visualization-section {
		background: var(--visualization-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		padding: 1rem;
		min-height: 300px;
	}

	.visualization-container {
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.simulation-display,
	.no-visualization {
		text-align: center;
		color: var(--text-secondary, #666666);
	}

	.simulation-display h4 {
		margin: 0 0 1rem 0;
		color: var(--text-primary, #1a1a1a);
	}

	.visualization-placeholder {
		background: var(--placeholder-bg, #f8f9fa);
		border: 2px dashed var(--placeholder-border, #dee2e6);
		border-radius: 6px;
		padding: 2rem;
	}

	.visualization-placeholder p {
		margin: 0.5rem 0;
		font-size: 0.9rem;
	}

	.state-section {
		background: var(--state-bg, #f8f9fa);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		padding: 1rem;
	}

	.state-title {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.state-display {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
	}

	.state-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: var(--state-item-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.state-key {
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.state-value {
		font-family: monospace;
		color: var(--text-secondary, #666666);
		text-align: right;
		max-width: 50%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
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
		.simulation-block {
			padding: 1rem;
		}

		.simulation-title-section {
			flex-direction: column;
			align-items: flex-start;
		}

		.simulation-title {
			font-size: 1.25rem;
		}

		.playback-controls {
			justify-content: center;
		}

		.control-btn {
			flex: 1;
			min-width: 0;
			justify-content: center;
		}

		.simulation-settings {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.speed-control {
			justify-content: space-between;
		}

		.state-display {
			grid-template-columns: 1fr;
		}

		.state-item {
			flex-direction: column;
			align-items: stretch;
			gap: 0.25rem;
		}

		.state-value {
			max-width: 100%;
			text-align: left;
		}
	}
</style>
