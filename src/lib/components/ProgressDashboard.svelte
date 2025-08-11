<script lang="ts">
	import { onMount } from 'svelte';
	import type { ProgressStats, Achievement, LearningStreak } from '../types/user.js';
	import { progressStorage } from '../storage/userStorage.js';
	import { appState } from '../stores/appState.svelte.js';
	import ProgressIndicator from './ProgressIndicator.svelte';

	interface Props {
		userId: string;
	}

	let { userId }: Props = $props();

	let stats = $state<ProgressStats | null>(null);
	let achievements = $state<Achievement[]>([]);
	let streak = $state<LearningStreak | null>(null);
	let is_loading = $state(true);
	let error = $state<string | null>(null);

	// Load progress data
	const load_progress_data = async () => {
		try {
			is_loading = true;
			error = null;

			const [progress_stats, user_achievements, learning_streak] = await Promise.all([
				progressStorage.getProgressStats(userId),
				progressStorage.getUserAchievements(userId),
				progressStorage.getLearningStreak(userId)
			]);

			stats = progress_stats;
			achievements = user_achievements.sort((a, b) => b.earnedAt.getTime() - a.earnedAt.getTime());
			streak = learning_streak;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load progress data';
			console.error('Error loading progress data:', err);
		} finally {
			is_loading = false;
		}
	};

	// Format time duration
	const format_duration = (minutes: number): string => {
		if (minutes < 60) return `${minutes} min`;
		const hours = Math.floor(minutes / 60);
		const remaining_minutes = minutes % 60;
		if (hours < 24) {
			return remaining_minutes > 0 ? `${hours}h ${remaining_minutes}m` : `${hours}h`;
		}
		const days = Math.floor(hours / 24);
		const remaining_hours = hours % 24;
		return remaining_hours > 0 ? `${days}d ${remaining_hours}h` : `${days}d`;
	};

	// Get achievement icon
	const get_achievement_icon = (type: Achievement['type']): string => {
		switch (type) {
			case 'completion':
				return '🎯';
			case 'streak':
				return '🔥';
			case 'score':
				return '⭐';
			case 'time':
				return '⏰';
			case 'milestone':
				return '🏆';
			default:
				return '🎉';
		}
	};

	onMount(() => {
		load_progress_data();
	});
</script>

<div class="progress-dashboard p-6 bg-white rounded-lg shadow-sm">
	<div class="flex items-center justify-between mb-6">
		<h2 class="text-2xl font-bold text-gray-900">Learning Progress</h2>
		<button
			onclick={loadProgressData}
			class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
			disabled={isLoading}
		>
			{is_loading ? 'Loading...' : 'Refresh'}
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
			<div class="flex">
				<svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800">Error loading progress</h3>
					<p class="text-sm text-red-700 mt-1">{error}</p>
				</div>
			</div>
		</div>
	{/if}

	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
			<span class="ml-3 text-gray-600">Loading progress data...</span>
		</div>
	{:else if stats}
		<!-- Overview Stats -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<!-- Completion Rate -->
			<div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-blue-600">Completion Rate</p>
						<p class="text-2xl font-bold text-blue-900">{stats.completionRate.toFixed(1)}%</p>
						<p class="text-xs text-blue-700">
							{stats.completedModules} of {stats.totalModules} modules
						</p>
					</div>
					<div class="flex-shrink-0">
						<ProgressIndicator
							progress={{
								userId,
								moduleId: 'overview',
								status:
									stats.completionRate === 100
										? 'completed'
										: stats.completionRate > 0
											? 'in-progress'
											: 'not-started',
								timeSpent: 0,
								lastAccessed: new Date(),
								attempts: 0,
								bookmarked: false,
								notes: ''
							}}
							size="large"
						/>
					</div>
				</div>
			</div>

			<!-- Average Score -->
			<div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-green-600">Average Score</p>
						<p class="text-2xl font-bold text-green-900">{stats.averageScore.toFixed(1)}%</p>
						<p class="text-xs text-green-700">Across completed modules</p>
					</div>
					<div class="text-3xl">⭐</div>
				</div>
			</div>

			<!-- Learning Streak -->
			<div class="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-orange-600">Current Streak</p>
						<p class="text-2xl font-bold text-orange-900">{stats.currentStreak} days</p>
						<p class="text-xs text-orange-700">Longest: {stats.longestStreak} days</p>
					</div>
					<div class="text-3xl">🔥</div>
				</div>
			</div>

			<!-- Time Spent -->
			<div class="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-purple-600">Time Spent</p>
						<p class="text-2xl font-bold text-purple-900">{format_duration(stats.totalTimeSpent)}</p>
						<p class="text-xs text-purple-700">Total learning time</p>
					</div>
					<div class="text-3xl">⏰</div>
				</div>
			</div>
		</div>

		<!-- Progress Breakdown -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Module Status Breakdown -->
			<div class="bg-gray-50 p-6 rounded-lg">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Module Status</h3>
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<div class="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
							<span class="text-sm font-medium text-gray-700">Completed</span>
						</div>
						<span class="text-sm font-bold text-gray-900">{stats.completedModules}</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<div class="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
							<span class="text-sm font-medium text-gray-700">In Progress</span>
						</div>
						<span class="text-sm font-bold text-gray-900">{stats.inProgressModules}</span>
					</div>
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<div class="w-4 h-4 bg-gray-400 rounded-full mr-3"></div>
							<span class="text-sm font-medium text-gray-700">Not Started</span>
						</div>
						<span class="text-sm font-bold text-gray-900"
							>{stats.totalModules - stats.completedModules - stats.inProgressModules}</span
						>
					</div>
				</div>
			</div>

			<!-- Recent Achievements -->
			<div class="bg-gray-50 p-6 rounded-lg">
				<h3 class="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
				{#if achievements.length > 0}
					<div class="space-y-3">
						{#each achievements.slice(0, 5) as achievement}
							<div class="flex items-center p-3 bg-white rounded-md shadow-sm">
								<div class="text-2xl mr-3">{get_achievement_icon(achievement.type)}</div>
								<div class="flex-1">
									<p class="text-sm font-medium text-gray-900">{achievement.title}</p>
									<p class="text-xs text-gray-600">{achievement.description}</p>
									<p class="text-xs text-gray-500 mt-1">
										{achievement.earnedAt.toLocaleDateString()}
									</p>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-8">
						<div class="text-4xl mb-2">🏆</div>
						<p class="text-sm text-gray-600">No achievements yet</p>
						<p class="text-xs text-gray-500">Complete modules to earn your first achievement!</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Last Activity -->
		{#if stats.lastActivityDate}
			<div class="mt-6 text-center">
				<p class="text-sm text-gray-600">
					Last activity: {stats.lastActivityDate.toLocaleDateString()} at {stats.lastActivityDate.toLocaleTimeString()}
				</p>
			</div>
		{/if}
	{/if}
</div>

<style>
	.progress-dashboard {
		min-height: 400px;
	}
</style>
