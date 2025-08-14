/**
 * Mobile Optimization Utilities
 * Provides utilities for detecting mobile devices, handling touch interactions,
 * and optimizing performance for mobile devices.
 */

export interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isTouchDevice: boolean;
    screenSize: 'mobile' | 'tablet' | 'desktop';
    orientation: 'portrait' | 'landscape';
    pixelRatio: number;
    viewportWidth: number;
    viewportHeight: number;
}

export interface TouchGesture {
    type: 'swipe' | 'pinch' | 'tap' | 'longpress';
    direction?: 'left' | 'right' | 'up' | 'down';
    distance?: number;
    duration?: number;
    scale?: number;
}

/**
 * Detects device capabilities and screen information
 */
export function getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
        return {
            isMobile: false,
            isTablet: false,
            isDesktop: true,
            isTouchDevice: false,
            screenSize: 'desktop',
            orientation: 'landscape',
            pixelRatio: 1,
            viewportWidth: 1024,
            viewportHeight: 768
        };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    const isMobile = width < 640;
    const isTablet = width >= 640 && width < 1024;
    const isDesktop = width >= 1024;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const screenSize: 'mobile' | 'tablet' | 'desktop' =
        isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

    const orientation: 'portrait' | 'landscape' =
        height > width ? 'portrait' : 'landscape';

    return {
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenSize,
        orientation,
        pixelRatio,
        viewportWidth: width,
        viewportHeight: height
    };
}

/**
 * Optimizes images for mobile devices
 */
export function getOptimizedImageSrc(
    baseSrc: string,
    deviceInfo: DeviceInfo,
    sizes?: { mobile?: string; tablet?: string; desktop?: string }
): string {
    if (!sizes) {return baseSrc;}

    const { screenSize, pixelRatio } = deviceInfo;
    const sizeKey = screenSize;
    const targetSize = sizes[sizeKey] || baseSrc;

    // Add pixel ratio for high-DPI displays
    if (pixelRatio > 1) {
        const extension = targetSize.split('.').pop();
        const baseName = targetSize.replace(`.${extension}`, '');
        return `${baseName}@${Math.ceil(pixelRatio)}x.${extension}`;
    }

    return targetSize;
}

/**
 * Handles touch gestures with debouncing and threshold detection
 */
export class TouchGestureHandler {
    private startX = 0;
    private startY = 0;
    private startTime = 0;
    private initialDistance = 0;
    private threshold = 50;
    private timeThreshold = 300;
    private longPressThreshold = 500;
    private longPressTimer: number | null = null;

    constructor(
        private element: HTMLElement,
        private onGesture: (gesture: TouchGesture) => void,
        options?: {
            threshold?: number;
            timeThreshold?: number;
            longPressThreshold?: number;
        }
    ) {
        if (options) {
            this.threshold = options.threshold ?? this.threshold;
            this.timeThreshold = options.timeThreshold ?? this.timeThreshold;
            this.longPressThreshold = options.longPressThreshold ?? this.longPressThreshold;
        }

        this.bindEvents();
    }

    private bindEvents() {
        this.element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    }

    private handleTouchStart(event: TouchEvent) {
        const touch = event.touches[0];
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.startTime = Date.now();

        if (event.touches.length === 2) {
            const touch2 = event.touches[1];
            this.initialDistance = Math.hypot(
                touch2.clientX - touch.clientX,
                touch2.clientY - touch.clientY
            );
        }

        // Start long press timer
        this.longPressTimer = window.setTimeout(() => {
            this.onGesture({ type: 'longpress' });
        }, this.longPressThreshold);
    }

    private handleTouchMove(event: TouchEvent) {
        // Clear long press timer on move
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (event.touches.length === 2) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );

