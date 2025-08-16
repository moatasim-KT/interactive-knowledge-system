/**
 * Web Content Sourcing Services
 * Export all source management and processing services
 */

// Core source management
export { sourceManager, SourceManager } from './sourceManager.js';


// Content update detection
export { contentUpdateDetector, ContentUpdateDetector } from './contentUpdateDetector.js';
export type {
	UpdateDetectionConfig,
	ContentChangeDetection,
	RefreshOperationResult
} from './contentUpdateDetector.js';

// Duplicate detection and merging
export { duplicateDetector, DuplicateDetector } from './duplicateDetector.js';
export type {
	SimilarityMethod,
	DuplicateDetectionConfig,
	MergeConfig,
	MergeResult
} from './duplicateDetector.js';

// Processing pipeline
export { processingPipelineManager, ProcessingPipelineManager } from './processingPipeline.js';
export type {
	ProcessingPipelineConfig,
	ProcessingJob,
	ProcessingJobStatus
} from './processingPipeline.js';

// Source library and search
export { sourceLibrary, SourceLibrary } from './sourceLibrary.js';
export type {
	AdvancedSearchConfig,
	SearchResult,
	CategorizationResult,
	TagAnalysis
} from './sourceLibrary.js';

// Error handling (existing)
export * from './webContentErrorHandler.js';

// Knowledge system integration
export { knowledgeSystemIntegration, KnowledgeSystemIntegration } from './knowledgeSystemIntegration.js';
export type {
	RelationshipDetectionConfig,
	RelationshipDetectionResult,
	SuggestedRelationship,
	IntegrationMetrics
} from './knowledgeSystemIntegration.js';
export type { LearningPathSuggestion } from '$lib/types/unified.js';

// Learning path integration
export { learningPathIntegration, LearningPathIntegration } from './learningPathIntegration.js';
export type {
	PrerequisiteSuggestion,
	LearningPathModule,
	ProgressionAnalysis
} from '$lib/types/unified.js';

// Unified web content knowledge integration
export { webContentKnowledgeIntegration, WebContentKnowledgeIntegration } from './webContentKnowledgeIntegration.js';

// Enhanced document processor
export { enhancedDocumentProcessor, EnhancedDocumentProcessor } from './enhancedDocumentProcessor.js';
export type {
	ProcessingConfig
} from './enhancedDocumentProcessor.js';
export type {
	DocumentStructure,
	TableOfContents,
	TocEntry,
	StructureMetadata,
	MediaAsset
} from '$lib/types/unified.js';

// Interactive content transformer
export { InteractiveTransformer, transformationUtils } from './interactiveTransformer.js';
export type { TransformationConfig } from './interactiveTransformer.js';
export type {
	InteractiveArticle,
	InteractiveContentBlock,
	InteractiveMetadata,
	InteractiveStructure,
	InteractiveSection,
	InteractiveAsset,
	InteractivityConfig,
	InteractiveFeature,
	ExpandableConfig,
	ExecutableConfig,
	ContentEnhancement,
	NavigationConfig,
	ProgressConfig,
	AssetInteractivity,
	AssetOverlay,
	ContentRelationship,
	UserProgress,
	UserAnnotation
} from '$lib/types/unified.js';

// Knowledge base integration services
export { relationshipDetectionService, RelationshipDetectionService } from './relationshipDetectionService.js';
export type {
	SuggestedConnection,
	RelationshipDetectionOptions
} from './relationshipDetectionService.js';

export { knowledgeBaseIntegrationService, KnowledgeBaseIntegrationService } from './knowledgeBaseIntegrationService.js';
export type {
	NodeCreationOptions,
	IntegrationResult,
	NodeCreationMetadata
} from './knowledgeBaseIntegrationService.js';

// Offline functionality
export { offlineManager, OfflineManager } from './offlineManager.js';
export { offlineQueue, OfflineQueue } from './offlineQueue.js';
export { syncService, SyncService } from './syncService.js';
export { networkService, NetworkService } from './networkService.js';
export { optimisticUpdateManager, OptimisticUpdateManager } from './optimisticUpdates.js';
export { cloudSyncService, CloudSyncService } from './cloudSyncService.js';
export { conflictResolver, ConflictResolver } from './conflictResolver.js';

