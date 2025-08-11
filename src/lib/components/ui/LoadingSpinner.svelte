<script lang="ts">
	interface Props {
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		color?: 'primary' | 'secondary' | 'white' | 'current';
		class?: string;
	}

	let { size = 'md', color = 'primary', class: className = '' }: Props = $props();

	const size_classes = {
		xs: 'w-3 h-3',
		sm: 'w-4 h-4',
		md: 'w-6 h-6',
		lg: 'w-8 h-8',
		xl: 'w-12 h-12'
	};

	const color_classes = {
		primary: 'text-primary-600',
		secondary: 'text-secondary-600',
		white: 'text-white',
		current: 'text-current'
	};

	const classes = $derived(() =>
		['animate-spin', size_classes[size], color_classes[color], className].filter(Boolean).join(' ')
	);
</script>

<svg class={classes} fill="none" viewBox="0 0 24 24" aria-label="Loading" role="status">
	<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
	<path
		class="opacity-75"
		fill="currentColor"
		d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
	></path>
</svg>

<style>
	:global(.text-primary-600) {
		color: var(--color-primary-600);
	}
	:global(.text-secondary-600) {
		color: var(--color-secondary-600);
	}
</style>
