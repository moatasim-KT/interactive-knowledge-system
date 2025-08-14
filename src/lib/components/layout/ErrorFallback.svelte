<script lang="ts">
	import { Button, Card } from '../ui';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	interface Props {
		error?: Error | null;
	}

	const { error = null }: Props = $props();

	function handleRetry() {
		dispatch('retry');
	}
</script>

<Card variant="outlined" padding="lg" class="error-fallback">
	<div class="text-center">
		<div class="text-4xl mb-4">⚠️</div>
		<h3 class="text-lg font-semibold mb-2">Something went wrong</h3>
		<p class="text-text-secondary mb-4">
			This page encountered an error. Please try refreshing or contact support if the problem
			persists.
		</p>

		{#if error}
			<details class="text-left mb-4">
				<summary
					class="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary"
				>
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

		<div class="flex gap-2 justify-center">
			<Button variant="primary" onclick={handleRetry}>Try Again</Button>
			<Button variant="outline" onclick={() => window.location.reload()}>Refresh Page</Button>
		</div>
	</div>
</Card>

<style>
	:global(.error-fallback) {
		margin: 2rem auto;
		max-width: 600px;
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

	:global(.text-text-secondary) {
		color: var(--color-text-secondary, #6b7280);
	}

	:global(.text-text-primary) {
		color: var(--color-text-primary, #1f2937);
	}

	:global(.hover\:text-text-primary:hover) {
		color: var(--color-text-primary, #1f2937);
	}
</style>
