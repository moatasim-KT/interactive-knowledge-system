/**
 * Unified type definitions for the application
 * Consolidates and standardizes all shared interfaces and types
 */

import type { ContentRelationship } from './relationships.js';

/**
 * Base metadata interface for all entities with common properties
 */
export interface BaseMetadata {
    created: Date;
    modified: Date;
    version: string;
}

/**
 * Comprehensive document metadata interface
 * Extends BaseMetadata with document-specific properties
 */
export interface DocumentMetadata extends BaseMetadata {
    originalFileName?: string;
    fileSize?: number;
    mimeType?: string;
    processedAt?: Date;
    processingTime?: number;
    extractedText?: number;
    pageCount?: number;
    language?: string;
    author?: string;
    keywords?: string[];
    sourceUrl?: string;
    originalFormat?: string;
    wordCount?: number;
}

/**
 * Node metadata interface for knowledge nodes
 * Extends BaseMetadata with node-specific properties
 */
export interface NodeMetadata extends BaseMetadata {
    description?: string;
    author?: string;
    wordCount?: number;
    readingTime?: number;
    difficulty?: DifficultyLevel;
    completionStatus?: 'draft' | 'review' | 'published';
    tags?: string[];
    categories?: string[];
    collections?: string[];
    estimatedTime?: number;
    prerequisites?: string[];
}

/**
 * Difficulty level union type with all valid values
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Source type union type with all valid values including 'manual'
 */
export type SourceType = 'file' | 'url' | 'text' | 'manual';

/**
 * Event emitter interface for error handlers and other event-driven components
 */
export interface EventEmitter {
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
}

/**
 * Error handler interface extending EventEmitter
 * Provides comprehensive error handling capabilities
 */
export interface ErrorHandler extends EventEmitter {
    handleError(error: Error, context?: string): void;
    showToast(message: string, type: 'error' | 'warning' | 'info'): void;
}

/**
 * Utility type for converting numeric difficulty (1-5) to string difficulty
 */
export type NumericDifficulty = 1 | 2 | 3 | 4 | 5;

/**
 * Utility functions for difficulty conversion
 */
export const DifficultyUtils = {
    /**
     * Convert numeric difficulty (1-5) to string difficulty
     */
    numericToString(numeric: NumericDifficulty): DifficultyLevel {
        switch (numeric) {
            case 1:
            case 2:
                return 'beginner';
            case 3:
            case 4:
                return 'intermediate';
            case 5:
                return 'advanced';
            default:
                return 'beginner';
        }
    },

    /**
     * Convert string difficulty to numeric difficulty (1-5)
     */
    stringToNumeric(difficulty: DifficultyLevel): NumericDifficulty {
        switch (difficulty) {
            case 'beginner':
                return 1;
            case 'intermediate':
                return 3;
            case 'advanced':
                return 5;
            default:
                return 1;
        }
    }
};

/**
 * Generic result type for operations that can succeed or fail
 */
export interface Result<T, E = Error> {
    success: boolean;
    data?: T;
    error?: E;
}

/**
 * Generic pagination interface
 */
export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

/**
 * Generic sort configuration
 */
export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

/**
 * Generic filter configuration
 */
export interface FilterConfig {
    field: string;
    operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan';
    value: any;
}

/**
 * Core content block interface for different types of learning content
 */
export interface ContentBlock {
	id: string;
	type:
	| 'text'
	| 'image'
	| 'video'
	| 'code'
	| 'quiz'
	| 'flashcard'
	| 'diagram'
	| 'interactive-visualization'
	| 'interactive-chart'
	| 'simulation';
	content: any;
	metadata: {
		created: Date;
		modified: Date;
		version: number;
	};
}

/**
 * Content module containing multiple content blocks
 */
export interface ContentModule {
	id: string;
	title: string;
	description: string;
	blocks: ContentBlock[];
	metadata: {
		author: string;
		created: Date;
		modified: Date;
		version: number;
		difficulty: number;
		estimatedTime: number;
		prerequisites: string[];
		tags: string[];
		language: string;
	};
	relationships: {
		prerequisites: string[];
		dependents: string[];
		related: string[];
	};
	analytics: {
		views: number;
		completions: number;
		averageScore: number;
		averageTime: number;
	};
}

