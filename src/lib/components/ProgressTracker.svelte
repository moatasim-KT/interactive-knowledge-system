<script lang="ts">
	import type { UserProgress } from '../types/user.js';
	import { progressStorage } from '../storage/userStorage.js';
	import { appState, actions } from '../stores/appState.svelte.js';
	import ProgressIndicator from './ProgressIndicator.svelte';

	interface Props {
		moduleId: string;
		userId: string;
		autoTrackTime?: boolean;
		showControls?: boolean;
		onProgressUpdate?: (progress: UserProgress) => void;
	}

	let { moduleId, userId, autoTrackTime = true, showControls = true, onProgressUpdate = () => {} }: Props = $props();

	let progress = $state<UserProgress | null>(null);
	let is_loading = $state(true);
	let error = $state<string | null>(null);
	let time_tracker = $state<{
		startTime: Date | null;
		intervalId: number | null;
		sessionTime: number;
	}>({
		startTime: null,
		intervalId: null,
		sessionTime: 0
	});

	// Load current progress
	const load_progress = async () => {
		try {
			is_loading = true;
			error = null;

			const current_progress = await progressStorage.getProgress(userId, moduleId);
			progress = current_progress || {
				userId,
				moduleId,
				status: 'not-started',
				timeSpent: 0,
				lastAccessed: new Date(),
				attempts: 0,
				bookmarked: false,
				notes: ''
			};

			// Update app state
			appState.progress.userProgress.set(moduleId, progress);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load progress';
			console.error('Error loading progress:', err);
		} finally {
			is_loading = false;
		}
	};

	// Start tracking time
	const start_time_tracking = () => {
		if (!autoTrackTime || time_tracker.startTime) return;

		time_tracker.startTime = new Date();
		time_tracker.intervalId = setInterval(() => {
			if (time_tracker.startTime) {
				time_tracker.sessionTime = Math.floor(
					(Date.now() - time_tracker.startTime.getTime()) / 1000 / 60
				);
			}
		}, 60000) as unknown as number; // Update every minute
	};

	// Stop tracking time and save
	const stop_time_tracking = async () => {
		if (!time_tracker.startTime || !progress) return;

		const session_minutes = Math.floor((Date.now() - time_tracker.startTime.getTime()) / 1000 / 60);

		if (time_tracker.intervalId) {
			clearInterval(time_tracker.intervalId);
			time_tracker.intervalId = null;
		}

		if (session_minutes > 0) {
			await progressStorage.addTimeSpent(userId, moduleId, session_minutes);
			progress.timeSpent += session_minutes;

			// Update app state
			appState.progress.userProgress.set(moduleId, progress);
			onProgressUpdate(progress);
		}

		time_tracker.startTime = null;
		time_tracker.sessionTime = 0;
	};

	// Start module
	const start_module = async () => {
		try {
			await progressStorage.startModule(userId, moduleId);
			await load_progress();

			if (autoTrackTime) {
				start_time_tracking();
			}

			// Update streak
			await progressStorage.updateLearningStreak(userId);


		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to start module';
			console.error('Error starting module:', err);
		}
	};

	// Complete module
	const complete_module = async (score?: number) => {
		try {
			await stop_time_tracking();
			await progressStorage.completeModule(userId, moduleId, score);
			await load_progress();

			// Update app state
			appState.progress.completedModules.add(moduleId);

			// Check for achievements
			const new_achievements = await progressStorage.checkAndAwardAchievements(userId);

			// Show achievement notifications
			for (const achievement of new_achievements) {
				actions.addNotification({
					type: 'success',
					message: `🎉 Achievement unlocked: ${achievement.title}!`
				});
			}


		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to complete module';
			console.error('Error completing module:', err);
		}
	};

	// Toggle bookmark
	const toggle_bookmark = async () => {
		try {
			const is_bookmarked = await progressStorage.toggleBookmark(userId, moduleId);
			if (progress) {
				progress.bookmarked = is_bookmarked;
				appState.progress.userProgress.set(moduleId, progress);
				onProgressUpdate(progress);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to toggle bookmark';
			console.error('Error toggling bookmark:', err);
		}
	};

	// Format time display
	const format_time = (minutes: number): string => {
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const remaining_minutes = minutes % 60;
		return remaining_minutes > 0 ? `${hours}h ${remaining_minutes}m` : `${hours}h`;
	};

	// Load progress on mount and start time tracking if needed
	$effect(() => {
		load_progress();

		// Start time tracking if module is already in progress
		if (autoTrackTime) {
			setTimeout(() => {
				if (progress?.status === 'in-progress') {
					start_time_tracking();
				}
			}, 100);
		}

		// Cleanup on destroy
		return () => {
			stop_time_tracking();
		};
	});
</script>

<div class="progress-tracker bg-white border border-gray-200 rounded-lg p-4">
	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
			<div class="flex">
				<svg class="w-4 h-4 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<div class="ml-2">
					<p class="text-sm text-red-700">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	{#if is_loading}
		<div class="flex items-center justify-center py-4">
			<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
			<span class="ml-2 text-sm text-gray-600">Loading progress...</span>
		</div>
	{:else if progress}
		<div class="flex items-center justify-between mb-4">
			<div class="flex items-center space-x-3">
				<ProgressIndicator {progress} size="medium" />
				<div>
					<p class="text-sm font-medium text-gray-900">
						{progress.status === 'completed'
							? 'Completed'
							: progress.status === 'in-progress'
								? 'In Progress'
								: 'Not Started'}
					</p>
					{#if progress.score !== undefined}
						<p class="text-xs text-gray-600">Score: {progress.score}%</p>
					{/if}
				</div>
			</div>

			<div class="flex items-center space-x-2">
				<!-- Bookmark button -->
				<button
					onclick={toggle_bookmark}
					class="p-1 rounded-md hover:bg-gray-100 transition-colors"
					title={progress.bookmarked ? 'Remove bookmark' : 'Add bookmark'}
					aria-label={progress.bookmarked ? 'Remove bookmark' : 'Add bookmark'}
					aria-pressed={progress.bookmarked}
					type="button"
				>
					<svg
						class="w-4 h-4 {progress.bookmarked ? 'text-yellow-500 fill-current' : 'text-gray-400'}"
						fill={progress.bookmarked ? 'currentColor' : 'none'}
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
						/>
					</svg>
				</button>
			</div>
		</div>

		<!-- Progress details -->
		<div class="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
			<div>
				<span class="font-medium">Time spent:</span>
				<span class="ml-1">
					{format_time(progress.timeSpent)}
					{#if time_tracker.sessionTime > 0}
						<span class="text-blue-600">(+{time_tracker.sessionTime}m this session)</span>
					{/if}
				</span>
			</div>
			<div>
				<span class="font-medium">Attempts:</span>
				<span class="ml-1">{progress.attempts}</span>
			</div>
		</div>

		{#if showControls}
			<div class="flex space-x-2">
				{#if progress.status === 'not-started'}
					<button
						onclick={start_module}
						class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
					>
						Start Learning
					</button>
				{:else if progress.status === 'in-progress'}
					<button
						onclick={() => complete_module()}
						class="flex-1 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
					>
						Mark Complete
					</button>
				{:else}
					<div
						class="flex-1 bg-green-100 text-green-800 px-4 py-2 rounded-md text-sm font-medium text-center"
					>
						✓ Completed
						{#if progress.completedAt}
							<div class="text-xs text-green-600 mt-1">
								{progress.completedAt.toLocaleDateString()}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Last accessed info -->
		{#if progress.lastAccessed}
			<div class="mt-3 pt-3 border-t border-gray-100">
				<p class="text-xs text-gray-500">
					Last accessed: {progress.lastAccessed.toLocaleDateString()} at {progress.lastAccessed.toLocaleTimeString()}
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.progress-tracker {
		min-width: 280px;
	}
</style>
