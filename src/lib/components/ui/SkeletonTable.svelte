<script lang="ts">
	import SkeletonLoader from './SkeletonLoader.svelte';

	interface Props {
		rows?: number;
		columns?: number;
		showHeader?: boolean;
		class?: string;
	}

	let { rows = 5, columns = 4, showHeader = true, class: className = '' }: Props = $props();
</script>

<div class={`animate-pulse ${className}`}>
	<div class="overflow-hidden bg-surface rounded-lg border border-border">
		{#if showHeader}
			<div class="bg-surface-secondary px-6 py-3 border-b border-border">
				<div class="grid gap-4" style="grid-template-columns: repeat({columns}, minmax(0, 1fr));">
					{#each Array(columns) as _, i (i)}
						<SkeletonLoader variant="text" width="80%" height="1rem" />
					{/each}
				</div>
			</div>
		{/if}

		<div class="divide-y divide-border">
			{#each Array(rows) as _, rowIndex (rowIndex)}
				<div class="px-6 py-4">
					<div class="grid gap-4" style="grid-template-columns: repeat({columns}, minmax(0, 1fr));">
						{#each Array(columns) as _, colIndex (colIndex)}
							{#if colIndex === 0}
								<div class="flex items-center gap-3">
									<SkeletonLoader variant="circular" width="32px" height="32px" />
									<SkeletonLoader variant="text" width="70%" height="1rem" />
								</div>
							{:else if colIndex === columns - 1}
								<div class="flex justify-end">
									<SkeletonLoader variant="rounded" width="60px" height="24px" />
								</div>
							{:else}
								<SkeletonLoader
									variant="text"
									width={Math.random() > 0.5 ? '60%' : '80%'}
									height="1rem"
								/>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	:global(.bg-surface) {
		background-color: var(--color-surface);
	}
	:global(.bg-surface-secondary) {
		background-color: var(--color-surface-secondary);
	}
	:global(.border-border) {
		border-color: var(--color-border);
	}
	:global(.divide-border > * + *) {
		border-top: 1px solid var(--color-border);
	}

	.overflow-hidden {
		overflow: hidden;
	}
	.rounded-lg {
		border-radius: var(--radius-lg);
	}
	.border {
		border-width: 1px;
	}
	.border-b {
		border-bottom-width: 1px;
	}
	.divide-y > * + * {
		border-top-width: 1px;
	}

	.grid {
		display: grid;
	}
	.flex {
		display: flex;
	}
	.items-center {
		align-items: center;
	}
	.justify-end {
		justify-content: flex-end;
	}
	.gap-3 {
		gap: 0.75rem;
	}
	.gap-4 {
		gap: 1rem;
	}

	.px-6 {
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}
	.py-3 {
		padding-top: 0.75rem;
		padding-bottom: 0.75rem;
	}
	.py-4 {
		padding-top: 1rem;
		padding-bottom: 1rem;
	}
</style>
