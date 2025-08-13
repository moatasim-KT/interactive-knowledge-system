/**
 * Simulation export utilities for saving simulation results and configurations
 */

export interface SimulationExportData {
	simulationType: string;
	parameters: Record<string, any>;
	results: SimulationResult[];
	metadata: {
		exportedAt: string;
		duration: number;
		steps: number;
		version: string;
	};
}

export interface SimulationResult {
	step: number;
	time: number;
	state: Record<string, any>;
	timestamp: number;
}

export interface DiagramExportData {
	diagramType: string;
	elements: any[];
	connections: any[];
	parameters: Record<string, any>;
	state: Record<string, any>;
	metadata: {
		exportedAt: string;
		version: string;
	};
}

/**
 * Export simulation results to JSON
 */
export function exportSimulationToJSON(
	simulationType: string,
	parameters: Record<string, any>,
	results: SimulationResult[],
	metadata?: Partial<SimulationExportData['metadata']>
): string {
	const export_data = {
		simulationType,
		parameters,
		results,
		metadata: {
			exportedAt: new Date().toISOString(),
			duration: results.length > 0 ? results[results.length - 1].time : 0,
			steps: results.length,
			version: '1.0.0',
			...metadata
		}
	};

	return JSON.stringify(export_data, null, 2);
}

/**
 * Export simulation results to CSV
 */
export function exportSimulationToCSV(results: SimulationResult[], stateKeys?: string[]): string {
	if (results.length === 0) {return '';}

	// Determine state keys if not provided
	const keys = stateKeys || Object.keys(results[0].state);

	// Create header
	const header = ['step', 'time', ...keys].join(',');

	// Create data rows
	const rows = results.map((result) => {
		const values = [
			result.step,
			result.time.toFixed(6),
			...keys.map((key) => {
				const value = result.state[key];
				return typeof value === 'number' ? value.toFixed(6) : String(value);
			})
		];
		return values.join(',');
	});

	return [header, ...rows].join('\n');
}

/**
 * Export diagram configuration to JSON
 */
export function exportDiagramToJSON(
	diagramType: string,
	elements: any[],
	connections: any[],
	parameters: Record<string, any>,
	state: Record<string, any>
): string {
	const export_data = {
		diagramType,
		elements,
		connections,
		parameters,
		state,
		metadata: {
			exportedAt: new Date().toISOString(),
			version: '1.0.0'
		}
	};

	return JSON.stringify(export_data, null, 2);
}

/**
 * Export diagram to SVG string
 */
export function exportDiagramToSVG(svgElement: SVGSVGElement, title?: string): string {
	// Clone the SVG element to avoid modifying the original
	const cloned_svg = svgElement.cloneNode(true) as SVGSVGElement;

	// Add title if provided
	if (title) {
		const title_element = document.createElementNS('http://www.w3.org/2000/svg', 'title');
		title_element.textContent = title;
		cloned_svg.insertBefore(title_element, cloned_svg.firstChild);
	}

	// Add XML declaration and DOCTYPE
	const xml_declaration = '<?xml version="1.0" encoding="UTF-8"?>';
	const svg_string = new XMLSerializer().serializeToString(cloned_svg);

	return `${xml_declaration}\n${svg_string}`;
}

/**
 * Download data as file
 */
export function downloadFile(data: string, filename: string, mime_type = 'text/plain'): void {
	const blob = new Blob([data], { type: mime_type });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.style.display = 'none';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}

/**
 * Export simulation results with automatic filename generation
 */
