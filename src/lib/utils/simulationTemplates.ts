import type {
	SimulationBlock,
	SystemDiagramBlock,
	SimulationParameter,
	DiagramElement,
	DiagramConnection
} from '../types/unified';

/**
 * Simulation template definitions for different domains
 */

export interface SimulationTemplate {
	id: string;
	name: string;
	domain: 'physics' | 'chemistry' | 'engineering' | 'mathematics' | 'biology';
	description: string;
	parameters: SimulationParameter[];
	initialState: any;
	stepFunction: string;
	visualization: any;
}

export interface DiagramTemplate {
	id: string;
	name: string;
	domain: 'physics' | 'chemistry' | 'engineering' | 'mathematics' | 'biology';
	description: string;
	elements: DiagramElement[];
	connections: DiagramConnection[];
	parameters: SimulationParameter[];
	initialState: any;
	updateFunction?: string;
}

/**
 * Physics simulation templates
 */
export const physicsSimulations: SimulationTemplate[] = [
	{
		id: 'pendulum',
		name: 'Simple Pendulum',
		domain: 'physics',
		description: 'Simulate the motion of a simple pendulum with adjustable parameters',
		parameters: [
			{
				name: 'length',
				type: 'number',
				min: 0.5,
				max: 5.0,
				step: 0.1,
				default: 2.0,
				description: 'Length of the pendulum (m)'
			},
			{
				name: 'gravity',
				type: 'number',
				min: 1.0,
				max: 20.0,
				step: 0.1,
				default: 9.81,
				description: 'Gravitational acceleration (m/s²)'
			},
			{
				name: 'damping',
				type: 'number',
				min: 0.0,
				max: 1.0,
				step: 0.01,
				default: 0.05,
				description: 'Damping coefficient'
			},
			{
				name: 'initialAngle',
				type: 'number',
				min: -90,
				max: 90,
				step: 1,
				default: 30,
				description: 'Initial angle (degrees)'
			}
		],
		initialState: {
			angle: (30 * Math.PI) / 180,
			angularVelocity: 0,
			time: 0
		},
		stepFunction: `
            const dt = 0.016; // 60 FPS
            const g = parameters.gravity;
            const L = parameters.length;
            const b = parameters.damping;
            
            const angularAcceleration = -(g / L) * Math.sin(state.angle) - b * state.angularVelocity;
            
            return {
                angle: state.angle + state.angularVelocity * dt,
                angularVelocity: state.angularVelocity + angularAcceleration * dt,
                time: state.time + dt
            };
        `,
		visualization: {
			type: 'canvas',
			width: 400,
			height: 400,
			interactive: true,
			config: {
				showTrail: true,
				showForces: false
			}
		}
	},
	{
		id: 'spring-mass',
		name: 'Spring-Mass System',
		domain: 'physics',
		description: 'Simulate a mass attached to a spring with damping',
		parameters: [
			{
				name: 'mass',
				type: 'number',
				min: 0.1,
				max: 10.0,
				step: 0.1,
				default: 1.0,
				description: 'Mass (kg)'
			},
			{
				name: 'springConstant',
				type: 'number',
				min: 1.0,
				max: 100.0,
				step: 1.0,
				default: 20.0,
				description: 'Spring constant (N/m)'
			},
			{
				name: 'damping',
				type: 'number',
				min: 0.0,
				max: 10.0,
				step: 0.1,
				default: 1.0,
				description: 'Damping coefficient'
			},
			{
				name: 'initialPosition',
				type: 'number',
				min: -2.0,
				max: 2.0,
				step: 0.1,
				default: 1.0,
				description: 'Initial displacement (m)'
			}
		],
		initialState: {
			position: 1.0,
			velocity: 0,
			time: 0
		},
		stepFunction: `
            const dt = 0.016;
            const m = parameters.mass;
            const k = parameters.springConstant;
            const c = parameters.damping;
            
            const force = -k * state.position - c * state.velocity;
            const acceleration = force / m;
            
            return {
                position: state.position + state.velocity * dt,
                velocity: state.velocity + acceleration * dt,
                time: state.time + dt
            };
        `,
		visualization: {
			type: 'canvas',
			width: 400,
			height: 300,
			interactive: true,
			config: {
				showGraph: true,
				showForces: true
			}
		}
	}
];

