/**
 * User-specific storage operations for progress and settings
 */
import { storage } from './indexeddb.js';
import type {
	UserProgress,
	UserSettings,
	ProgressStats,
	LearningStreak,
	Achievement
} from '$lib/types/unified';

/**
 * User progress storage operations
 */
export class ProgressStorage {
	/**
	 * Create or update user progress for a module
	 */
	async updateProgress(progress: UserProgress): Promise<void> {
		const updated_progress = {
			...progress,
			lastAccessed: new Date()
		};

		await storage.put('progress', updated_progress);
	}

	/**
	 * Get user progress for a specific module
	 */
	async getProgress(userId: string, moduleId: string): Promise<UserProgress | undefined> {
		return await storage.get('progress', [userId, moduleId]);
	}

	/**
	 * Get all progress records for a user
	 */
	async getUserProgress(userId: string): Promise<UserProgress[]> {
		return await storage.searchByIndex('progress', 'userId', userId);
	}

	/**
	 * Get progress for a specific module across all users
	 */
	async getModuleProgress(moduleId: string): Promise<UserProgress[]> {
		return await storage.searchByIndex('progress', 'moduleId', moduleId);
	}

	/**
	 * Get completed modules for a user
	 */
	async getCompletedModules(userId: string): Promise<UserProgress[]> {
		const user_progress = await this.getUserProgress(userId);
		return user_progress.filter((progress) => progress.status === 'completed');
	}

	/**
	 * Get in-progress modules for a user
	 */
	async getInProgressModules(userId: string): Promise<UserProgress[]> {
		const user_progress = await this.getUserProgress(userId);
		return user_progress.filter((progress) => progress.status === 'in-progress');
	}

	/**
	 * Get bookmarked modules for a user
	 */
	async getBookmarkedModules(userId: string): Promise<UserProgress[]> {
		const user_progress = await this.getUserProgress(userId);
		return user_progress.filter((progress) => progress.bookmarked);
	}

	/**
	 * Mark a module as completed
	 */
	async completeModule(userId: string, moduleId: string, score?: number): Promise<void> {
		const existing_progress = await this.getProgress(userId, moduleId);

		const progress: UserProgress = {
			userId,
			moduleId,
			status: 'completed',
			score,
			timeSpent: existing_progress?.timeSpent || 0,
			lastAccessed: new Date(),
			attempts: (existing_progress?.attempts || 0) + 1,
			bookmarked: existing_progress?.bookmarked || false,
			notes: existing_progress?.notes || ''
		};

		await this.updateProgress(progress);
	}

	/**
	 * Start a module (mark as in-progress)
	 */
	async startModule(userId: string, moduleId: string): Promise<void> {
		const existing_progress = await this.getProgress(userId, moduleId);

		const progress: UserProgress = {
			userId,
			moduleId,
			status: 'in-progress',
			timeSpent: existing_progress?.timeSpent || 0,
			lastAccessed: new Date(),
			attempts: existing_progress?.attempts || 0,
			bookmarked: existing_progress?.bookmarked || false,
			notes: existing_progress?.notes || ''
		};

		await this.updateProgress(progress);
	}

	/**
	 * Add time spent on a module
	 */
	async addTimeSpent(userId: string, moduleId: string, timeSpent: number): Promise<void> {
		const existing_progress = await this.getProgress(userId, moduleId);

		if (existing_progress) {
			existing_progress.timeSpent += timeSpent;
			await this.updateProgress(existing_progress);
		}
	}

	/**
	 * Toggle bookmark status for a module
	 */
	async toggleBookmark(userId: string, moduleId: string): Promise<boolean> {
		const existing_progress = await this.getProgress(userId, moduleId);

		const progress: UserProgress = existing_progress || {
			userId,
			moduleId,
			status: 'not-started',
			timeSpent: 0,
			lastAccessed: new Date(),
			attempts: 0,
			bookmarked: false,
			notes: ''
		};

		progress.bookmarked = !progress.bookmarked;
		await this.updateProgress(progress);

		return progress.bookmarked;
	}

	/**
	 * Update notes for a module
	 */
	async updateNotes(userId: string, moduleId: string, notes: string): Promise<void> {
		const existing_progress = await this.getProgress(userId, moduleId);

		const progress: UserProgress = existing_progress || {
			userId,
			moduleId,
			status: 'not-started',
			timeSpent: 0,
			lastAccessed: new Date(),
			attempts: 0,
			bookmarked: false,
			notes: ''
		};

		progress.notes = notes;
		await this.updateProgress(progress);
	}