export function exportSimulationResults(
	simulationType: string,
	parameters: Record<string, any>,
	results: SimulationResult[],
	format: 'json' | 'csv' = 'json'
): void {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const base_filename = `${simulationType.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

	if (format === 'json') {
		const json_data = exportSimulationToJSON(simulationType, parameters, results);
		downloadFile(json_data, `${base_filename}.json`, 'application/json');
	} else if (format === 'csv') {
		const csv_data = exportSimulationToCSV(results);
		downloadFile(csv_data, `${base_filename}.csv`, 'text/csv');
	}
}

/**
 * Export diagram with automatic filename generation
 */
export function exportDiagramResults(
	diagramType: string,
	svgElement: SVGSVGElement,
	elements: any[],
	connections: any[],
	parameters: Record<string, any>,
	state: Record<string, any>,
	format: 'svg' | 'json' = 'svg'
): void {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const base_filename = `${diagramType.toLowerCase().replace(/\s+/g, '-')}-${timestamp}`;

	if (format === 'svg') {
		const svg_data = exportDiagramToSVG(svgElement, diagramType);
		downloadFile(svg_data, `${base_filename}.svg`, 'image/svg+xml');
	} else if (format === 'json') {
		const json_data = exportDiagramToJSON(diagramType, elements, connections, parameters, state);
		downloadFile(json_data, `${base_filename}.json`, 'application/json');
	}
}

/**
 * Import simulation data from JSON
 */
export function importSimulationFromJSON(jsonString: string): SimulationExportData | null {
	try {
		const data = JSON.parse(jsonString);

		// Validate required fields
		if (!data.simulationType || !data.parameters || !Array.isArray(data.results)) {
			throw new Error('Invalid simulation data format');
		}

		return data as SimulationExportData;
	} catch {
		return null;
	}
}

/**
 * Import diagram data from JSON
 */
export function importDiagramFromJSON(jsonString: string): DiagramExportData | null {
	try {
		const data = JSON.parse(jsonString);

		// Validate required fields
		if (!data.diagramType || !Array.isArray(data.elements) || !Array.isArray(data.connections)) {
			throw new Error('Invalid diagram data format');
		}

		return data as DiagramExportData;
	} catch {
		return null;
	}
}

/**
 * Create a simulation report with analysis
 */
export function generateSimulationReport(
	simulationType: string,
	parameters: Record<string, any>,
	results: SimulationResult[]
): string {
	if (results.length === 0) {
		return 'No simulation data available for report generation.';
	}

	const first_result = results[0];
	const last_result = results[results.length - 1];
	const state_keys = Object.keys(first_result.state);

	let report = `# Simulation Report: ${simulationType}\n\n`;

	// Parameters section
	report += '## Parameters\n\n';
	Object.entries(parameters).forEach(([key, value]) => {
		report += `- **${key}**: ${value}\n`;
	});

	// Summary statistics
	report += '\n## Summary\n\n';
	report += `- **Duration**: ${last_result.time.toFixed(3)} seconds\n`;
	report += `- **Steps**: ${results.length}\n`;
	report += `- **Average step time**: ${(last_result.time / results.length).toFixed(6)} seconds\n`;

	// State analysis
	report += '\n## State Analysis\n\n';
	state_keys.forEach((key) => {
		const values = results.map((r) => r.state[key]).filter((v) => typeof v === 'number');
		if (values.length > 0) {
			const min = Math.min(...values);
			const max = Math.max(...values);
			const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
			const final = values[values.length - 1];

			report += `### ${key}\n`;
			report += `- **Initial**: ${values[0].toFixed(6)}\n`;
			report += `- **Final**: ${final.toFixed(6)}\n`;
			report += `- **Minimum**: ${min.toFixed(6)}\n`;
			report += `- **Maximum**: ${max.toFixed(6)}\n`;
			report += `- **Average**: ${avg.toFixed(6)}\n\n`;
		}
	});

	// Export information
	report += '\n## Export Information\n\n';
	report += `- **Generated**: ${new Date().toISOString()}\n`;
	report += `- **Version**: 1.0.0\n`;

	return report;
}

/**
 * Export simulation report as markdown file
 */
export function exportSimulationReport(
	simulationType: string,
	parameters: Record<string, any>,
	results: SimulationResult[]
): void {
	const report = generateSimulationReport(simulationType, parameters, results);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `${simulationType.toLowerCase().replace(/\s+/g, '-')}-report-${timestamp}.md`;

	downloadFile(report, filename, 'text/markdown');
}
