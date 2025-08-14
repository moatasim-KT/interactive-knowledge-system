<script lang="ts">
	interface BreadcrumbItem {
		label: string;
		href?: string;
		current?: boolean;
	}

	interface Props {
		items: BreadcrumbItem[];
		separator?: string;
		maxItems?: number;
		class?: string;
	}

	let { items, separator = '/', maxItems = 5, class: className = '' }: Props = $props();

	let display_items = $derived(
		items.length > maxItems
			? [items[0], { label: '...', href: undefined }, ...items.slice(-maxItems + 2)]
			: items
	);

	let containerClasses = $derived(
		['flex items-center space-x-2 text-sm', className].filter(Boolean).join(' ')
	);
</script>

<nav class={containerClasses} aria-label="Breadcrumb">
	<ol class="flex items-center space-x-2">
		{#each display_items as item, index (index)}
			<li class="flex items-center">
				{#if index > 0}
					<span class="text-text-muted mx-2" aria-hidden="true">
						{separator}
					</span>
				{/if}

				{#if item.href && !item.current}
					<a
						href={item.href}
						class="text-primary-600 hover:text-primary-800 transition-colors focus-ring rounded px-1 py-0.5"
					>
						{item.label}
					</a>
				{:else if item.label === '...'}
					<span class="text-text-muted">...</span>
				{:else}
					<span
						class="text-text-primary font-medium"
						class:text-text-muted={!item.current}
						aria-current={item.current ? 'page' : undefined}
					>
						{item.label}
					</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	:global(.text-text-primary) {
		color: var(--color-text-primary);
	}
	:global(.text-text-muted) {
		color: var(--color-text-muted);
	}
	:global(.text-primary-600) {
		color: var(--color-primary-600);
	}
	:global(.hover\:text-primary-800:hover) {
		color: var(--color-primary-800);
	}

	/* Layout utilities */
	:global(.flex) {
		display: flex;
	}
	:global(.items-center) {
		align-items: center;
	}
	:global(.space-x-2 > * + *) {
		margin-left: 0.5rem;
	}

	/* Text utilities */
	:global(.text-sm) {
		font-size: 0.875rem;
	}
	:global(.font-medium) {
		font-weight: 500;
	}

	/* Padding utilities */
	:global(.px-1) {
		padding-left: 0.25rem;
		padding-right: 0.25rem;
	}
	:global(.py-0\.5) {
		padding-top: 0.125rem;
		padding-bottom: 0.125rem;
	}
	:global(.mx-2) {
		margin-left: 0.5rem;
		margin-right: 0.5rem;
	}
</style>
