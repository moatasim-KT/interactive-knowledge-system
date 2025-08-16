/**
 * Progress persistence service for automatic saving and loading
 */
import { progressStorage } from '../storage/userStorage.js';
import { appState, actions } from './appState.svelte.js';
import type { UserProgress } from '$lib/types/unified';

class ProgressPersistenceService {
	private saveQueue = new Set<string>();
	private saveTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly SAVE_DELAY = 2000; // 2 seconds debounce

	/**
	 * Initialize the persistence service
	 */
	async initialize(userId: string) {
		if (!userId) {return;}

		try {
			// Load all user progress from storage
			const userProgress = await progressStorage.getUserProgress(userId);
			const progressMap = new Map<string, UserProgress>();

			for (const progress of userProgress) {
				progressMap.set(progress.moduleId, progress);
			}

			// Update app state
			actions.loadUserProgress(progressMap);

			console.log(`Loaded ${userProgress.length} progress records for user ${userId}`);
		} catch (error) {
			console.error('Failed to load user progress:', error);
		}
	}

	/**
	 * Queue a module for saving (with debouncing)
	 */
	queueSave(moduleId: string) {
		this.saveQueue.add(moduleId);

		// Clear existing timer
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
		}

		// Set new timer
		this.saveTimer = setTimeout(() => {
			this.flushSaveQueue();
		}, this.SAVE_DELAY);
	}

	/**
	 * Immediately save all queued progress
	 */
	async flushSaveQueue() {
		if (this.saveQueue.size === 0) {return;}

		const modulesToSave = Array.from(this.saveQueue);
		this.saveQueue.clear();

		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}

		try {
			const savePromises = modulesToSave.map(async (moduleId) => {
				const progress = appState.progress.userProgress.get(moduleId);
				if (progress) {
					await progressStorage.updateProgress(progress);
				}
			});

			await Promise.all(savePromises);
			console.log(`Saved progress for ${modulesToSave.length} modules`);
		} catch (error) {
			console.error('Failed to save progress:', error);
			// Re-queue failed saves
			modulesToSave.forEach((moduleId) => this.saveQueue.add(moduleId));
		}
	}

	/**
	 * Save progress for a specific module immediately
	 */
	async saveProgress(moduleId: string, progress: UserProgress) {
		try {
			await progressStorage.updateProgress(progress);
			appState.progress.userProgress.set(moduleId, progress);

			// Update completed modules set if needed
			if (progress.status === 'completed') {
				appState.progress.completedModules.add(moduleId);
			}

			console.log(`Saved progress for module ${moduleId}`);
		} catch (error) {
			console.error(`Failed to save progress for module ${moduleId}:`, error);
			throw error;
		}
	}

	/**
	 * Load progress for a specific module
	 */
	async loadProgress(userId: string, moduleId: string): Promise<UserProgress | null> {
		try {
			const progress = await progressStorage.getProgress(userId, moduleId);

			if (progress) {
				appState.progress.userProgress.set(moduleId, progress);

				if (progress.status === 'completed') {
					appState.progress.completedModules.add(moduleId);
				}
			}

			return progress || null;
		} catch (error) {
			console.error(`Failed to load progress for module ${moduleId}:`, error);
			return null;
		}
	}

	/**
	 * Sync progress with storage (useful for manual refresh)
	 */
	async syncProgress(userId: string) {
		try {
			await this.flushSaveQueue(); // Save any pending changes first
			await this.initialize(userId); // Reload from storage
		} catch (error) {
			console.error('Failed to sync progress:', error);
			throw error;
		}
	}

	/**
	 * Get progress statistics
	 */
	async getStats(userId: string) {
		try {
			return await progressStorage.getProgressStats(userId);
		} catch (error) {
			console.error('Failed to get progress stats:', error);
			throw error;
		}
	}

	/**
	 * Clean up resources
	 */
	destroy() {
		if (this.saveTimer) {
			clearTimeout(this.saveTimer);
			this.saveTimer = null;
		}
		this.saveQueue.clear();
	}
}

// Create singleton instance
export const progressPersistence = new ProgressPersistenceService();

// Auto-save functionality (only in browser environment)
if (typeof window !== 'undefined') {
	let previousProgressMap = new Map<string, UserProgress>();

	// Auto-save effect - watches for changes in progress and queues saves
	$effect(() => {
		const currentProgressMap = appState.progress.userProgress;

		// Check for changes and queue saves
		for (const [moduleId, progress] of currentProgressMap) {
			const previous = previousProgressMap.get(moduleId);

			// If progress changed, queue for saving
			if (
				!previous ||
				previous.status !== progress.status ||
				previous.score !== progress.score ||
				previous.timeSpent !== progress.timeSpent ||
				previous.bookmarked !== progress.bookmarked ||
				previous.notes !== progress.notes
			) {
				progressPersistence.queueSave(moduleId);
			}
		}

		// Update previous state
		previousProgressMap = new Map(currentProgressMap);
	});

	// Auto-initialize when user changes
	$effect(() => {
		const userId = appState.user.id;
		if (userId) {
			progressPersistence.initialize(userId);
		}
	});

	// Cleanup on page unload
	window.addEventListener('beforeunload', () => {
		progressPersistence.flushSaveQueue();
	});

	// Also save periodically
	setInterval(() => {
		progressPersistence.flushSaveQueue();
	}, 30000); // Every 30 seconds
}
