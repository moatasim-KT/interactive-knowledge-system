<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		content: string;
		position?: 'top' | 'bottom' | 'left' | 'right';
		delay?: number;
		disabled?: boolean;
		class?: string;
		children?: any;
	}

	let {
		content,
		position = 'top',
		delay = 500,
		disabled = false,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	let triggerElement: HTMLElement | null = null;
	let tooltipElement = $state<HTMLElement | null>(null);
	let isVisible = $state(false);
	let timeoutId: number | null = null;

	function showTooltip() {
		if (disabled || !content) return;

		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = window.setTimeout(() => {
			isVisible = true;
		}, delay);
	}

	function hideTooltip() {
		if (timeoutId) clearTimeout(timeoutId);
		isVisible = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			hideTooltip();
		}
	}

	onMount(() => {
		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	});

	const position_classes = {
		top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
		bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
		left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
		right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
	};

	const arrow_classes = {
		top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-gray-900',
		bottom:
			'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-gray-900',
		left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-gray-900',
		right:
			'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-gray-900'
	};

	const tooltip_classes = $derived(() =>
		[
			'absolute z-tooltip px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none transition-opacity duration-200',
			position_classes[position],
			isVisible ? 'opacity-100' : 'opacity-0',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div
	class="relative inline-block"
	bind:this={triggerElement}
	onmouseenter={showTooltip}
	onmouseleave={hideTooltip}
	onfocus={showTooltip}
	onblur={hideTooltip}
	onkeydown={handleKeydown}
	{...rest}
>
	{@render children?.()}

	{#if content && !disabled}
		<div
			bind:this={tooltipElement}
			class={tooltip_classes}
			role="tooltip"
			aria-hidden={!isVisible}
		>
			{content}

			<!-- Arrow -->
			<div class={`absolute w-0 h-0 border-4 ${arrow_classes[position]}`}></div>
		</div>
	{/if}
</div>

<style>
	:global(.z-tooltip) {
		z-index: var(--z-tooltip);
	}
	:global(.text-white) {
		color: white;
	}
	:global(.bg-gray-900) {
		background-color: var(--color-gray-900);
	}
	:global(.shadow-lg) {
		box-shadow: var(--shadow-lg);
	}

	/* Position utilities */
	:global(.relative) {
		position: relative;
	}
	:global(.absolute) {
		position: absolute;
	}
	:global(.inline-block) {
		display: inline-block;
	}

	:global(.top-full) {
		top: 100%;
	}
	:global(.bottom-full) {
		bottom: 100%;
	}
	:global(.left-full) {
		left: 100%;
	}
	:global(.right-full) {
		right: 100%;
	}
	:global(.left-1\/2) {
		left: 50%;
	}
	:global(.top-1\/2) {
		top: 50%;
	}

	/* Transform utilities */
	:global(.transform) {
		transform: var(--tw-transform);
	}
	:global(.-translate-x-1\/2) {
		--tw-translate-x: -50%;
	}
	:global(.-translate-y-1\/2) {
		--tw-translate-y: -50%;
	}

	/* Spacing utilities */
	:global(.px-2) {
		padding-left: 0.5rem;
		padding-right: 0.5rem;
	}
	:global(.py-1) {
		padding-top: 0.25rem;
		padding-bottom: 0.25rem;
	}
	:global(.mb-2) {
		margin-bottom: 0.5rem;
	}
	:global(.mt-2) {
		margin-top: 0.5rem;
	}
	:global(.mr-2) {
		margin-right: 0.5rem;
	}
	:global(.ml-2) {
		margin-left: 0.5rem;
	}

	/* Border utilities */
	:global(.rounded) {
		border-radius: var(--radius-base);
	}
	:global(.border-4) {
		border-width: 4px;
	}
	:global(.w-0) {
		width: 0;
	}
	:global(.h-0) {
		height: 0;
	}

	/* Text utilities */
	:global(.text-xs) {
		font-size: var(--font-size-xs);
	}

	/* Opacity utilities */
	:global(.opacity-0) {
		opacity: 0;
	}
	:global(.opacity-100) {
		opacity: 1;
	}

	/* Pointer events */
	:global(.pointer-events-none) {
		pointer-events: none;
	}

	/* Transition utilities */
	:global(.duration-200) {
		transition-duration: 200ms;
	}

	/* Border color utilities for arrows */
	:global(.border-l-transparent) {
		border-left-color: transparent;
	}
	:global(.border-r-transparent) {
		border-right-color: transparent;
	}
	:global(.border-t-transparent) {
		border-top-color: transparent;
	}
	:global(.border-b-transparent) {
		border-bottom-color: transparent;
	}
	:global(.border-t-gray-900) {
		border-top-color: var(--color-gray-900);
	}
	:global(.border-b-gray-900) {
		border-bottom-color: var(--color-gray-900);
	}
	:global(.border-l-gray-900) {
		border-left-color: var(--color-gray-900);
	}
	:global(.border-r-gray-900) {
		border-right-color: var(--color-gray-900);
	}
</style>
