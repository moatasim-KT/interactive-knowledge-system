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

		// Auto-close sidebar on mobile when switching from larger screen
		if (is_mobile && sidebarOpen && window_width < 640) {
			sidebarOpen = false;
		}
		
		// Auto-open sidebar on desktop
		if (window_width >= 1024 && !sidebarOpen) {
			sidebarOpen = true;
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

	// Touch gesture support for sidebar
	let touch_start_x = 0;
	let touch_start_y = 0;
	let is_swiping = false;

	function handle_touch_start(event: TouchEvent) {
		if (!is_mobile) return;
		
		const touch = event.touches[0];
		touch_start_x = touch.clientX;
		touch_start_y = touch.clientY;
		is_swiping = false;
	}

	function handle_touch_move(event: TouchEvent) {
		if (!is_mobile || !touch_start_x) return;
		
		const touch = event.touches[0];
		const diff_x = touch.clientX - touch_start_x;
		const diff_y = touch.clientY - touch_start_y;
		
		// Check if this is a horizontal swipe
		if (Math.abs(diff_x) > Math.abs(diff_y) && Math.abs(diff_x) > 10) {
			is_swiping = true;
			
			// Swipe right from left edge to open sidebar
			if (touch_start_x < 20 && diff_x > 50 && !sidebarOpen) {
				sidebarOpen = true;
			}
			// Swipe left to close sidebar
			else if (diff_x < -50 && sidebarOpen) {
				sidebarOpen = false;
			}
		}
	}

	function handle_touch_end() {
		touch_start_x = 0;
		touch_start_y = 0;
		is_swiping = false;
	}

	$effect(() => {
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
			'safe-area-inset-left',
			sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
			is_mobile ? 'w-full max-w-sm mobile-scroll' : '',
			'touch-pan-y' // Enable vertical panning for touch devices
		].join(' ')
	);

	let main_classes = $derived(
		[
			'flex-1 flex flex-col',
			'transition-all duration-300',
			'safe-area-inset-right',
			'mobile-scroll',
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

<div 
	class={layout_classes}
	ontouchstart={handle_touch_start}
	ontouchmove={handle_touch_move}
	ontouchend={handle_touch_end}
>
	<!-- Mobile Overlay -->
	{#if is_mobile}
		<div
			class={overlay_classes}
			role="button"
			tabindex="0"
			aria-label="Close sidebar overlay"
			onclick={close_sidebar}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && close_sidebar()}
		></div>
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
			<header class="bg-surface border-b border-border sticky top-0 z-sticky safe-area-inset-top">
				<!-- Mobile Header -->
				<div class="flex items-center justify-between p-4 lg:hidden">
					<button
						class="touch-target p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-md transition-colors"
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
					
					<!-- Mobile header content (simplified) -->
					<div class="flex-1 text-center">
						<h1 class="text-lg font-semibold text-text-primary truncate">
							Interactive Knowledge System
						</h1>
					</div>
					
					<!-- Mobile actions placeholder -->
					<div class="w-10"></div>
				</div>

				<!-- Desktop Header Content -->
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

	/* Touch gesture support */
	.touch-pan-y {
		touch-action: pan-y;
	}

	/* Mobile scroll optimization */
	.mobile-scroll {
		-webkit-overflow-scrolling: touch;
		scroll-behavior: smooth;
	}

	/* Safe area support */
	.safe-area-inset-left {
		padding-left: env(safe-area-inset-left);
	}
	.safe-area-inset-right {
		padding-right: env(safe-area-inset-right);
	}
	.safe-area-inset-top {
		padding-top: env(safe-area-inset-top);
	}

	/* Touch targets */
	.touch-target {
		min-height: 44px;
		min-width: 44px;
	}

	/* Layout utilities */
	.flex-1 {
		flex: 1 1 0%;
	}
	.text-center {
		text-align: center;
	}
	.truncate {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