/**
 * Chemistry simulation templates
 */
export const chemistrySimulations: SimulationTemplate[] = [
	{
		id: 'reaction-kinetics',
		name: 'Chemical Reaction Kinetics',
		domain: 'chemistry',
		description: 'Simulate the kinetics of a simple A → B reaction',
		parameters: [
			{
				name: 'rateConstant',
				type: 'number',
				min: 0.001,
				max: 1.0,
				step: 0.001,
				default: 0.1,
				description: 'Rate constant (s⁻¹)'
			},
			{
				name: 'initialConcentrationA',
				type: 'number',
				min: 0.1,
				max: 10.0,
				step: 0.1,
				default: 2.0,
				description: 'Initial concentration of A (mol/L)'
			},
			{
				name: 'temperature',
				type: 'number',
				min: 273,
				max: 373,
				step: 1,
				default: 298,
				description: 'Temperature (K)'
			}
		],
		initialState: {
			concentrationA: 2.0,
			concentrationB: 0.0,
			time: 0
		},
		stepFunction: `
            const dt = 0.1;
            const k = parameters.rateConstant;
            const rate = k * state.concentrationA;
            
            return {
                concentrationA: Math.max(0, state.concentrationA - rate * dt),
                concentrationB: state.concentrationB + rate * dt,
                time: state.time + dt
            };
        `,
		visualization: {
			type: 'chart',
			width: 500,
			height: 300,
			interactive: true,
			config: {
				chartType: 'line',
				showBoth: true
			}
		}
	},
	{
		id: 'gas-laws',
		name: 'Ideal Gas Law',
		domain: 'chemistry',
		description: 'Explore the relationship between pressure, volume, and temperature',
		parameters: [
			{
				name: 'volume',
				type: 'number',
				min: 1.0,
				max: 50.0,
				step: 0.5,
				default: 22.4,
				description: 'Volume (L)'
			},
			{
				name: 'temperature',
				type: 'number',
				min: 200,
				max: 500,
				step: 5,
				default: 273,
				description: 'Temperature (K)'
			},
			{
				name: 'moles',
				type: 'number',
				min: 0.1,
				max: 10.0,
				step: 0.1,
				default: 1.0,
				description: 'Amount of gas (mol)'
			}
		],
		initialState: {
			pressure: 1.0,
			volume: 22.4,
			temperature: 273,
			moles: 1.0
		},
		stepFunction: `
            const R = 0.08314; // Gas constant (L·bar/mol·K)
            const pressure = (parameters.moles * R * parameters.temperature) / parameters.volume;
            
            return {
                pressure: pressure,
                volume: parameters.volume,
                temperature: parameters.temperature,
                moles: parameters.moles
            };
        `,
		visualization: {
			type: 'canvas',
			width: 400,
			height: 400,
			interactive: true,
			config: {
				show3D: false,
				showMolecules: true
			}
		}
	}
];

/**
 * Engineering simulation templates
 */
