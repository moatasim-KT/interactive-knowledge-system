/**
 * Quiz question types and interfaces
 */
export interface Question {
	id: string;
	type: 'multiple-choice' | 'true-false' | 'fill-blank' | 'drag-drop';
	question: string;
	options?: string[];
	correctAnswer: any;
	explanation?: string;
}

/**
 * Quiz state management
 */
export interface QuizState {
	questions: Question[];
	currentQuestion: number;
	answers: Map<string, any>;
	score: number;
	completed: boolean;
}

/**
 * Flashcard for spaced repetition learning
 */
export interface Flashcard {
	id: string;
	front: string;
	back: string;
	difficulty: number;
	nextReview: Date;
	reviewCount: number;
}

/**
 * Search functionality interfaces
 */
export interface SearchIndex {
	content: Map<string, string[]>; // content_id -> tokenized words
	tags: Map<string, string[]>; // tag -> content_ids
	links: Map<string, string[]>; // content_id -> linked_content_ids
}

export interface SearchResult {
	id: string;
	title: string;
	snippet: string;
	relevance: number;
	type: string;
	tags: string[];
}
