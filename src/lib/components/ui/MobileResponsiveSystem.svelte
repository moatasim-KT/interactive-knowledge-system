<script lang="ts">
	import { onMount } from 'svelte';
	import type { ComponentProps } from 'svelte';

	interface Props {
		children?: any;
		breakpoints?: {
			mobile: number;
			tablet: number;
			desktop: number;
		};
		enableTouchOptimization?: boolean;
		enableGestures?: boolean;
		adaptiveLayout?: boolean;
	}

	let {
		children,
		breakpoints = {
			mobile: 768,
			tablet: 1024,
			desktop: 1200
		},
		enableTouchOptimization = true,
		enableGestures = true,
		adaptiveLayout = true
	}: Props = $props();

	// Reactive screen size detection
	let screenWidth = $state(0);
	let screenHeight = $state(0);
	let isMobile = $state(false);
	let isTablet = $state(false);
	let isDesktop = $state(false);
	let orientation = $state<'portrait' | 'landscape'>('portrait');
	let touchDevice = $state(false);

	// Touch and gesture state
	let touchStartX = $state(0);
	let touchStartY = $state(0);
	let touchEndX = $state(0);
	let touchEndY = $state(0);
	let isSwipeGesture = $state(false);
	let swipeDirection = $state<'left' | 'right' | 'up' | 'down' | null>(null);

	// Viewport and device capabilities
	let viewportHeight = $state(0);
	let safeAreaInsets = $state({
		top: 0,
		right: 0,
		bottom: 0,
		left: 0
	});

	$effect(() => {
		updateScreenSize();
		detectTouchDevice();
		updateSafeAreaInsets();

		// Set up event listeners
		window.addEventListener('resize', updateScreenSize);
		window.addEventListener('orientationchange', handleOrientationChange);

		// Touch event listeners for gesture detection
		if (enableGestures) {
			document.addEventListener('touchstart', handleTouchStart, { passive: true });
			document.addEventListener('touchend', handleTouchEnd, { passive: true });
		}

		return () => {
			window.removeEventListener('resize', updateScreenSize);
			window.removeEventListener('orientationchange', handleOrientationChange);
			
			if (enableGestures) {
				document.removeEventListener('touchstart', handleTouchStart);
				document.removeEventListener('touchend', handleTouchEnd);
			}
		};
	});

	function updateScreenSize() {
		screenWidth = window.innerWidth;
		screenHeight = window.innerHeight;
		viewportHeight = window.visualViewport?.height || window.innerHeight;

		// Update device type flags
		isMobile = screenWidth < breakpoints.mobile;
		isTablet = screenWidth >= breakpoints.mobile && screenWidth < breakpoints.desktop;
		isDesktop = screenWidth >= breakpoints.desktop;

		// Update orientation
		orientation = screenWidth > screenHeight ? 'landscape' : 'portrait';

		// Update CSS custom properties for responsive design
		document.documentElement.style.setProperty('--screen-width', `${screenWidth}px`);
		document.documentElement.style.setProperty('--screen-height', `${screenHeight}px`);
		document.documentElement.style.setProperty('--viewport-height', `${viewportHeight}px`);
		document.documentElement.style.setProperty('--is-mobile', isMobile ? '1' : '0');
		document.documentElement.style.setProperty('--is-tablet', isTablet ? '1' : '0');
		document.documentElement.style.setProperty('--is-desktop', isDesktop ? '1' : '0');
	}

	function detectTouchDevice() {
		touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		document.documentElement.style.setProperty('--is-touch', touchDevice ? '1' : '0');
	}

	function updateSafeAreaInsets() {
		// Get safe area insets from CSS environment variables
		const computedStyle = getComputedStyle(document.documentElement);
		
		safeAreaInsets = {
			top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top') || '0'),
			right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right') || '0'),
			bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom') || '0'),
			left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left') || '0')
		};

		// Set CSS custom properties
		document.documentElement.style.setProperty('--safe-area-top', `${safeAreaInsets.top}px`);
		document.documentElement.style.setProperty('--safe-area-right', `${safeAreaInsets.right}px`);
		document.documentElement.style.setProperty('--safe-area-bottom', `${safeAreaInsets.bottom}px`);
		document.documentElement.style.setProperty('--safe-area-left', `${safeAreaInsets.left}px`);
	}

	function handleOrientationChange() {
		// Delay to allow for orientation change to complete
		setTimeout(() => {
			updateScreenSize();
			updateSafeAreaInsets();
		}, 100);
	}

	function handleTouchStart(event: TouchEvent) {
		if (!enableGestures || event.touches.length !== 1) return;

		const touch = event.touches[0];
		touchStartX = touch.clientX;
		touchStartY = touch.clientY;
		isSwipeGesture = false;
		swipeDirection = null;
	}

	function handleTouchEnd(event: TouchEvent) {
		if (!enableGestures || event.changedTouches.length !== 1) return;

		const touch = event.changedTouches[0];
		touchEndX = touch.clientX;
		touchEndY = touch.clientY;

		detectSwipeGesture();
	}

	function detectSwipeGesture() {
		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;
		const minSwipeDistance = 50;
		const maxSwipeTime = 300;

		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		if (distance < minSwipeDistance) return;

		// Determine swipe direction
		if (Math.abs(deltaX) > Math.abs(deltaY)) {
			// Horizontal swipe
			swipeDirection = deltaX > 0 ? 'right' : 'left';
		} else {
			// Vertical swipe
			swipeDirection = deltaY > 0 ? 'down' : 'up';
		}

		isSwipeGesture = true;

		// Dispatch custom swipe event
		const swipeEvent = new CustomEvent('swipe', {
			detail: {
				direction: swipeDirection,
				distance,
				deltaX,
				deltaY,
				startX: touchStartX,
				startY: touchStartY,
				endX: touchEndX,
				endY: touchEndY
			}
		});

		document.dispatchEvent(swipeEvent);

		// Reset after a short delay
		setTimeout(() => {
			isSwipeGesture = false;
			swipeDirection = null;
		}, 100);
	}

	// Utility functions for responsive behavior
	function getResponsiveValue<T>(values: { mobile?: T; tablet?: T; desktop?: T; default: T }): T {
		if (isMobile && values.mobile !== undefined) return values.mobile;
		if (isTablet && values.tablet !== undefined) return values.tablet;
		if (isDesktop && values.desktop !== undefined) return values.desktop;
		return values.default;
	}

	function getOptimalTouchTarget(): number {
		// Return optimal touch target size based on device
		return isMobile ? 44 : 40; // 44px for mobile (Apple HIG), 40px for desktop
	}

	function getOptimalSpacing(): number {
		// Return optimal spacing based on device
		return getResponsiveValue({
			mobile: 16,
			tablet: 20,
			desktop: 24,
			default: 16
		});
	}

	// Export reactive values and utilities for child components
	export const responsiveContext = {
		// Screen information
		screenWidth,
		screenHeight,
		viewportHeight,
		isMobile,
		isTablet,
		isDesktop,
		orientation,
		touchDevice,
		
		// Safe area insets
		safeAreaInsets,
		
		// Gesture information
		isSwipeGesture,
		swipeDirection,
		
		// Utility functions
		getResponsiveValue,
		getOptimalTouchTarget,
		getOptimalSpacing
	};