export const engineeringSimulations: SimulationTemplate[] = [
	{
		id: 'pid-controller',
		name: 'PID Controller',
		domain: 'engineering',
		description: 'Simulate a PID controller response to a step input',
		parameters: [
			{
				name: 'kp',
				type: 'number',
				min: 0.0,
				max: 10.0,
				step: 0.1,
				default: 1.0,
				description: 'Proportional gain (Kp)'
			},
			{
				name: 'ki',
				type: 'number',
				min: 0.0,
				max: 5.0,
				step: 0.1,
				default: 0.5,
				description: 'Integral gain (Ki)'
			},
			{
				name: 'kd',
				type: 'number',
				min: 0.0,
				max: 2.0,
				step: 0.01,
				default: 0.1,
				description: 'Derivative gain (Kd)'
			},
			{
				name: 'setpoint',
				type: 'number',
				min: 0.0,
				max: 10.0,
				step: 0.1,
				default: 5.0,
				description: 'Setpoint value'
			}
		],
		initialState: {
			output: 0,
			error: 0,
			integral: 0,
			previousError: 0,
			time: 0
		},
		stepFunction: `
            const dt = 0.05;
            const setpoint = parameters.setpoint;
            const error = setpoint - state.output;
            const integral = state.integral + error * dt;
            const derivative = (error - state.previousError) / dt;
            
            const controlSignal = parameters.kp * error + parameters.ki * integral + parameters.kd * derivative;
            const newOutput = state.output + controlSignal * dt;
            
            return {
                output: newOutput,
                error: error,
                integral: integral,
                previousError: error,
                time: state.time + dt
            };
        `,
		visualization: {
			type: 'chart',
			width: 500,
			height: 300,
			interactive: true,
			config: {
				chartType: 'line',
				showSetpoint: true,
				showError: true
			}
		}
	},
	{
		id: 'beam-deflection',
		name: 'Beam Deflection',
		domain: 'engineering',
		description: 'Calculate deflection of a simply supported beam under load',
		parameters: [
			{
				name: 'load',
				type: 'number',
				min: 100,
				max: 10000,
				step: 100,
				default: 1000,
				description: 'Applied load (N)'
			},
			{
				name: 'length',
				type: 'number',
				min: 1.0,
				max: 10.0,
				step: 0.1,
				default: 4.0,
				description: 'Beam length (m)'
			},
			{
				name: 'elasticModulus',
				type: 'number',
				min: 100000,
				max: 300000,
				step: 10000,
				default: 200000,
				description: 'Elastic modulus (MPa)'
			},
			{
				name: 'momentOfInertia',
				type: 'number',
				min: 0.0001,
				max: 0.01,
				step: 0.0001,
				default: 0.001,
				description: 'Moment of inertia (m⁴)'
			}
		],
		initialState: {
			maxDeflection: 0,
			stress: 0,
			safetyFactor: 0
		},
		stepFunction: `
            const P = parameters.load;
            const L = parameters.length;
            const E = parameters.elasticModulus * 1e6; // Convert MPa to Pa
            const I = parameters.momentOfInertia;
            
            // Maximum deflection at center for simply supported beam with center load
            const maxDeflection = (P * Math.pow(L, 3)) / (48 * E * I);
            
            // Maximum stress
            const maxStress = (P * L) / (4 * Math.sqrt(I)) / 1e6; // Convert to MPa
            
            // Safety factor (assuming yield strength of 250 MPa)
            const yieldStrength = 250;
            const safetyFactor = yieldStrength / maxStress;
            
            return {
                maxDeflection: maxDeflection * 1000, // Convert to mm
                stress: maxStress,
                safetyFactor: safetyFactor
            };
        `,
		visualization: {
			type: 'canvas',
			width: 500,
			height: 300,
			interactive: true,
			config: {
				showDeformation: true,
				showStress: true
			}
		}
	}
];

/**
 * System diagram templates
 */
