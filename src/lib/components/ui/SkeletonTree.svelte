<script lang="ts">
	import SkeletonLoader from './SkeletonLoader.svelte';

	interface Props {
		levels?: number;
		itemsPerLevel?: number;
		class?: string;
	}

	let { levels = 3, itemsPerLevel = 4, class: className = '' }: Props = $props();

	function generate_tree_structure(current_level, max_levels): any[] {
		if (current_level >= max_levels) return [];

		const items = [];
		const item_count = Math.max(1, itemsPerLevel - current_level);

		for (let i = 0; i < item_count; i++) {
			items.push({
				id: `${current_level}-${i}`,
				hasChildren: current_level < max_levels - 1 && Math.random() > 0.3,
				children:
					current_level < max_levels - 1 ? generate_tree_structure(current_level + 1, max_levels) : []
			});
		}

		return items;
	}

	const treeData = generate_tree_structure(0, levels);
</script>

<div class={`animate-pulse space-y-1 ${className}`}>
	{#each treeData as item, index (item.id)}
		<div class="tree-item" style="padding-left: 0;">
			<div class="flex items-center gap-2 py-2 px-3 rounded-md">
				<!-- Expand/collapse icon -->
				<div class="w-4 h-4 flex items-center justify-center">
					{#if item.hasChildren}
						<SkeletonLoader variant="rectangular" width="12px" height="12px" />
					{/if}
				</div>

				<!-- Icon -->
				<SkeletonLoader variant="rectangular" width="16px" height="16px" />

				<!-- Title -->
				<SkeletonLoader
					variant="text"
					width={`${Math.floor(Math.random() * 40) + 40}%`}
					height="1rem"
				/>

				<!-- Status indicator -->
				{#if Math.random() > 0.7}
					<div class="ml-auto">
						<SkeletonLoader variant="circular" width="8px" height="8px" />
					</div>
				{/if}
			</div>

			<!-- Children -->
			{#if item.hasChildren && item.children.length > 0}
				<div class="ml-6 space-y-1">
					{#each item.children as child (child.id)}
						<div class="flex items-center gap-2 py-1.5 px-3 rounded-md">
							<div class="w-4 h-4 flex items-center justify-center">
								{#if child.hasChildren}
									<SkeletonLoader variant="rectangular" width="10px" height="10px" />
								{/if}
							</div>
							<SkeletonLoader variant="rectangular" width="14px" height="14px" />
							<SkeletonLoader
								variant="text"
								width={`${Math.floor(Math.random() * 50) + 30}%`}
								height="0.875rem"
							/>
							{#if Math.random() > 0.8}
								<div class="ml-auto">
									<SkeletonLoader variant="circular" width="6px" height="6px" />
								</div>
							{/if}
						</div>

						<!-- Grandchildren -->
						{#if child.hasChildren && child.children.length > 0}
							<div class="ml-6 space-y-1">
								{#each child.children.slice(0, 2) as grandchild (grandchild.id)}
									<div class="flex items-center gap-2 py-1 px-3 rounded-md">
										<div class="w-4 h-4"></div>
										<SkeletonLoader variant="rectangular" width="12px" height="12px" />
										<SkeletonLoader
											variant="text"
											width={`${Math.floor(Math.random() * 60) + 25}%`}
											height="0.75rem"
										/>
									</div>
								{/each}
							</div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.space-y-1 > * + * {
		margin-top: 0.25rem;
	}

	.flex {
		display: flex;
	}
	.items-center {
		align-items: center;
	}
	.justify-center {
		justify-content: center;
	}
	.gap-2 {
		gap: 0.5rem;
	}

	.w-4 {
		width: 1rem;
	}
	.h-4 {
		height: 1rem;
	}

	.py-1 {
		padding-top: 0.25rem;
		padding-bottom: 0.25rem;
	}
	.py-1\.5 {
		padding-top: 0.375rem;
		padding-bottom: 0.375rem;
	}
	.py-2 {
		padding-top: 0.5rem;
		padding-bottom: 0.5rem;
	}
	.px-3 {
		padding-left: 0.75rem;
		padding-right: 0.75rem;
	}

	.ml-6 {
		margin-left: 1.5rem;
	}
	.ml-auto {
		margin-left: auto;
	}

	.rounded-md {
		border-radius: var(--radius-md);
	}
</style>
