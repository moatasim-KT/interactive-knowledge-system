<script lang="ts">
	interface Props {
		value: number;
		max?: number;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'success' | 'warning' | 'error';
		showLabel?: boolean;
		label?: string;
		animated?: boolean;
		striped?: boolean;
		class?: string;
	}

	let {
		value,
		max = 100,
		size = 'md',
		variant = 'default',
		showLabel = false,
		label,
		animated = false,
		striped = false,
		class: className = '',
		...rest
	}: Props = $props();

	const percentage = $derived(Math.min(Math.max((value / max) * 100, 0), 100));
	const display_label = $derived(label || `${Math.round(percentage)}%`);

	const size_classes = {
		sm: 'h-1',
		md: 'h-2',
		lg: 'h-3'
	};

	const variant_classes = {
		default: 'bg-primary-500',
		success: 'bg-success-500',
		warning: 'bg-warning-500',
		error: 'bg-error-500'
	};

	const container_classes = $derived(() =>
		['w-full bg-gray-200 rounded-full overflow-hidden', size_classes[size], className]
			.filter(Boolean)
			.join(' ')
	);

	const bar_classes = $derived(() =>
		[
			'h-full transition-all duration-500 ease-out',
			variant_classes[variant],
			striped && 'bg-stripes',
			animated && striped && 'animate-stripes'
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class="space-y-1">
	{#if showLabel}
		<div class="flex justify-between items-center text-sm">
			<span class="text-text-secondary">{display_label}</span>
			<span class="text-text-muted">{Math.round(percentage)}%</span>
		</div>
	{/if}

	<div class={container_classes} {...rest}>
		<div
			class={bar_classes}
			style="width: {percentage}%"
			role="progressbar"
			aria-valuenow={value}
			aria-valuemin="0"
			aria-valuemax={max}
			aria-label={display_label}
		></div>
	</div>
</div>

<style>
	:global(.bg-gray-200) {
		background-color: var(--color-gray-200);
	}
	:global(.text-text-secondary) {
		color: var(--color-text-secondary);
	}
	:global(.text-text-muted) {
		color: var(--color-text-muted);
	}

	:global(.bg-primary-500) {
		background-color: var(--color-primary-500);
	}
	:global(.bg-success-500) {
		background-color: var(--color-success-500);
	}
	:global(.bg-warning-500) {
		background-color: var(--color-warning-500);
	}
	:global(.bg-error-500) {
		background-color: var(--color-error-500);
	}

	/* Size utilities */
	:global(.h-1) {
		height: 0.25rem;
	}
	:global(.h-2) {
		height: 0.5rem;
	}
	:global(.h-3) {
		height: 0.75rem;
	}
	:global(.h-full) {
		height: 100%;
	}
	:global(.w-full) {
		width: 100%;
	}

	/* Layout utilities */
	:global(.flex) {
		display: flex;
	}
	:global(.justify-between) {
		justify-content: space-between;
	}
	:global(.items-center) {
		align-items: center;
	}
	:global(.space-y-1 > * + *) {
		margin-top: 0.25rem;
	}

	:global(.rounded-full) {
		border-radius: 9999px;
	}
	:global(.overflow-hidden) {
		overflow: hidden;
	}

	:global(.text-sm) {
		font-size: var(--font-size-sm);
	}

	:global(.duration-500) {
		transition-duration: 500ms;
	}
	:global(.ease-out) {
		transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
	}

	/* Striped pattern */
	.bg-stripes {
		background-image: linear-gradient(
			45deg,
			rgba(255, 255, 255, 0.15) 25%,
			transparent 25%,
			transparent 50%,
			rgba(255, 255, 255, 0.15) 50%,
			rgba(255, 255, 255, 0.15) 75%,
			transparent 75%,
			transparent
		);
		background-size: 1rem 1rem;
	}

	@keyframes stripes {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 1rem 0;
		}
	}

	.animate-stripes {
		animation: stripes 1s linear infinite;
	}
</style>
