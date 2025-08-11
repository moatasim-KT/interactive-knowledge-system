<script lang="ts">
	import { onMount } from 'svelte';
	import type { UserProgress } from '../types/user.js';
	import { progressStorage } from '../storage/userStorage.js';

	interface Props {
		moduleId: string;
		userId: string;
		maxScore?: number;
		passingScore?: number;
		showGrade?: boolean;
		onScoreUpdate?: (score: number, passed: boolean) => void;
	}

	let {
		moduleId,
		userId,
		maxScore = 100,
		passingScore = 70,
		showGrade = true,
		onScoreUpdate
	}: Props = $props();

	let current_score = $state(0);
	let attempts = $state(0);
	let best_score = $state(0);
	let progress = $state<UserProgress | null>(null);
	let is_loading = $state(true);

	// Calculate grade based on score
	const get_grade = (score: number): { letter: string; color: string } => {
		if (score >= 90) return { letter: 'A', color: 'text-green-600' };
		if (score >= 80) return { letter: 'B', color: 'text-blue-600' };
		if (score >= 70) return { letter: 'C', color: 'text-yellow-600' };
		if (score >= 60) return { letter: 'D', color: 'text-orange-600' };
		return { letter: 'F', color: 'text-red-600' };
	};

	// Check if score is passing
	const is_passing = $derived(() => current_score >= passingScore);

	// Get score color based on performance
	const get_score_color = (score: number): string => {
		if (score >= 90) return 'text-green-600';
		if (score >= passingScore) return 'text-blue-600';
		if (score >= 50) return 'text-yellow-600';
		return 'text-red-600';
	};

	// Load current progress and scores
	const load_progress = async () => {
		try {
			is_loading = true;
			const user_progress = await progressStorage.getProgress(userId, moduleId);

			if (user_progress) {
				progress = user_progress;
				current_score = user_progress.score || 0;
				best_score = user_progress.score || 0;
				attempts = user_progress.attempts;
			}
		} catch (err) {
			console.error('Error loading progress:', err);
		} finally {
			is_loading = false;
		}
	};

	// Update score
	const update_score = async (new_score) => {
		try {
			current_score = Math.max(0, Math.min(maxScore, new_score));

			// Update best score if this is better
			if (current_score > best_score) {
				best_score = current_score;
			}

			// Update progress in storage
			const existing_progress = await progressStorage.getProgress(userId, moduleId);
			const updated_progress = {
				userId,
				moduleId,
				status: current_score >= passingScore ? 'completed' : 'in-progress',
				score: best_score,
				timeSpent: existing_progress?.timeSpent || 0,
				lastAccessed: new Date(),
				attempts: attempts + 1,
				bookmarked: existing_progress?.bookmarked || false,
				notes: existing_progress?.notes || '',
				completedAt: current_score >= passingScore ? new Date() : existing_progress?.completedAt
			};

			await progressStorage.updateProgress(updated_progress);
			progress = updated_progress;
			attempts = updated_progress.attempts;

			// Trigger callback
			onScoreUpdate?.(current_score, is_passing);

			// If passing, complete the module
			if (is_passing) {
				await progressStorage.completeModule(userId, moduleId, best_score);
			}
		} catch (err) {
			console.error('Error updating score:', err);
		}
	};

	// Add points to current score
	const add_points = (points: number) => {
		update_score(current_score + points);
	};

	// Subtract points from current score
	const subtract_points = (points: number) => {
		update_score(current_score - points);
	};

	// Reset score for new attempt
	const reset_score = () => {
		current_score = 0;
		update_score(0);
	};

	// Set specific score
	const set_score = (score: number) => {
		update_score(score);
	};

	// Calculate percentage
	const get_percentage = (score: number): number => {
		return Math.round((score / maxScore) * 100);
	};

	onMount(() => {
		load_progress();
	});

	// Expose methods for parent components
	export { addPoints, subtractPoints, resetScore, setScore, updateScore };
</script>

