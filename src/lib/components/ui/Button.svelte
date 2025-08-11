<script lang="ts">
	interface Props {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		disabled?: boolean;
		loading?: boolean;
		fullWidth?: boolean;
		type?: 'button' | 'submit' | 'reset';
		onclick?: (event: MouseEvent) => void;
		class?: string;
		children?: any;
	}

	let {
		variant = 'primary',
		size = 'md',
		disabled = false,
		loading = false,
		fullWidth = false,
		type = 'button',
		onclick,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const base_classes =
		'inline-flex items-center justify-center font-medium transition focus-ring rounded-md border';

	const variant_classes = {
		primary:
			'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 hover:border-primary-700 active:bg-primary-800',
		secondary:
			'bg-secondary-100 text-secondary-900 border-secondary-200 hover:bg-secondary-200 hover:border-secondary-300 active:bg-secondary-300',
		outline:
			'bg-transparent text-primary-600 border-primary-600 hover:bg-primary-50 hover:text-primary-700 active:bg-primary-100',
		ghost:
			'bg-transparent text-secondary-700 border-transparent hover:bg-secondary-100 hover:text-secondary-900 active:bg-secondary-200',
		danger:
			'bg-error-600 text-white border-error-600 hover:bg-error-700 hover:border-error-700 active:bg-error-800'
	};

	const size_classes = {
		xs: 'px-2 py-1 text-xs gap-1',
		sm: 'px-3 py-1.5 text-sm gap-1.5',
		md: 'px-4 py-2 text-base gap-2',
		lg: 'px-6 py-3 text-lg gap-2.5',
		xl: 'px-8 py-4 text-xl gap-3'
	};

	const disabled_classes = 'opacity-50 cursor-not-allowed pointer-events-none';
	const full_width_classes = 'w-full';

	const classes = $derived(() =>
		[
			base_classes,
			variant_classes[variant],
			size_classes[size],
			disabled && disabled_classes,
			fullWidth && full_width_classes,
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<button {type} {disabled} class={classes} {onclick} {...rest}>
	{#if loading}
		<svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{/if}

	{@render children?.()}
</button>

<style>
	/* Custom color classes for dynamic variants */
	:global(.bg-primary-600) {
		background-color: var(--color-primary-600);
	}
	:global(.bg-primary-700) {
		background-color: var(--color-primary-700);
	}
	:global(.bg-primary-800) {
		background-color: var(--color-primary-800);
	}
	:global(.bg-primary-50) {
		background-color: var(--color-primary-50);
	}
	:global(.bg-primary-100) {
		background-color: var(--color-primary-100);
	}

	:global(.text-primary-600) {
		color: var(--color-primary-600);
	}
	:global(.text-primary-700) {
		color: var(--color-primary-700);
	}

	:global(.border-primary-600) {
		border-color: var(--color-primary-600);
	}
	:global(.border-primary-700) {
		border-color: var(--color-primary-700);
	}

	:global(.bg-secondary-100) {
		background-color: var(--color-secondary-100);
	}
	:global(.bg-secondary-200) {
		background-color: var(--color-secondary-200);
	}
	:global(.bg-secondary-300) {
		background-color: var(--color-secondary-300);
	}

	:global(.text-secondary-700) {
		color: var(--color-secondary-700);
	}
	:global(.text-secondary-900) {
		color: var(--color-secondary-900);
	}

	:global(.border-secondary-200) {
		border-color: var(--color-secondary-200);
	}
	:global(.border-secondary-300) {
		border-color: var(--color-secondary-300);
	}

	:global(.bg-error-600) {
		background-color: var(--color-error-600);
	}
	:global(.bg-error-700) {
		background-color: var(--color-error-700);
	}
	:global(.bg-error-800) {
		background-color: var(--color-error-800);
	}

	:global(.border-error-600) {
		border-color: var(--color-error-600);
	}
	:global(.border-error-700) {
		border-color: var(--color-error-700);
	}

	/* Hover and active states */
	button:hover:not(:disabled) :global(.hover\:bg-primary-700) {
		background-color: var(--color-primary-700);
	}
	button:hover:not(:disabled) :global(.hover\:border-primary-700) {
		border-color: var(--color-primary-700);
	}
	button:hover:not(:disabled) :global(.hover\:bg-primary-50) {
		background-color: var(--color-primary-50);
	}
	button:hover:not(:disabled) :global(.hover\:text-primary-700) {
		color: var(--color-primary-700);
	}
	button:hover:not(:disabled) :global(.hover\:bg-secondary-200) {
		background-color: var(--color-secondary-200);
	}
	button:hover:not(:disabled) :global(.hover\:border-secondary-300) {
		border-color: var(--color-secondary-300);
	}
	button:hover:not(:disabled) :global(.hover\:bg-secondary-100) {
		background-color: var(--color-secondary-100);
	}
	button:hover:not(:disabled) :global(.hover\:text-secondary-900) {
		color: var(--color-secondary-900);
	}
	button:hover:not(:disabled) :global(.hover\:bg-error-700) {
		background-color: var(--color-error-700);
	}
	button:hover:not(:disabled) :global(.hover\:border-error-700) {
		border-color: var(--color-error-700);
	}

	button:active:not(:disabled) :global(.active\:bg-primary-800) {
		background-color: var(--color-primary-800);
	}
	button:active:not(:disabled) :global(.active\:bg-primary-100) {
		background-color: var(--color-primary-100);
	}
	button:active:not(:disabled) :global(.active\:bg-secondary-300) {
		background-color: var(--color-secondary-300);
	}
	button:active:not(:disabled) :global(.active\:bg-secondary-200) {
		background-color: var(--color-secondary-200);
	}
	button:active:not(:disabled) :global(.active\:bg-error-800) {
		background-color: var(--color-error-800);
	}
</style>
