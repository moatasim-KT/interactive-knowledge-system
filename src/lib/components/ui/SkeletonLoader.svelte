<script lang="ts">
	interface Props {
		variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
		width?: string | number;
		height?: string | number;
		lines?: number;
		class?: string;
	}

	let { variant = 'text', width, height, lines = 1, class: className = '' }: Props = $props();

	const base_classes = 'animate-pulse bg-surface-secondary';

	const variant_classes = {
		text: 'rounded',
		circular: 'rounded-full',
		rectangular: '',
		rounded: 'rounded-lg'
	};

	const default_sizes = {
		text: { width: '100%', height: '1rem' },
		circular: { width: '2.5rem', height: '2.5rem' },
		rectangular: { width: '100%', height: '8rem' },
		rounded: { width: '100%', height: '6rem' }
	};

	const final_width = $derived(() => width || default_sizes[variant].width);
	const final_height = $derived(() => height || default_sizes[variant].height);

	const classes = $derived(() =>
		[base_classes, variant_classes[variant], className].filter(Boolean).join(' ')
	);

	const style = $derived(
		() =>
			`width: ${typeof final_width === 'number' ? final_width + 'px' : final_width}; height: ${typeof final_height === 'number' ? final_height + 'px' : final_height};`
	);
</script>

{#if variant === 'text' && lines > 1}
	<div class="space-y-2">
		{#each Array(lines) as _, i (i)}
			<div class={classes} style={i === lines - 1 ? `${style} width: 75%;` : style}></div>
		{/each}
	</div>
{:else}
	<div class={classes} {style}></div>
{/if}

<style>
	:global(.bg-surface-secondary) {
		background-color: var(--color-surface-secondary);
	}

	.space-y-2 > * + * {
		margin-top: 0.5rem;
	}
</style>
