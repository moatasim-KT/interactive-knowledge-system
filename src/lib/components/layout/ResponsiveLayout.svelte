<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		sidebarOpen?: boolean;
		sidebarWidth?: string;
		breakpoint?: number;
		children?: any;
		sidebar?: any;
		header?: any;
		footer?: any;
	}

	let {
		sidebarOpen = $bindable(true),
		sidebarWidth = '280px',
		breakpoint = 768,
		children,
		sidebar,
		header,
		footer
	}: Props = $props();

	let is_mobile = $state(false);
	let is_tablet = $state(false);
	let window_width = $state(0);

	function update_screen_size() {
		window_width = window.innerWidth;
		is_mobile = window_width < 640;
		is_tablet = window_width >= 640 && window_width < 1024;

		// Auto-close sidebar on mobile
		if (is_mobile && sidebarOpen) {
			sidebarOpen = false;
		}
	}

	function toggle_sidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function close_sidebar() {
		if (is_mobile) {
			sidebarOpen = false;
		}
	}

	onMount(() => {
		update_screen_size();
		window.addEventListener('resize', update_screen_size);

		return () => {
			window.removeEventListener('resize', update_screen_size);
		};
	});

	const layout_classes = [
		'min-h-screen bg-background transition-all duration-300',
		'flex flex-col'
	].join(' ');

	let sidebar_classes = $derived(
		[
			'fixed lg:relative inset-y-0 left-0 z-fixed',
			'bg-surface border-r border-border',
			'transform transition-transform duration-300 ease-in-out',
			'flex flex-col',
			sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
			is_mobile ? 'w-full max-w-sm' : ''
		].join(' ')
	);

	let main_classes = $derived(
		[
			'flex-1 flex flex-col',
			'transition-all duration-300',
			!is_mobile && sidebarOpen ? `lg:ml-[${sidebarWidth}]` : ''
		].join(' ')
	);

	let overlay_classes = $derived(
		[
			'fixed inset-0 bg-black bg-opacity-50 z-40',
			'transition-opacity duration-300',
			is_mobile && sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
		].join(' ')
	);
</script>

<svelte:window bind:innerWidth={window_width} />

<div class={layout_classes}>
	<!-- Mobile Overlay -->
	{#if is_mobile}
		<div class={overlay_classes} onclick={close_sidebar} aria-hidden="true"></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class={sidebar_classes}
		style="width: {is_mobile ? '100%' : sidebarWidth}; max-width: {is_mobile
			? '20rem'
			: sidebarWidth};"
		aria-label="Sidebar navigation"
	>
		<!-- Mobile Close Button -->
		{#if is_mobile}
			<div class="flex justify-end p-4 border-b border-border">
				<button
					class="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-md transition-colors"
					onclick={close_sidebar}
					aria-label="Close sidebar"
				>
					<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</div>
		{/if}

		<!-- Sidebar Content -->
		<div class="flex-1 overflow-y-auto">
			{@render sidebar?.()}
		</div>
	</aside>

	<!-- Main Content Area -->
	<div class={main_classes}>
		<!-- Header -->
		{#if header}
			<header class="bg-surface border-b border-border sticky top-0 z-sticky">
				<!-- Mobile Menu Button -->
				<div class="flex items-center gap-4 p-4 lg:hidden">
					<button
						class="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-md transition-colors"
						onclick={toggle_sidebar}
						aria-label="Toggle sidebar"
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				</div>

				<!-- Header Content -->
				<div class="hidden lg:block">
					{@render header?.()}
				</div>
			</header>
		{/if}

		<!-- Main Content -->
		<main class="flex-1 overflow-y-auto">
			{@render children?.()}
		</main>

		<!-- Footer -->
		{#if footer}
			<footer class="bg-surface border-t border-border">
				{@render footer?.()}
			</footer>
		{/if}
	</div>
</div>

<style>
	:global(.bg-background) {
		background-color: var(--color-background);
	}
	:global(.bg-surface) {
		background-color: var(--color-surface);
	}
	:global(.border-border) {
		border-color: var(--color-border);
	}
	:global(.text-text-primary) {
		color: var(--color-text-primary);
	}
	:global(.text-text-muted) {
		color: var(--color-text-muted);
	}
	:global(.hover\:text-text-primary:hover) {
		color: var(--color-text-primary);
	}
	:global(.hover\:bg-surface-secondary:hover) {
		background-color: var(--color-surface-secondary);
	}

	/* Responsive utilities */
	@media (min-width: 640px) {
		:global(.sm\:max-w-sm) {
			max-width: 24rem;
		}
	}

	@media (min-width: 1024px) {
		:global(.lg\:relative) {
			position: relative;
		}
		:global(.lg\:translate-x-0) {
			transform: translateX(0);
		}
		:global(.lg\:block) {
			display: block;
		}
		:global(.lg\:hidden) {
			display: none;
		}
	}

	/* Custom margin for main content */
	.lg\:ml-\[280px\] {
		margin-left: 280px;
	}

	@media (min-width: 1024px) {
		.lg\:ml-\[280px\] {
			margin-left: 280px;
		}
	}
</style>
