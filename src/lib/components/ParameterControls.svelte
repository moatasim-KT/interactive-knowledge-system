<script lang="ts">
	import type { Parameter } from '$lib/types/web-content.js';

	interface Props {
		parameters: Parameter[];
		onParameterChange?: (payload: { parameter: string; value: any; allValues: Record<string, any> }) => void;
		onParametersReset?: (payload: { values: Record<string, any> }) => void;
	}

	let { parameters, onParameterChange = () => {}, onParametersReset = () => {} }: Props = $props();

	// Track current values for all parameters
	let parameter_values = $state<Record<string, any>>({});

	// Initialize parameter values when parameters change
	$effect(() => {
		parameters.forEach((param) => {
			if (!(param.name in parameter_values)) {
				parameter_values[param.name] = param.default;
			}
		});
	});

	function handle_parameter_change(parameter_name: string, value: any) {
		parameter_values[parameter_name] = value;

		onParameterChange({ parameter: parameter_name, value, allValues: { ...parameter_values } });
	}

	function reset_to_defaults() {
		parameters.forEach((param) => {
			parameter_values[param.name] = param.default;
		});

		onParametersReset({ values: { ...parameter_values } });
	}

	function get_constraint_value(param: Parameter, key: string, default_value: any) {
		return param.constraints?.[key] ?? default_value;
	}
</script>

