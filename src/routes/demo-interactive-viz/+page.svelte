<script lang="ts">
	import InteractiveVisualizationBlock from '$lib/components/InteractiveVisualizationBlock.svelte';
	import InteractiveChartBlock from '$lib/components/InteractiveChartBlock.svelte';
	import SimulationBlock from '$lib/components/SimulationBlock.svelte';
	import type {
		InteractiveVisualizationBlock as IVBType,
		InteractiveChartBlock as ICBType,
		SimulationBlock as SBType
	} from '$lib/types/web-content.js';

	// Sample data for demonstrations
	const sample_visualization_block = {
		id: 'demo-viz-1',
		type: 'interactive-visualization',
		content: {
			visualizationType: 'chart',
			config: {
				title: 'Interactive Sales Data Visualization',
				description: 'Explore sales data with interactive controls and real-time filtering',
				parameters: [
					{
						name: 'timeRange',
						type: 'dropdown',
						default: 'monthly',
						description: 'Time aggregation period',
						constraints: { options: ['daily', 'weekly', 'monthly', 'yearly'] }
					},
					{
						name: 'smoothing',
						type: 'slider',
						default: 0.3,
						description: 'Data smoothing factor',
						constraints: { min: 0, max: 1, step: 0.1 }
					},
					{
						name: 'showTrend',
						type: 'toggle',
						default: true,
						description: 'Display trend line'
					}
				],
				layout: {
					width: 800,
					height: 400,
					margin: { top: 20, right: 20, bottom: 40, left: 60 },
					responsive: true
				},
				styling: {
					theme: 'light',
					colors: ['#0066cc', '#ff6b35', '#28a745'],
					fonts: { family: 'system-ui', size: 12 }
				},
				animations: {
					enabled: true,
					duration: 300,
					easing: 'ease-in-out',
					transitions: ['opacity', 'transform']
				}
			},
			data: [
				{ x: 'Jan', y: 120, label: 'January Sales' },
				{ x: 'Feb', y: 135, label: 'February Sales' },
				{ x: 'Mar', y: 148, label: 'March Sales' },
				{ x: 'Apr', y: 162, label: 'April Sales' },
				{ x: 'May', y: 178, label: 'May Sales' },
				{ x: 'Jun', y: 195, label: 'June Sales' }
			],
			sourceReference: {
				originalUrl: 'https://example.com/sales-report',
				originalContent: 'Monthly sales data from company dashboard',
				transformationReasoning: 'Converted static table to interactive visualization',
				extractionMethod: 'table-parser',
				confidence: 0.95
			}
		},
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		}
	};

	const sample_chart_block = {
		id: 'demo-chart-1',
		type: 'interactive-chart',
		content: {
			chartType: 'line',
			data: {
				id: 'performance-data',
				type: 'line',
				selector: '',
				detected: true,
				data: [
					{ x: 0, y: 10, category: 'A' },
					{ x: 1, y: 25, category: 'A' },
					{ x: 2, y: 18, category: 'B' },
					{ x: 3, y: 32, category: 'B' },
					{ x: 4, y: 28, category: 'C' },
					{ x: 5, y: 45, category: 'C' }
				]
			},
			interactions: [
				{
					event: 'hover',
					parameter: 'highlight',
					effect: 'function(point) { return point.category; }',
					debounce: 100
				},
				{
					event: 'click',
					parameter: 'select',
					effect: 'function(point) { return point; }'
				}
			],
			filters: [
				{
					field: 'category',
					type: 'select',
					operator: 'equals',
					value: 'A',
					active: false
				}
			],
			sourceReference: {
				originalUrl: 'https://example.com/performance-metrics',
				originalContent: 'Performance metrics chart from analytics dashboard',
				transformationReasoning: 'Enhanced static chart with interactive features',
				extractionMethod: 'chart-detector',
				confidence: 0.88
			}
		},
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		}
	};

	const sample_simulation_block = {
		id: 'demo-sim-1',
		type: 'simulation',
		content: {
			simulationType: 'Physics Pendulum',
			parameters: [
				{
					name: 'gravity',
					type: 'number',
					min: 1,
					max: 20,
					step: 0.5,
					default: 9.8,
					description: 'Gravitational acceleration (m/s²)'
				},
				{
					name: 'length',
					type: 'number',
					min: 0.5,
					max: 5,
					step: 0.1,
					default: 1.0,
					description: 'Pendulum length (m)'
				},
				{
					name: 'damping',
					type: 'number',
					min: 0,
					max: 1,
					step: 0.01,
					default: 0.02,
					description: 'Damping coefficient'
				}
			],
			initialState: {
				angle: 0.5,
				angularVelocity: 0,
				time: 0
			},
			stepFunction: `
				const dt = 0.016; // 60 FPS
				const g = parameters.gravity;
				const L = parameters.length;
				const damping = parameters.damping;
				
				const angularAcceleration = -(g / L) * Math.sin(state.angle) - damping * state.angularVelocity;
				
				return {
					angle: state.angle + state.angularVelocity * dt,
					angularVelocity: state.angularVelocity + angularAcceleration * dt,
					time: state.time + dt
				};
			`,
			visualization: {
				type: 'pendulum',
				width: 400,
				height: 400,
				interactive: true,
				config: {
					showTrail: true,
					showForces: false
				}
			},
			sourceReference: {
				originalUrl: 'https://example.com/physics-tutorial',
				originalContent: 'Static pendulum diagram from physics textbook',
				transformationReasoning: 'Converted static diagram to interactive physics simulation',
				extractionMethod: 'diagram-analyzer',
				confidence: 0.92
			}
		},
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		}
	};

	// Event handlers for demonstration
	function handle_parameter_change(event: CustomEvent) {
		console.log('Parameter changed:', event.detail);
	}

	function handle_data_change(event: CustomEvent) {
		console.log('Data changed:', event.detail);
	}

	function handle_chart_interaction(event: CustomEvent) {
		console.log('Chart interaction:', event.detail);
	}

	function handle_simulation_event(event: CustomEvent) {
		console.log('Simulation event:', event.detail);
	}
