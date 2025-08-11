/**
 * User progress tracking for individual modules
 */
export interface UserProgress {
	userId: string;
	moduleId: string;
	status: 'not-started' | 'in-progress' | 'completed';
	score?: number;
	timeSpent: number;
	lastAccessed: Date;
	attempts: number;
	bookmarked: boolean;
	notes: string;
	startedAt?: Date;
	completedAt?: Date;
}

/**
 * Progress statistics for analytics and dashboard
 */
export interface ProgressStats {
	totalModules: number;
	completedModules: number;
	inProgressModules: number;
	completionRate: number;
	averageScore: number;
	totalTimeSpent: number;
	currentStreak: number;
	longestStreak: number;
	lastActivityDate: Date;
}

/**
 * Learning streak tracking
 */
export interface LearningStreak {
	userId: string;
	currentStreak: number;
	longestStreak: number;
	lastActivityDate: Date;
	streakStartDate: Date;
}

/**
 * Achievement/milestone tracking
 */
export interface Achievement {
	id: string;
	userId: string;
	type: 'completion' | 'streak' | 'score' | 'time' | 'milestone';
	title: string;
	description: string;
	earnedAt: Date;
	metadata?: Record<string, any>;
}

/**
 * User preferences and settings
 */
export interface UserSettings {
	id: string;
	preferences: {
		theme: 'light' | 'dark' | 'auto';
		learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
		difficulty: 1 | 2 | 3 | 4 | 5;
		language: string;
		notifications: boolean;
		autoSave: boolean;
	};
	profile: {
		name: string;
		email?: string;
		avatar?: string;
		joinDate: Date;
	};
}
