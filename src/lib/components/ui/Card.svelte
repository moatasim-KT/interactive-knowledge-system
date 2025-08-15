<script lang="ts">
	type Props = {
		variant?: 'default' | 'elevated' | 'outlined' | 'filled';
		padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
		interactive?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: any;
	};

	let {
		variant = 'default',
		padding = 'md',
		interactive = false,
		class: className = '',
		onclick,
		children,
		...rest
	}: Props = $props();

	const base_classes = 'bg-surface border border-border rounded-lg transition';

	const variant_classes = {
		default: '',
		elevated: 'shadow-md hover:shadow-lg',
		outlined: 'border-2',
		filled: 'bg-surface-secondary'
	};

	const padding_classes = {
		none: '',
		sm: 'p-3',
		md: 'p-4',
		lg: 'p-6',
		xl: 'p-8'
	};

	const interactive_classes = interactive
		? 'cursor-pointer hover:shadow-md hover:border-primary-300 focus-ring'
		: '';

	const classes = $derived(() =>
		[
			base_classes,
			variant_classes[variant],
			padding_classes[padding],
			interactive_classes,
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if interactive}
	<button class={classes} {onclick} {...rest}>
		{@render children?.()}
	</button>
{:else}
	<div class={classes} {...rest}>
		{@render children?.()}
	</div>
{/if}

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
	:global(.hover\:border-primary-300:hover) {
		border-color: var(--color-primary-300);
	}

	/* Mobile responsive adjustments */
	@media (max-width: 768px) {
		:global(.p-3) {
			padding: 0.6rem;
		}
		:global(.p-4) {
			padding: 0.8rem;
		}
		:global(.p-6) {
			padding: 1rem;
		}
		:global(.p-8) {
			padding: 1.2rem;
		}
	}

	/* Touch-friendly interactions */
	@media (hover: none) and (pointer: coarse) {
		:global(.cursor-pointer) {
			-webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
			touch-action: manipulation;
		}

		:global(.hover\:shadow-md) {
			/* Remove hover effects on touch devices */
			box-shadow: var(--shadow-base);
		}

		:global(.focus-ring:focus) {
			/* Enhanced focus for touch devices */
			outline: 3px solid var(--color-border-focus);
			outline-offset: 2px;
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: high) {
		:global(.border) {
			border-width: 2px;
		}
		
		:global(.border-2) {
			border-width: 3px;
		}
	}
</style>