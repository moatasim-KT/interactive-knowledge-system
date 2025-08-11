<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ProgressDashboard,
		ProgressTracker,
		ProgressIndicator,
		ScoreTracker
	} from '$lib/components/index.js';
	import { progressStorage } from '$lib/storage/userStorage.js';
	import { appState, actions } from '$lib/stores/appState.svelte.js';
	import type { UserProgress } from '$lib/types/user.js';

	// Demo user and modules
	const demo_user_id = 'demo-user-123';
	const demo_modules = [
		{ id: 'intro-to-svelte', title: 'Introduction to Svelte', difficulty: 2 },
		{ id: 'svelte-components', title: 'Svelte Components', difficulty: 3 },
		{ id: 'state-management', title: 'State Management', difficulty: 4 },
		{ id: 'advanced-patterns', title: 'Advanced Patterns', difficulty: 5 }
	];

	let selected_module = $state(demo_modules[0]);
	let is_loading = $state(true);
	let error = $state<string | null>(null);

	// Initialize demo data
	const initialize_demo_data = async () => {
		try {
			is_loading = true;
			error = null;

			// Set demo user
			appState.user.id = demo_user_id;

			// Create some sample progress data
			const sample_progress = [
				{
					userId: demo_user_id,
					moduleId: 'intro-to-svelte',
					status: 'completed',
					score: 92,
					timeSpent: 45,
					lastAccessed: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
					attempts: 1,
					bookmarked: true,
					notes: 'Great introduction!',
					completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
				},
				{
					userId: demo_user_id,
					moduleId: 'svelte-components',
					status: 'in-progress',
					timeSpent: 25,
					lastAccessed: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
					attempts: 1,
					bookmarked: false,
					notes: '',
					startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
				}
			];

			// Save sample data to storage
			for (const progress of sample_progress) {
				await progressStorage.updateProgress(progress);
			}

			// Update app state
			const progress_map = new Map<string, UserProgress>();
			for (const progress of sample_progress) {
				progress_map.set(progress.moduleId, progress);
			}
			actions.loadUserProgress(progress_map);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to initialize demo data';
			console.error('Demo initialization error:', err);
		} finally {
			is_loading = false;
		}
	};

	// Handle progress updates
	const handle_progress_update = (progress: UserProgress) => {
		console.log('Progress updated:', progress);
		// The progress tracker will handle updating the app state
	};

	// Reset demo data
	const reset_demo_data = async () => {
		try {
			// Clear all progress for demo user
			await progressStorage.deleteUserProgress(demo_user_id);

			// Clear app state
			appState.progress.userProgress.clear();
			appState.progress.completedModules.clear();

			// Reinitialize
			await initialize_demo_data();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to reset demo data';
		}
	};

	onMount(() => {
		initialize_demo_data();
	});
</script>

<svelte:head>
	<title>Progress Tracking Demo - Interactive Knowledge System</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-4">Progress Tracking System Demo</h1>
			<p class="text-lg text-gray-600 max-w-2xl mx-auto">
				Explore the comprehensive progress tracking features including dashboards, progress
				indicators, score tracking, and achievement systems.
			</p>
			<div class="mt-4">
				<button
					onclick={resetDemoData}
					class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
				>
					Reset Demo Data
				</button>
			</div>
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
						<h3 class="text-sm font-medium text-red-800">Demo Error</h3>
						<p class="text-sm text-red-700 mt-1">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		{#if isLoading}
			<div class="flex items-center justify-center py-12">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<span class="ml-3 text-gray-600">Loading demo data...</span>
			</div>
		{:else}
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Left Column: Progress Dashboard -->
				<div class="lg:col-span-2">
					<div class="bg-white rounded-lg shadow-sm p-6 mb-8">
						<h2 class="text-xl font-semibold text-gray-900 mb-4">Progress Dashboard</h2>
						<ProgressDashboard userId={demoUserId} />
					</div>

					<!-- Module Selection -->
					<div class="bg-white rounded-lg shadow-sm p-6">
						<h2 class="text-xl font-semibold text-gray-900 mb-4">Module Progress Tracking</h2>

						<!-- Module Selector -->
						<div class="mb-6">
							<label class="block text-sm font-medium text-gray-700 mb-2"> Select Module: </label>
							<select
								bind:value={selectedModule}
								class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
							>
								{#each demoModules as module}
									<option value={module}>{module.title} (Difficulty: {module.difficulty})</option>
								{/each}
							</select>
						</div>

						<!-- Progress Tracker for Selected Module -->
						<div class="border border-gray-200 rounded-lg p-4">
							<h3 class="text-lg font-medium text-gray-900 mb-4">{selected_module.title}</h3>
							<ProgressTracker
								moduleId={selected_module.id}
								userId={demoUserId}
								onProgressUpdate={handleProgressUpdate}
							/>
						</div>
					</div>
				</div>

				<!-- Right Column: Components Showcase -->
				<div class="space-y-6">
					<!-- Progress Indicators -->
					<div class="bg-white rounded-lg shadow-sm p-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Progress Indicators</h3>
						<div class="space-y-4">
							{#each demoModules as module}
								{@const progress = appState.progress.userProgress.get(module.id)}
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-gray-900">{module.title}</p>
										<p class="text-xs text-gray-500">Difficulty: {module.difficulty}/5</p>
									</div>
									<div class="flex items-center space-x-2">
										<ProgressIndicator {progress} variant="circular" size="small" />
										<ProgressIndicator {progress} variant="badge" />
									</div>
								</div>
							{/each}
						</div>
					</div>

					<!-- Score Tracker Demo -->
					<div class="bg-white rounded-lg shadow-sm p-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Score Tracker</h3>
						<ScoreTracker
							moduleId={selected_module.id}
							userId={demoUserId}
							maxScore={100}
							passingScore={70}
						/>
					</div>

					<!-- Linear Progress Examples -->
					<div class="bg-white rounded-lg shadow-sm p-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Linear Progress</h3>
						<div class="space-y-4">
							{#each demoModules as module}
								{@const progress = appState.progress.userProgress.get(module.id)}
								<div>
									<p class="text-sm font-medium text-gray-900 mb-2">{module.title}</p>
									<ProgressIndicator {progress} variant="linear" showDetails={true} />
								</div>
							{/each}
						</div>
					</div>

					<!-- Quick Stats -->
					<div class="bg-white rounded-lg shadow-sm p-6">
						<h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
						<div class="space-y-3">
							<div class="flex justify-between">
								<span class="text-sm text-gray-600">Total Modules:</span>
								<span class="text-sm font-medium text-gray-900">{demo_modules.length}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-600">Completed:</span>
								<span class="text-sm font-medium text-green-600"
									>{appState.progress.completedModules.size}</span
								>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-600">In Progress:</span>
								<span class="text-sm font-medium text-blue-600">
									{Array.from(appState.progress.userProgress.values()).filter(
										(p) => p.status === 'in-progress'
									).length}
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-sm text-gray-600">Total Time:</span>
								<span class="text-sm font-medium text-gray-900">
									{Math.floor(appState.progress.totalTimeSpent / 60)}h {appState.progress
										.totalTimeSpent % 60}m
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	/* Custom styles for demo page */
	:global(body) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
</style>
