<script lang="ts">
	interface Props {
		src?: string;
		alt?: string;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
		fallback?: string;
		status?: 'online' | 'offline' | 'away' | 'busy';
		class?: string;
	}

	let {
		src,
		alt = '',
		size = 'md',
		fallback,
		status,
		class: className = '',
		...rest
	}: Props = $props();

	let image_error = $state(false);
	let image_loaded = $state(false);

	const size_classes = {
		xs: 'w-6 h-6 text-xs',
		sm: 'w-8 h-8 text-sm',
		md: 'w-10 h-10 text-base',
		lg: 'w-12 h-12 text-lg',
		xl: 'w-16 h-16 text-xl',
		'2xl': 'w-20 h-20 text-2xl'
	};

	const status_colors = {
		online: 'bg-success-500',
		offline: 'bg-gray-400',
		away: 'bg-warning-500',
		busy: 'bg-error-500'
	};

	const status_sizes = {
		xs: 'w-1.5 h-1.5',
		sm: 'w-2 h-2',
		md: 'w-2.5 h-2.5',
		lg: 'w-3 h-3',
		xl: 'w-4 h-4',
		'2xl': 'w-5 h-5'
	};

	function handle_image_error() {
		image_error = true;
	}

	function handle_image_load() {
		image_loaded = true;
	}

	function get_initials(name: string): string {
		return name
			.split(' ')
			.map((word) => word.charAt(0))
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	const classes = $derived(() =>
		[
			'relative inline-flex items-center justify-center rounded-full bg-surface-secondary text-text-secondary font-medium overflow-hidden transition-all',
			size_classes[size],
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class={classes} {...rest}>
	{#if src && !image_error}
		<img
			{src}
			{alt}
			class="w-full h-full object-cover transition-opacity duration-300"
			class:opacity-0={!image_loaded}
			class:opacity-100={imageLoaded}
			onerror={handleImageError}
			onload={handleImageLoad}
		/>
	{:else if fallback}
		<span class="select-none">
			{get_initials(fallback)}
		</span>
	{:else}
		<!-- Default avatar icon -->
		<svg class="w-3/5 h-3/5 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
			<path
				fill-rule="evenodd"
				d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
				clip-rule="evenodd"
			/>
		</svg>
	{/if}

	<!-- Status indicator -->
	{#if status}
		<div
			class={`absolute bottom-0 right-0 rounded-full border-2 border-surface ${status_colors[status]} ${status_sizes[size]}`}
			aria-label={`Status: ${status}`}
		></div>
	{/if}
</div>

<style>
	:global(.bg-surface) {
		background-color: var(--color-surface);
	}
	:global(.bg-surface-secondary) {
		background-color: var(--color-surface-secondary);
	}
	:global(.text-text-secondary) {
		color: var(--color-text-secondary);
	}
	:global(.text-text-muted) {
		color: var(--color-text-muted);
	}

	:global(.bg-success-500) {
		background-color: var(--color-success-500);
	}
	:global(.bg-warning-500) {
		background-color: var(--color-warning-500);
	}
	:global(.bg-error-500) {
		background-color: var(--color-error-500);
	}
	:global(.bg-gray-400) {
		background-color: var(--color-gray-400);
	}

	/* Size utilities */
	:global(.w-6) {
		width: 1.5rem;
	}
	:global(.h-6) {
		height: 1.5rem;
	}
	:global(.w-8) {
		width: 2rem;
	}
	:global(.h-8) {
		height: 2rem;
	}
	:global(.w-10) {
		width: 2.5rem;
	}
	:global(.h-10) {
		height: 2.5rem;
	}
	:global(.w-12) {
		width: 3rem;
	}
	:global(.h-12) {
		height: 3rem;
	}
	:global(.w-16) {
		width: 4rem;
	}
	:global(.h-16) {
		height: 4rem;
	}
	:global(.w-20) {
		width: 5rem;
	}
	:global(.h-20) {
		height: 5rem;
	}

	:global(.w-1\.5) {
		width: 0.375rem;
	}
	:global(.h-1\.5) {
		height: 0.375rem;
	}
	:global(.w-2) {
		width: 0.5rem;
	}
	:global(.h-2) {
		height: 0.5rem;
	}
	:global(.w-2\.5) {
		width: 0.625rem;
	}
	:global(.h-2\.5) {
		height: 0.625rem;
	}
	:global(.w-3) {
		width: 0.75rem;
	}
	:global(.h-3) {
		height: 0.75rem;
	}
	:global(.w-4) {
		width: 1rem;
	}
	:global(.h-4) {
		height: 1rem;
	}
	:global(.w-5) {
		width: 1.25rem;
	}
	:global(.h-5) {
		height: 1.25rem;
	}

	:global(.w-3\/5) {
		width: 60%;
	}
	:global(.h-3\/5) {
		height: 60%;
	}

	:global(.w-full) {
		width: 100%;
	}
	:global(.h-full) {
		height: 100%;
	}

	/* Layout utilities */
	:global(.relative) {
		position: relative;
	}
	:global(.absolute) {
		position: absolute;
	}
	:global(.bottom-0) {
		bottom: 0;
	}
	:global(.right-0) {
		right: 0;
	}

	:global(.inline-flex) {
		display: inline-flex;
	}
	:global(.items-center) {
		align-items: center;
	}
	:global(.justify-center) {
		justify-content: center;
	}

	:global(.rounded-full) {
		border-radius: 9999px;
	}
	:global(.overflow-hidden) {
		overflow: hidden;
	}
	:global(.object-cover) {
		object-fit: cover;
	}
	:global(.select-none) {
		user-select: none;
	}

	:global(.border-2) {
		border-width: 2px;
	}

	:global(.opacity-0) {
		opacity: 0;
	}
	:global(.opacity-100) {
		opacity: 1;
	}

	:global(.duration-300) {
		transition-duration: 300ms;
	}
</style>
