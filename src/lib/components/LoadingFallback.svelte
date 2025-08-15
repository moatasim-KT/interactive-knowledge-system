<script lang="ts">

	import { Card, LoadingSpinner } from './ui';

	interface Props {
		message?: string;
		size?: 'sm' | 'md' | 'lg';
		showCard?: boolean;
		timeout?: number;
		onTimeout?: () => void;
		showProgress?: boolean;
		progress?: number;
	}

	let {
		message = 'Loading...',
		size = 'md',
		showCard = true,
		timeout = 30000, // 30 seconds default timeout
		onTimeout,
		showProgress = false,
		progress = 0
	}: Props = $props();

	let hasTimedOut = $state(false);
	let timeoutId: number | null = null;

	function handleTimeout() {
		hasTimedOut = true;
		if (onTimeout) {
			onTimeout();
		}
	}

	$effect(() => {
		if (timeout > 0) {
			timeoutId = window.setTimeout(handleTimeout, timeout);
		}

		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	});
</script>

{#if hasTimedOut}
	{#if showCard}
		<Card variant="outlined" padding="lg" class="loading-fallback timeout">
			<div class="text-center">
				<div class="text-3xl mb-3">⏱️</div>
				<h4 class="text-md font-medium mb-2">Loading Timeout</h4>
				<p class="text-sm text-text-secondary mb-4">
					This is taking longer than expected. Please check your connection and try again.
				</p>
				<button 
					onclick={() => window.location.reload()} 
					class="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
				>
					Refresh Page
				</button>
			</div>
		</Card>
	{:else}
		<div class="loading-fallback-simple timeout">
			<div class="text-2xl mb-2">⏱️</div>
			<p class="text-sm text-text-secondary">Loading timeout - please refresh</p>
		</div>
	{/if}
{:else if showCard}
	<Card variant="outlined" padding="lg" class="loading-fallback">
		<div class="text-center">
			<LoadingSpinner {size} class="mb-3" />
			<p class="text-sm text-text-secondary mb-2">{message}</p>
			{#if showProgress && progress > 0}
				<div class="progress-bar">
					<div class="progress-fill" style="width: {progress}%"></div>
				</div>
				<p class="text-xs text-text-secondary mt-1">{Math.round(progress)}%</p>
			{/if}
		</div>
	</Card>
{:else}
	<div class="loading-fallback-simple">
		<LoadingSpinner {size} class="mb-2" />
		<p class="text-sm text-text-secondary">{message}</p>
		{#if showProgress && progress > 0}
			<div class="progress-bar small">
				<div class="progress-fill" style="width: {progress}%"></div>
			</div>
		{/if}
	</div>
{/if}

<style>
    

    .loading-fallback-simple {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        text-align: center;
    }

    .timeout {
        border-color: var(--color-warning-300, #fcd34d);
        background-color: var(--color-warning-50, #fffbeb);
    }

    .progress-bar {
        width: 100%;
        height: 8px;
        background-color: var(--color-gray-200, #e5e7eb);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 0.5rem;
    }

    .progress-bar.small {
        height: 4px;
        margin-top: 0.25rem;
    }

    .progress-fill {
        height: 100%;
        background-color: var(--color-primary-500, #3b82f6);
        transition: width 0.3s ease;
        border-radius: 4px;
    }

    :global(.text-text-secondary) {
        color: var(--color-text-secondary, #6b7280);
    }

    :global(.bg-primary-500) {
        background-color: var(--color-primary-500, #3b82f6);
    }

    :global(.hover\:bg-primary-600:hover) {
        background-color: var(--color-primary-600, #2563eb);
    }
</style>