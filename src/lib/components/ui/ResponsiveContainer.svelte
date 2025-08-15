<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
		padding?: 'none' | 'sm' | 'md' | 'lg';
		center?: boolean;
		class?: string;
		children?: any;
	}

	let {
		maxWidth = 'full',
		padding = 'md',
		center = true,
		class: className = '',
		children
	}: Props = $props();

	let screenSize = $state<'mobile' | 'tablet' | 'desktop'>('desktop');
	let windowWidth = $state(0);

	function updateScreenSize() {
		windowWidth = window.innerWidth;
		if (windowWidth < 640) {
			screenSize = 'mobile';
		} else if (windowWidth < 1024) {
			screenSize = 'tablet';
		} else {
			screenSize = 'desktop';
		}
	}

	$effect(() => {
		updateScreenSize();
		window.addEventListener('resize', updateScreenSize);
		return () => window.removeEventListener('resize', updateScreenSize);
	});

	const maxWidthClasses = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		'2xl': 'max-w-2xl',
		full: 'max-w-full'
	};

	const paddingClasses = {
		none: '',
		sm: 'px-3 mobile:px-2',
		md: 'px-4 mobile:px-3',
		lg: 'px-6 mobile:px-4'
	};

	const containerClasses = $derived(() =>
		[
			'w-full',
			maxWidthClasses[maxWidth],
			paddingClasses[padding],
			center ? 'mx-auto' : '',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<svelte:window bind:innerWidth={windowWidth} />

<div class={containerClasses} data-screen-size={screenSize}>
	{@render children?.()}
</div>

<style>
	/* Responsive container utilities */
	.max-w-sm {
		max-width: 24rem;
	}
	.max-w-md {
		max-width: 28rem;
	}
	.max-w-lg {
		max-width: 32rem;
	}
	.max-w-xl {
		max-width: 36rem;
	}
	.max-w-2xl {
		max-width: 42rem;
	}
	.max-w-full {
		max-width: 100%;
	}

	.w-full {
		width: 100%;
	}
	.mx-auto {
		margin-left: auto;
		margin-right: auto;
	}

	.px-2 {
		padding-left: 0.5rem;
		padding-right: 0.5rem;
	}
	.px-3 {
		padding-left: 0.75rem;
		padding-right: 0.75rem;
	}
	.px-4 {
		padding-left: 1rem;
		padding-right: 1rem;
	}
	.px-6 {
		padding-left: 1.5rem;
		padding-right: 1.5rem;
	}

	/* Mobile-specific padding */
	@media (max-width: 639px) {
		.mobile\:px-2 {
			padding-left: 0.5rem;
			padding-right: 0.5rem;
		}
		.mobile\:px-3 {
			padding-left: 0.75rem;
			padding-right: 0.75rem;
		}
		.mobile\:px-4 {
			padding-left: 1rem;
			padding-right: 1rem;
		}
	}
</style>