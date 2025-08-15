/**
 * Component prop interfaces for type safety and consistency
 */

import type { ContentBlock, ContentModule } from './content.js';
import type { KnowledgeNode } from './unified.js';
import type { MediaFile } from './media.js';
import type {
    WebContent,
    WebContentSource,
    InteractiveVisualizationBlock,
    InteractiveChartBlock,
    SimulationBlock,
    SystemDiagramBlock
} from './web-content.js';

// Core Content Components
export interface ContentEditorProps {
    initialBlocks?: ContentBlock[];
    onSave?: (blocks: ContentBlock[]) => void;
    autoSave?: boolean;
    autoSaveDelay?: number;
}

export interface ContentBlockComponentProps {
    block: ContentBlock;
    editable?: boolean;
    onUpdate?: (block: ContentBlock) => void;
    onDelete?: (blockId: string) => void;
    onMove?: (blockId: string, direction: 'up' | 'down') => void;
}

// Knowledge Management Components
export interface KnowledgeTreeProps {
    nodes?: KnowledgeNode[];
    showActions?: boolean;
    onNodeSelect?: (node: KnowledgeNode) => void;
    onNodeAdd?: (parentId: string | null) => void;
    onNodeDelete?: (nodeId: string) => void;
    onNodeMove?: (nodeId: string, newParentId: string | null) => void;
}

export interface KnowledgeMapProps {
    nodes: KnowledgeNode[];
    connections?: Array<{ from: string; to: string; type: string }>;
    onNodeClick?: (node: KnowledgeNode) => void;
    onConnectionCreate?: (from: string, to: string) => void;
    interactive?: boolean;
}

export interface RelationshipManagerProps {
    sourceId: string;
    sourceType: 'content' | 'knowledge' | 'media';
    onRelationshipAdd?: (relationship: any) => void;
    onRelationshipRemove?: (relationshipId: string) => void;
    showSuggestions?: boolean;
}

// Progress Tracking Components
export interface ProgressIndicatorProps {
    current: number;
    total: number;
    showPercentage?: boolean;
    showLabel?: boolean;
    size?: 'small' | 'medium' | 'large';
    variant?: 'linear' | 'circular';
}

export interface ProgressDashboardProps {
    userId?: string;
    moduleId?: string;
    showDetails?: boolean;
    onModuleSelect?: (moduleId: string) => void;
}

export interface ProgressTrackerProps {
    moduleId: string;
    userId?: string;
    autoUpdate?: boolean;
    onProgressUpdate?: (progress: any) => void;
}

export interface ScoreTrackerProps {
    scores: Array<{ date: Date; score: number; maxScore: number }>;
    showTrend?: boolean;
    timeRange?: 'week' | 'month' | 'year';
}

// Media Components
export interface LazyMediaProps {
    src: string;
    alt?: string;
    type: 'image' | 'video' | 'audio';
    placeholder?: string;
    loadingStrategy?: 'lazy' | 'eager';
    onLoad?: () => void;
    onError?: (error: Error) => void;
}

export interface ResponsiveImageProps {
    src: string;
    alt: string;
    sizes?: string;
    srcSet?: string;
    loading?: 'lazy' | 'eager';
    className?: string;
}

export interface MediaUploadProps {
    accept?: string;
    multiple?: boolean;
    maxSize?: number;
    onUpload?: (files: MediaFile[]) => void;
    onError?: (error: string) => void;
    showPreview?: boolean;
}

export interface MediaManagerProps {
    userId?: string;
    showUpload?: boolean;
    allowDelete?: boolean;
    onMediaSelect?: (media: MediaFile) => void;
    onMediaDelete?: (mediaId: string) => void;
}

// Interactive Visualization Components
export interface InteractiveVisualizationBlockProps {
    block: InteractiveVisualizationBlock;
    editable?: boolean;
    onParameterChange?: (event: { parameter: string; value: any }) => void;
    onDataChange?: (event: { data: any; filters: any[] }) => void;
    onChartInteraction?: (event: any) => void;
}

export interface InteractiveChartBlockProps {
    block: InteractiveChartBlock;
    editable?: boolean;
    onChartUpdate?: (chartData: any) => void;
    onFilterChange?: (filters: any[]) => void;
    onExport?: (format: string) => void;
}

