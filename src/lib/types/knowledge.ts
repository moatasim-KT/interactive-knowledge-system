/**
 * Knowledge node representing a hierarchical structure of learning content
 */
export interface KnowledgeNode {
	id: string;
	title: string;
	type: 'folder' | 'module' | 'lesson';
	children?: KnowledgeNode[];
	parent?: string;
	metadata: {
		difficulty: 1 | 2 | 3 | 4 | 5;
		estimatedTime: number;
		prerequisites: string[];
		tags: string[];
	};
	progress?: {
		completed: boolean;
		score?: number;
		lastAccessed: Date;
	};
}

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
