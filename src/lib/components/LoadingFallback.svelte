<script lang="ts">
	import { Card, LoadingSpinner } from './ui';

	interface Props {
		message?: string;
		size?: 'sm' | 'md' | 'lg';
		showCard?: boolean;
	}

	let {
		message = 'Loading...',
		size = 'md',
		showCard = true
	}: Props = $props();
</script>

{#if showCard}
	<Card variant="outline" padding="lg" class="loading-fallback">
		<div class="text-center">
			<LoadingSpinner {size} class="mb-3" />
			<p class="text-sm text-text-secondary">{message}</p>
		</div>
	</Card>
{:else}
	<div class="loading-fallback-simple">
		<LoadingSpinner {size} class="mb-2" />
		<p class="text-sm text-text-secondary">{message}</p>
	</div>
{/if}

<style>
	.loading-fallback {
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.loading-fallback-simple {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		text-align: center;
	}
</style>