/**
 * Web Content types for the Interactive Knowledge System
 * Compatible with existing ContentBlock and ContentModule interfaces
 */

import type { ContentBlock, ContentModule } from './content.js';

/**
 * Web content source information
 */
export interface WebContentSource {
	id: string;
	url: string;
	finalUrl?: string;
	title: string;
	domain: string;
	importDate: Date;
	lastChecked: Date;
	status: 'active' | 'updated' | 'error' | 'removed';
	metadata: WebContentMetadata;
	usage: {
		timesReferenced: number;
		lastAccessed: Date;
		generatedModules: string[];
	};
}

/**
 * Metadata extracted from web content
 */
export interface WebContentMetadata {
	author?: string;
	publishDate?: Date;
	lastModified?: Date;
	domain: string;
	contentType: string;
	language: string;
	readingTime: number;
	wordCount: number;
	keywords: string[];
	description: string;
	license?: string;
	attribution: string;
	tags: string[];
	category: string;
	contentHash?: string;
}

/**
 * Raw web content structure
 */
export interface WebContent {
	id: string;
	url: string;
	finalUrl?: string;
	title: string;
	content: {
		html: string;
		text: string;
		images: ImageReference[];
		codeBlocks: CodeBlock[];
		tables: TableData[];
		charts: ChartData[];
		blocks: ContentBlock[];
	};
	metadata: WebContentMetadata;
	extraction: {
		method: 'readability' | 'semantic' | 'heuristic' | 'custom';
		confidence: number;
		qualityScore: number;
		issues: string[];
		processingTime: number;
	};
	fetchedAt: string;
	success: boolean;
}

/**
 * Image reference in web content
 */
export interface ImageReference {
	id: string;
	src: string;
	alt: string;
	caption?: string;
	width?: number;
	height?: number;
}

/**
 * Code block in web content
 */
export interface CodeBlock {
	id: string;
	code: string;
	language: string;
	filename?: string;
	interactive?: boolean;
	executable?: boolean;
}

/**
 * Table data structure
 */
export interface TableData {
	id: string;
	headers: string[];
	rows: string[][];
}

/**
 * Chart data structure
 */
export interface ChartData {
	id: string;
	type: string;
	selector?: string;
	detected: boolean;
	data?: any;
}

/**
 * Interactive opportunity detection
 */
export interface InteractiveOpportunity {
	id: string;
	type:
	| 'interactive-chart'
	| 'interactive-code'
	| 'interactive-table'
	| 'simulation'
	| 'parameter-explorer';
	title: string;
	description: string;
	confidence: number;
	reasoning: string;
	sourceElement: string;
	parameters: Record<string, { type: string; value: any }>;
	suggestedInteraction?: InteractionSpec;
	sourceReference?: {
		elementId?: string;
		codeBlockId?: string;
		tableIndex?: number;
	};
}

/**
 * Interaction specification for transformations
 */
export interface InteractionSpec {
	type:
	| 'chart-explorer'
	| 'code-editor'
	| 'data-table'
	| 'parameter-simulation'
	| 'algorithm-stepper';
	parameters: {
		[key: string]: {
			type: 'slider' | 'dropdown' | 'toggle' | 'input';
			range?: [number, number];
			options?: string[];
			default: any;
			description: string;
		};
	};
	outputs?: {
		[key: string]: {
			type: 'chart' | 'text' | 'image' | 'animation';
			description: string;
		};
	};
}

/**
 * Extended content block types for web content
 * These extend the base ContentBlock but with specific interactive types
 */
export interface InteractiveVisualizationBlock extends Omit<ContentBlock, 'type'> {
	type: 'interactive-visualization';
	content: {
		visualizationType: 'neural-network' | 'chart' | 'simulation' | 'algorithm' | 'data-explorer';
		config: VisualizationConfig;
		data: any;
		sourceReference: SourceReference;
	};
}

