/**
 * Comprehensive event type definitions for component communication
 * Defines custom events, event handlers, and event data structures
 */

import type { ContentBlock, ContentModule, KnowledgeNode, UserProgress } from './index';
import type {
	WebContent,
	WebContentSource,
	InteractiveVisualizationBlock,
	InteractiveChartBlock,
	SimulationBlock,
	SystemDiagramBlock,
	ChartData,
	DataFilter,
	SimulationParameter
} from './web-content';
import type { MediaFile, GraphVisualizationOptions } from './unified';
import type { CodeBlockContent, CodeExecutionResult, CodeSnippetShare } from './code';

/**
 * Base event interface for all custom events
 */
export interface BaseCustomEvent<T = any> {
	detail: T;
	type: string;
	target: EventTarget | null;
	currentTarget: EventTarget | null;
	preventDefault: () => void;
	stopPropagation: () => void;
}

/**
 * Content Editor Events
 */
export interface ContentEditorEvents {
	save: {
		blocks: ContentBlock[];
		timestamp: Date;
	};
	'block-add': {
		block: ContentBlock;
		position: number;
	};
	'block-remove': {
		blockId: string;
		position: number;
	};
	'block-move': {
		blockId: string;
		fromPosition: number;
		toPosition: number;
	};
	'block-update': {
		blockId: string;
		updates: Partial<ContentBlock>;
	};
	'auto-save': {
		blocks: ContentBlock[];
		timestamp: Date;
	};
}

/**
 * Content Block Component Events
 */
export interface ContentBlockEvents {
	update: Partial<ContentBlock>;
	delete: string;
	move: {
		blockId: string;
		direction: 'up' | 'down';
	};
	select: string;
	'media-upload': MediaFile;
	'media-error': string;
}

/**
 * Knowledge Management Events
 */
export interface KnowledgeTreeEvents {
	'node-select': KnowledgeNode;
	'node-add': {
		parentId: string | null;
		nodeType: 'folder' | 'module' | 'lesson';
	};
	'node-delete': string;
	'node-move': {
		nodeId: string;
		newParentId: string | null;
	};
	'node-update': {
		nodeId: string;
		updates: Partial<KnowledgeNode>;
	};
}

export interface KnowledgeMapEvents {
	'node-click': KnowledgeNode;
	'connection-create': {
		from: string;
		to: string;
		type: string;
	};
	'connection-delete': string;
	'layout-change': {
		layout: GraphVisualizationOptions['layout'];
	};
	'filter-change': {
		filters: Record<string, any>;
	};
}

/**
 * Progress Tracking Events
 */
export interface ProgressEvents {
	'module-start': {
		moduleId: string;
		userId: string;
	};
	'module-complete': {
		moduleId: string;
		userId: string;
		score?: number;
		timeSpent: number;
	};
	'progress-update': {
		moduleId: string;
		progress: Partial<UserProgress>;
	};
	'streak-update': {
		currentStreak: number;
		longestStreak: number;
	};
}

/**
 * Media Management Events
 */
export interface MediaEvents {
	upload: MediaFile;
	'upload-progress': {
		fileId: string;
		progress: number;
	};
	'upload-error': {
		fileId?: string;
		error: string;
	};
	select: MediaFile;
	delete: string;
	'quota-update': {
		used: number;
		available: number;
		total: number;
	};
}

/**
 * Interactive Visualization Events
 */
export interface InteractiveVisualizationEvents {
	'parameter-change': {
		parameter: string;
		value: any;
		blockId?: string;
	};
	'data-change': {
		data: any;
		filters: DataFilter[];
		blockId?: string;
	};
	'chart-interaction': {
		type: 'click' | 'hover' | 'zoom' | 'pan';
		point?: any;
		coordinates?: { x: number; y: number };
		blockId?: string;
	};
	'visualization-ready': {
		blockId: string;
		config: any;
	};
	'visualization-error': {
		blockId: string;
		error: string;
	};
}

/**
 * Interactive Chart Events
 */
export interface InteractiveChartEvents {
	'chart-update': {
		chartData: ChartData;
		blockId?: string;
	};
	'filter-change': {
		filters: DataFilter[];
		blockId?: string;
	};
	export: {
		format: 'png' | 'svg' | 'pdf' | 'json';
		blockId?: string;
	};
	hover: {
		point: any;
		coordinates: { x: number; y: number };
	};
	'hover-end': Record<string, never>;
	select: {
		point: any;
		selected: any[];
	};
	zoom: {
		zoomLevel: number;
		isZoomed: boolean;
	};
	'zoom-reset': Record<string, never>;
	'chart-type-change': {
		chartType: string;
	};
	'animation-toggle': {
		enabled: boolean;
	};
}

/**
 * Simulation Events
 */
export interface SimulationEvents {
	'parameter-change': {
		parameter: string;
		value: any;
		blockId: string;
	};
	'simulation-start': {
		blockId: string;
		initialState: any;
	};
	'simulation-pause': {
		blockId: string;
		currentState: any;
	};
	'simulation-stop': {
		blockId: string;
		finalState: any;
	};
	'simulation-reset': {
		blockId: string;
	};
	'simulation-step': {
		step: number;
		state: any;
		blockId: string;
	};
	'simulation-error': {
		error: string;
		step: number;
		blockId?: string;
	};
	'simulation-export': {
		format: 'json' | 'csv' | 'video';
		blockId: string;
	};
	'simulation-report-export': {
		blockId: string;
		reportData: any;
	};
}

/**
 * System Diagram Events
 */
