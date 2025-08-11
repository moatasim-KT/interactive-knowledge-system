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
