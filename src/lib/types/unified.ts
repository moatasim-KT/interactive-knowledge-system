// Core type definitions for the interactive knowledge system
// Import existing types from other files to avoid duplication
export type { ToastItem } from './toast.js';
export type { MediaStorageQuota } from '../storage/mediaStorage.js';
export type { SyncOperation, OfflineQueueItem } from '../services/offlineQueue.js';
export type { NetworkStatus } from '../services/networkService.js';
export type {
    DuplicateDetectionConfig,
    MergeConfig,
    MergeResult
} from '../services/duplicateDetector.js';

// No circular imports - all types defined here

export type ContentLink = {
    id: string;
    sourceId: string;
    targetId: string;
    type: RelationshipType;
    strength: number;
    description?: string;
    automatic?: boolean;
    metadata?: Record<string, any>;
};

export type ContentGraphNode = {
    id: string;
    title: string;
    incomingLinks: string[];
    outgoingLinks: string[];
    type?: string;
    tags?: string[];
    difficulty?: DifficultyLevel;
};

export type ContentGraph = {
    nodes: Map<string, ContentGraphNode>;
    edges: Map<string, ContentLink>;
};

export interface DependencyChain {
    nodeId?: string;
    prerequisites: string[];
    dependents: string[];
    depth?: number;
    canAccess?: boolean;
}

export type RelationshipType =
    | 'prerequisite'
    | 'dependent'
    | 'related'
    | 'similar'
    | 'sequence'
    | 'practice'
    | 'example'
    | 'reference'
    | 'references'
    | 'follows'
    | 'contradicts'
    | 'duplicate'
    | 'conceptual';

export type KnowledgeMapNode = {
    id: string;
    contentId: string;
    title: string;
    type: 'concept' | 'skill' | 'topic' | 'milestone';
    status: 'locked' | 'available' | 'in-progress' | 'completed';
    position: { x: number; y: number };
    size: number;
    color: string;
};

export type KnowledgeMapConnection = {
    id: string;
    sourceId: string;
    targetId: string;
    type: RelationshipType;
    strength: number;
    style: 'solid' | 'dashed' | 'dotted';
    color: string;
};

export type KnowledgeMap = {
    id: string;
    title: string;
    description?: string;
    nodes: KnowledgeMapNode[];
    connections: KnowledgeMapConnection[];
    layout: 'force-directed' | 'hierarchical' | 'circular' | 'grid' | 'radial';
    filters?: {
        showCompleted: boolean;
        showPrerequisites: boolean;
        difficultyRange: [number, number];
        tags: string[];
    };
};

export type ContentRecommendation = {
    id?: string;
    title?: string;
    contentId: string;
    score: number;
    type: 'next-in-sequence' | 'related-topic' | 'similar-difficulty' | 'practice' | 'review';
    reasons: RecommendationReason[];
    difficulty?: DifficultyLevel;
};

export type RecommendationReason = {
    type: 'prerequisite-completed' | 'similar-content' | 'difficulty-match' | 'topic-continuation';
    weight: number;
    description: string;
};

export interface SimilarityReason {
    type: string;
    score: number;
    details?: string;
}

export interface SimilarityScore {
    contentId?: string;
    score: number;
    reasoning?: string;
    reasons?: SimilarityReason[];
}

// Standardized difficulty type across the app
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type ContentModule = {
    id: string;
    title: string;
    metadata: {
        difficulty: DifficultyLevel;
        tags: string[];
        estimatedTime: number;
        prerequisites: string[];
        description?: string;
        created?: Date;
        modified?: Date;
        version?: number;
        language?: string;
        author?: string;
        contentHash?: string;
    };
    blocks: ContentBlock[];
    description?: string;
    relationships?: {
        prerequisites: string[];
        dependents: string[];
        related: string[];
    };
    analytics?: {
        views: number;
        completions: number;
        averageScore: number;
        averageTime: number;
    };
};

export type GraphVisualizationOptions = {
    layout: 'force-directed' | 'hierarchical' | 'circular' | 'grid' | 'radial';
    width: number;
    height: number;
    margin?: { top: number; right: number; bottom: number; left: number };
    responsive?: boolean;
    colorScheme: 'by-progress' | 'by-type' | 'by-difficulty' | 'custom';
    nodeColorBy: 'status' | 'type' | 'difficulty' | 'custom';
    edgeColorBy: 'type' | 'strength' | 'custom';
    showConnections: boolean;
    clustered: boolean;
    nodeSize?: string;
};