export interface SystemDiagramEvents {
	'element-add': {
		element: any;
		diagramId: string;
	};
	'element-update': {
		elementId: string;
		updates: any;
		diagramId: string;
	};
	'element-delete': {
		elementId: string;
		diagramId: string;
	};
	'connection-add': {
		connection: any;
		diagramId: string;
	};
	'connection-delete': {
		connectionId: string;
		diagramId: string;
	};
	'diagram-export': {
		format: 'svg' | 'png' | 'json';
		diagramId: string;
	};
}

/**
 * Code Editor Events
 */
export interface CodeEditorEvents {
	execute: CodeExecutionResult;
	save: CodeBlockContent;
	'version-created': CodeBlockContent;
	'content-change': {
		content: string;
		language: string;
	};
	'language-change': string;
	'theme-change': string;
}

/**
 * Code Snippet Sharing Events
 */
export interface CodeSnippetEvents {
	share: CodeSnippetShare;
	update: CodeSnippetShare;
	cancel: Record<string, never>;
	delete: string;
	fork: {
		originalId: string;
		newSnippet: CodeSnippetShare;
	};
}

/**
 * Web Content Events
 */
export interface WebContentEvents {
	'source-add': WebContentSource;
	'source-update': {
		sourceId: string;
		updates: Partial<WebContentSource>;
	};
	'source-delete': string;
	'source-select': WebContentSource;
	'content-process': {
		sourceId: string;
		options: any;
	};
	'batch-start': {
		jobId: string;
		urls: string[];
	};
	'batch-progress': {
		jobId: string;
		completed: number;
		total: number;
	};
	'batch-complete': {
		jobId: string;
		results: any[];
	};
	'transformation-analyze': {
		contentId: string;
	};
	'transformation-apply': {
		contentId: string;
		transformation: any;
	};
}

/**
 * Search Events
 */
export interface SearchEvents {
	search: {
		query: string;
		filters?: Record<string, any>;
	};
	'result-select': {
		result: any;
		query: string;
	};
	'filter-change': {
		filters: Record<string, any>;
	};
	'suggestion-select': {
		suggestion: string;
	};
}

/**
 * Data Management Events
 */
export interface DataManagementEvents {
	'data-change': {
		data: any[];
		source: 'filter' | 'sort' | 'edit' | 'add' | 'delete';
	};
	'row-add': any;
	'row-delete': string;
	'row-update': {
		rowId: string;
		updates: any;
	};
	'column-add': {
		key: string;
		label: string;
		type: string;
	};
	'column-remove': string;
	'data-transform': {
		transformedData: any[];
		transformation: string;
	};
	'visualization-create': {
		config: any;
		data: any[];
	};
	'filter-apply': {
		filters: DataFilter[];
	};
}

/**
 * Chart Configuration Events
 */
export interface ChartConfigurationEvents {
	'config-change': {
		config: any;
	};
	export: {
		config: string;
	};
	import: {
		config: any;
	};
	error: {
		message: string;
	};
	reset: Record<string, never>;
}

/**
 * Sync Events
 */
export interface SyncEvents {
	'sync-start': {
		type: 'manual' | 'automatic';
	};
	'sync-progress': {
		completed: number;
		total: number;
	};
	'sync-complete': {
		success: boolean;
		conflicts: any[];
		errors: any[];
	};
	'sync-error': {
		error: string;
		retryable: boolean;
	};
	'conflict-resolve': {
		conflictId: string;
		resolution: 'local' | 'remote' | 'merge';
	};
}

/**
 * UI Events
 */
export interface UIEvents {
	'theme-change': 'light' | 'dark' | 'auto';
	'sidebar-toggle': boolean;
	'view-change': string;
	'notification-add': {
		type: 'info' | 'success' | 'warning' | 'error';
		message: string;
		persistent?: boolean;
	};
	'notification-remove': string;
	'modal-open': {
		modalId: string;
		data?: any;
	};
	'modal-close': string;
	'tooltip-show': {
		content: string;
		position: { x: number; y: number };
	};
	'tooltip-hide': Record<string, never>;
}

/**
 * Generic event handler types
 */
export type EventHandler<T = any> = (event: BaseCustomEvent<T>) => void;
export type AsyncEventHandler<T = any> = (event: BaseCustomEvent<T>) => Promise<void>;

/**
 * Event dispatcher type for Svelte components
 */
export interface EventDispatcher<T extends Record<string, any>> {
	<K extends keyof T>(type: K, detail: T[K]): void;
}

/**
 * Component event map - maps component names to their event interfaces
 */
export interface ComponentEventMap {
	ContentEditor: ContentEditorEvents;
	ContentBlockComponent: ContentBlockEvents;
	KnowledgeTree: KnowledgeTreeEvents;
	KnowledgeMap: KnowledgeMapEvents;
	ProgressTracker: ProgressEvents;
	MediaManager: MediaEvents;
	InteractiveVisualizationBlock: InteractiveVisualizationEvents;
	InteractiveChartBlock: InteractiveChartEvents;
	SimulationBlock: SimulationEvents;
	SystemDiagramBlock: SystemDiagramEvents;
	CodeEditor: CodeEditorEvents;
	CodeSnippetShare: CodeSnippetEvents;
	WebContentDashboard: WebContentEvents;
	SearchEngine: SearchEvents;
	DataManager: DataManagementEvents;
	ChartConfigurator: ChartConfigurationEvents;
	SyncStatus: SyncEvents;
}

/**
 * Event listener configuration
 */
export interface EventListenerConfig {
	once?: boolean;
	passive?: boolean;
	capture?: boolean;
	signal?: AbortSignal;
}

/**
 * Event bus for global event communication
 */
export interface EventBus {
	on<T = any>(event: string, handler: EventHandler<T>, config?: EventListenerConfig): () => void;
	off<T = any>(event: string, handler: EventHandler<T>): void;
	emit<T = any>(event: string, detail: T): void;
	once<T = any>(event: string, handler: EventHandler<T>): Promise<T>;
}