export interface InteractiveChartBlock extends Omit<ContentBlock, 'type'> {
	type: 'interactive-chart';
	content: {
		chartType: 'line' | 'bar' | 'scatter' | 'heatmap' | 'network';
		data: ChartData;
		interactions: ChartInteraction[];
		filters: DataFilter[];
		sourceReference: SourceReference;
		/** Optional presentation fields used by components like AdvancedChartBlock */
		title?: string;
		description?: string;
	};
}

export interface SimulationBlock extends Omit<ContentBlock, 'type'> {
	type: 'simulation';
	content: {
		simulationType: string;
		parameters: SimulationParameter[];
		initialState: any;
		stepFunction: string; // Serialized function
		visualization: VisualizationSpec;
		sourceReference: SourceReference;
	};
	metadata: ContentBlock['metadata'];
}

export interface SystemDiagramBlock extends Omit<ContentBlock, 'type'> {
	type: 'system-diagram';
	content: {
		diagramType: string;
		description?: string;
		elements: DiagramElement[];
		connections: DiagramConnection[];
		parameters: SimulationParameter[];
		initialState: any;
		updateFunction?: string; // Serialized function for parameter updates
		layout: DiagramLayout;
		sourceReference: SourceReference;
	};
}

/**
 * Visualization configuration
 */
export interface VisualizationConfig {
	title: string;
	description: string;
	parameters: Parameter[];
	layout: LayoutConfig;
	styling: StyleConfig;
	animations: AnimationConfig;
}

/**
 * Source reference for traceability
 */
export interface SourceReference {
	originalUrl: string;
	originalContent: string;
	transformationReasoning: string;
	extractionMethod: string;
	confidence: number;
}

/**
 * Chart interaction definition
 */
export interface ChartInteraction {
	event: string;
	parameter: string;
	effect: string; // Serialized function
	debounce?: number;
}

/**
 * Data filter for interactive content
 */
export interface DataFilter {
	field: string;
	type: 'text' | 'number' | 'date' | 'select';
	operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
	value: any;
	active: boolean;
}

/**
 * Simulation parameter
 */
export interface SimulationParameter {
	name: string;
	type: 'number' | 'boolean' | 'string' | 'select';
	min?: number;
	max?: number;
	step?: number;
	options?: string[];
	default: any;
	description: string;
}

/**
 * Visualization specification
 */
export interface VisualizationSpec {
	type: string;
	width: number;
	height: number;
	interactive: boolean;
	config: any;
}

/**
 * Parameter definition
 */
export interface Parameter {
	name: string;
	type: string;
	default: any;
	description: string;
	constraints?: any;
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
	width: number;
	height: number;
	margin: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
	responsive: boolean;
}

/**
 * Style configuration
 */
export interface StyleConfig {
	theme: 'light' | 'dark' | 'auto';
	colors: string[];
	fonts: {
		family: string;
		size: number;
	};
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
	enabled: boolean;
	duration: number;
	easing: string;
	transitions: string[];
}

/**
 * Diagram element for system diagrams
 */
export interface DiagramElement {
	id: string;
	type: 'rectangle' | 'circle' | 'text' | 'image';
	position: { x: number; y: number };
	size: { width: number; height: number };
	label?: string;
	description?: string;
	text?: string;
	src?: string; // for image elements
	style: DiagramElementStyle;
	interactive: boolean;
	clickable: boolean;
}

/**
 * Diagram connection between elements
 */
export interface DiagramConnection {
	id: string;
	from: string;
	to: string;
	type: 'line' | 'arrow' | 'bidirectional';
	label?: string;
	style: DiagramConnectionStyle;
	arrow: boolean;
}

/**
 * Diagram element styling
 */
export interface DiagramElementStyle {
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	opacity?: number;
	scale?: number;
	borderRadius?: number;
	fontSize?: number;
	fontFamily?: string;
	textAnchor?: 'start' | 'middle' | 'end';
}

/**
 * Diagram connection styling
 */
export interface DiagramConnectionStyle {
	stroke?: string;
	strokeWidth?: number;
	strokeDasharray?: string;
	opacity?: number;
}

