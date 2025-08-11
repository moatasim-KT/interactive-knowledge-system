<script lang="ts">
	import SkeletonLoader from './SkeletonLoader.svelte';
	import Card from './Card.svelte';

	interface Props {
		variant?: 'default' | 'compact' | 'detailed' | 'media';
		showImage?: boolean;
		showActions?: boolean;
		lines?: number;
		class?: string;
	}

	let {
		variant = 'default',
		showImage = false,
		showActions = false,
		lines = 2,
		class: className = ''
	}: Props = $props();
</script>

<Card variant="default" padding="lg" class={`animate-pulse ${className}`}>
	{#if variant === 'media' || showImage}
		<div class="mb-4">
			<SkeletonLoader variant="rectangular" height="12rem" />
		</div>
	{/if}

	{#if variant === 'compact'}
		<div class="flex items-center gap-3">
			<SkeletonLoader variant="circular" width="40px" height="40px" />
			<div class="flex-1 space-y-2">
				<SkeletonLoader variant="text" width="70%" height="1rem" />
				<SkeletonLoader variant="text" width="50%" height="0.75rem" />
			</div>
		</div>
	{:else if variant === 'detailed'}
		<div class="space-y-4">
			<!-- Header -->
			<div class="flex items-start justify-between">
				<div class="flex-1 space-y-2">
					<SkeletonLoader variant="text" width="80%" height="1.5rem" />
					<SkeletonLoader variant="text" width="60%" height="1rem" />
				</div>
				<SkeletonLoader variant="circular" width="32px" height="32px" />
			</div>

			<!-- Content -->
			<div class="space-y-2">
				{#each Array(lines) as _, i (i)}
					<SkeletonLoader variant="text" width={i === lines - 1 ? '75%' : '100%'} height="1rem" />
				{/each}
			</div>

			<!-- Tags -->
			<div class="flex gap-2">
				{#each Array(3) as _, i (i)}
					<SkeletonLoader variant="rounded" width="60px" height="24px" />
				{/each}
			</div>
		</div>
	{:else}
		<!-- Default variant -->
		<div class="space-y-3">
			<SkeletonLoader variant="text" width="75%" height="1.25rem" />
			<div class="space-y-2">
				{#each Array(lines) as _, i (i)}
					<SkeletonLoader variant="text" width={i === lines - 1 ? '60%' : '100%'} height="1rem" />
				{/each}
			</div>
		</div>
	{/if}

	{#if showActions || variant === 'detailed'}
		<div class="flex gap-2 mt-4 pt-4 border-t border-border">
			<SkeletonLoader variant="rounded" width="80px" height="32px" />
			<SkeletonLoader variant="rounded" width="80px" height="32px" />
		</div>
	{/if}
</Card>

<style>
	:global(.border-border) {
		border-color: var(--color-border);
	}

	.space-y-2 > * + * {
		margin-top: 0.5rem;
	}
	.space-y-3 > * + * {
		margin-top: 0.75rem;
	}
	.space-y-4 > * + * {
		margin-top: 1rem;
	}

	.flex {
		display: flex;
	}
	.flex-1 {
		flex: 1 1 0%;
	}
	.items-center {
		align-items: center;
	}
	.items-start {
		align-items: flex-start;
	}
	.justify-between {
		justify-content: space-between;
	}
	.gap-2 {
		gap: 0.5rem;
	}
	.gap-3 {
		gap: 0.75rem;
	}

	.mb-4 {
		margin-bottom: 1rem;
	}
	.mt-4 {
		margin-top: 1rem;
	}
	.pt-4 {
		padding-top: 1rem;
	}

	.border-t {
		border-top-width: 1px;
	}
</style>
