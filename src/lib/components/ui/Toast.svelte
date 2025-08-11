<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		type?: 'success' | 'error' | 'warning' | 'info';
		title?: string;
		message: string;
		duration?: number;
		dismissible?: boolean;
		onDismiss?: () => void;
		class?: string;
	}

	let {
		type = 'info',
		title,
		message,
		duration = 5000,
		dismissible = true,
		onDismiss,
		class: className = ''
	}: Props = $props();

	let visible = $state(true);
	let timeout_id;

	const icons = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ'
	};

	const type_classes = {
		success: 'bg-success-50 border-success-200 text-success-800',
		error: 'bg-error-50 border-error-200 text-error-800',
		warning: 'bg-warning-50 border-warning-200 text-warning-800',
		info: 'bg-primary-50 border-primary-200 text-primary-800'
	};

	const icon_classes = {
		success: 'text-success-600',
		error: 'text-error-600',
		warning: 'text-warning-600',
		info: 'text-primary-600'
	};

	function dismiss() {
		visible = false;
		setTimeout(() => {
			onDismiss?.();
		}, 200); // Wait for exit animation
	}

	onMount(() => {
		if (duration > 0) {
			timeout_id = setTimeout(dismiss, duration);
		}

		return () => {
			if (timeout_id) {
				clearTimeout(timeout_id);
			}
		};
	});

	let classes = $derived(
		[
			'flex items-start gap-3 p-4 border rounded-lg shadow-md transition-all duration-200',
			type_classes[type],
			visible
				? 'animate-slide-in-right opacity-100'
				: 'animate-fade-out opacity-0 translate-x-full',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if visible}
	<div class={classes} role="alert">
		<div
			class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white {icon_classes[
				type
			]}"
		>
			{icons[type]}
		</div>

		<div class="flex-1 min-w-0">
			{#if title}
				<h4 class="font-medium text-sm mb-1">{title}</h4>
			{/if}
			<p class="text-sm">{message}</p>
		</div>

		{#if dismissible}
			<button
				class="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-600 transition-colors"
				onclick={dismiss}
				aria-label="Dismiss notification"
			>
				<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		{/if}
	</div>
{/if}

<style>
	:global(.bg-success-50) {
		background-color: var(--color-success-50);
	}
	:global(.border-success-200) {
		border-color: var(--color-success-200);
	}
	:global(.text-success-800) {
		color: var(--color-success-800);
	}
	:global(.text-success-600) {
		color: var(--color-success-600);
	}

	:global(.bg-error-50) {
		background-color: var(--color-error-50);
	}
	:global(.border-error-200) {
		border-color: var(--color-error-200);
	}
	:global(.text-error-800) {
		color: var(--color-error-800);
	}
	:global(.text-error-600) {
		color: var(--color-error-600);
	}

	:global(.bg-warning-50) {
		background-color: var(--color-warning-50);
	}
	:global(.border-warning-200) {
		border-color: var(--color-warning-200);
	}
	:global(.text-warning-800) {
		color: var(--color-warning-800);
	}
	:global(.text-warning-600) {
		color: var(--color-warning-600);
	}

	:global(.bg-primary-50) {
		background-color: var(--color-primary-50);
	}
	:global(.border-primary-200) {
		border-color: var(--color-primary-200);
	}
	:global(.text-primary-800) {
		color: var(--color-primary-800);
	}
	:global(.text-primary-600) {
		color: var(--color-primary-600);
	}
</style>