// Knowledge system types
export interface KnowledgeNode {
    id: string;
    title: string;
    type: 'concept' | 'skill' | 'topic' | 'milestone' | 'module' | 'lesson' | 'exercise' | 'article' | 'reference' | 'folder' | 'interactive-content';
    content?: ContentBlock[];
    metadata: {
        difficulty: DifficultyLevel;
        tags: string[];
        version?: number; // Made optional
        created?: Date; // Made optional
        modified?: Date; // Made optional
        interactivity?: string;
        description?: string;
        estimatedTime: number;
        prerequisites?: string[];
        parent?: string;
        categories?: string[];
        wordCount?: number;
        readingTime?: number;
    };
    parent?: string;
    relationships?: string[];
    prerequisites?: string[];
    dependents?: string[];
    status?: 'locked' | 'available' | 'in-progress' | 'completed';
    position?: { x: number; y: number };
    size?: number;
    color?: string;
    progress?: {
        completed: boolean;
        score?: number;
        lastAccessed: Date;
    };
    source?: {
        type: string;
        url?: string;
        importedAt: Date;
        originalId?: string;
        originalUrl?: string;
    };
    interactivity?: any;
    children?: KnowledgeNode[];
}

// Web content types
export interface WebContentSource {
    id: string;
    type?: 'url' | 'rss' | 'sitemap' | 'file' | 'api';
    url?: string;
    name?: string;
    title?: string; // Added missing title property
    enabled?: boolean;
    domain?: string;
    lastFetched?: Date;
    status?: 'active' | 'inactive' | 'error' | 'updated' | 'removed'; // Extended status types
    lastChecked?: Date; // Added missing lastChecked property
    importDate?: Date; // Added missing importDate property
    usage?: { // Changed from number to object with timesReferenced
        timesReferenced: number;
        lastReferenced?: Date;
        referenceCount?: number;
        lastAccessed?: Date;
        generatedModules?: string[];
    };
    metadata?: { // Added missing metadata property
        contentType: string;
        category?: string;
        tags?: string[];
        description?: string;
        lastModified?: Date;
        publishDate?: Date;
        size?: number;
        readingTime?: number;
        wordCount?: number;
        domain?: string;
        language?: string;
        keywords?: string[];
        attribution?: string;
        contentHash?: string;
        author?: string;
        license?: string;
    };
}

export interface WebContent {
    id: string;
    path?: string;
    url?: string;
    finalUrl?: string;
    title?: string;
    html?: string;
    sourceId?: string;
    fetchedAt: Date | string;
    status?: 'pending' | 'processing' | 'completed' | 'error';
    content?: {
        text?: string;
        html?: string;
        images?: Array<{
            url: string;
            src?: string;
            alt?: string;
            caption?: string;
            metadata?: any;
        }>;
        codeBlocks?: Array<{
            id?: string;
            language: string;
            filename?: string;
            code: string;
            metadata?: any;
            interactive?: boolean;
            executable?: boolean;
        }>;
        tables?: Array<{
            headers: string[];
            rows: any[][];
            metadata?: any;
        }>;
        charts?: Array<{
            type: string;
            data: any;
            config?: any;
        }>;
        blocks?: Array<{
            type: string;
            content: any;
        }>;
    };
    metadata?: { // Added missing metadata property
        contentType: string;
        category?: string;
        tags?: string[];
        description?: string;
        lastModified?: Date;
        publishDate?: Date;
        size?: number;
        wordCount: number;
        language?: string;
        readingTime: number; // Added missing readingTime property
        keywords?: string[];
        domain?: string;
        author?: string | {
            name: string;
            url?: string;
            image?: string;
            [key: string]: any;
        } | null;
        attribution?: string;
        contentHash?: string;
    };
    extraction?: {
        method: string;
        issues?: string[];
        confidence?: number;
        qualityScore?: number;
        processingTime?: number;
    };
    success?: boolean;
}

// WebContentMetadata interface
export interface WebContentMetadata {
    /** The title of the web content */
    title?: string;
    /** A short description or summary */
    description?: string;
    /** The author of the content */
    author?: string | {
        name: string;
        url?: string;
        image?: string;
        [key: string]: any;
    } | null;
    /** The date the content was published (ISO 8601 format) */
    published_date?: string;
    /** The date the content was last modified (ISO 8601 format) */
    modified_date?: string;
    /** The primary language of the content (BCP 47 language tag) */
    language?: string;
    /** The MIME type of the content */
    content_type?: string;
    /** Estimated word count */
    word_count?: number;
    /** Estimated reading time in minutes */
    reading_time?: number;
    /** The canonical URL of the content */
    url?: string;
    /** The canonical URL if different from the requested URL */
    canonical_url?: string;
    /** The name of the website or publisher */
    site_name?: string;
    /** Categories or sections the content belongs to */
    categories?: string[];
    /** Tags or keywords associated with the content */
    tags?: string[];
    /** Primary image URL or object with image details */
    image?: string | {
        url: string;
        width?: number;
        height?: number;
        alt?: string;
        type?: string;
        [key: string]: any;
    };
    /** Content license information */
    license?: string | {
        type: string;
        url?: string;
        [key: string]: any;
    };
    /** When the content was fetched (ISO 8601 format) */
    fetched_at?: string;
    /** Structured data extracted from the page */
    structured_data?: any;
    /** Open Graph metadata */
    opengraph?: any;
    /** Twitter Card metadata */
    twitter?: any;
    /** Any additional metadata */
    [key: string]: any;
    /** Content type for WebContent compatibility */
    contentType: string;
    /** Word count for WebContent compatibility */
    wordCount: number;
    /** Reading time for WebContent compatibility */
    readingTime: number;
    /** Category for WebContent compatibility */
    category?: string;
    /** Last modified date for WebContent compatibility */
    lastModified?: Date;
    /** Size for WebContent compatibility */
    size?: number;
    /** Keywords for WebContent compatibility */
    keywords?: string[];
    /** Domain for WebContent compatibility */
    domain?: string;
    /** Attribution for WebContent compatibility */
    attribution?: string;
}