export interface InteractiveChartProps {
    data: any;
    config: any;
    width?: number;
    height?: number;
    interactive?: boolean;
    onDataPointClick?: (point: any) => void;
    onZoom?: (range: any) => void;
}

export interface ParameterControlsProps {
    parameters: Array<{
        name: string;
        type: 'number' | 'string' | 'boolean' | 'select';
        value: any;
        min?: number;
        max?: number;
        step?: number;
        options?: string[];
    }>;
    onParameterChange?: (parameter: string, value: any) => void;
    layout?: 'horizontal' | 'vertical';
}

// Simulation Components
export interface SimulationBlockProps {
    block: SimulationBlock;
    editable?: boolean;
    onParameterChange?: (event: { parameter: string; value: any; blockId: string }) => void;
    onSimulationStart?: (event: { blockId: string }) => void;
    onSimulationPause?: (event: { blockId: string }) => void;
    onSimulationStop?: (event: { blockId: string }) => void;
    onSimulationReset?: (event: { blockId: string }) => void;
    onSimulationStep?: (event: { step: number; state: any; blockId: string }) => void;
    onSimulationError?: (event: { error: string; step: number }) => void;
    onSimulationExport?: (event: { format: string; blockId: string }) => void;
    onSimulationReportExport?: (event: { blockId: string }) => void;
}

export interface SimulationManagerProps {
    simulations?: SimulationBlock[];
    diagrams?: SystemDiagramBlock[];
    onSimulationCreate?: (simulation: SimulationBlock) => void;
    onDiagramCreate?: (diagram: SystemDiagramBlock) => void;
    onSimulationDelete?: (simulationId: string) => void;
    onDiagramDelete?: (diagramId: string) => void;
}

export interface SystemDiagramBlockProps {
    block: SystemDiagramBlock;
    editable?: boolean;
    onElementAdd?: (element: any) => void;
    onElementUpdate?: (elementId: string, updates: any) => void;
    onElementDelete?: (elementId: string) => void;
    onConnectionAdd?: (connection: any) => void;
    onConnectionDelete?: (connectionId: string) => void;
}

// Web Content Components
export interface WebContentDashboardProps {
    showImporter?: boolean;
    showAnalyzer?: boolean;
    onSourceSelect?: (source: WebContentSource) => void;
    onContentSelect?: (content: WebContent) => void;
}

export interface WebContentImporterProps {
    onImportComplete?: (source: WebContentSource) => void;
    onImportError?: (error: string) => void;
    defaultOptions?: {
        extractInteractive?: boolean;
        generateQuizzes?: boolean;
        preserveFormatting?: boolean;
        timeout?: number;
    };
}

export interface WebContentAnalyzerProps {
    contentId?: string;
    autoAnalyze?: boolean;
    onAnalysisComplete?: (analysis: any) => void;
    onAnalysisError?: (error: string) => void;
}

// Data Management Components
export interface DataManagerProps {
    data: any[];
    columns?: Array<{ key: string; label: string; type: string }>;
    editable?: boolean;
    onDataChange?: (data: any[]) => void;
    onRowAdd?: (row: any) => void;
    onRowDelete?: (rowId: string) => void;
    onRowUpdate?: (rowId: string, updates: any) => void;
}

export interface DataManipulatorProps {
    data: any[];
    onDataTransform?: (transformedData: any[]) => void;
    availableTransforms?: string[];
    showPreview?: boolean;
}

export interface DataExplorerProps {
    data: any[];
    onVisualizationCreate?: (config: any) => void;
    onFilterApply?: (filters: any[]) => void;
    showStatistics?: boolean;
}

// Search Components
export interface SearchEngineProps {
    placeholder?: string;
    onSearch?: (query: string, filters?: any) => void;
    onResultSelect?: (result: any) => void;
    showFilters?: boolean;
    showSuggestions?: boolean;
}

// Sync Components
export interface SyncStatusProps {
    status: 'synced' | 'syncing' | 'error' | 'offline';
    lastSync?: Date;
    onRetry?: () => void;
    showDetails?: boolean;
}