            const scale = currentDistance / this.initialDistance;
            this.onGesture({ type: 'pinch', scale });
        }
    }

    private handleTouchEnd(event: TouchEvent) {
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }

        if (event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            const endX = touch.clientX;
            const endY = touch.clientY;
            const endTime = Date.now();

            const deltaX = endX - this.startX;
            const deltaY = endY - this.startY;
            const deltaTime = endTime - this.startTime;
            const distance = Math.hypot(deltaX, deltaY);

            // Tap gesture
            if (distance < this.threshold && deltaTime < this.timeThreshold) {
                this.onGesture({ type: 'tap' });
                return;
            }

            // Swipe gesture
            if (distance > this.threshold) {
                const direction = this.getSwipeDirection(deltaX, deltaY);
                this.onGesture({
                    type: 'swipe',
                    direction,
                    distance,
                    duration: deltaTime
                });
            }
        }
    }

    private getSwipeDirection(deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            return deltaX > 0 ? 'right' : 'left';
        } else {
            return deltaY > 0 ? 'down' : 'up';
        }
    }

    public destroy() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
        }
        this.element.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        this.element.removeEventListener('touchmove', this.handleTouchMove.bind(this));
        this.element.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    }
}

/**
 * Optimizes performance for mobile devices
 */
export class MobilePerformanceOptimizer {
    private intersectionObserver?: IntersectionObserver;
    private resizeObserver?: ResizeObserver;

    /**
     * Implements lazy loading for images and components
     */
    public setupLazyLoading(
        elements: NodeListOf<Element> | Element[],
        callback: (element: Element) => void,
        options?: IntersectionObserverInit
    ) {
        if (!('IntersectionObserver' in window)) {
            // Fallback for older browsers
            Array.from(elements).forEach(callback);
            return;
        }

        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    callback(entry.target);
                    this.intersectionObserver?.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1,
            ...options
        });

        Array.from(elements).forEach((element) => {
            this.intersectionObserver?.observe(element);
        });
    }

    /**
     * Debounces resize events for better performance
     */
    public setupResponsiveHandler(
        callback: (deviceInfo: DeviceInfo) => void,
        debounceMs = 250
    ) {
        let timeoutId: number;

        const debouncedHandler = () => {
            clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                callback(getDeviceInfo());
            }, debounceMs);
        };

        window.addEventListener('resize', debouncedHandler);
        window.addEventListener('orientationchange', debouncedHandler);

        // Initial call
        callback(getDeviceInfo());

        return () => {
            window.removeEventListener('resize', debouncedHandler);
            window.removeEventListener('orientationchange', debouncedHandler);
            clearTimeout(timeoutId);
        };
    }

    /**
     * Optimizes scroll performance with passive listeners
     */
    public setupOptimizedScrolling(
        element: HTMLElement,
        callback: (scrollInfo: { scrollY: number; direction: 'up' | 'down' }) => void,
        throttleMs = 16
    ) {
        let lastScrollY = element.scrollTop;
        let ticking = false;

        const handleScroll = () => {
            const scrollY = element.scrollTop;
            const direction = scrollY > lastScrollY ? 'down' : 'up';

            callback({ scrollY, direction });
            lastScrollY = scrollY;
            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(handleScroll);
                ticking = true;
            }
        };

        element.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            element.removeEventListener('scroll', onScroll);
        };
    }

    public destroy() {
        this.intersectionObserver?.disconnect();
        this.resizeObserver?.disconnect();
    }
}

/**
 * Utility functions for mobile-specific features
 */
export const mobileUtils = {
    /**
     * Prevents zoom on input focus (iOS)
     */
    preventZoomOnFocus(input: HTMLInputElement) {
        const originalFontSize = input.style.fontSize;

        input.addEventListener('focus', () => {
            input.style.fontSize = '16px';
        });

        input.addEventListener('blur', () => {
            input.style.fontSize = originalFontSize;
        });
    },

    /**
     * Adds safe area padding for devices with notches
     */
    applySafeAreaPadding(element: HTMLElement, sides: ('top' | 'bottom' | 'left' | 'right')[]) {
        sides.forEach(side => {
            element.style.setProperty(`padding-${side}`, `env(safe-area-inset-${side})`);
        });
    },

    /**
     * Optimizes touch scrolling for iOS
     */
    enableSmoothScrolling(element: HTMLElement) {
        (element.style as any).webkitOverflowScrolling = 'touch';
        element.style.scrollBehavior = 'smooth';
    },

    /**
     * Disables text selection for better touch experience
     */
    disableTextSelection(element: HTMLElement) {
        element.style.userSelect = 'none';
        (element.style as any).webkitUserSelect = 'none';
        (element.style as any).webkitTouchCallout = 'none';
        (element.style as any).webkitTapHighlightColor = 'transparent';
    }
};