	/**
	 * Get recently accessed modules for a user
	 */
	async getRecentlyAccessed(userId: string, limit: number = 10): Promise<UserProgress[]> {
		const user_progress = await this.getUserProgress(userId);
		return user_progress
			.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
			.slice(0, limit);
	}

	/**
	 * Delete progress record
	 */
	async deleteProgress(userId: string, moduleId: string): Promise<void> {
		await storage.delete('progress', [userId, moduleId]);
	}

	/**
	 * Delete all progress for a user
	 */
	async deleteUserProgress(userId: string): Promise<void> {
		const user_progress = await this.getUserProgress(userId);

		for (const progress of user_progress) {
			await storage.delete('progress', [progress.userId, progress.moduleId]);
		}
	}

	/**
	 * Get comprehensive progress statistics for a user
	 */
	async getProgressStats(userId: string): Promise<ProgressStats> {
		const user_progress = await this.getUserProgress(userId);
		const completed_progress = user_progress.filter((p) => p.status === 'completed');
		const in_progress_progress = user_progress.filter((p) => p.status === 'in-progress');

		const total_time_spent = user_progress.reduce((sum, p) => sum + p.timeSpent, 0);
		const average_score =
			completed_progress.length > 0
				? completed_progress.reduce((sum, p) => sum + (p.score || 0), 0) / completed_progress.length
				: 0;

		const completion_rate =
			user_progress.length > 0 ? (completed_progress.length / user_progress.length) * 100 : 0;

		// Calculate current streak
		const streak = await this.getLearningStreak(userId);

		// Find last activity date
		const last_activity_date =
			user_progress.length > 0
				? new Date(Math.max(...user_progress.map((p) => p.lastAccessed.getTime())))
				: new Date();

		return {
			totalModules: user_progress.length,
			completedModules: completed_progress.length,
			inProgressModules: in_progress_progress.length,
			completionRate: completion_rate,
			averageScore: average_score,
			totalTimeSpent: total_time_spent,
			currentStreak: streak.currentStreak,
			longestStreak: streak.longestStreak,
			lastActivityDate: last_activity_date
		} as any;
	}

	/**
	 * Get or create learning streak for a user
	 */
	async getLearningStreak(userId: string): Promise<LearningStreak> {
		let streak = await storage.get('streaks', userId);

		if (!streak) {
			streak = {
				id: `streak-${userId}-${Date.now()}`,
				userId,
				startDate: new Date(),
				endDate: undefined,
				duration: 0,
				isActive: true,
				currentStreak: 0,
				longestStreak: 0,
				lastActivityDate: new Date(),
				streakStartDate: new Date(),
				milestones: [],
			};
			await storage.add('streaks', streak);
		}

		return streak;
	}

	/**
	 * Update learning streak when user completes activity
	 */
	async updateLearningStreak(userId: string): Promise<LearningStreak> {
		const streak = await this.getLearningStreak(userId);
		const today = new Date();
		const last_activity = new Date(streak.lastActivityDate);

		// Check if it's a new day
		const is_new_day = today.toDateString() !== last_activity.toDateString();
		const days_difference = Math.floor(
			(today.getTime() - last_activity.getTime()) / (1000 * 60 * 60 * 24)
		);

		if (is_new_day) {
			if (days_difference === 1) {
				// Consecutive day - increment streak
				streak.currentStreak += 1;
				if (streak.currentStreak > streak.longestStreak) {
					streak.longestStreak = streak.currentStreak;
				}
			} else if (days_difference > 1) {
				// Streak broken - reset
				streak.currentStreak = 1;
				streak.streakStartDate = today;
			}
			// If daysDifference === 0, it's the same day, no change needed
		}

		streak.lastActivityDate = today;
		await storage.put('streaks', streak);

		return streak;
	}

	/**
	 * Get user achievements
	 */
	async getUserAchievements(userId: string): Promise<Achievement[]> {
		return await storage.searchByIndex('achievements', 'userId', userId);
	}

	/**
	 * Award achievement to user
	 */
	async awardAchievement(achievement: Achievement): Promise<void> {
		await storage.add('achievements', achievement);
	}