/**
 * Editor state for content creation
 */
export interface EditorState {
	blocks: ContentBlock[];
	selectedBlock: string | null;
	isEditing: boolean;
	history: ContentBlock[][];
}

/**
 * File upload and processing interfaces
 */
export interface UploadProgress {
	fileId: string;
	fileName: string;
	percentage: number;
	status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
	message?: string;
	bytesUploaded?: number;
	totalBytes?: number;
}

export interface FileValidationResult {
	isValid: boolean;
	errors: string[];
	warnings: string[];
	fileInfo: {
		name: string;
		size: number;
		type: string;
		lastModified: Date;
	};
	preview?: FilePreview;
}

export interface FilePreview {
	type: 'image' | 'text' | 'none';
	content?: string;
	url?: string;
}

export interface ProcessedDocument {
	id: string;
	title: string;
	content: ContentBlock[];
	metadata: DocumentMetadata;
	structure: DocumentStructure;
	assets: MediaAsset[];
	source: DocumentSource;
}

export interface DocumentStructure {
	sections: DocumentSection[];
	toc: TableOfContents;
	metadata: StructureMetadata;
}

/**
 * Interactive article with enhanced features
 */
export interface InteractiveArticle {
	id: string;
	title: string;
	content: ContentBlock[];
	interactiveElements: InteractiveElement[];
	metadata: DocumentMetadata;
	structure: DocumentStructure;
	assets: MediaAsset[];
	relationships: ContentRelationship[];
}

/**
 * Interactive element within content
 */
export interface InteractiveElement {
	id: string;
	type: 'expandable' | 'quiz' | 'code-execution' | 'simulation' | 'chart';
	position: number; // Position within content
	config: Record<string, unknown>;
	metadata: {
		created: Date;
		modified: Date;
	};
}

export interface DocumentSection {
	id: string;
	title: string;
	level: number;
	content: ContentBlock[];
	subsections: DocumentSection[];
	startPage?: number;
	endPage?: number;
}

export interface TableOfContents {
	items: TocEntry[];
	entries?: TocEntry[]; // Alias for backward compatibility
}

export interface TocEntry {
	id: string;
	title: string;
	level: number;
	page?: number;
	children: TocEntry[];
}

export interface StructureMetadata {
	totalSections: number;
	maxDepth: number;
	hasImages: boolean;
	hasCode: boolean;
	hasTables: boolean;
}

export interface MediaAsset {
	id: string;
	type: 'image' | 'video' | 'audio' | 'document';
	url: string;
	filename: string;
	size: number;
	mimeType: string;
	metadata?: Record<string, any>;
}

export interface DocumentSource {
	type: SourceType;
	originalUrl?: string;
	uploadedAt?: Date;
	userId?: string;
    originalId?: string;
    importedAt?: Date;
}

/**
 * Knowledge node representing a hierarchical structure of learning content
 */
export interface KnowledgeNode {
	id: string;
	title: string;
	type: 'folder' | 'module' | 'lesson' | 'document' | 'article' | 'interactive-content';
	children?: KnowledgeNode[];
	parent?: string;
	content?: ContentBlock[];
	source?: DocumentSource;
	relationships?: NodeRelationship[];
	interactivity?: InteractivityLevel;
	structure?: DocumentStructure;
	assets?: MediaAsset[];
	progress?: {
		completed: boolean;
		score?: number;
		lastAccessed: Date;
	};
    metadata?: NodeMetadata;
}

/**
 * Relationship between knowledge nodes
 */
export interface NodeRelationship {
	id: string;
	targetId: string;
	type: string;
	strength: number;
	confidence: number;
}

/**
 * Level of interactivity for content
 */
export type InteractivityLevel = 'static' | 'basic' | 'advanced';

/**
 * Learning path containing ordered modules
 */
export interface LearningPath {
	id: string;
	name: string;
	description: string;
	modules: string[];
	estimatedDuration: number;
	difficulty: number;
	prerequisites: string[];
}