// Content block types
export interface ContentBlock {
    id: string;
    type: 'text' | 'code' | 'image' | 'video' | 'interactive-content' | 'chart' | 'simulation' | 'diagram' | string;
    content: any;
    metadata?: {
        created?: Date;
        modified?: Date;
        version?: number;
    };
}

export interface InteractiveContentBlock extends ContentBlock {
    type: 'interactive-content' | 'text' | 'code';
    content: {
        title: string;
        description: string;
        interactivity: string;
        parameters: Parameter[];
        sourceReference: SourceReference;
        text?: string;
        language?: string;
        preview?: string;
        fullText?: string;
        code?: string;
        expandable?: boolean;
        defaultExpanded?: boolean;
        syntaxHighlighting?: {
            enabled: boolean;
            theme?: string;
            lineNumbers?: boolean;
            highlightLines?: number[];
        };
        execution?: {
            enabled: boolean;
            runtime?: string;
            timeout?: number;
            timeoutMs?: number;
            allowedLibraries?: string[];
            sandboxed?: boolean;
        };
        examples?: Array<{ input: string; output: string }>;
        url?: string;
        alt?: string;
        section?: string;
        interactive?: {
            zoomable?: boolean;
            draggable?: boolean;
            resizable?: boolean;
            annotatable?: boolean;
            overlays?: any[];
        };
    };
    interactivity?: InteractivityConfig;
    enhancements?: ContentEnhancement[];
}

export interface InteractiveArticle {
    id: string;
    title: string;
    content: InteractiveContentBlock[];
    interactiveElements: any[];
    metadata: InteractiveMetadata;
    structure: InteractiveStructure;
    assets: InteractiveAsset[];
    relationships: ContentLink[];
}

export interface InteractiveMetadata {
    difficulty?: DifficultyLevel;
    estimatedTime?: number;
    tags?: string[];
    interactivity?: string;
    version?: number;
    created?: Date;
    modified?: Date;
    originalDocument?: string;
    transformationDate?: Date;
    interactivityLevel?: number;
    estimatedReadingTime?: number;
    difficultyLevel?: DifficultyLevel | number;
    completionTracking?: boolean;
    aiEnhanced?: boolean;
}

export interface InteractiveStructure {
    sections: InteractiveSection[];
    navigation: any;
    progressTracking: any;
}

export interface InteractiveSection {
    id: string;
    title: string;
    level: number;
    content: InteractiveContentBlock[];
    subsections: InteractiveSection[];
    expandable?: boolean;
    estimatedTime?: number;
    prerequisites?: string[];
}

export interface NavigationConfig {
    showTableOfContents: boolean;
    showProgressBar: boolean;
    allowSkipping?: boolean;
    enableKeyboardNavigation?: boolean;
    breadcrumbs?: boolean;
}

export interface ProgressConfig {
    trackReadingProgress?: boolean;
    trackQuizScores?: boolean;
    trackTimeSpent?: boolean;
    trackInteractionProgress?: boolean;
    saveBookmarks?: boolean;
    estimateCompletionTime?: boolean;
}

export interface InteractiveAsset {
    id: string;
    type: 'image' | 'video' | 'audio' | 'interactive';
    url: string;
    metadata: any;
}

export interface AssetInteractivity {
    type: string;
    config: any;
}

export interface AssetOverlay {
    type: string;
    config: any;
}

export interface ContentRelationship {
    id: string;
    sourceId: string;
    targetId: string;
    type: string;
    strength: RelationshipStrength;
    confidence: number;
    metadata: any;
}

export type RelationshipStrength = number | 'very-weak' | 'weak' | 'medium' | 'strong';

export interface NodeMetadata {
    difficulty: DifficultyLevel;
    tags: string[];
    estimatedTime: number;
    prerequisites?: string[];
    description?: string;
    version?: number;
    created?: Date;
    modified?: Date;
    interactivity?: string;
    author?: string;
    wordCount?: number;
    readingTime?: number;
    completionStatus?: string;
    categories?: string[];
    collections?: string[];
}

export interface UserAnnotation {
    id: string;
    content: string;
    timestamp: Date;
    type: string;
}