<div class="parameter-controls">
	<div class="controls-header">
		<h4 class="controls-title">Parameters</h4>
		<button
			class="reset-button"
			onclick={reset_to_defaults}
			type="button"
			title="Reset all parameters to default values"
		>
			Reset
		</button>
	</div>

	<div class="controls-grid">
		{#each parameters as param (param.name)}
			<div class="parameter-control" data-parameter={param.name}>
				<label class="parameter-label" for="param-{param.name}">
					{param.name}
					{#if param.description}
						<span class="parameter-description">{param.description}</span>
					{/if}
				</label>

				<div class="parameter-input">
					{#if param.type === 'slider' || (param.type === 'number' && param.constraints?.min !== undefined && param.constraints?.max !== undefined)}
						<!-- Slider Control -->
						<div class="slider-container">
							<input
								id="param-{param.name}"
								type="range"
								min={get_constraint_value(param, 'min', 0)}
								max={get_constraint_value(param, 'max', 100)}
								step={get_constraint_value(param, 'step', 1)}
								bind:value={parameter_values[param.name]}
								oninput={(e) =>
									handle_parameter_change(param.name, parseFloat(e.currentTarget.value))}
								class="slider"
							/>
							<div class="slider-value">
								{parameter_values[param.name]}
							</div>
						</div>
					{:else if param.type === 'dropdown' || param.type === 'select' || param.constraints?.options}
						<!-- Dropdown Control -->
						<select
							id="param-{param.name}"
							bind:value={parameter_values[param.name]}
							onchange={(e) => handle_parameter_change(param.name, e.currentTarget.value)}
							class="dropdown"
						>
							{#each param.constraints?.options || [] as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					{:else if param.type === 'toggle' || param.type === 'boolean'}
						<!-- Toggle Control -->
						<label class="toggle-container">
							<input
								id="param-{param.name}"
								type="checkbox"
								bind:checked={parameter_values[param.name]}
								onchange={(e) => handle_parameter_change(param.name, e.currentTarget.checked)}
								class="toggle-input"
							/>
							<span class="toggle-slider"></span>
						</label>
					{:else if param.type === 'number'}
						<!-- Number Input -->
						<input
							id="param-{param.name}"
							type="number"
							min={get_constraint_value(param, 'min', undefined)}
							max={get_constraint_value(param, 'max', undefined)}
							step={get_constraint_value(param, 'step', 'any')}
							bind:value={parameter_values[param.name]}
							oninput={(e) =>
								handle_parameter_change(param.name, parseFloat(e.currentTarget.value))}
							class="number-input"
						/>
					{:else if param.type === 'text' || param.type === 'string'}
						<!-- Text Input -->
						<input
							id="param-{param.name}"
							type="text"
							bind:value={parameter_values[param.name]}
							oninput={(e) => handle_parameter_change(param.name, e.currentTarget.value)}
							class="text-input"
							placeholder={param.description || ''}
						/>
					{:else}
						<!-- Generic Input -->
						<input
							id="param-{param.name}"
							type="text"
							bind:value={parameter_values[param.name]}
							oninput={(e) => handle_parameter_change(param.name, e.currentTarget.value)}
							class="generic-input"
							placeholder="Enter value..."
						/>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if parameters.length === 0}
		<div class="no-parameters">
			<p>No parameters available for this visualization.</p>
		</div>
	{/if}
</div>

<style>
	.parameter-controls {
		background: var(--controls-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		padding: 1rem;
	}

	.controls-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.controls-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.reset-button {
		background: var(--button-secondary-bg, #6c757d);
		color: var(--button-secondary-text, #ffffff);
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background-color 0.2s;
	}

	.reset-button:hover {
		background: var(--button-secondary-hover-bg, #5a6268);
	}

	.controls-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	}

	.parameter-control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.parameter-label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.parameter-description {
		font-size: 0.8rem;
		font-weight: 400;
		color: var(--text-secondary, #666666);
		font-style: italic;
	}

	.parameter-input {
		display: flex;
		align-items: center;
	}

	/* Slider Styles */
	.slider-container {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
	}

	.slider {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: var(--slider-track, #e9ecef);
		outline: none;
		appearance: none;
	}

	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--slider-thumb, #0066cc);
		cursor: pointer;
		border: 2px solid var(--slider-thumb-border, #ffffff);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.slider::-moz-range-thumb {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--slider-thumb, #0066cc);
		cursor: pointer;
		border: 2px solid var(--slider-thumb-border, #ffffff);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.slider-value {
		min-width: 3rem;
		text-align: center;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		background: var(--value-bg, #f8f9fa);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	/* Dropdown Styles */
	.dropdown {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-size: 0.9rem;
		cursor: pointer;
	}

	.dropdown:focus {
		outline: none;
		border-color: var(--input-focus-border, #0066cc);
		box-shadow: 0 0 0 2px var(--input-focus-shadow, rgba(0, 102, 204, 0.2));
	}

	/* Toggle Styles */
	.toggle-container {
		position: relative;
		display: inline-block;
		width: 50px;
		height: 24px;
		cursor: pointer;
	}

	.toggle-input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: var(--toggle-off-bg, #ccc);
		border-radius: 24px;
		transition: 0.3s;
	}

	.toggle-slider:before {
		position: absolute;
		content: '';
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background: var(--toggle-thumb, #ffffff);
		border-radius: 50%;
		transition: 0.3s;
	}

	.toggle-input:checked + .toggle-slider {
		background: var(--toggle-on-bg, #0066cc);
	}

	.toggle-input:checked + .toggle-slider:before {
		transform: translateX(26px);
	}

	/* Input Styles */
	.number-input,
	.text-input,
	.generic-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-size: 0.9rem;
	}

	.number-input:focus,
	.text-input:focus,
	.generic-input:focus {
		outline: none;
		border-color: var(--input-focus-border, #0066cc);
		box-shadow: 0 0 0 2px var(--input-focus-shadow, rgba(0, 102, 204, 0.2));
	}

	.no-parameters {
		text-align: center;
		color: var(--text-secondary, #666666);
		font-style: italic;
		padding: 2rem;
	}

	@media (max-width: 768px) {
		.controls-grid {
			grid-template-columns: 1fr;
		}

		.controls-header {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.reset-button {
			align-self: flex-start;
		}

		.slider-container {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.slider-value {
			align-self: center;
		}
	}
</style>