</script>

<svelte:head>
	<title>Interactive Visualization Components Demo</title>
	<meta
		name="description"
		content="Demonstration of interactive visualization components for web content sourcing"
	/>
</svelte:head>

<div class="demo-page">
	<header class="demo-header">
		<h1>Interactive Visualization Components</h1>
		<p class="demo-description">
			This page demonstrates the interactive visualization components built for the web content
			sourcing system. These components transform static web content into dynamic, explorable
			visualizations.
		</p>
	</header>

	<main class="demo-content">
		<section class="demo-section">
			<h2>Interactive Visualization Block</h2>
			<p>
				A comprehensive visualization component with parameter controls, data manipulation, and
				real-time updates. Perfect for transforming static charts into interactive experiences.
			</p>
			<InteractiveVisualizationBlock
				block={sampleVisualizationBlock}
				on:parameterChange={handleParameterChange}
				on:dataChange={handleDataChange}
				on:chartInteraction={handleChartInteraction}
			/>
		</section>

		<section class="demo-section">
			<h2>Interactive Chart Block</h2>
			<p>
				Specialized chart component with hover effects, zoom capabilities, and advanced filtering.
				Includes built-in interaction handlers and data manipulation tools.
			</p>
			<InteractiveChartBlock
				block={sampleChartBlock}
				on:dataChange={handleDataChange}
				on:chartInteraction={handleChartInteraction}
				on:interactionExecuted={handleChartInteraction}
			/>
		</section>

		<section class="demo-section">
			<h2>Simulation Block</h2>
			<p>
				Interactive simulation component with playback controls, parameter adjustment, and real-time
				state visualization. Great for physics, algorithms, and dynamic systems.
			</p>
			<SimulationBlock
				block={sampleSimulationBlock}
				on:parameterChange={handleParameterChange}
				on:simulationStart={handleSimulationEvent}
				on:simulationPause={handleSimulationEvent}
				on:simulationStop={handleSimulationEvent}
				on:simulationReset={handleSimulationEvent}
				on:simulationStep={handleSimulationEvent}
				on:simulationError={handleSimulationEvent}
			/>
		</section>

		<section class="demo-section">
			<h2>Features Implemented</h2>
			<div class="features-grid">
				<div class="feature-card">
					<h3>Parameter Controls</h3>
					<ul>
						<li>Sliders with real-time updates</li>
						<li>Dropdown selections</li>
						<li>Toggle switches</li>
						<li>Number and text inputs</li>
						<li>Reset to defaults</li>
					</ul>
				</div>

				<div class="feature-card">
					<h3>Data Manipulation</h3>
					<ul>
						<li>Search and filtering</li>
						<li>Sorting by any field</li>
						<li>Advanced filter conditions</li>
						<li>Real-time data updates</li>
						<li>Filter management</li>
					</ul>
				</div>

				<div class="feature-card">
					<h3>Chart Interactions</h3>
					<ul>
						<li>Hover tooltips</li>
						<li>Zoom and pan</li>
						<li>Click interactions</li>
						<li>Point highlighting</li>
						<li>Responsive design</li>
					</ul>
				</div>

				<div class="feature-card">
					<h3>Simulation Controls</h3>
					<ul>
						<li>Play/pause/stop controls</li>
						<li>Step-by-step execution</li>
						<li>Speed adjustment</li>
						<li>State visualization</li>
						<li>Auto-run on parameter change</li>
					</ul>
				</div>
			</div>
		</section>

		<section class="demo-section">
			<h2>Technical Implementation</h2>
			<div class="tech-details">
				<h3>Components Created:</h3>
				<ul>
					<li><code>InteractiveVisualizationBlock.svelte</code> - Main visualization container</li>
					<li><code>InteractiveChartBlock.svelte</code> - Specialized chart component</li>
					<li><code>SimulationBlock.svelte</code> - Interactive simulation component</li>
					<li><code>InteractiveChart.svelte</code> - Core chart with hover and zoom</li>
					<li><code>ParameterControls.svelte</code> - Dynamic parameter interface</li>
					<li><code>DataManipulator.svelte</code> - Data filtering and sorting</li>
				</ul>

				<h3>Key Features:</h3>
				<ul>
					<li>Real-time parameter updates with immediate visual feedback</li>
					<li>Advanced data filtering with multiple condition types</li>
					<li>Interactive chart elements with hover, zoom, and click handling</li>
					<li>Simulation playback controls with variable speed</li>
					<li>Responsive design that works on mobile and desktop</li>
					<li>Source attribution and transformation traceability</li>
					<li>Event-driven architecture for component communication</li>
					<li>Type-safe interfaces with comprehensive TypeScript support</li>
				</ul>
			</div>
		</section>
	</main>
