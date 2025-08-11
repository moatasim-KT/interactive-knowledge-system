/**
 * Web Content Sourcing Services
 * Export all source management and processing services
 */

// Core source management
export { sourceManager, SourceManager } from './sourceManager.js';
export type {
	SourceFilters,
	SourceUpdateResult,
	DuplicateDetectionResult
} from './sourceManager.js';

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
	LearningPathSuggestion,
	IntegrationMetrics
} from './knowledgeSystemIntegration.js';

// Learning path integration
export { learningPathIntegration, LearningPathIntegration } from './learningPathIntegration.js';
export type {
	PrerequisiteSuggestion,
	LearningPathModule,
	ProgressionAnalysis
} from './learningPathIntegration.js';

// Unified web content knowledge integration
export { webContentKnowledgeIntegration, WebContentKnowledgeIntegration } from './webContentKnowledgeIntegration.js';
export type {
	ContentIntegrationResult,
	IntegrationStatus,
	SearchEnhancementResult
} from './webContentKnowledgeIntegration.js';