export interface InteractivityConfig {
    type: string;
    level: number;
    features: InteractiveFeature[];
    parameters: Parameter[];
    expandable?: ExpandableConfig;
    executable?: ExecutableConfig;
}

export interface InteractiveFeature {
    type: string;
    enabled: boolean;
    config: any;
}

export interface ExpandableConfig {
    type: 'expandable';
    title: string;
    content: string;
    expanded: boolean;
    previewLength?: number;
    defaultExpanded?: boolean;
    animationDuration?: number;
}

export interface ExecutableConfig {
    type: 'executable';
    language: string;
    code: string;
    parameters: Parameter[];
    runtime?: string;
    allowedLibraries?: string[];
    timeoutMs?: number;
}

export interface ContentEnhancement {
    type: string;
    content: any;
    position?: string;
    generated?: boolean;
    config?: any;
}

export interface TransformationConfig {
    enableExpandableSections: boolean;
    generateQuizzes: boolean;
    enhanceCodeBlocks: boolean;
    findRelatedContent: boolean;
    aiEnhancement: boolean;
    maxQuizzesPerSection: number;
    minSectionLengthForExpansion: number;
    codeExecutionTimeout: number;
    relatedContentThreshold: number;
}

export interface InteractiveChartBlock extends ContentBlock {
    type: 'interactive-chart';
    content: {
        chartType: 'line' | 'bar' | 'scatter' | 'heatmap' | 'network';
        data: ChartData;
        interactions: ChartInteraction[];
        filters: DataFilter[];
        sourceReference: SourceReference;
        title?: string;
        description?: string;
    };
}

export interface InteractiveVisualizationBlock extends ContentBlock {
    type: 'interactive-visualization';
    content: {
        visualizationType: 'neural-network' | 'chart' | 'simulation' | 'algorithm' | 'data-explorer';
        config: VisualizationConfig;
        data: any;
        sourceReference: SourceReference;
    };
}