</div>

<style>
	.demo-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.demo-header {
		text-align: center;
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 2px solid #e9ecef;
	}

	.demo-header h1 {
		font-size: 2.5rem;
		color: #1a1a1a;
		margin-bottom: 1rem;
	}

	.demo-description {
		font-size: 1.1rem;
		color: #666666;
		max-width: 800px;
		margin: 0 auto;
		line-height: 1.6;
	}

	.demo-content {
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	.demo-section {
		background: #ffffff;
		border-radius: 8px;
		padding: 2rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.demo-section h2 {
		color: #1a1a1a;
		margin-bottom: 1rem;
		font-size: 1.8rem;
	}

	.demo-section > p {
		color: #666666;
		margin-bottom: 2rem;
		line-height: 1.6;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.feature-card {
		background: #f8f9fa;
		border: 1px solid #e9ecef;
		border-radius: 6px;
		padding: 1.5rem;
	}

	.feature-card h3 {
		color: #1a1a1a;
		margin-bottom: 1rem;
		font-size: 1.2rem;
	}

	.feature-card ul {
		margin: 0;
		padding-left: 1.5rem;
		color: #666666;
	}

	.feature-card li {
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.tech-details {
		background: #f8f9fa;
		border-radius: 6px;
		padding: 2rem;
		margin-top: 1rem;
	}

	.tech-details h3 {
		color: #1a1a1a;
		margin-bottom: 1rem;
		margin-top: 2rem;
	}

	.tech-details h3:first-child {
		margin-top: 0;
	}

	.tech-details ul {
		color: #666666;
		line-height: 1.6;
	}

	.tech-details li {
		margin-bottom: 0.5rem;
	}

	.tech-details code {
		background: #e9ecef;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-family: 'Monaco', 'Menlo', monospace;
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.demo-page {
			padding: 1rem;
		}

		.demo-header h1 {
			font-size: 2rem;
		}

		.demo-section {
			padding: 1.5rem;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.tech-details {
			padding: 1.5rem;
		}
	}
</style>