<div class="score-tracker bg-white border border-gray-200 rounded-lg p-4">
	{#if isLoading}
		<div class="flex items-center justify-center py-4">
			<div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
			<span class="ml-2 text-sm text-gray-600">Loading scores...</span>
		</div>
	{:else}
		<!-- Current Score Display -->
		<div class="text-center mb-4">
			<div class="flex items-center justify-center space-x-4">
				<div class="text-center">
					<div class="text-3xl font-bold {get_score_color(current_score)}">
						{currentScore}
					</div>
					<div class="text-sm text-gray-600">Current</div>
				</div>

				<div class="text-gray-400">/</div>

				<div class="text-center">
					<div class="text-3xl font-bold text-gray-700">
						{maxScore}
					</div>
					<div class="text-sm text-gray-600">Max</div>
				</div>

				{#if showGrade}
					<div class="text-center ml-4">
						<div class="text-3xl font-bold {get_grade(get_percentage(current_score)).color}">
							{get_grade(get_percentage(current_score)).letter}
						</div>
						<div class="text-sm text-gray-600">Grade</div>
					</div>
				{/if}
			</div>

			<!-- Percentage and Status -->
			<div class="mt-2">
				<div class="text-lg font-semibold {get_score_color(current_score)}">
					{get_percentage(current_score)}%
				</div>
				<div class="text-sm {is_passing ? 'text-green-600' : 'text-red-600'}">
					{is_passing ? '✓ Passing' : '✗ Below passing score'}
				</div>
			</div>
		</div>

		<!-- Progress Bar -->
		<div class="mb-4">
			<div class="flex justify-between text-xs text-gray-600 mb-1">
				<span>Progress</span>
				<span>{get_percentage(current_score)}%</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2">
				<div
					class="h-2 rounded-full transition-all duration-300 {is_passing
						? 'bg-green-500'
						: 'bg-blue-500'}"
					style="width: {Math.min(100, get_percentage(current_score))}%"
				></div>
			</div>
			<!-- Passing score indicator -->
			{#if passingScore > 0 && passingScore < maxScore}
				<div
					class="relative -mt-2 h-4 flex items-center"
					style="margin-left: {(passingScore / maxScore) * 100}%"
				>
					<div class="w-0.5 h-4 bg-yellow-500"></div>
					<div class="absolute -top-1 left-1 text-xs text-yellow-600 whitespace-nowrap">
						Passing: {passingScore}
					</div>
				</div>
			{/if}
		</div>

		<!-- Score Statistics -->
		<div class="grid grid-cols-3 gap-4 text-center text-sm">
			<div class="bg-gray-50 p-2 rounded">
				<div class="font-semibold text-gray-900">{bestScore}</div>
				<div class="text-gray-600">Best Score</div>
			</div>
			<div class="bg-gray-50 p-2 rounded">
				<div class="font-semibold text-gray-900">{attempts}</div>
				<div class="text-gray-600">Attempts</div>
			</div>
			<div class="bg-gray-50 p-2 rounded">
				<div class="font-semibold text-gray-900">{get_percentage(best_score)}%</div>
				<div class="text-gray-600">Best %</div>
			</div>
		</div>

		<!-- Achievement Indicators -->
		{#if best_score === maxScore}
			<div class="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
				<div class="flex items-center">
					<div class="text-yellow-500 text-lg mr-2">🏆</div>
					<div class="text-sm">
						<div class="font-medium text-yellow-800">Perfect Score!</div>
						<div class="text-yellow-700">You achieved the maximum score possible.</div>
					</div>
				</div>
			</div>
		{:else if is_passing && attempts === 1}
			<div class="mt-4 bg-green-50 border border-green-200 rounded-md p-3">
				<div class="flex items-center">
					<div class="text-green-500 text-lg mr-2">⭐</div>
					<div class="text-sm">
						<div class="font-medium text-green-800">First Try Success!</div>
						<div class="text-green-700">You passed on your first attempt.</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Quick Actions (for development/testing) -->
		{#if import.meta.env.DEV}
			<div class="mt-4 pt-4 border-t border-gray-200">
				<div class="text-xs text-gray-500 mb-2">Development Controls:</div>
				<div class="flex space-x-2">
					<button
						onclick={() => add_points(10)}
						class="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
					>
						+10
					</button>
					<button
						onclick={() => subtract_points(10)}
						class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
					>
						-10
					</button>
					<button
						onclick={resetScore}
						class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
					>
						Reset
					</button>
					<button
						onclick={() => set_score(maxScore)}
						class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
					>
						Max
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.score-tracker {
		min-width: 300px;
	}
</style>
