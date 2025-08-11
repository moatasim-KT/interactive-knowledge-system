import { describe, it, expect } from 'vitest';
import {
	createSimulationFromTemplate,
	createDiagramFromTemplate,
	getSimulationTemplate,
	getDiagramTemplate
} from '$lib/utils/simulationTemplates.js';

describe('Simulation Templates', () => {
	it('creates simulation from template', () => {
		const simulation = createSimulationFromTemplate('pendulum', 'test-sim-1');
		expect(simulation).toBeTruthy();
		expect(simulation?.type).toBe('simulation');
		expect(simulation?.content.simulationType).toBe('Simple Pendulum');
	});

	it('creates diagram from template', () => {
		const diagram = createDiagramFromTemplate('control-system', 'test-diagram-1');
		expect(diagram).toBeTruthy();
		expect(diagram?.type).toBe('system-diagram');
		expect(diagram?.content.diagramType).toBe('Control System Block Diagram');
	});

	it('gets simulation template by ID', () => {
		const template = getSimulationTemplate('pendulum');
		expect(template).toBeTruthy();
		expect(template?.name).toBe('Simple Pendulum');
		expect(template?.domain).toBe('physics');
	});

	it('gets diagram template by ID', () => {
		const template = getDiagramTemplate('control-system');
		expect(template).toBeTruthy();
		expect(template?.name).toBe('Control System Block Diagram');
		expect(template?.domain).toBe('engineering');
	});

	it('returns null for invalid template IDs', () => {
		const simulation = createSimulationFromTemplate('invalid-id', 'test');
		const diagram = createDiagramFromTemplate('invalid-id', 'test');
		expect(simulation).toBeNull();
		expect(diagram).toBeNull();
	});
});

describe('Simulation Export', () => {
	it('exports simulation to JSON', async () => {
		const { exportSimulationToJSON } = await import('$lib/utils/simulationExport.js');

		const results = [
			{
				step: 0,
				time: 0,
				state: { position: 1.0, velocity: 0 },
				timestamp: Date.now()
			},
			{
				step: 1,
				time: 0.016,
				state: { position: 0.9, velocity: -0.1 },
				timestamp: Date.now()
			}
		];

		const json = exportSimulationToJSON('Test Simulation', { param1: 1.0 }, results);
		const data = JSON.parse(json);

		expect(data.simulationType).toBe('Test Simulation');
		expect(data.parameters.param1).toBe(1.0);
		expect(data.results).toHaveLength(2);
		expect(data.metadata.steps).toBe(2);
	});

	it('exports simulation to CSV', async () => {
		const { exportSimulationToCSV } = await import('$lib/utils/simulationExport.js');

		const results = [
			{
				step: 0,
				time: 0,
				state: { position: 1.0, velocity: 0 },
				timestamp: Date.now()
			},
			{
				step: 1,
				time: 0.016,
				state: { position: 0.9, velocity: -0.1 },
				timestamp: Date.now()
			}
		];

		const csv = exportSimulationToCSV(results);
		const lines = csv.split('\n');

		expect(lines[0]).toBe('step,time,position,velocity');
		expect(lines[1]).toContain('0,0.000000,1.000000,0.000000');
		expect(lines[2]).toContain('1,0.016000,0.900000,-0.100000');
	});

	it('generates simulation report', async () => {
		const { generateSimulationReport } = await import('$lib/utils/simulationExport.js');

		const results = [
			{
				step: 0,
				time: 0,
				state: { position: 1.0, velocity: 0 },
				timestamp: Date.now()
			},
			{
				step: 1,
				time: 0.016,
				state: { position: 0.9, velocity: -0.1 },
				timestamp: Date.now()
			}
		];

		const report = generateSimulationReport('Test Simulation', { param1: 1.0 }, results);

		expect(report).toContain('# Simulation Report: Test Simulation');
		expect(report).toContain('## Parameters');
		expect(report).toContain('**param1**: 1');
		expect(report).toContain('## Summary');
		expect(report).toContain('**Steps**: 2');
		expect(report).toContain('## State Analysis');
	});
});
