<script lang="ts">
	import { Button, Card } from './ui';

	interface Props {
		title?: string;
		message?: string;
		showRetry?: boolean;
		onRetry?: () => void;
		icon?: string;
		error?: Error | null;
		errorInfo?: any;
	}

	let {
		title = 'Component Error',
		message = 'This component failed to load properly.',
		showRetry = true,
		onRetry,
		icon = '⚠️',
		error = null,
		errorInfo = null
	}: Props = $props();

	function handleRetry() {
		if (onRetry) {
			onRetry();
		} else {
			window.location.reload();
		}
	}
</script>

<Card variant="outline" padding="lg" class="fallback-component">
	<div class="text-center">
		<div class="text-3xl mb-3">{icon}</div>
		<h4 class="text-md font-medium mb-2 text-text-primary">{title}</h4>
		<p class="text-sm text-text-secondary mb-4">{message}</p>
		
		{#if error}
			<details class="text-left mb-4">
				<summary class="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary">
					Error Details
				</summary>
				<div class="mt-2 p-3 bg-error-50 border border-error-200 rounded text-sm">
					<div class="font-medium text-error-800">Error:</div>
					<div class="text-error-700 mb-2">{error.message}</div>
					{#if error.stack}
						<div class="font-medium text-error-800">Stack Trace:</div>
						<pre class="text-xs text-error-600 overflow-x-auto">{error.stack}</pre>
					{/if}
				</div>
			</details>
		{/if}
		
		{#if showRetry}
			<div class="flex gap-2 justify-center">
				<Button variant="outline" size="sm" onclick={handleRetry}>
					Retry
				</Button>
				<Button variant="ghost" size="sm" onclick={() => window.location.reload()}>
					Refresh Page
				</Button>
			</div>
		{/if}
	</div>
</Card>

<style>
	.fallback-component {
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 1rem;
	}

	:global(.text-error-600) {
		color: var(--color-error-600, #dc2626);
	}

	:global(.text-error-700) {
		color: var(--color-error-700, #b91c1c);
	}

	:global(.text-error-800) {
		color: var(--color-error-800, #991b1b);
	}

	:global(.bg-error-50) {
		background-color: var(--color-error-50, #fef2f2);
	}

	:global(.border-error-200) {
		border-color: var(--color-error-200, #fecaca);
	}

	:global(.text-text-primary) {
		color: var(--color-text-primary, #1f2937);
	}

	:global(.text-text-secondary) {
		color: var(--color-text-secondary, #6b7280);
	}

	:global(.hover\:text-text-primary:hover) {
		color: var(--color-text-primary, #1f2937);
	}
</style>