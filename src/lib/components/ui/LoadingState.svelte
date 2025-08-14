<script lang="ts">
	import SkeletonLoader from './SkeletonLoader.svelte';
	import SkeletonCard from './SkeletonCard.svelte';
	import SkeletonTable from './SkeletonTable.svelte';
	import SkeletonTree from './SkeletonTree.svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import Card from './Card.svelte';

	interface Props {
		type?:
			| 'spinner'
			| 'skeleton'
			| 'card'
			| 'list'
			| 'dashboard'
			| 'table'
			| 'tree'
			| 'form'
			| 'media';
		size?: 'sm' | 'md' | 'lg';
		count?: number;
		message?: string;
		class?: string;
	}

	let {
		type = 'spinner',
		size = 'md',
		count = 3,
		message = 'Loading...',
		class: className = ''
	}: Props = $props();

	let containerClasses = $derived(['animate-fade-in', className].filter(Boolean).join(' '));
</script>

<div class={containerClasses}>
	{#if type === 'spinner'}
		<div class="flex flex-col items-center justify-center p-8 space-y-4">
			<LoadingSpinner {size} />
			{#if message}
				<p class="text-text-secondary text-sm">{message}</p>
			{/if}
		</div>
	{:else if type === 'skeleton'}
		<div class="space-y-4">
			{#each Array(count) as _, i (i)}
				<SkeletonLoader variant="text" lines={2} />
			{/each}
		</div>
	{:else if type === 'card'}
		<div class="space-y-4">
			{#each Array(count) as _, i (i)}
				<Card padding="lg">
					<div class="space-y-3">
						<SkeletonLoader variant="text" width="60%" height="1.5rem" />
						<SkeletonLoader variant="text" lines={2} />
						<div class="flex gap-2">
							<SkeletonLoader variant="rectangular" width="80px" height="32px" />
							<SkeletonLoader variant="rectangular" width="80px" height="32px" />
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{:else if type === 'list'}
		<div class="space-y-2">
			{#each Array(count) as _, i (i)}
				<div class="flex items-center gap-3 p-3 bg-surface rounded-lg">
					<SkeletonLoader variant="circular" width="40px" height="40px" />
					<div class="flex-1 space-y-2">
						<SkeletonLoader variant="text" width="70%" />
						<SkeletonLoader variant="text" width="40%" height="0.75rem" />
					</div>
				</div>
			{/each}
		</div>
	{:else if type === 'dashboard'}
		<div class="space-y-6">
			<!-- Header skeleton -->
			<div class="flex items-center justify-between">
				<SkeletonLoader variant="text" width="200px" height="2rem" />
				<SkeletonLoader variant="rectangular" width="120px" height="40px" />
			</div>

			<!-- Stats grid skeleton -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				{#each Array(4) as _, i (i)}
					<Card variant="elevated" padding="lg">
						<div class="text-center space-y-2">
							<SkeletonLoader variant="text" width="60px" height="2.5rem" />
							<SkeletonLoader variant="text" width="80%" height="1rem" />
						</div>
					</Card>
				{/each}
			</div>

			<!-- Content area skeleton -->
			<Card padding="lg">
				<div class="space-y-4">
					<SkeletonLoader variant="text" width="150px" height="1.5rem" />
					<SkeletonLoader variant="rectangular" height="200px" />
				</div>
			</Card>
		</div>
	{:else if type === 'table'}
		<SkeletonTable rows={count} columns={4} />
	{:else if type === 'tree'}
		<SkeletonTree levels={3} itemsPerLevel={count || 4} />
	{:else if type === 'form'}
		<div class="space-y-6 max-w-md">
			<!-- Form title -->
			<SkeletonLoader variant="text" width="60%" height="1.5rem" />

			<!-- Form fields -->
			{#each Array(count || 4) as _, i (i)}
				<div class="space-y-2">
					<SkeletonLoader variant="text" width="30%" height="1rem" />
					<SkeletonLoader variant="rectangular" height="2.5rem" />
				</div>
			{/each}

			<!-- Form actions -->
			<div class="flex gap-3 pt-4">
				<SkeletonLoader variant="rounded" width="100px" height="40px" />
				<SkeletonLoader variant="rounded" width="80px" height="40px" />
			</div>
		</div>
	{:else if type === 'media'}
		<div class="space-y-4">
			{#each Array(count) as _, i (i)}
				<SkeletonCard variant="media" lines={2} />
			{/each}
		</div>
	{/if}
</div>

<style>
	:global(.bg-surface) {
		background-color: var(--color-surface);
	}
	:global(.text-text-secondary) {
		color: var(--color-text-secondary);
	}

	/* Spacing utilities */
	:global(.space-y-2 > * + *) {
		margin-top: 0.5rem;
	}
	:global(.space-y-3 > * + *) {
		margin-top: 0.75rem;
	}
	:global(.space-y-4 > * + *) {
		margin-top: 1rem;
	}
	:global(.space-y-6 > * + *) {
		margin-top: 1.5rem;
	}

	/* Layout utilities */
	:global(.flex) {
		display: flex;
	}
	:global(.flex-col) {
		flex-direction: column;
	}
	:global(.flex-1) {
		flex: 1;
	}
	:global(.items-center) {
		align-items: center;
	}
	:global(.justify-center) {
		justify-content: center;
	}
	:global(.justify-between) {
		justify-content: space-between;
	}
	:global(.text-center) {
		text-align: center;
	}

	/* Grid utilities */
	:global(.grid) {
		display: grid;
	}
	:global(.grid-cols-1) {
		grid-template-columns: repeat(1, minmax(0, 1fr));
	}
	:global(.gap-2) {
		gap: 0.5rem;
	}
	:global(.gap-3) {
		gap: 0.75rem;
	}
	:global(.gap-6) {
		gap: 1.5rem;
	}

	/* Padding utilities */
	:global(.p-3) {
		padding: 0.75rem;
	}
	:global(.p-8) {
		padding: 2rem;
	}

	/* Border radius utilities */
	:global(.rounded-lg) {
		border-radius: var(--radius-lg);
	}

	/* Responsive utilities */
	@media (min-width: 640px) {
		:global(.sm\:grid-cols-2) {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (min-width: 1024px) {
		:global(.lg\:grid-cols-4) {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
