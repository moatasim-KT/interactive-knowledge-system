<script lang="ts">
	import SimulationManager from '$lib/components/SimulationManager.svelte';
	import {
		createSimulationFromTemplate,
		createDiagramFromTemplate
	} from '$lib/utils/simulationTemplates.js';
	import SimulationBlock from '$lib/components/SimulationBlock.svelte';
	import SystemDiagramBlock from '$lib/components/SystemDiagramBlock.svelte';

	let show_manager = true;
	let demo_simulation = createSimulationFromTemplate('pendulum', 'demo-pendulum');
	let demo_diagram = createDiagramFromTemplate('control-system', 'demo-control');

	function handle_simulation_event(event: CustomEvent) {
		console.log('Simulation event:', event.detail);
	}

	function handle_diagram_event(event: CustomEvent) {
		console.log('Diagram event:', event.detail);
	}
</script>

<svelte:head>
	<title>Simulation & Diagram Demo</title>
	<meta name="description" content="Interactive simulation and system diagram components demo" />
</svelte:head>

<div class="demo-container">
	<header class="demo-header">
		<h1>Simulation & System Diagram Components</h1>
		<p class="demo-description">
			Interactive physics, chemistry, and engineering simulations with real-time parameter controls
			and exportable results, plus clickable system diagrams with dynamic state visualization.
		</p>
	</header>

	<nav class="demo-nav">
		<button
			class="nav-btn"
			class:active={show_manager}
			on:click={() => (show_manager = true)}
			type="button"
		>
			Template Manager
		</button>
		<button
			class="nav-btn"
			class:active={!show_manager}
			on:click={() => (show_manager = false)}
			type="button"
		>
			Individual Components
		</button>
	</nav>

	<main class="demo-content">
		{#if show_manager}
			<section class="manager-section">
				<h2>Simulation & Diagram Manager</h2>
				<p>Choose from pre-built templates across different domains:</p>
				<SimulationManager
					mode="both"
					domain="all"
					on:simulationCreated={handle_simulation_event}
					on:diagramCreated={handle_diagram_event}
					on:simulationEvent={handle_simulation_event}
					on:diagramEvent={handle_diagram_event}
				/>
			</section>
		{:else}
			<section class="components-section">
				<h2>Individual Component Examples</h2>

				<div class="component-demo">
					<h3>Physics Simulation: Simple Pendulum</h3>
					<p>
						Adjust parameters and watch the pendulum motion in real-time. Export results for
						analysis.
					</p>
					{#if demo_simulation}
						<SimulationBlock
							block={demo_simulation}
							editable={true}
							on:parameterChange={handle_simulation_event}
							on:simulationStart={handle_simulation_event}
							on:simulationPause={handle_simulation_event}
							on:simulationStop={handle_simulation_event}
							on:simulationReset={handle_simulation_event}
							on:simulationStep={handle_simulation_event}
							on:simulationError={handle_simulation_event}
							on:simulationExport={handle_simulation_event}
							on:simulationReportExport={handle_simulation_event}
						/>
					{/if}
				</div>

				<div class="component-demo">
					<h3>Engineering Diagram: Control System</h3>
					<p>Click on elements to see details. Adjust parameters to see visual feedback.</p>
					{#if demo_diagram}
						<SystemDiagramBlock
							block={demo_diagram}
							editable={true}
							on:parameterChange={handle_diagram_event}
							on:elementClick={handle_diagram_event}
							on:elementHover={handle_diagram_event}
							on:diagramReset={handle_diagram_event}
							on:diagramExport={handle_diagram_event}
							on:diagramError={handle_diagram_event}
						/>
					{/if}
				</div>
			</section>
		{/if}
	</main>

	<footer class="demo-footer">
		<div class="feature-highlights">
			<h3>Key Features</h3>
			<div class="features-grid">
				<div class="feature-card">
					<h4>🎛️ Real-time Parameters</h4>
					<p>Adjust simulation parameters and see immediate visual feedback</p>
				</div>
				<div class="feature-card">
					<h4>📊 Export Capabilities</h4>
					<p>Export simulation results as JSON, CSV, or detailed reports</p>
				</div>
				<div class="feature-card">
					<h4>🖱️ Interactive Diagrams</h4>
					<p>Click elements for details, hover for information</p>
				</div>
				<div class="feature-card">
					<h4>🔬 Multi-Domain</h4>
					<p>Physics, chemistry, and engineering simulation templates</p>
				</div>
				<div class="feature-card">
					<h4>⚡ State Management</h4>
					<p>Playback controls with step-by-step execution</p>
				</div>
				<div class="feature-card">
					<h4>📱 Responsive Design</h4>
					<p>Works seamlessly across desktop and mobile devices</p>
				</div>
			</div>
		</div>
	</footer>
</div>

<style>
	.demo-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.demo-header {
		text-align: center;
		margin-bottom: 3rem;
	}

	.demo-header h1 {
		font-size: 2.5rem;
		font-weight: 700;
		color: #1a1a1a;
		margin: 0 0 1rem 0;
	}

	.demo-description {
		font-size: 1.1rem;
		color: #666666;
		line-height: 1.6;
		max-width: 800px;
		margin: 0 auto;
	}

	.demo-nav {
		display: flex;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 3rem;
	}

	.nav-btn {
		background: #f8f9fa;
		color: #495057;
		border: 2px solid #e9ecef;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
		transition: all 0.2s;
	}

	.nav-btn:hover {
		background: #e9ecef;
		transform: translateY(-1px);
	}

	.nav-btn.active {
		background: #0066cc;
		color: #ffffff;
		border-color: #0066cc;
	}

	.demo-content {
		margin-bottom: 4rem;
	}

	.manager-section h2,
	.components-section h2 {
		text-align: center;
		font-size: 2rem;
		font-weight: 600;
		color: #1a1a1a;
		margin: 0 0 1rem 0;
	}

	.manager-section p,
	.components-section p {
		text-align: center;
		color: #666666;
		font-size: 1.1rem;
		margin-bottom: 2rem;
	}

	.component-demo {
		margin-bottom: 4rem;
		padding: 2rem;
		background: #f8f9fa;
		border-radius: 12px;
		border: 1px solid #e9ecef;
	}

	.component-demo h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1a1a1a;
		margin: 0 0 0.5rem 0;
	}

	.component-demo p {
		color: #666666;
		margin-bottom: 1.5rem;
		text-align: left;
	}

	.demo-footer {
		border-top: 2px solid #e9ecef;
		padding-top: 3rem;
	}

	.feature-highlights h3 {
		text-align: center;
		font-size: 1.75rem;
		font-weight: 600;
		color: #1a1a1a;
		margin: 0 0 2rem 0;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
	}

	.feature-card {
		background: #ffffff;
		border: 1px solid #e9ecef;
		border-radius: 8px;
		padding: 1.5rem;
		text-align: center;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
		transition: all 0.2s;
	}

	.feature-card:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.feature-card h4 {
		font-size: 1.1rem;
		font-weight: 600;
		color: #1a1a1a;
		margin: 0 0 0.75rem 0;
	}

	.feature-card p {
		color: #666666;
		font-size: 0.9rem;
		line-height: 1.4;
		margin: 0;
	}

	@media (max-width: 768px) {
		.demo-container {
			padding: 1rem;
		}

		.demo-header h1 {
			font-size: 2rem;
		}

		.demo-description {
			font-size: 1rem;
		}

		.demo-nav {
			flex-direction: column;
			align-items: center;
		}

		.nav-btn {
			width: 200px;
		}

		.component-demo {
			padding: 1rem;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