</script>

<!-- Provide responsive context to child components -->
<div 
	class="mobile-responsive-system"
	class:mobile={isMobile}
	class:tablet={isTablet}
	class:desktop={isDesktop}
	class:portrait={orientation === 'portrait'}
	class:landscape={orientation === 'landscape'}
	class:touch-device={touchDevice}
	class:touch-optimized={enableTouchOptimization}
	class:gestures-enabled={enableGestures}
	class:adaptive-layout={adaptiveLayout}
	style="
		--current-screen-width: {screenWidth}px;
		--current-screen-height: {screenHeight}px;
		--current-viewport-height: {viewportHeight}px;
		--optimal-touch-target: {getOptimalTouchTarget()}px;
		--optimal-spacing: {getOptimalSpacing()}px;
	"
>
	{@render children?.()}
</div>

<style>
	.mobile-responsive-system {
		/* Base responsive system styles */
		width: 100%;
		min-height: 100vh;
		min-height: 100dvh; /* Dynamic viewport height for mobile */
		
		/* CSS custom properties for responsive design */
		--breakpoint-mobile: 768px;
		--breakpoint-tablet: 1024px;
		--breakpoint-desktop: 1200px;
		
		/* Touch target sizes */
		--touch-target-min: 44px;
		--touch-target-comfortable: 48px;
		
		/* Spacing scale */
		--spacing-xs: 0.25rem;
		--spacing-sm: 0.5rem;
		--spacing-md: 1rem;
		--spacing-lg: 1.5rem;
		--spacing-xl: 2rem;
		--spacing-2xl: 3rem;
		
		/* Typography scale */
		--text-xs: 0.75rem;
		--text-sm: 0.875rem;
		--text-base: 1rem;
		--text-lg: 1.125rem;
		--text-xl: 1.25rem;
		--text-2xl: 1.5rem;
		--text-3xl: 1.875rem;
		--text-4xl: 2.25rem;
		
		/* Safe area support */
		padding-top: env(safe-area-inset-top);
		padding-right: env(safe-area-inset-right);
		padding-bottom: env(safe-area-inset-bottom);
		padding-left: env(safe-area-inset-left);
	}

	/* Mobile-specific styles */
	.mobile-responsive-system.mobile {
		/* Optimize for mobile */
		--base-font-size: 16px; /* Prevent zoom on iOS */
		--line-height-base: 1.5;
		--border-radius-base: 8px;
		
		/* Mobile spacing */
		--container-padding: var(--spacing-md);
		--section-spacing: var(--spacing-lg);
		--element-spacing: var(--spacing-sm);
	}

	/* Tablet-specific styles */
	.mobile-responsive-system.tablet {
		--container-padding: var(--spacing-lg);
		--section-spacing: var(--spacing-xl);
		--element-spacing: var(--spacing-md);
	}

	/* Desktop-specific styles */
	.mobile-responsive-system.desktop {
		--container-padding: var(--spacing-xl);
		--section-spacing: var(--spacing-2xl);
		--element-spacing: var(--spacing-lg);
	}

	/* Touch optimization */
	.mobile-responsive-system.touch-optimized {
		/* Larger touch targets */
		--button-min-height: var(--touch-target-min);
		--input-min-height: var(--touch-target-min);
		--link-min-height: var(--touch-target-min);
		
		/* Better touch feedback */
		--touch-feedback-duration: 0.1s;
		--touch-feedback-scale: 0.95;
	}

	/* Touch device specific optimizations */
	.mobile-responsive-system.touch-device {
		/* Remove hover states that don't work on touch */
		--hover-transition: none;
		
		/* Optimize scrolling */
		-webkit-overflow-scrolling: touch;
		scroll-behavior: smooth;
	}

	/* Gesture support */
	.mobile-responsive-system.gestures-enabled {
		/* Enable hardware acceleration for smooth gestures */
		transform: translateZ(0);
		will-change: transform;
	}

	/* Adaptive layout */
	.mobile-responsive-system.adaptive-layout {
		/* Flexible grid system */
		--grid-columns-mobile: 1;
		--grid-columns-tablet: 2;
		--grid-columns-desktop: 3;
		
		/* Adaptive container widths */
		--container-width-mobile: 100%;
		--container-width-tablet: 90%;
		--container-width-desktop: 1200px;
	}

	/* Orientation-specific styles */
	.mobile-responsive-system.portrait {
		/* Portrait-specific optimizations */
		--content-max-width: 100%;
		--sidebar-width: 100%;
	}

	.mobile-responsive-system.landscape {
		/* Landscape-specific optimizations */
		--content-max-width: 70%;
		--sidebar-width: 30%;
	}

	/* High contrast mode support */
	@media (prefers-contrast: high) {
		.mobile-responsive-system {
			--border-width: 2px;
			--focus-ring-width: 3px;
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.mobile-responsive-system {
			--animation-duration: 0.01ms;
			--transition-duration: 0.01ms;
		}
		
		.mobile-responsive-system * {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}

	/* Dark mode support */
	@media (prefers-color-scheme: dark) {
		.mobile-responsive-system {
			--color-background: #1a1a1a;
			--color-surface: #2d2d2d;
			--color-text: #ffffff;
			--color-text-secondary: #a0a0a0;
		}
	}

	/* Print styles */
	@media print {
		.mobile-responsive-system {
			/* Optimize for printing */
			--font-size-base: 12pt;
			--line-height-base: 1.4;
			--color-background: white;
			--color-text: black;
		}
	}

	/* Responsive utilities */
	.mobile-responsive-system :global(.mobile-only) {
		display: block;
	}
	
	.mobile-responsive-system :global(.tablet-only) {
		display: none;
	}
	
	.mobile-responsive-system :global(.desktop-only) {
		display: none;
	}

	.mobile-responsive-system.tablet :global(.mobile-only) {
		display: none;
	}
	
	.mobile-responsive-system.tablet :global(.tablet-only) {
		display: block;
	}
	
	.mobile-responsive-system.tablet :global(.desktop-only) {
		display: none;
	}

	.mobile-responsive-system.desktop :global(.mobile-only) {
		display: none;
	}
	
	.mobile-responsive-system.desktop :global(.tablet-only) {
		display: none;
	}
	
	.mobile-responsive-system.desktop :global(.desktop-only) {
		display: block;
	}

	/* Touch-friendly interactive elements */
	.mobile-responsive-system.touch-optimized :global(button),
	.mobile-responsive-system.touch-optimized :global(input),
	.mobile-responsive-system.touch-optimized :global(select),
	.mobile-responsive-system.touch-optimized :global(textarea) {
		min-height: var(--touch-target-min);
		min-width: var(--touch-target-min);
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--border-radius-base, 8px);
		font-size: var(--base-font-size, 16px);
	}

	/* Touch feedback */
	.mobile-responsive-system.touch-optimized :global(button:active),
	.mobile-responsive-system.touch-optimized :global(.touchable:active) {
		transform: scale(var(--touch-feedback-scale, 0.95));
		transition: transform var(--touch-feedback-duration, 0.1s) ease;
	}

	/* Improved focus indicators for keyboard navigation */
	.mobile-responsive-system :global(*:focus-visible) {
		outline: var(--focus-ring-width, 2px) solid var(--color-primary, #007bff);
		outline-offset: 2px;
		border-radius: var(--border-radius-base, 4px);
	}

	/* Smooth scrolling for better UX */
	.mobile-responsive-system {
		scroll-behavior: smooth;
	}

	/* Optimize text rendering */
	.mobile-responsive-system {
		text-rendering: optimizeLegibility;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
</style>