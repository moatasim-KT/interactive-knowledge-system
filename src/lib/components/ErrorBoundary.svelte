<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Card } from './ui';
	import { errorHandler } from '../utils/errorHandler.js';
	import type { ErrorContext } from '../utils/errorHandler.js';

	interface Props {
		children: import('svelte').Snippet;
		fallback?: import('svelte').Snippet;
		context?: Partial<ErrorContext>;
		showDetails?: boolean;
		enableRetry?: boolean;
		onError?: (error: Error, errorInfo: any) => void;
		onRetry?: () => void;
		// Svelte 5 event callback props
		onerror?: (error: Error, errorInfo: any) => void;
		onretry?: () => void;
	}

	let { 
		children, 
		fallback,
		context = {},
		showDetails = false,
		enableRetry = true,
		onError,
		onRetry,
		onerror,
		onretry
	}: Props = $props();

	let hasError = $state(false);
	let error = $state<Error | null>(null);
	let errorInfo = $state<any>(null);
	let retryCount = $state(0);
	let isRetrying = $state(false);

	// Reset error state when children change
	$effect(() => {
		children;
		if (!isRetrying) {
			hasError = false;
			error = null;
			errorInfo = null;
			retryCount = 0;
		}
	});

	function handleError(event: ErrorEvent) {
		const errorObj = new Error(event.message);
		const info = {
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno,
			stack: event.error?.stack,
			timestamp: new Date().toISOString()
		};

		setError(errorObj, info);
	}

	function handleUnhandledRejection(event: PromiseRejectionEvent) {
		const errorObj = new Error(`Unhandled promise rejection: ${event.reason}`);
		const info = {
			reason: event.reason,
			promise: event.promise,
			timestamp: new Date().toISOString()
		};

		setError(errorObj, info);
	}

	function setError(errorObj: Error, info: any) {
		hasError = true;
		error = errorObj;
		errorInfo = info;
		isRetrying = false;

		// Create error context
		const errorContext: ErrorContext = {
			operation: 'component-render',
			component: context.component || 'ErrorBoundary',
			...context
		};

		// Log error through error handler
		errorHandler.handleSync(
			() => { throw errorObj; },
			errorContext,
			{ showToast: false, logError: true }
		);

		// Call custom error handler
		if (onError) {
			onError(errorObj, info);
		}

		// Call error callback
		onerror?.(errorObj, { errorInfo: info, context: errorContext });
		onError?.(errorObj, { errorInfo: info, context: errorContext });
	}

	async function retry() {
		if (isRetrying) return;

		isRetrying = true;
		retryCount++;

		try {
			// Call custom retry handler
			if (onRetry) {
				await onRetry();
			}
			if (onretry) {
				await onretry();
			}

			// Reset error state after a brief delay
			setTimeout(() => {
				hasError = false;
				error = null;
				errorInfo = null;
				isRetrying = false;
			}, 100);

		} catch (retryError) {
			// If retry fails, show the retry error
			const retryErrorObj = retryError instanceof Error ? retryError : new Error(String(retryError));
			setError(retryErrorObj, { 
				isRetryError: true, 
				originalError: error,
				retryAttempt: retryCount 
			});
		}
	}

	function reportError() {
		if (error && errorInfo) {
			// Create error report
			const report = {
				error: {
					message: error.message,
					stack: error.stack,
					name: error.name
				},
				errorInfo,
				context,
				userAgent: navigator.userAgent,
				url: window.location.href,
				timestamp: new Date().toISOString(),
				retryCount
			};

			// Log detailed error report
			console.error('Error Report:', report);

			// Could send to error reporting service here
			// Note: error-report event removed in favor of direct error handling
		}
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
		<Card variant="outlined" padding="lg" class="error-boundary">
			<div class="text-center">
				<div class="text-4xl mb-4">⚠️</div>
				<h3 class="text-lg font-semibold mb-2 text-error-600">
					{retryCount > 0 ? `Error (Attempt ${retryCount + 1})` : 'Something went wrong'}
				</h3>
				<p class="text-text-secondary mb-4">
					{#if error}
						{errorHandler.getUserFriendlyMessage(error, { operation: 'component-render', ...context })}
					{:else}
						An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
					{/if}
				</p>

				{#if error && (showDetails || retryCount > 2)}
					<details class="text-left mb-4">
						<summary class="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary">
							Error Details
						</summary>
						<div class="mt-2 p-3 bg-error-50 border border-error-200 rounded text-sm">
							<div class="font-medium text-error-800">Error:</div>
							<div class="text-error-700 mb-2">{error.message}</div>
							
							{#if errorInfo?.timestamp}
								<div class="font-medium text-error-800">Time:</div>
								<div class="text-error-700 mb-2">{new Date(errorInfo.timestamp).toLocaleString()}</div>
							{/if}

							{#if errorInfo?.filename}
								<div class="font-medium text-error-800">Location:</div>
								<div class="text-error-700 mb-2">{errorInfo.filename}:{errorInfo.lineno}:{errorInfo.colno}</div>
							{/if}

							{#if errorInfo?.stack}
								<div class="font-medium text-error-800">Stack Trace:</div>
								<pre class="text-xs text-error-600 overflow-x-auto whitespace-pre-wrap">{errorInfo.stack}</pre>
							{/if}
						</div>
					</details>
				{/if}

				<div class="flex gap-2 justify-center flex-wrap">
					{#if enableRetry}
						<Button 
							variant="primary" 
							onclick={retry}
							disabled={isRetrying}
							class={isRetrying ? 'opacity-50' : ''}
						>
							{isRetrying ? 'Retrying...' : retryCount > 0 ? `Try Again (${retryCount})` : 'Try Again'}
						</Button>
					{/if}
					
					<Button variant="outline" onclick={() => window.location.reload()}>
						Refresh Page
					</Button>

					{#if retryCount > 1}
						<Button variant="ghost" onclick={reportError} size="sm">
							Report Error
						</Button>
					{/if}
				</div>

				{#if retryCount > 3}
					<div class="mt-4 p-3 bg-warning-50 border border-warning-200 rounded text-sm">
						<div class="font-medium text-warning-800 mb-1">Persistent Error</div>
						<div class="text-warning-700">
							This error has occurred multiple times. Consider refreshing the page or contacting support.
						</div>
					</div>
				{/if}
			</div>
		</Card>
	{/if}
{:else}
	{@render children()}
{/if}

<style>
	:global(.error-boundary) {
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

	:global(.text-warning-700) {
		color: var(--color-warning-700, #b45309);
	}

	:global(.text-warning-800) {
		color: var(--color-warning-800, #92400e);
	}

	:global(.bg-warning-50) {
		background-color: var(--color-warning-50, #fffbeb);
	}

	:global(.border-warning-200) {
		border-color: var(--color-warning-200, #fed7aa);
	}

	:global(.whitespace-pre-wrap) {
		white-space: pre-wrap;
	}
</style>