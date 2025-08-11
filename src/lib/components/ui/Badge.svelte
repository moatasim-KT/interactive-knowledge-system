<script lang="ts">
	interface Props {
		variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children?: any;
	}

	let {
		variant = 'default',
		size = 'md',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const base_classes = 'inline-flex items-center font-medium rounded-full transition-colors';

	const variant_classes = {
		default: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
		primary: 'bg-primary-100 text-primary-800 hover:bg-primary-200',
		secondary: 'bg-secondary-100 text-secondary-800 hover:bg-secondary-200',
		success: 'bg-success-100 text-success-800 hover:bg-success-200',
		warning: 'bg-warning-100 text-warning-800 hover:bg-warning-200',
		error: 'bg-error-100 text-error-800 hover:bg-error-200',
		outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50'
	};

	const size_classes = {
		sm: 'px-2 py-0.5 text-xs',
		md: 'px-2.5 py-1 text-sm',
		lg: 'px-3 py-1.5 text-base'
	};

	const classes = $derived(() =>
		[base_classes, variant_classes[variant], size_classes[size], className]
			.filter(Boolean)
			.join(' ')
	);
</script>

<span class={classes} {...rest}>
	{@render children?.()}
</span>

<style>
	/* Color utilities for badges */
	:global(.bg-gray-100) {
		background-color: var(--color-gray-100);
	}
	:global(.bg-gray-200) {
		background-color: var(--color-gray-200);
	}
	:global(.text-gray-700) {
		color: var(--color-gray-700);
	}
	:global(.text-gray-800) {
		color: var(--color-gray-800);
	}
	:global(.border-gray-300) {
		border-color: var(--color-gray-300);
	}
	:global(.hover\:bg-gray-50:hover) {
		background-color: var(--color-gray-50);
	}
	:global(.hover\:bg-gray-200:hover) {
		background-color: var(--color-gray-200);
	}

	:global(.bg-primary-100) {
		background-color: var(--color-primary-100);
	}
	:global(.bg-primary-200) {
		background-color: var(--color-primary-200);
	}
	:global(.text-primary-800) {
		color: var(--color-primary-800);
	}
	:global(.hover\:bg-primary-200:hover) {
		background-color: var(--color-primary-200);
	}

	:global(.bg-secondary-100) {
		background-color: var(--color-secondary-100);
	}
	:global(.bg-secondary-200) {
		background-color: var(--color-secondary-200);
	}
	:global(.text-secondary-800) {
		color: var(--color-secondary-800);
	}
	:global(.hover\:bg-secondary-200:hover) {
		background-color: var(--color-secondary-200);
	}

	:global(.bg-success-100) {
		background-color: var(--color-success-100);
	}
	:global(.bg-success-200) {
		background-color: var(--color-success-200);
	}
	:global(.text-success-800) {
		color: var(--color-success-800);
	}
	:global(.hover\:bg-success-200:hover) {
		background-color: var(--color-success-200);
	}

	:global(.bg-warning-100) {
		background-color: var(--color-warning-100);
	}
	:global(.bg-warning-200) {
		background-color: var(--color-warning-200);
	}
	:global(.text-warning-800) {
		color: var(--color-warning-800);
	}
	:global(.hover\:bg-warning-200:hover) {
		background-color: var(--color-warning-200);
	}

	:global(.bg-error-100) {
		background-color: var(--color-error-100);
	}
	:global(.bg-error-200) {
		background-color: var(--color-error-200);
	}
	:global(.text-error-800) {
		color: var(--color-error-800);
	}
	:global(.hover\:bg-error-200:hover) {
		background-color: var(--color-error-200);
	}
</style>
