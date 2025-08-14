<script lang="ts">
	import { onMount } from 'svelte';
	import { LoadingFallback, FallbackComponent, ErrorBoundary } from './index.js';
	import { errorHandler } from '../utils/errorHandler.js';
	import type { ErrorContext } from '../utils/errorHandler.js';

	interface Props {
		asyncOperation: () => Promise<any>;
		context: ErrorContext;
		children: import('svelte').Snippet<[any]>;
		loadingMessage?: string;
		errorMessage?: string;
		retryable?: boolean;
		showLoadingCard?: boolean;
		onSuccess?: (data: any) => void;
		onError?: (error: Error) => void;
		onRetry?: () => void;
	}

	let {
		asyncOperation,
		context,
		children,
		loadingMessage = 'Loading...',
		errorMessage,
		retryable = true,
		showLoadingCard = true,
		onSuccess,
		onError,
		onRetry
	}: Props = $props();

	let isLoading = $state(true);
	let hasError = $state(false);
	let error = $state<Error | null>(null);
	let data = $state<any>(null);
	let retryCount = $state(0);

	async function executeOperation() {
		isLoading = true;
		hasError = false;
		error = null;

		const result = await errorHandler.handleAsync(
			asyncOperation,
			context,
			{
				showToast: false,
				retryable,
				maxRetries: 0, // Handle retries manually
				onError: (err) => {
					if (onError) onError(err);
				}
			}
		);

		isLoading = false;

		if (result.success) {
			data = result.data;
			if (onSuccess) onSuccess(result.data);
		} else {
			hasError = true;
			error = result.error || null;
		}
	}

	async function handleRetry() {
		retryCount++;
		if (onRetry) onRetry();
		await executeOperation();
	}

	onMount(() => {
		executeOperation();
	});
</script>

<ErrorBoundary {context} onRetry={handleRetry}>
	{#if isLoading}
		<LoadingFallback message={loadingMessage} showCard={showLoadingCard} />
	{:else if hasError && error}
		<FallbackComponent
			title="Failed to Load"
			message={errorMessage || errorHandler.getUserFriendlyMessage(error, context)}
			showRetry={retryable}
			{error}
			onretry={handleRetry}
		/>
	{:else if data !== null}
		{@render children(data)}
	{:else}
		<FallbackComponent
			title="No Data"
			message="No data available to display."
			showRetry={retryable}
			icon="📭"
			onretry={handleRetry}
		/>
	{/if}
</ErrorBoundary>