export const systemDiagramTemplates: DiagramTemplate[] = [
	{
		id: 'control-system',
		name: 'Control System Block Diagram',
		domain: 'engineering',
		description: 'Interactive control system with feedback loop',
		elements: [
			{
				id: 'input',
				type: 'circle',
				position: { x: 50, y: 150 },
				size: { width: 60, height: 60 },
				label: 'Input',
				description: 'System input signal',
				style: {
					fill: '#e3f2fd',
					stroke: '#1976d2',
					strokeWidth: 2
				},
				interactive: true,
				clickable: true
			},
			{
				id: 'controller',
				type: 'rectangle',
				position: { x: 150, y: 125 },
				size: { width: 100, height: 50 },
				label: 'Controller',
				description: 'PID Controller',
				style: {
					fill: '#f3e5f5',
					stroke: '#7b1fa2',
					strokeWidth: 2,
					borderRadius: 5
				},
				interactive: true,
				clickable: true
			},
			{
				id: 'plant',
				type: 'rectangle',
				position: { x: 300, y: 125 },
				size: { width: 100, height: 50 },
				label: 'Plant',
				description: 'System to be controlled',
				style: {
					fill: '#e8f5e8',
					stroke: '#388e3c',
					strokeWidth: 2,
					borderRadius: 5
				},
				interactive: true,
				clickable: true
			},
			{
				id: 'output',
				type: 'circle',
				position: { x: 450, y: 150 },
				size: { width: 60, height: 60 },
				label: 'Output',
				description: 'System output signal',
				style: {
					fill: '#fff3e0',
					stroke: '#f57c00',
					strokeWidth: 2
				},
				interactive: true,
				clickable: true
			},
			{
				id: 'sensor',
				type: 'rectangle',
				position: { x: 300, y: 225 },
				size: { width: 100, height: 40 },
				label: 'Sensor',
				description: 'Feedback sensor',
				style: {
					fill: '#fce4ec',
					stroke: '#c2185b',
					strokeWidth: 2,
					borderRadius: 5
				},
				interactive: true,
				clickable: true
			}
		],
		connections: [
			{
				id: 'input-controller',
				from: 'input',
				to: 'controller',
				type: 'arrow',
				arrow: true,
				style: {
					stroke: '#666666',
					strokeWidth: 2
				}
			},
			{
				id: 'controller-plant',
				from: 'controller',
				to: 'plant',
				type: 'arrow',
				arrow: true,
				style: {
					stroke: '#666666',
					strokeWidth: 2
				}
			},
			{
				id: 'plant-output',
				from: 'plant',
				to: 'output',
				type: 'arrow',
				arrow: true,
				style: {
					stroke: '#666666',
					strokeWidth: 2
				}
			},
			{
				id: 'output-sensor',
				from: 'output',
				to: 'sensor',
				type: 'line',
				arrow: false,
				style: {
					stroke: '#666666',
					strokeWidth: 2
				}
			},
			{
				id: 'sensor-controller',
				from: 'sensor',
				to: 'controller',
				type: 'arrow',
				arrow: true,
				style: {
					stroke: '#666666',
					strokeWidth: 2,
					strokeDasharray: '5,5'
				}
			}
		],
		parameters: [
			{
				name: 'gain',
				type: 'number',
				min: 0.1,
				max: 10.0,
				step: 0.1,
				default: 1.0,
				description: 'Controller gain'
			},
			{
				name: 'delay',
				type: 'number',
				min: 0.0,
				max: 2.0,
				step: 0.1,
				default: 0.5,
				description: 'System delay (s)'
			}
		],
		initialState: {
			input: { opacity: 1.0, scale: 1.0 },
			controller: { opacity: 1.0, scale: 1.0 },
			plant: { opacity: 1.0, scale: 1.0 },
			output: { opacity: 1.0, scale: 1.0 },
			sensor: { opacity: 1.0, scale: 1.0 }
		},
		updateFunction: `
            const gain = parameters.gain;
            const delay = parameters.delay;
            
            // Highlight active components based on parameters
            const controllerScale = 1.0 + (gain - 1.0) * 0.1;
            const plantOpacity = Math.max(0.3, 1.0 - delay * 0.3);
            
            return {
                ...state,
                controller: { ...state.controller, scale: controllerScale },
                plant: { ...state.plant, opacity: plantOpacity }
            };
        `
	},
	{
		id: 'chemical-process',
		name: 'Chemical Process Flow',
		domain: 'chemistry',
		description: 'Interactive chemical process diagram',
		elements: [
			{
				id: 'reactor',
				type: 'circle',
				position: { x: 200, y: 100 },
				size: { width: 80, height: 80 },
				label: 'Reactor',
				description: 'Chemical reactor vessel',
				style: {
					fill: '#e8f5e8',
					stroke: '#388e3c',
					strokeWidth: 3
				},
				interactive: true,
				clickable: true
			},
			{
				id: 'heater',
				type: 'rectangle',
				position: { x: 150, y: 200 },
				size: { width: 60, height: 40 },
				label: 'Heater',
				description: 'Process heater',
				style: {
					fill: '#ffebee',
					stroke: '#d32f2f',
					strokeWidth: 2,
					borderRadius: 5
				},
				interactive: true,
				clickable: true
			},
			{
				id: 'separator',
				type: 'rectangle',
				position: { x: 350, y: 125 },
				size: { width: 80, height: 60 },
				label: 'Separator',
				description: 'Product separator',
				style: {
					fill: '#e3f2fd',
					stroke: '#1976d2',
					strokeWidth: 2,
					borderRadius: 5
				},
				interactive: true,
				clickable: true
			}
		],
		connections: [
			{
				id: 'reactor-separator',
				from: 'reactor',
				to: 'separator',
				type: 'arrow',
				arrow: true,
				style: {
					stroke: '#666666',
					strokeWidth: 3
				}
			},
			{
				id: 'heater-reactor',
				from: 'heater',
				to: 'reactor',
				type: 'arrow',
				arrow: true,
				style: {
					stroke: '#d32f2f',
					strokeWidth: 2
				}
			}
		],
		parameters: [
			{
				name: 'temperature',
				type: 'number',
				min: 20,
				max: 200,
				step: 5,
				default: 80,
				description: 'Reactor temperature (°C)'
			},
			{
				name: 'pressure',
				type: 'number',
				min: 1.0,
				max: 10.0,
				step: 0.5,
				default: 2.0,
				description: 'System pressure (bar)'
			}
		],
		initialState: {
			reactor: { opacity: 1.0, scale: 1.0 },
			heater: { opacity: 1.0, scale: 1.0 },
			separator: { opacity: 1.0, scale: 1.0 }
		},
		updateFunction: `
            const temp = parameters.temperature;
            const pressure = parameters.pressure;
            
            // Visual feedback based on parameters
            const heaterIntensity = Math.min(1.0, temp / 100);
            const reactorScale = 1.0 + (pressure - 1.0) * 0.05;
            
            return {
                reactor: { opacity: 1.0, scale: reactorScale },
                heater: { opacity: 0.5 + heaterIntensity * 0.5, scale: 1.0 },
                separator: { opacity: 1.0, scale: 1.0 }
            };
        `
	}
];

