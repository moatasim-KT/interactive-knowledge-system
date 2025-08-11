import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import InteractiveVisualizationBlock from '../InteractiveVisualizationBlock.svelte';
import InteractiveChartBlock from '../InteractiveChartBlock.svelte';
import SimulationBlock from '../SimulationBlock.svelte';
import type {
	InteractiveVisualizationBlock as IVBType,
	InteractiveChartBlock as ICBType,
	SimulationBlock as SBType
} from '$lib/types/web-content.js';

describe('Interactive Visualization Components', () => {
	const mock_visualization_block = {
		id: 'test-viz-1',
		type: 'interactive-visualization',
		content: {
			visualizationType: 'chart',
			config: {
				title: 'Test Visualization',
				description: 'A test interactive visualization',
				parameters: [
					{
						name: 'testParam',
						type: 'slider',
						default: 50,
						description: 'Test parameter',
						constraints: { min: 0, max: 100, step: 1 }
					}
				],
				layout: {
					width: 600,
					height: 400,
					margin: { top: 20, right: 20, bottom: 40, left: 40 },
					responsive: true
				},
				styling: {
					theme: 'light',
					colors: ['#0066cc'],
					fonts: { family: 'system-ui', size: 12 }
				},
				animations: {
					enabled: true,
					duration: 300,
					easing: 'ease-in-out',
					transitions: ['opacity']
				}
			},
			data: [
				{ x: 1, y: 10, label: 'Point 1' },
				{ x: 2, y: 20, label: 'Point 2' },
				{ x: 3, y: 15, label: 'Point 3' }
			],
			sourceReference: {
				originalUrl: 'https://example.com',
				originalContent: 'Original content',
				transformationReasoning: 'Test transformation',
				extractionMethod: 'test',
				confidence: 0.9
			}
		},
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		}
	};

	const mock_chart_block = {
		id: 'test-chart-1',
		type: 'interactive-chart',
		content: {
			chartType: 'line',
			data: {
				id: 'test-data',
				type: 'line',
				selector: '',
				detected: true,
				data: [
					{ x: 1, y: 10 },
					{ x: 2, y: 20 },
					{ x: 3, y: 15 }
				]
			},
			interactions: [],
			filters: [],
			sourceReference: {
				originalUrl: 'https://example.com',
				originalContent: 'Original content',
				transformationReasoning: 'Test transformation',
				extractionMethod: 'test',
				confidence: 0.9
			}
		},
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		}
	};

	const mock_simulation_block = {
		id: 'test-sim-1',
		type: 'simulation',
		content: {
			simulationType: 'physics',
			parameters: [
				{
					name: 'gravity',
					type: 'number',
					min: 0,
					max: 20,
					step: 0.1,
					default: 9.8,
					description: 'Gravitational acceleration'
				}
			],
			initialState: { position: 0, velocity: 0 },
			stepFunction:
				'return { position: state.position + state.velocity, velocity: state.velocity + parameters.gravity };',
			visualization: {
				type: 'physics',
				width: 400,
				height: 300,
				interactive: true,
				config: {}
			},
			sourceReference: {
				originalUrl: 'https://example.com',
				originalContent: 'Original content',
				transformationReasoning: 'Test transformation',
				extractionMethod: 'test',
				confidence: 0.9
			}
		},
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		}
	};

	it('renders InteractiveVisualizationBlock without crashing', () => {
		const { container } = render(InteractiveVisualizationBlock, {
			props: { block: mock_visualization_block }
		});

		expect(container.querySelector('.interactive-visualization-block')).toBeTruthy();
		expect(container.textContent).toContain('Test Visualization');
	});

	it('renders InteractiveChartBlock without crashing', () => {
		const { container } = render(InteractiveChartBlock, {
			props: { block: mock_chart_block }
		});

		expect(container.querySelector('.interactive-chart-block')).toBeTruthy();
		expect(container.textContent).toContain('Line Chart');
	});

	it('renders SimulationBlock without crashing', () => {
		const { container } = render(SimulationBlock, {
			props: { block: mock_simulation_block }
		});

		expect(container.querySelector('.simulation-block')).toBeTruthy();
		expect(container.textContent).toContain('physics Simulation');
	});

	it('displays parameter controls when parameters are provided', () => {
		const { container } = render(InteractiveVisualizationBlock, {
			props: { block: mock_visualization_block }
		});

		expect(container.querySelector('.parameter-section')).toBeTruthy();
		expect(container.textContent).toContain('Parameters');
	});

	it('displays data manipulation controls', () => {
		const { container } = render(InteractiveVisualizationBlock, {
			props: { block: mock_visualization_block }
		});

		expect(container.querySelector('.data-manipulation-section')).toBeTruthy();
		expect(container.textContent).toContain('Data Controls');
	});

	it('shows source attribution when provided', () => {
		const { container } = render(InteractiveVisualizationBlock, {
			props: { block: mock_visualization_block }
		});

		expect(container.querySelector('.source-attribution')).toBeTruthy();
		expect(container.textContent).toContain('https://example.com');
	});
});