export interface SimulationBlock extends ContentBlock {
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

export interface SystemDiagramBlock extends ContentBlock {
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

// Configuration types
export interface VisualizationConfig {
    title: string;
    description: string;
    parameters: Parameter[];
    layout: LayoutConfig;
    styling: StyleConfig;
    animations: AnimationConfig;
}

export interface Parameter {
    name: string;
    type: 'number' | 'boolean' | 'string' | 'select' | 'slider' | 'dropdown' | 'toggle' | 'text';
    default: any;
    description: string;
    constraints?: {
        min?: number;
        max?: number;
        step?: number;
        options?: string[];
    };
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
}

export interface LayoutConfig {
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
    responsive: boolean;
}

export interface StyleConfig {
    theme: 'light' | 'dark' | 'auto';
    colors: string[];
    fonts: { family: string; size: number };
}

export interface AnimationConfig {
    enabled: boolean;
    duration: number;
    easing: string;
    transitions: string[];
}

export interface SourceReference {
    originalUrl: string;
    originalContent: string;
    transformationReasoning: string;
    extractionMethod: string;
    confidence: number;
}

export interface ChartInteraction {
    event: string;
    parameter: string;
    effect: string; // Serialized function
    debounce?: number;
}

export interface DataFilter {
    field: string;
    type: 'text' | 'number' | 'date' | 'select';
    operator: 'equals' | 'contains' | 'greater' | 'less' | 'between';
    value: any;
    active: boolean;
}

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

export interface VisualizationSpec {
    type: string;
    width: number;
    height: number;
    interactive: boolean;
    config: any;
}

export interface DiagramElement {
    id: string;
    type: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    label: string;
    description?: string;
    properties?: Record<string, any>;
    style?: Record<string, any>;
    interactive?: boolean;
    clickable?: boolean;
}

export interface DiagramConnection {
    id: string;
    sourceId?: string;
    targetId?: string;
    type: string;
    label?: string;
    style: 'solid' | 'dashed' | 'dotted' | Record<string, any>;
    color?: string;
    from?: string;
    to?: string;
    arrow?: boolean;
}

export interface DiagramLayout {
    type: 'force-directed' | 'hierarchical' | 'circular' | 'grid' | 'radial';
    spacing: number;
    direction: 'horizontal' | 'vertical';
    width?: number;
    height?: number;
    padding?: number;
    grid?: boolean;
}

export interface ChartData {
    labels?: any[];
    datasets: Array<Record<string, any>>;
    data?: any;
}

// Batch processing types
export interface BatchProcessingJob {
    id: string;
    type: 'import' | 'analyze' | 'transform';
    status: 'pending' | 'running' | 'completed' | 'failed' | 'processing';
    progress: number;
    totalItems: number;
    processedItems: number;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    error?: string;
    metadata: Record<string, any>;
    results?: ContentProcessingResult[];
    urls?: string[];
}

export interface ProcessingStage {
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    startTime?: Date;
    endTime?: Date;
    error?: string;
    config?: Record<string, any>;
}

export interface ProcessingResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata: Record<string, any>;
    stage?: string;
}

export interface ContentProcessingResult extends ProcessingResult {
    contentId: string;
    contentType: string;
    processingTime: number;
    quality: 'low' | 'medium' | 'high';
    extractedElements: {
        text: string[];
        images: string[];
        links: string[];
        tables: any[];
        codeBlocks: any[];
    };
}

// Document processing types
export interface DocumentSource {
    id?: string;
    type: 'file' | 'url' | 'database' | 'api' | 'text' | 'manual'; // Added 'text' and 'manual' types
    name?: string;
    path?: string;
    url?: string;
    originalUrl?: string; // Added to support file names and original URLs
    uploadedAt?: Date; // Added to support timestamp tracking
    importedAt?: Date; // Added to support import timestamp tracking
    metadata?: Record<string, any>;
}

export interface UploadProgress {
    loaded?: number; // Made optional for flexibility
    total?: number; // Made optional for flexibility
    percentage?: number; // Made optional for flexibility
    progress: number; // Added missing progress property (0-100)
    fileId: string;
    fileName: string;
    status: 'uploading' | 'processing' | 'completed' | 'error' | 'failed';
    message?: string;
    bytesUploaded?: number;
    totalBytes?: number;
    error?: string;
}

export interface DocumentMetadata {
    title?: string;
    author?: string; // Made optional since not all documents have authors
    subject?: string; // Made optional since not all documents have subjects
    keywords?: string[];
    language?: string;
    created?: Date;
    modified?: Date;
    version?: number; // Changed from string to number
    pageCount?: number; // Made optional since not all documents have page counts
    wordCount?: number;
    fileSize?: number;
    mimeType?: string;
    contentType?: string; // Made optional for flexibility
    readingTime?: number; // Made optional since it's calculated
    difficulty?: 'beginner' | 'intermediate' | 'advanced'; // Made optional
    estimatedTime?: number; // Made optional since it's estimated
    originalFormat?: string; // Made optional
    originalFileName?: string; // Made optional
    processedAt?: Date; // Made optional
    processingTime?: number; // Made optional
    sourceUrl?: string; // Made optional
    tags?: string[]; // Made optional for flexibility
    prerequisites?: string[]; // Made optional for flexibility
    extractionMethod?: string; // Added missing extractionMethod property
    confidence?: number; // Added missing confidence property
}

export interface DocumentSection {
    id: string;
    title: string;
    level: number;
    content: ContentBlock[];
    startPage?: number;
    endPage?: number;
    subsections: DocumentSection[];
    startPosition?: number;
    endPosition?: number;
}

export interface TableOfContents {
    title?: string;
    entries?: TocEntry[];
    maxDepth?: number;
    includePageNumbers?: boolean;
    items?: TocEntry[]; // Alias for entries
}

export interface TocEntry {
    id: string;
    title: string;
    level: number;
    pageNumber?: number;
    children: TocEntry[];
    position?: number; // Alias for pageNumber
}

export interface StructureMetadata {
    sectionCount?: number;
    averageSectionLength?: number;
    hasTableOfContents?: boolean;
    hasIndex?: boolean;
    complexity?: 'simple' | 'moderate' | 'complex';
    totalSections?: number;
    maxDepth?: number;
    averageDepth?: number;
    hasImages?: boolean;
    hasCode?: boolean;
    hasCodeBlocks?: boolean;
    hasTables?: boolean;
}

export interface DocumentStructure {
    sections?: DocumentSection[];
    tableOfContents?: TableOfContents;
    metadata?: StructureMetadata;
    outline?: string[];
    toc?: TableOfContents; // Alias for tableOfContents
}

export interface MediaAsset {
    id: string;
    type: 'image' | 'video' | 'audio' | 'document';
    name: string;
    path: string;
    url?: string; // Added missing url property for external URLs
    filename?: string; // Added missing filename property
    size: number;
    mimeType: string;
    extractedFrom?: string; // Added missing extractedFrom property
    metadata: {
        width?: number;
        height?: number;
        duration?: number;
        format?: string; // Made optional
        quality?: string; // Made optional
        tags?: string[]; // Made optional
        alt?: string; // Added alt property
    };
}

export interface TransformationContext {
    sourceType: string;
    targetType: string;
    rules: TransformationRule[];
    userPreferences: UserTransformationPreferences;
}

export interface TransformationRule {
    name: string;
    condition: string;
    action: string;
    priority: number;
    enabled: boolean;
}

export interface UserTransformationPreferences {
    interactivityLevel: 'low' | 'medium' | 'high';
    visualizationType: 'chart' | 'simulation' | 'diagram';
    complexity: 'simple' | 'moderate' | 'advanced';
}

// Interactive opportunity types
export interface InteractiveOpportunity {
    id: string;
    title?: string;
    type: 'chart' | 'simulation' | 'quiz' | 'exploration' | 'interactive-table' | 'interactive-code' | 'interactive-chart';
    confidence: number;
    reasoning: string[];
    sourceElement: string;
    suggestedTransformations?: string[];
    estimatedEffort?: 'low' | 'medium' | 'high';
    description?: string;
}

// Integration types
export interface IntegrationPipeline {
    id: string;
    name: string;
    description: string;
    steps: IntegrationStep[];
    status: 'draft' | 'active' | 'paused' | 'archived' | 'completed' | 'error' | 'running' | 'idle';
    progress?: number;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
    startTime?: Date;
    endTime?: Date;
}

export interface IntegrationStep {
    id: string;
    name: string;
    type: 'fetch' | 'transform' | 'integrate' | 'validate';
    order: number;
    config: Record<string, any>;
    status: 'pending' | 'running' | 'completed' | 'failed';
    error?: string;
    progress?: number;
    result?: any;
}

export interface DocumentTransformationResult {
    success: boolean;
    transformedContent?: any;
    metadata?: {
        originalFormat: string;
        targetFormat: string;
        transformationRules: string[];
        confidence: number;
    };
    errors: string[];
    originalDocument?: any;
    interactiveArticle?: any;
    knowledgeNode?: any;
    integrationResult?: any;
    processingTime?: number;
}

export interface SystemIntegrationOptions {
    enableAutoDiscovery: boolean;
    enableConflictResolution: boolean;
    enableOptimisticUpdates: boolean;
    maxRetries: number;
    timeout: number;
    enableProgressTracking: boolean;
    enableErrorRecovery: boolean;
    enableCaching: boolean;
    enableMobileOptimization: boolean;
    batchSize: number;
    maxConcurrentOperations: number;
}

// User and progress types
export interface UserSettings {
    id?: string; // Added missing id property
    theme?: 'light' | 'dark' | 'auto';
    language?: string;
    notifications?: boolean;
    accessibility?: {
        highContrast: boolean;
        fontSize: number;
        reducedMotion: boolean;
    };
    preferences: {
        autoSave?: boolean;
        autoSync?: boolean;
        defaultView?: 'grid' | 'list' | 'timeline';
        showProgress?: boolean;
        showDifficulty?: boolean;
        estimatedTime?: boolean;
        theme?: 'light' | 'dark' | 'auto'; // Added theme to preferences
        learningStyle?: 'visual' | 'auditory' | 'kinesthetic';
        difficulty?: DifficultyLevel;
        notifications?: boolean;
        language?: string; // Added missing language property
    };
    profile?: { // Added missing profile property
        name: string;
        email?: string;
        joinDate: Date;
        avatar?: string;
        bio?: string;
    };
}

export interface UserProgress {
    nodeId?: string; // Made optional
    status: 'not-started' | 'in-progress' | 'completed';
    progress?: number; // Made optional
    timeSpent: number;
    lastAccessed: Date;
    completedAt?: Date;
    startedAt?: Date;
    score?: number;
    attempts?: number;
    bookmarked?: boolean;
    notes?: string;
    userId?: string;
    moduleId?: string;
}

// Progress and achievement types
export interface ProgressStats {
    totalModules: number;
    completedModules: number;
    inProgressModules: number;
    totalTimeSpent: number;
    averageScore: number;
    currentStreak: number;
    longestStreak: number;
    lastActivity: Date;
    completionRate?: number;
    lastActivityDate?: Date;
}

export interface LearningStreak {
    id: string;
    userId: string;
    startDate: Date;
    endDate?: Date;
    duration: number;
    isActive: boolean;
    currentStreak: number; // Added missing property
    longestStreak: number; // Added missing property
    lastActivityDate: Date; // Added missing property
    streakStartDate: Date; // Added missing property
    milestones: {
        date: Date;
        description: string;
        type: 'daily' | 'weekly' | 'monthly';
    }[];
}

export interface Achievement {
    id: string;
    userId: string;
    type: 'completion' | 'streak' | 'milestone' | 'special' | 'score'; // Added 'score' type
    title: string;
    description: string;
    icon: string;
    unlockedAt: Date;
    earnedAt?: Date; // Added missing property (alias for unlockedAt)
    progress?: number;
    maxProgress?: number;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    metadata?: Record<string, any>; // Added missing metadata property
}

export interface SearchResult {
    id: string;
    title: string;
    type: string;
    relevance: number;
    snippet: string;
    metadata: Record<string, any>;
    tags?: string[];
}

// Navigation types
export interface NavItem {
    id: string;
    label: string;
    icon?: string;
    href?: string;
    active?: boolean;
    badge?: string | number;
}

// Toast types
export interface Toast {
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    duration: number;
    dismissible: boolean;
    title?: string;
    timestamp?: Date;
    actions?: Array<{ label: string; action: () => void }>;
}

// Quiz types
export interface Question {
    id: string;
    text: string;
    question?: string;
    type: 'multiple-choice' | 'true-false' | 'fill-in' | 'matching';
    options?: string[];
    correctAnswer: string | string[];
    explanation?: string;
    difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizState {
    quizId: string;
    questions: Question[];
    currentQuestion: number;
    answers: Record<string, string>;
    score: number;
    completed: boolean;
}

// Document processing types
export interface ProcessedDocument {
    id: string;
    title: string;
    content: ContentBlock[]; // Changed from string to ContentBlock[]
    metadata: DocumentMetadata; // Use the unified DocumentMetadata interface
    structure?: DocumentStructure; // Added missing structure property
    assets?: MediaAsset[]; // Added missing assets property
    source?: DocumentSource; // Added missing source property
    documentContent?: {
        html: string;
        text: string;
        codeBlocks: Array<{
            language: string;
            code: string;
            lineNumbers: boolean;
        }>;
        tables: Array<{
            headers: string[];
            rows: string[][];
        }>;
        images: Array<{
            src: string;
            alt: string;
            caption?: string;
        }>;
    };
    extraction?: {
        method: string;
        issues: string[];
        confidence: number;
    };
    success?: boolean;
    relationships?: {
        prerequisites: string[];
        dependents: string[];
        related: string[];
    };
    analytics?: {
        complexity: number;
        readability: number;
        engagement: number;
    };
}

// Media types
export interface MediaFile {
    id: string;
    name: string;
    type: 'image' | 'video' | 'audio' | 'document';
    path: string;
    size: number;
    mimeType: string;
    uploadedAt?: Date;
    url?: string;
    thumbnailUrl?: string;
    optimized?: { webp?: string; thumbnail?: string };
    metadata: {
        width?: number;
        height?: number;
        duration?: number;
        format: string;
        createdAt?: Date;
        created?: Date;
        modified?: Date;
        tags: string[];
    };
}

// Learning path and progression types
export interface LearningPath {
    id: string;
    name: string;
    description: string;
    modules: string[]; // List of module IDs
    estimatedDuration: number; // Minutes
    tags?: string[];
    difficulty?: DifficultyLevel;
}

export interface LearningPathModule {
    id: string;
    title: string;
    position: number;
    isImported: boolean;
    estimatedTime: number; // Minutes
    difficulty: DifficultyLevel;
    sourceUrl: string;
    tags: string[];
    prerequisites: string[];
}

export interface PrerequisiteSuggestion {
    contentId: string;
    title: string;
    confidence: number; // 0-1
    reasoning: string[];
    difficulty: DifficultyLevel;
    estimatedTime: number; // Minutes
    tags: string[];
}

export interface ProgressionAnalysis {
    contentId: string;
    currentLevel: number; // 0-1 proportion of prereqs completed
    suggestedNext: PrerequisiteSuggestion[];
    suggestedPrevious: PrerequisiteSuggestion[];
    relatedTopics: PrerequisiteSuggestion[];
    skillGaps: string[];
}

export interface LearningPathSuggestion {
    id: string;
    name: string;
    description: string;
    modules: LearningPathModule[];
    totalDuration: number; // Minutes
    averageDifficulty: number; // Averaged numeric rank (1-3)
    confidence: number; // 0-1
    reasoning: string[];
}

export function difficultyToRank(difficulty: DifficultyLevel | number): 1 | 2 | 3 {
    if (typeof difficulty === 'string') {
        switch (difficulty) {
            case 'beginner':
                return 1;
            case 'intermediate':
                return 2;
            case 'advanced':
            default:
                return 3;
        }
    }
    const value = Number(difficulty);
    if (value <= 2) { return 1; }
    if (value <= 4) { return 2; }
    return 3;
}

export function rankToDifficulty(rank: number): DifficultyLevel {
    if (rank <= 1) { return 'beginner'; }
    if (rank === 2) { return 'intermediate'; }
    return 'advanced';
}

// Integration types
export interface IntegrationResult {
    node: KnowledgeNode;
    relationships: ContentRelationship[];
    suggestions: any; // RelationshipDetectionResult
    metadata: NodeCreationMetadata;
}

export interface NodeCreationMetadata {
    createdAt: Date;
    source: 'document' | 'url' | 'manual';
    processingTime: number;
    confidence: number;
    autoGeneratedFields: string[];
}

// Lazy loading types
export interface LazyLoadOptions {
    fallback?: any;
    errorComponent?: any;
    loadingComponent?: any;
    timeout?: number;
    retries?: number;
    fadeIn?: boolean;
    rootMargin?: string;
    threshold?: number;
}

// Source Management Types
export interface SourceHealthCheck {
    sourceId: string;
    status: 'healthy' | 'warning' | 'error' | 'unknown';
    lastChecked: Date;
    issues: string[];
    recommendations: string[];
    url?: string;
}

export interface SourceUpdateResult {
    success: boolean;
    sourceId: string;
    changes: {
        title?: boolean;
        content: boolean;
        metadata: boolean;
        relationships: boolean;
    };
    timestamp: Date;
    errors?: string[];
    hasChanges?: boolean;
}

export interface QualityMetrics {
    readability: number;
    accuracy: number;
    completeness: number;
    relevance: number;
    lastAssessed: Date;
    assessmentMethod: string;
}

// Relationship & Graph Types
export interface ConnectionStrength {
    value: number;
    confidence: number;
    factors: string[];
    lastUpdated: Date;
}

export interface PathfindingResult {
    path: string[];
    distance?: number;
    obstacles?: string[];
    alternativePaths?: string[][];
    totalCost?: number;
    steps?: Array<{
        from: string;
        to: string;
        relationshipType: RelationshipType;
        strength: number;
    }>;
}

export interface ClusterAnalysis {
    clusters: Array<{
        id: string;
        nodes: string[];
        centroid: string;
        topic: string;
        coherence: number;
    }>;
    isolatedNodes: string[];
    bridgeNodes: string[];
    metrics?: {
        silhouetteScore: number;
        cohesion: number;
        separation: number;
    };
}

export interface EnhancedConnectionStrength extends ConnectionStrength {
    bidirectional: boolean;
    temporalDecay: number;
    contextDependent: boolean;
}

export interface GraphLayout {
    type: 'force-directed' | 'hierarchical' | 'circular' | 'grid' | 'tree';
    options?: Record<string, any>;
    name?: string;
    width?: number;
    height?: number;
}

export interface VisualNode {
    id: string;
    position: { x: number; y: number };
    size: { width: number; height: number };
    style: Record<string, any>;
}

export interface RelationshipAnalysis {
    patterns: Array<{
        type: string;
        frequency: number;
        strength: number;
        examples: string[];
    }>;
    recommendations: Array<{
        type: string;
        priority: 'high' | 'medium' | 'low';
        description: string;
        action: string;
    }>;
}

// Sync & Cloud Types
export interface CloudSyncConfig {
    enabled: boolean;
    provider: 'local' | 'dropbox' | 'google-drive' | 'onedrive';
    syncInterval: number;
    autoSync: boolean;
    conflictResolution: 'local-wins' | 'remote-wins' | 'manual';
    encryption: boolean;
}

// File & Media Types
export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    metadata: {
        size: number;
        type: string;
        lastModified: Date;
    };
    preview?: any;
}

// Content validation result for MCP web-content server
export interface ContentValidationResult {
    checks: string[];
    scores: Record<string, number>;
    passed: boolean;
    issues: Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>;
}

export interface FilePreview {
    id: string;
    filename: string;
    type: string;
    size: number;
    previewUrl?: string;
    thumbnailUrl?: string;
    metadata: Record<string, any>;
    content?: any;
}

export interface MediaUploadOptions {
    maxSize: number;
    allowedTypes: string[];
    compression: boolean;
    generateThumbnails: boolean;
    metadata: Record<string, any>;
}

export interface ResponsiveImageSizes {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    original: number;
}

// Additional missing types
export interface SyncConflict {
    id: string;
    type: 'content' | 'metadata' | 'relationships';
    conflictType?: string;
    localVersion: any;
    remoteVersion: any;
    localData?: any;
    remoteData?: any;
    operationId?: string;
    resolution: 'local-wins' | 'remote-wins' | 'manual' | 'unresolved';
    resolved?: boolean;
    timestamp: Date;
}

export interface DuplicateDetectionResult {
    sourceId: string;
    duplicates: Array<{
        sourceId: string;
        similarity: number;
        method: string;
        confidence: number;
    }>;
    recommendations: Array<{
        action: 'merge' | 'keep-both' | 'ignore';
        reason: string;
        confidence: number;
    }>;
    timestamp: Date;
    suggestions?: Array<{
        action: 'merge' | 'keep-both' | 'ignore';
        confidence: number;
        reasoning?: string;
    }>;
}

// Interactive Transformer Types
export interface AssetInteractivity {
    zoomable: boolean;
    annotatable: boolean;
    draggable: boolean;
    resizable: boolean;
    clickable: boolean;
    hoverable: boolean;
}

export interface AssetOverlay {
    id: string;
    type: string;
    position: { x: number; y: number };
    content: any;
    style: Record<string, any>;
}

export interface NavigationConfig {
    enableKeyboard: boolean;
    enableMouse: boolean;
    enableTouch: boolean;
    shortcuts: Record<string, string>;
}

export interface ProgressConfig {
    trackProgress: boolean;
    saveState: boolean;
    autoSave: boolean;
    milestones: string[];
}

export interface UserAnnotation {
    id: string;
    userId: string;
    contentId: string;
    type: string;
    content: string;
    position?: { x: number; y: number };
    timestamp: Date;
}