/**
 * Diagram layout configuration
 */
export interface DiagramLayout {
	width: number;
	height: number;
	padding: number;
	grid: boolean;
	gridSize?: number;
}

/**
 * Content processing result
 */
export interface ContentProcessingResult {
	id: string;
	sourceUrl: string;
	processedAt: string;
	success: boolean;
	contentBlocks: ContentBlock[];
	interactiveOpportunities: InteractiveOpportunity[];
	metadata: WebContentMetadata;
	processingSteps: string[];
	codeBlocks?: CodeBlock[];
	quizzes?: QuizBlock[];
}

/**
 * Quiz block for generated quizzes
 */
export interface QuizBlock {
	id: string;
	type: 'multiple-choice' | 'true-false' | 'fill-blank';
	question: string;
	options?: string[];
	correctAnswer: number | string;
	explanation: string;
}

/**
 * Content validation result
 */
export interface ContentValidationResult {
	id: string;
	validatedAt: string;
	success: boolean;
	scores: {
		readability?: number;
		accessibility?: number;
		interactivity?: number;
		overall: number;
	};
	issues: string[];
	suggestions: string[];
	validationSteps: string[];
}

/**
 * Quality metrics for content assessment
 */
export interface QualityMetrics {
	readabilityScore: number;
	interactivityScore: number;
	accuracyScore: number;
	engagementScore: number;
	accessibilityScore: number;
	overallScore: number;
}

/**
 * Quality improvement suggestion
 */
export interface QualityImprovement {
	type: 'readability' | 'interactivity' | 'accessibility' | 'engagement';
	priority: 'low' | 'medium' | 'high';
	description: string;
	actionable: boolean;
	estimatedImpact: number;
}

/**
 * Processing pipeline stage
 */
export interface ProcessingStage {
	name: string;
	processor: string;
	config: any;
	dependencies: string[];
	outputs: string[];
}

/**
 * Processing pipeline result
 */
export interface ProcessingResult {
	stage: string;
	success: boolean;
	data: any;
	metadata: {
		processingTime: number;
		confidence: number;
		issues: string[];
	};
}

/**
 * Content transformation context
 */
export interface TransformationContext {
	sourceContent: WebContent;
	targetFormat: string;
	transformationRules: TransformationRule[];
	userPreferences: UserTransformationPreferences;
}

/**
 * Transformation rule
 */
export interface TransformationRule {
	id: string;
	name: string;
	description: string;
	condition: string; // Serialized function
	action: string; // Serialized function
	priority: number;
	enabled: boolean;
}

/**
 * User transformation preferences
 */
export interface UserTransformationPreferences {
	preferInteractive: boolean;
	maxComplexity: number;
	preferredVisualizationTypes: string[];
	accessibilityRequirements: string[];
	learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed';
}

/**
 * Batch processing job
 */
export interface BatchProcessingJob {
	id: string;
	urls: string[];
	options: any;
	status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
	progress: {
		total: number;
		completed: number;
		failed: number;
	};
	results: ContentProcessingResult[];
	createdAt: Date;
	completedAt?: Date;
}

/**
 * Source health check result
 */
export interface SourceHealthCheck {
	sourceId: string;
	url: string;
	status: 'healthy' | 'warning' | 'error';
	lastChecked: Date;
	responseTime: number;
	issues: string[];
	suggestions: string[];
}

/**
 * Source update result
 */
export interface SourceUpdateResult {
	sourceId: string;
	success: boolean;
	hasChanges: boolean;
	changes?: {
		title?: boolean;
		content?: boolean;
		metadata?: boolean;
	};
	error?: string;
	updatedAt: Date;
}

/**
 * Duplicate detection result
 */
export interface DuplicateDetectionResult {
	sourceId: string;
	duplicates: Array<{
		id: string;
		similarity: number;
		reason: string;
	}>;
	suggestions: Array<{
		action: 'merge' | 'keep_both' | 'remove_duplicate';
		confidence: number;
		reasoning: string;
	}>;
}