	/**
	 * Check and award automatic achievements based on progress
	 */
	async checkAndAwardAchievements(userId: string): Promise<Achievement[]> {
		const stats = await this.getProgressStats(userId);
		const existing_achievements = await this.getUserAchievements(userId);
		const new_achievements = [];

		// First completion achievement
		if (
			stats.completedModules >= 1 &&
			!existing_achievements.some((a) => a.type === 'completion' && a.id === 'first-completion')
		) {
			const achievement: Achievement = {
				id: 'first-completion',
				userId,
				type: 'completion',
				title: 'First Steps',
				description: 'Completed your first module!',
				earnedAt: new Date(),
				metadata: { modulesCompleted: stats.completedModules },
				icon: '',
				unlockedAt: undefined,
				rarity: 'common'
			};
			await this.awardAchievement(achievement);
			new_achievements.push(achievement);
		}

		// Streak achievements
		if (
			stats.currentStreak >= 7 &&
			!existing_achievements.some((a) => a.type === 'streak' && a.id === 'week-streak')
		) {
			const achievement: Achievement = {
				id: 'week-streak',
				userId,
				type: 'streak',
				title: 'Week Warrior',
				description: 'Maintained a 7-day learning streak!',
				earnedAt: new Date(),
				metadata: { streakLength: stats.currentStreak },
				icon: '',
				unlockedAt: undefined,
				rarity: 'common'
			};
			await this.awardAchievement(achievement);
			new_achievements.push(achievement);
		}

		// High score achievement
		if (
			stats.averageScore >= 90 &&
			stats.completedModules >= 5 &&
			!existing_achievements.some((a) => a.type === 'score' && a.id === 'high-achiever')
		) {
			const achievement: Achievement = {
				id: 'high-achiever',
				userId,
				type: 'score',
				title: 'High Achiever',
				description: 'Maintained 90%+ average score across 5+ modules!',
				earnedAt: new Date(),
				metadata: { averageScore: stats.averageScore, modulesCompleted: stats.completedModules },
				icon: '',
				unlockedAt: undefined,
				rarity: 'common'
			};
			await this.awardAchievement(achievement);
			new_achievements.push(achievement);
		}

		return new_achievements;
	}
}

/**
 * User settings storage operations
 */
export class SettingsStorage {
	/**
	 * Create or update user settings
	 */
	async updateSettings(settings: UserSettings, changeDescription?: string): Promise<void> {
		await storage.put('settings', settings, changeDescription || 'Settings updated');
	}

	/**
	 * Get user settings
	 */
	async getSettings(userId: string): Promise<UserSettings | undefined> {
		return await storage.get('settings', userId);
	}

	/**
	 * Get all user settings
	 */
	async getAllSettings(): Promise<UserSettings[]> {
		return await storage.getAll('settings');
	}

	/**
	 * Create default settings for a new user
	 */
	async createDefaultSettings(userId: string, name: string, email?: string): Promise<UserSettings> {
		const default_settings: UserSettings = {
			id: userId,
			preferences: {
				theme: 'light',
				learningStyle: 'visual',
				difficulty: 'intermediate',
				language: 'en',
				notifications: true,
				autoSave: true,
				autoSync: false,
				defaultView: 'grid',
				showProgress: false,
				showDifficulty: false,
				estimatedTime: false
			},
			profile: {
				name,
				email,
				joinDate: new Date()
			},
			theme: 'light',
			language: '',
			notifications: false,
			accessibility: {
				highContrast: false,
				fontSize: 0,
				reducedMotion: false
			}
		};

		await storage.add('settings', default_settings, 'Initial settings creation');
		return default_settings;
	}

	/**
	 * Update user preferences
	 */
	async updatePreferences(
		userId: string,
		preferences: Partial<UserSettings['preferences']>
	): Promise<void> {
		const existing_settings = await this.getSettings(userId);

		if (!existing_settings) {
			throw new Error(`Settings not found for user ${userId}`);
		}

		const updated_settings = {
			...existing_settings,
			preferences: {
				...existing_settings.preferences,
				...preferences
			}
		};

		await this.updateSettings(updated_settings, 'Preferences updated');
	}

	/**
	 * Update user profile
	 */
	async updateProfile(userId: string, profile: Partial<UserSettings['profile']>): Promise<void> {
		const existing_settings = await this.getSettings(userId);

		if (!existing_settings) {
			throw new Error(`Settings not found for user ${userId}`);
		}

		const updated_settings = {
			...existing_settings,
			profile: {
				...existing_settings.profile,
				...profile
			}
		};

		await this.updateSettings(updated_settings, 'Profile updated');
	}

	/**
	 * Delete user settings
	 */
	async deleteSettings(userId: string): Promise<void> {
		await storage.delete('settings', userId);
	}

	/**
	 * Get settings version history
	 */
	async getSettingsHistory(userId: string) {
		return await storage.getVersionHistory(userId, 'settings');
	}
}

// Export singleton instances
export const progressStorage = new ProgressStorage();
export const settingsStorage = new SettingsStorage();
