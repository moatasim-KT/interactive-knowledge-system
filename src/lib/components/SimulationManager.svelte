<script lang="ts">
	import type { SimulationBlock, SystemDiagramBlock } from '$lib/types/unified';
	import SimulationBlockComponent from './SimulationBlock.svelte';
	import SystemDiagramBlockComponent from './SystemDiagramBlock.svelte';
	import {
		physicsSimulations,
		chemistrySimulations,
		engineeringSimulations,
		systemDiagramTemplates,
		createSimulationFromTemplate,
		createDiagramFromTemplate,
		type SimulationTemplate,
		type DiagramTemplate
	} from '$lib/utils/simulationTemplates.js';

	interface Props {
		mode?: 'simulation' | 'diagram' | 'both';
		domain?: 'physics' | 'chemistry' | 'engineering' | 'all';
		editable?: boolean;
		onSimulationCreated?: (simulation: SimulationBlock) => void;
		onDiagramCreated?: (diagram: SystemDiagramBlock) => void;
		onSimulationEvent?: (event: any) => void; // General event for simulation interactions
		onParameterChange?: (event: { parameter: string; value: any }) => void;
		onSimulationStart?: (event: any) => void;
		onSimulationPause?: (event: any) => void;
		onSimulationStep?: (event: any) => void;
		onSimulationReset?: (event: any) => void;
		onElementClick?: (event: any) => void;
	}

	let { 
		mode = 'both', 
		domain = 'all', 
		editable = true,
		onSimulationCreated = () => {},
		onDiagramCreated = () => {},
		onSimulationEvent = () => {},
		onParameterChange = () => {},
		onSimulationStart = () => {},
		onSimulationPause = () => {},
		onSimulationStep = () => {},
		onSimulationReset = () => {},
		onElementClick = () => {}
	}: Props = $props();

	let selected_template = $state<SimulationTemplate | DiagramTemplate | null>(null);
	let current_simulation = $state<SimulationBlock | null>(null);
	let current_diagram = $state<SystemDiagramBlock | null>(null);
	let view_mode = $state<'template-selection' | 'simulation' | 'diagram'>('template-selection');

	// Get available templates based on domain and mode
	const available_simulation_templates = $derived(() => get_simulation_templates(domain));
	const available_diagram_templates = $derived(() => get_diagram_templates(domain));

	function get_simulation_templates(current_domain: string): SimulationTemplate[] {
		const all_templates = [
			...physicsSimulations,
			...chemistrySimulations,
			...engineeringSimulations
		];
		return current_domain === 'all'
			? all_templates
			: all_templates.filter((t) => t.domain === current_domain);
	}

	function get_diagram_templates(current_domain: string): DiagramTemplate[] {
		return current_domain === 'all'
			? systemDiagramTemplates
			: systemDiagramTemplates.filter((t) => t.domain === current_domain);
	}

	// Create simulation from template
	function create_simulation(template: SimulationTemplate) {
		const block_id = `sim-${Date.now()}`;
		current_simulation = createSimulationFromTemplate(template.id, block_id);
		view_mode = 'simulation';
		onSimulationCreated(current_simulation);
	}

	// Create diagram from template
	function create_diagram(template: DiagramTemplate) {
		const block_id = `diagram-${Date.now()}`;
		current_diagram = createDiagramFromTemplate(template.id, block_id);
		view_mode = 'diagram';
		onDiagramCreated(current_diagram);
	}

	// Handle template selection
	function select_template(
		template: SimulationTemplate | DiagramTemplate,
		type: 'simulation' | 'diagram') {
		selected_template = template;
		if (type === 'simulation') {
			create_simulation(template as SimulationTemplate);
		} else {
			create_diagram(template as DiagramTemplate);
		}
	}

	// Go back to template selection
	function back_to_templates() {
		view_mode = 'template-selection';
		selected_template = null;
		// Back to templates - no callback needed
	}

	// Handle simulation events
	function handle_simulation_event(event: any) {
		onSimulationEvent(event);
	}

	// Handle diagram events
	function handle_diagram_event(event: any) {
		onSimulationEvent(event);
	}
