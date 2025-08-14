<script lang="ts">
	import { ErrorBoundary, FallbackComponent } from './index.js';
	import type { ErrorContext } from '../utils/errorHandler.js';

	interface Props {
		component: any;
		props?: Record<string, any>;
		context?: Partial<ErrorContext>;
		fallbackTitle?: string;
		fallbackMessage?: string;
		enableRetry?: boolean;
		showDetails?: boolean;
		onError?: (error: Error, errorInfo: any) => void;
		onRetry?: () => void;
	}

	let {
		component,
		props = {},
		context = {},
		fallbackTitle = 'Component Error',
		fallbackMessage = 'This component failed to load properly.',
		enableRetry = true,
		showDetails = false,
		onError,
		onRetry
	}: Props = $props();

	let componentKey = $state(0);

	function handleRetry() {
		// Force component re-render by changing key
		componentKey++;
		if (onRetry) onRetry();
	}

	function handleError(error: Error, errorInfo: any) {
		console.error('SafeComponent caught error:', error, errorInfo);
		if (onError) onError(error, errorInfo);
	}
</script>

<ErrorBoundary 
	{context} 
	{showDetails}
	{enableRetry}
	onError={handleError}
	onRetry={handleRetry}
>
	{#snippet fallback()}
		<FallbackComponent
			title={fallbackTitle}
			message={fallbackMessage}
			showRetry={enableRetry}
			onretry={handleRetry}
		/>
	{/snippet}

	{#key componentKey}
		{#if component}
			{@const Component = component}
			<Component {...props} />
		{/if}
	{/key}
</ErrorBoundary>