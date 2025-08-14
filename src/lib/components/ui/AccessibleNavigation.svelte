<script lang="ts">
	import { createKeyboardNavigationHandler, generateId, KEYBOARD_KEYS } from '$lib/utils/accessibility.js';
	import { onMount } from 'svelte';

	interface NavigationItem {
		id: string;
		label: string;
		href?: string;
		onclick?: () => void;
		children?: NavigationItem[];
		disabled?: boolean;
		current?: boolean;
	}

	interface Props {
		items: NavigationItem[];
		orientation?: 'horizontal' | 'vertical';
		label?: string;
		class?: string;
		id?: string;
	}

	let {
		items,
		orientation = 'horizontal',
		label = 'Main navigation',
		class: className = '',
		id = generateId('nav')
	}: Props = $props();

	let nav_element: HTMLElement;
	let nav_items: HTMLElement[] = [];
	let current_index = $state(0);
	let expanded_items = $state(new Set<string>());

	const navigation_classes = $derived(() =>
		[
			'navigation',
			`navigation--${orientation}`,
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	function handle_item_click(item: NavigationItem, event: MouseEvent) {
		if (item.disabled) {
			event.preventDefault();
			return;
		}

		if (item.onclick) {
			event.preventDefault();
			item.onclick();
		}

		// Handle submenu toggle
		if (item.children) {
			event.preventDefault();
			toggle_submenu(item.id);
		}
	}

	function handle_item_keydown(item: NavigationItem, event: KeyboardEvent) {
		const { key } = event;

		switch (key) {
			case KEYBOARD_KEYS.ENTER:
			case KEYBOARD_KEYS.SPACE:
				event.preventDefault();
				if (item.children) {
					toggle_submenu(item.id);
				} else if (item.onclick) {
					item.onclick();
				} else if (item.href) {
					window.location.href = item.href;
				}
				break;

			case KEYBOARD_KEYS.ARROW_RIGHT:
				if (orientation === 'horizontal' && item.children && !expanded_items.has(item.id)) {
					event.preventDefault();
					toggle_submenu(item.id);
				}
				break;

			case KEYBOARD_KEYS.ARROW_LEFT:
				if (orientation === 'horizontal' && item.children && expanded_items.has(item.id)) {
					event.preventDefault();
					toggle_submenu(item.id);
				}
				break;

			case KEYBOARD_KEYS.ARROW_DOWN:
				if (item.children && !expanded_items.has(item.id)) {
					event.preventDefault();
					toggle_submenu(item.id);
				}
				break;

			case KEYBOARD_KEYS.ESCAPE:
				if (item.children && expanded_items.has(item.id)) {
					event.preventDefault();
					toggle_submenu(item.id);
				}
				break;
		}
	}

	function toggle_submenu(item_id: string) {
		if (expanded_items.has(item_id)) {
			expanded_items.delete(item_id);
		} else {
			expanded_items.add(item_id);
		}
		expanded_items = new Set(expanded_items);
	}

	function is_expanded(item_id: string): boolean {
		return expanded_items.has(item_id);
	}

	onMount(() => {
		if (nav_element) {
			const items = nav_element.querySelectorAll('[role="menuitem"], a[href]') as NodeListOf<HTMLElement>;
			nav_items = Array.from(items);

			const keyboard_handler = createKeyboardNavigationHandler(nav_items, {
				orientation,
				wrap: true,
				activateOnFocus: false
			});

			nav_element.addEventListener('keydown', keyboard_handler);

			return () => {
				nav_element.removeEventListener('keydown', keyboard_handler);
			};
		}
	});
</script>

<nav
	bind:this={nav_element}
	{id}
	class={navigation_classes}
	aria-label={label}
>
	<ul class="navigation__list" role="none">
		{#each items as item, index (item.id)}
			<li class="navigation__item" role="none">
				{#if item.href && !item.children}
					<a
						href={item.href}
						class="navigation__link"
						class:navigation__link--current={item.current}
						class:navigation__link--disabled={item.disabled}
						role="menuitem"
						tabindex={index === 0 ? 0 : -1}
						aria-current={item.current ? 'page' : undefined}
						aria-disabled={item.disabled}
						onclick={(e) => handle_item_click(item, e)}
						onkeydown={(e) => handle_item_keydown(item, e)}
					>
						{item.label}
					</a>
				{:else}
					<button
						class="navigation__button"
						class:navigation__button--current={item.current}
						class:navigation__button--disabled={item.disabled}
						class:navigation__button--expanded={item.children && is_expanded(item.id)}
						role="menuitem"
						tabindex={index === 0 ? 0 : -1}
						aria-expanded={item.children ? is_expanded(item.id) : undefined}
						aria-haspopup={item.children ? 'menu' : undefined}
						aria-disabled={item.disabled}
						disabled={item.disabled}
						onclick={(e) => handle_item_click(item, e)}
						onkeydown={(e) => handle_item_keydown(item, e)}
					>
						{item.label}
						{#if item.children}
							<svg
								class="navigation__icon"
								class:navigation__icon--expanded={is_expanded(item.id)}
								fill="currentColor"
								viewBox="0 0 20 20"
								aria-hidden="true"
							>
								<path
									fill-rule="evenodd"
									d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</button>

					{#if item.children && is_expanded(item.id)}
						<ul
							class="navigation__submenu"
							role="menu"
							aria-labelledby="{item.id}-button"
						>
							{#each item.children as child_item (child_item.id)}
								<li role="none">
									{#if child_item.href}
										<a
											href={child_item.href}
											class="navigation__submenu-link"
											class:navigation__submenu-link--current={child_item.current}
											class:navigation__submenu-link--disabled={child_item.disabled}
											role="menuitem"
											tabindex="-1"
											aria-current={child_item.current ? 'page' : undefined}
											aria-disabled={child_item.disabled}
											onclick={(e) => handle_item_click(child_item, e)}
										>
											{child_item.label}
										</a>
									{:else}
										<button
											class="navigation__submenu-button"
											class:navigation__submenu-button--current={child_item.current}
											class:navigation__submenu-button--disabled={child_item.disabled}
											role="menuitem"
											tabindex="-1"
											aria-disabled={child_item.disabled}
											disabled={child_item.disabled}
											onclick={(e) => handle_item_click(child_item, e)}
										>
											{child_item.label}
										</button>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</li>
		{/each}
	</ul>
</nav>

<style>
	.navigation {
		position: relative;
	}

	.navigation__list {
		display: flex;
		list-style: none;
		margin: 0;
		padding: 0;
		gap: 0.5rem;
	}

	.navigation--vertical .navigation__list {
		flex-direction: column;
	}

	.navigation__item {
		position: relative;
	}

	.navigation__link,
	.navigation__button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--font-size-base);
		font-weight: var(--font-weight-medium);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all var(--transition-base);
		min-height: 44px; /* Touch target */
		min-width: 44px;
	}

	.navigation__link:hover,
	.navigation__button:hover {
		background-color: var(--color-surface-secondary);
		color: var(--color-text-primary);
	}

	.navigation__link:focus-visible,
	.navigation__button:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.navigation__link--current,
	.navigation__button--current {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.navigation__link--disabled,
	.navigation__button--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.navigation__icon {
		width: 1rem;
		height: 1rem;
		transition: transform var(--transition-base);
	}

	.navigation__icon--expanded {
		transform: rotate(180deg);
	}

	.navigation__submenu {
		position: absolute;
		top: 100%;
		left: 0;
		min-width: 200px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		list-style: none;
		margin: 0;
		padding: 0.5rem 0;
		z-index: var(--z-dropdown);
	}

	.navigation--vertical .navigation__submenu {
		position: static;
		box-shadow: none;
		border: none;
		background: var(--color-surface-secondary);
		margin-left: 1rem;
		border-radius: 0;
	}

	.navigation__submenu-link,
	.navigation__submenu-button {
		display: block;
		width: 100%;
		padding: 0.5rem 1rem;
		border: none;
		background: transparent;
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
		transition: all var(--transition-base);
		min-height: 44px; /* Touch target */
	}

	.navigation__submenu-link:hover,
	.navigation__submenu-button:hover {
		background-color: var(--color-surface-secondary);
		color: var(--color-text-primary);
	}

	.navigation__submenu-link:focus-visible,
	.navigation__submenu-button:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: -2px;
	}

	.navigation__submenu-link--current,
	.navigation__submenu-button--current {
		background-color: var(--color-primary-100);
		color: var(--color-primary-700);
	}

	.navigation__submenu-link--disabled,
	.navigation__submenu-button--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.navigation__link,
		.navigation__button,
		.navigation__submenu-link,
		.navigation__submenu-button {
			border: 1px solid currentColor;
		}

		.navigation__submenu {
			border: 2px solid currentColor;
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.navigation__link,
		.navigation__button,
		.navigation__submenu-link,
		.navigation__submenu-button,
		.navigation__icon {
			transition: none;
		}
	}
</style>