</script>

<div class="simulation-manager">
	{#if view_mode === 'template-selection'}
		<div class="template-selection">
			<header class="selection-header">
				<h2 class="selection-title">Choose a Simulation or Diagram</h2>
				<div class="selection-filters">
					<div class="domain-filter">
						<label for="domain-select">Domain:</label>
						<select id="domain-select" bind:value={domain}>
							<option value="all">All Domains</option>
							<option value="physics">Physics</option>
							<option value="chemistry">Chemistry</option>
							<option value="engineering">Engineering</option>
						</select>
					</div>
					<div class="mode-filter">
						<label for="mode-select">Type:</label>
						<select id="mode-select" bind:value={mode}>
							<option value="both">Both</option>
							<option value="simulation">Simulations Only</option>
							<option value="diagram">Diagrams Only</option>
						</select>
					</div>
				</div>
			</header>

			<div class="template-grid">
				{#if mode === 'simulation' || mode === 'both'}
					<div class="template-section">
						<h3 class="section-title">Simulations</h3>
						<div class="template-cards">
							{#each available_simulation_templates() as template (template.id)}
								<div class="template-card simulation-card">
									<div class="card-header">
										<h4 class="card-title">{template.name}</h4>
										<span class="card-domain">{template.domain}</span>
									</div>
									<p class="card-description">{template.description}</p>
									<div class="card-parameters">
										<strong>Parameters:</strong>
										<ul class="parameter-list">
											{#each template.parameters.slice(0, 3) as param (param.name)}
												<li>{param.name}: {param.description}</li>
											{/each}
											{#if template.parameters.length > 3}
												<li class="more-params">...and {template.parameters.length - 3} more</li>
											{/if}
										</ul>
									</div>
									<button
										class="card-button simulation-button"
										onclick={() => select_template(template, 'simulation')}
										type="button"
									>
										Create Simulation
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				{#if mode === 'diagram' || mode === 'both'}
					<div class="template-section">
						<h3 class="section-title">System Diagrams</h3>
						<div class="template-cards">
							{#each available_diagram_templates() as template (template.id)}
								<div class="template-card diagram-card">
									<div class="card-header">
										<h4 class="card-title">{template.name}</h4>
										<span class="card-domain">{template.domain}</span>
									</div>
									<p class="card-description">{template.description}</p>
									<div class="card-elements">
										<strong>Elements:</strong>
										<span class="element-count"
											>{template.elements.length} components, {template.connections.length} connections</span
										>
									</div>
									<button
										class="card-button diagram-button"
										onclick={() => select_template(template, 'diagram')}
										type="button"
									>
										Create Diagram
									</button>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{:else if view_mode === 'simulation' && current_simulation}
		<div class="simulation-view">
			<div class="view-header">
				<button class="back-button" onclick={back_to_templates} type="button">
					← Back to Templates
				</button>
				<h2 class="view-title">Simulation: {current_simulation.content.simulationType}</h2>
			</div>
			<SimulationBlockComponent
				block={current_simulation}
				{editable}
				onparameterchange={handle_simulation_event}
				onsimulationstart={handle_simulation_event}
				onsimulationpause={handle_simulation_event}
				onsimulationstop={handle_simulation_event}
				onsimulationreset={handle_simulation_event}
				onsimulationstep={handle_simulation_event}
				onsimulationerror={handle_simulation_event}
				onsimulationexport={handle_simulation_event}
				onsimulationreportexport={handle_simulation_event}
			/>
		</div>
	{:else if view_mode === 'diagram' && current_diagram}
		<div class="diagram-view">
			<div class="view-header">
				<button class="back-button" onclick={back_to_templates} type="button">
					← Back to Templates
				</button>
				<h2 class="view-title">Diagram: {current_diagram.content.diagramType}</h2>
			</div>
			<SystemDiagramBlockComponent
				block={current_diagram}
				{editable}
				onparameterchange={handle_diagram_event}
				onelementclick={handle_diagram_event}
				onelementhover={handle_diagram_event}
				ondiagramreset={handle_diagram_event}
				ondiagramexport={handle_diagram_event}
				ondiagramerror={handle_diagram_event}
			/>
		</div>
	{/if}
</div>

<style>
	.simulation-manager {
		width: 100%;
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	.template-selection {
		width: 100%;
	}

	.selection-header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.selection-title {
		margin: 0 0 1rem 0;
		font-size: 2rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.selection-filters {
		display: flex;
		justify-content: center;
		gap: 2rem;
		flex-wrap: wrap;
	}

	.domain-filter,
	.mode-filter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.domain-filter label,
	.mode-filter label {
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.domain-filter select,
	.mode-filter select {
		padding: 0.5rem;
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 4px;
		background: var(--bg-color, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-size: 0.9rem;
	}

	.template-grid {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.template-section {
		width: 100%;
	}

	.section-title {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		text-align: center;
	}

	.template-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.template-card {
		background: var(--bg-color, #ffffff);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		transition: all 0.2s;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.template-card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.simulation-card {
		border-left: 4px solid var(--simulation-color, #28a745);
	}

	.diagram-card {
		border-left: 4px solid var(--diagram-color, #0066cc);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
		gap: 1rem;
	}

	.card-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		flex: 1;
	}

	.card-domain {
		background: var(--domain-bg, #f8f9fa);
		color: var(--domain-text, #6c757d);
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 500;
		text-transform: capitalize;
		white-space: nowrap;
	}

	.card-description {
		margin: 0 0 1rem 0;
		color: var(--text-secondary, #666666);
		line-height: 1.4;
		flex: 1;
	}

	.card-parameters,
	.card-elements {
		margin-bottom: 1.5rem;
		font-size: 0.9rem;
	}

	.card-parameters strong,
	.card-elements strong {
		color: var(--text-primary, #1a1a1a);
		display: block;
		margin-bottom: 0.5rem;
	}

	.parameter-list {
		margin: 0;
		padding-left: 1rem;
		color: var(--text-secondary, #666666);
	}

	.parameter-list li {
		margin-bottom: 0.25rem;
	}

	.more-params {
		font-style: italic;
		color: var(--text-muted, #999999);
	}

	.element-count {
		color: var(--text-secondary, #666666);
	}

	.card-button {
		background: var(--button-bg, #0066cc);
		color: var(--button-text, #ffffff);
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: all 0.2s;
		margin-top: auto;
	}

	.card-button:hover {
		background: var(--button-hover-bg, #0052a3);
		transform: translateY(-1px);
	}

	.simulation-button {
		background: var(--simulation-color, #28a745);
	}

	.simulation-button:hover {
		background: var(--simulation-hover, #218838);
	}

	.diagram-button {
		background: var(--diagram-color, #0066cc);
	}

	.diagram-button:hover {
		background: var(--diagram-hover, #0052a3);
	}

	.simulation-view,
	.diagram-view {
		width: 100%;
	}

	.view-header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.back-button {
		background: var(--back-button-bg, #6c757d);
		color: var(--back-button-text, #ffffff);
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

	.back-button:hover {
		background: var(--back-button-hover, #5a6268);
		transform: translateY(-1px);
	}

	.view-title {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		flex: 1;
	}

	@media (max-width: 768px) {
		.simulation-manager {
			padding: 0.5rem;
		}

		.selection-title {
			font-size: 1.5rem;
		}

		.selection-filters {
			flex-direction: column;
			align-items: center;
			gap: 1rem;
		}

		.template-cards {
			grid-template-columns: 1fr;
		}

		.card-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.view-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.back-button {
			align-self: flex-start;
		}

		.view-title {
			font-size: 1.25rem;
		}
	}
</style>