/**
 * Get simulation template by ID
 */
export function getSimulationTemplate(id: string): SimulationTemplate | undefined {
	const all_simulations = [
		...physicsSimulations,
		...chemistrySimulations,
		...engineeringSimulations
	];
	return all_simulations.find((sim) => sim.id === id);
}

/**
 * Get diagram template by ID
 */
export function getDiagramTemplate(id: string): DiagramTemplate | undefined {
	return systemDiagramTemplates.find((template) => template.id === id);
}

/**
 * Get all simulation templates for a domain
 */
export function getSimulationsByDomain(domain: string): SimulationTemplate[] {
	const all_simulations = [
		...physicsSimulations,
		...chemistrySimulations,
		...engineeringSimulations
	];
	return all_simulations.filter((sim) => sim.domain === domain);
}

/**
 * Get all diagram templates for a domain
 */
export function getDiagramsByDomain(domain: string): DiagramTemplate[] {
	return systemDiagramTemplates.filter((template) => template.domain === domain);
}

/**
 * Create a simulation block from a template
 */
export function createSimulationFromTemplate(
	templateId: string,
	blockId: string
): SimulationBlock | null {
	const template = getSimulationTemplate(templateId);
	if (!template) {return null;}

	return {
		id: blockId,
		type: 'simulation',
		content: {
			simulationType: template.name,
			parameters: template.parameters,
			initialState: template.initialState,
			stepFunction: template.stepFunction,
			visualization: template.visualization,
			sourceReference: {
				originalUrl: '',
				originalContent: `Template: ${template.name}`,
				transformationReasoning: `Created from ${template.domain} simulation template`,
				extractionMethod: 'template',
				confidence: 1.0
			}
		},
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		}
	};
}

/**
 * Create a system diagram block from a template
 */
export function createDiagramFromTemplate(
	templateId: string,
	blockId: string
): SystemDiagramBlock | null {
	const template = getDiagramTemplate(templateId);
	if (!template) {return null;}

	return {
		id: blockId,
		type: 'system-diagram',
		content: {
			diagramType: template.name,
			description: template.description,
			elements: template.elements,
			connections: template.connections,
			parameters: template.parameters,
			initialState: template.initialState,
			updateFunction: template.updateFunction,
            layout: {
                type: 'grid',
                spacing: 20,
                direction: 'horizontal',
                width: 600,
                height: 400,
                padding: 20,
                grid: false
            },
			sourceReference: {
				originalUrl: '',
				originalContent: `Template: ${template.name}`,
				transformationReasoning: `Created from ${template.domain} diagram template`,
				extractionMethod: 'template',
				confidence: 1.0
			}
		},
		metadata: {
			created: new Date(),
			modified: new Date(),
			version: 1
		}
	};
}
