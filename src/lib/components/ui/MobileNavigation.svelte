<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface NavItem {
		id: string;
		label: string;
		icon?: string;
		href?: string;
		active?: boolean;
		badge?: string | number;
	}

	interface Props {
		items: NavItem[];
		position?: 'top' | 'bottom';
		variant?: 'tabs' | 'pills';
		class?: string;
		onnavigate?: (event: CustomEvent<{ item: NavItem }>) => void;
	}

	let {
		items,
		position = 'bottom',
		variant = 'tabs',
		class: className = ''
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		navigate: { item: NavItem };
	}>();

	function handleNavigation(item: NavItem) {
		dispatch('navigate', { item });
	}

	const containerClasses = $derived(() =>
		[
			'mobile-navigation',
			`mobile-navigation--${position}`,
			`mobile-navigation--${variant}`,
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<nav class={containerClasses} aria-label="Mobile navigation">
	<div class="mobile-navigation__container">
		{#each items as item (item.id)}
			<button
				class="mobile-navigation__item"
				class:mobile-navigation__item--active={item.active}
				onclick={() => handleNavigation(item)}
				aria-label={item.label}
				type="button"
			>
				{#if item.icon}
					<span class="mobile-navigation__icon" aria-hidden="true">
						{item.icon}
					</span>
				{/if}
				
				<span class="mobile-navigation__label">
					{item.label}
				</span>

				{#if item.badge}
					<span class="mobile-navigation__badge" aria-label="Badge: {item.badge}">
						{item.badge}
					</span>
				{/if}
			</button>
		{/each}
	</div>
</nav>

<style>
	.mobile-navigation {
		display: none;
		position: fixed;
		left: 0;
		right: 0;
		z-index: var(--z-fixed, 1030);
		background: var(--color-surface);
		border-color: var(--color-border);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}

	.mobile-navigation--bottom {
		bottom: 0;
		border-top: 1px solid var(--color-border);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.mobile-navigation--top {
		top: 0;
		border-bottom: 1px solid var(--color-border);
		padding-top: env(safe-area-inset-top);
	}

	.mobile-navigation__container {
		display: flex;
		justify-content: space-around;
		align-items: center;
		padding: 0.5rem 0;
		max-width: 100%;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	.mobile-navigation__item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		background: none;
		border: none;
		color: var(--color-text-secondary);
		text-decoration: none;
		transition: all 0.2s ease;
		border-radius: 0.5rem;
		position: relative;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
	}

	.mobile-navigation__item:hover,
	.mobile-navigation__item:focus {
		color: var(--color-text-primary);
		background: var(--color-surface-secondary);
		outline: none;
	}

	.mobile-navigation__item--active {
		color: var(--color-primary-600);
		background: var(--color-primary-50);
	}

	.mobile-navigation--pills .mobile-navigation__item {
		border-radius: 1rem;
		margin: 0 0.25rem;
	}

	.mobile-navigation__icon {
		font-size: 1.25rem;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.mobile-navigation__label {
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 4rem;
	}

	.mobile-navigation__badge {
		position: absolute;
		top: 0.25rem;
		right: 0.25rem;
		background: var(--color-error-500);
		color: white;
		font-size: 0.625rem;
		font-weight: 600;
		line-height: 1;
		padding: 0.125rem 0.375rem;
		border-radius: 0.75rem;
		min-width: 1rem;
		text-align: center;
	}

	/* Show on mobile devices */
	@media (max-width: 768px) {
		.mobile-navigation {
			display: block;
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: high) {
		.mobile-navigation {
			border-width: 2px;
		}

		.mobile-navigation__item {
			border: 1px solid transparent;
		}

		.mobile-navigation__item--active {
			border-color: var(--color-primary-600);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.mobile-navigation__item {
			transition: none;
		}
	}
</style>