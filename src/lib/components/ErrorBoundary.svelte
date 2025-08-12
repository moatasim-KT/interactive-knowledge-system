<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Card } from './ui';

	interface Props {
		children: import('svelte').Snippet;
		fallback?: import('svelte').Snippet;
		onError?: (error: Error, errorInfo?: any) => void;
	}

	let { children, fallback, onError }: Props = $props();

	let hasError = $state(false);
	let error = $state<Error | null>(null);
	let errorInfo = $state<any>(null);

	// Reset error state when children change
	$effect(() => {
		children;
		hasError = false;
		error = null;
		errorInfo = null;
	});

	function handleError(event: ErrorEvent) {
		hasError = true;
		error = new Error(event.message);
		errorInfo = {
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			stack: event.error?.stack
		};

		if (onError) {
			onError(error, errorInfo);
		}

		console.error('ErrorBoundary caught an error:', error, errorInfo);
	}

	function handleUnhandledRejection(event: PromiseRejectionEvent) {
		hasError = true;
		error = new Error(`Unhandled promise rejection: ${event.reason}`);
		errorInfo = {
			reason: event.reason,
			promise: event.promise
		};

		if (onError) {
			onError(error, errorInfo);
		}

		console.error('ErrorBoundary caught an unhandled promise rejection:', error, errorInfo);
	}

	function retry() {
		hasError = false;
		error = null;
		errorInfo = null;
	}

	onMount(() => {
		window.addEventListener('error', handleError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);

		return () => {
			window.removeEventListener('error', handleError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});
</script>

{#if hasError}
	{#if fallback}
		{@render fallback()}
	{:else}
		<Card variant="error" padding="lg" class="error-boundary">
			<div class="text-center">
				<div class="text-4xl mb-4">⚠️</div>
				<h3 class="text-lg font-semibold mb-2 text-error-600">Something went wrong</h3>
				<p class="text-text-secondary mb-4">
					An unexpected error occurred. Please try refreshing the page or contact support if the
					problem persists.
				</p>

				{#if error}
					<details class="text-left mb-4">
						<summary class="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary">
							Error Details
						</summary>
						<div class="mt-2 p-3 bg-error-50 border border-error-200 rounded text-sm">
							<div class="font-medium text-error-800">Error:</div>
							<div class="text-error-700 mb-2">{error.message}</div>
							{#if errorInfo?.stack}
								<div class="font-medium text-error-800">Stack Trace:</div>
								<pre class="text-xs text-error-600 overflow-x-auto">{errorInfo.stack}</pre>
							{/if}
						</div>
					</details>
				{/if}

				<div class="flex gap-2 justify-center">
					<Button variant="primary" onclick={retry}>Try Again</Button>
					<Button variant="outline" onclick={() => window.location.reload()}>Refresh Page</Button>
				</div>
			</div>
		</Card>
	{/if}
{:else}
	{@render children()}
{/if}

<style>
	.error-boundary {
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
</style>