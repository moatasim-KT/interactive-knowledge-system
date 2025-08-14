<script lang="ts">
	import type { UserProgress } from '../types/user.js';

	interface Props {
		progress?: UserProgress;
		showDetails?: boolean;
		size?: 'small' | 'medium' | 'large';
		variant?: 'circular' | 'linear' | 'badge';
	}

	let { progress, showDetails = false, size = 'medium', variant = 'circular' }: Props = $props();

	// Calculate progress percentage
	const progress_percentage = $derived(() => {
		if (!progress) return 0;

		switch (progress.status) {
			case 'completed':
				return 100;
			case 'in-progress':
				return 50; // Could be enhanced with more granular tracking
			case 'not-started':
			default:
				return 0;
		}
	});

	// Get status color
	const status_color = $derived(() => {
		if (!progress) return 'gray';

		switch (progress.status) {
			case 'completed':
				return 'green';
			case 'in-progress':
				return 'blue';
			case 'not-started':
			default:
				return 'gray';
		}
	});

	// Format time spent
	const format_time = (minutes: number): string => {
		if (minutes < 60) return `${minutes}m`;
		const hours = Math.floor(minutes / 60);
		const remaining_minutes = minutes % 60;
		return remaining_minutes > 0 ? `${hours}h ${remaining_minutes}m` : `${hours}h`;
	};

	// Get size classes
	const size_classes = $derived(() => {
		switch (size) {
			case 'small':
				return 'w-6 h-6 text-xs';
			case 'large':
				return 'w-16 h-16 text-lg';
			case 'medium':
			default:
				return 'w-10 h-10 text-sm';
		}
	});
</script>

{#if variant === 'circular'}
	<div class="relative inline-flex items-center justify-center {size_classes()}">
		<!-- Background circle -->
		<svg class="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
			<path
				class="stroke-gray-200"
				stroke-width="3"
				fill="none"
				d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
			/>
			<!-- Progress circle -->
			<path
				class="stroke-{status_color()}-500 transition-all duration-300"
				stroke-width="3"
				fill="none"
				stroke-dasharray="{progress_percentage()}, 100"
				d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
			/>
		</svg>

		<!-- Status icon or percentage -->
		<div class="relative z-10 flex items-center justify-center">
			{#if progress?.status === 'completed'}
				<svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else if progress?.status === 'in-progress'}
				<svg class="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			{:else}
				<div class="w-2 h-2 bg-gray-400 rounded-full"></div>
			{/if}
		</div>
	</div>
{:else if variant === 'linear'}
	<div class="w-full">
		<div class="flex justify-between items-center mb-1">
			<span class="text-sm font-medium text-gray-700">
				{progress?.status === 'completed'
					? 'Completed'
					: progress?.status === 'in-progress'
						? 'In Progress'
						: 'Not Started'}
			</span>
			{#if progress?.score !== undefined}
				<span class="text-sm text-gray-500">{progress.score}%</span>
			{/if}
		</div>
		<div class="w-full bg-gray-200 rounded-full h-2">
			<div
				class="bg-{status_color()}-500 h-2 rounded-full transition-all duration-300"
				style="width: {progress_percentage()}%"
			></div>
		</div>
	</div>
{:else if variant === 'badge'}
	<span
		class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-{status_color()}-100 text-{status_color()}-800"
	>
		{#if progress?.status === 'completed'}
			✓ Completed
		{:else if progress?.status === 'in-progress'}
			⏳ In Progress
		{:else}
			○ Not Started
		{/if}
		{#if progress?.score !== undefined}
			({progress.score}%)
		{/if}
	</span>
{/if}

{#if showDetails && progress}
	<div class="mt-2 text-xs text-gray-600 space-y-1">
		{#if progress.timeSpent > 0}
			<div>Time spent: {format_time(progress.timeSpent)}</div>
		{/if}
		{#if progress.attempts > 0}
			<div>Attempts: {progress.attempts}</div>
		{/if}
		{#if progress.lastAccessed}
			<div>Last accessed: {progress.lastAccessed.toLocaleDateString()}</div>
		{/if}
	</div>
{/if}

<style>
	/* Custom stroke colors for dynamic classes */
	:global(.stroke-green-500) {
		stroke: var(--color-success-500);
	}
	:global(.stroke-blue-500) {
		stroke: var(--color-primary-500);
	}
	:global(.stroke-gray-500) {
		stroke: var(--color-gray-500);
	}

	:global(.bg-green-500) {
		background-color: var(--color-success-500);
	}
	:global(.bg-blue-500) {
		background-color: var(--color-primary-500);
	}
	:global(.bg-gray-500) {
		background-color: var(--color-gray-500);
	}

	:global(.bg-green-100) {
		background-color: var(--color-success-100);
	}
	:global(.bg-blue-100) {
		background-color: var(--color-primary-100);
	}
	:global(.bg-gray-100) {
		background-color: var(--color-gray-100);
	}

	:global(.text-green-800) {
		color: var(--color-success-800);
	}
	:global(.text-blue-800) {
		color: var(--color-primary-800);
	}
	:global(.text-gray-800) {
		color: var(--color-gray-800);
	}

	/* Responsive sizing */
	@media (max-width: 640px) {
		.w-6 {
			width: 1rem;
			height: 1rem;
		}
		.w-10 {
			width: 2rem;
			height: 2rem;
		}
		.w-16 {
			width: 3rem;
			height: 3rem;
		}
	}
</style>
