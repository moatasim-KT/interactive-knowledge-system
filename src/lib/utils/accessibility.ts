/**
 * Accessibility utilities and helpers
 * Provides functions and constants for improving accessibility compliance
 */

// ARIA roles and properties
export const ARIA_ROLES = {
    button: 'button',
    link: 'link',
    navigation: 'navigation',
    main: 'main',
    banner: 'banner',
    contentinfo: 'contentinfo',
    complementary: 'complementary',
    search: 'search',
    form: 'form',
    dialog: 'dialog',
    alertdialog: 'alertdialog',
    alert: 'alert',
    status: 'status',
    progressbar: 'progressbar',
    tab: 'tab',
    tabpanel: 'tabpanel',
    tablist: 'tablist',
    menu: 'menu',
    menuitem: 'menuitem',
    menubar: 'menubar',
    listbox: 'listbox',
    option: 'option',
    combobox: 'combobox',
    tree: 'tree',
    treeitem: 'treeitem',
    grid: 'grid',
    gridcell: 'gridcell',
    row: 'row',
    columnheader: 'columnheader',
    rowheader: 'rowheader'
} as const;

// Keyboard navigation constants
export const KEYBOARD_KEYS = {
    ENTER: 'Enter',
    SPACE: ' ',
    ESCAPE: 'Escape',
    TAB: 'Tab',
    ARROW_UP: 'ArrowUp',
    ARROW_DOWN: 'ArrowDown',
    ARROW_LEFT: 'ArrowLeft',
    ARROW_RIGHT: 'ArrowRight',
    HOME: 'Home',
    END: 'End',
    PAGE_UP: 'PageUp',
    PAGE_DOWN: 'PageDown'
} as const;

// Screen reader text utility
export function createScreenReaderText(text: string): string {
    return `<span class="sr-only">${text}</span>`;
}

// Generate unique IDs for accessibility
let idCounter = 0;
export function generateId(prefix = 'a11y'): string {
    return `${prefix}-${++idCounter}`;
}

// Focus management utilities
export function trapFocus(element: HTMLElement): () => void {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === KEYBOARD_KEYS.TAB) {
            if (event.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    event.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    event.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    }

    element.addEventListener('keydown', handleKeyDown);
    firstFocusable?.focus();

    return () => {
        element.removeEventListener('keydown', handleKeyDown);
    };
}

// Announce to screen readers
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Check if user prefers high contrast
export function prefersHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
}

// Get user's preferred color scheme
export function getPreferredColorScheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Keyboard navigation handler for lists/grids
export function createKeyboardNavigationHandler(
    items: HTMLElement[],
    options: {
        orientation?: 'horizontal' | 'vertical' | 'both';
        wrap?: boolean;
        activateOnFocus?: boolean;
    } = {}
) {
    const { orientation = 'vertical', wrap = true, activateOnFocus = false } = options;
    let currentIndex = 0;

    return function handleKeyDown(event: KeyboardEvent) {
        const { key } = event;
        let newIndex = currentIndex;

        switch (key) {
            case KEYBOARD_KEYS.ARROW_DOWN:
                if (orientation === 'vertical' || orientation === 'both') {
                    event.preventDefault();
                    newIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
                }
                break;
            case KEYBOARD_KEYS.ARROW_UP:
                if (orientation === 'vertical' || orientation === 'both') {
                    event.preventDefault();
                    newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
                }
                break;
            case KEYBOARD_KEYS.ARROW_RIGHT:
                if (orientation === 'horizontal' || orientation === 'both') {
                    event.preventDefault();
                    newIndex = wrap ? (currentIndex + 1) % items.length : Math.min(currentIndex + 1, items.length - 1);
                }
                break;
            case KEYBOARD_KEYS.ARROW_LEFT:
                if (orientation === 'horizontal' || orientation === 'both') {
                    event.preventDefault();
                    newIndex = wrap ? (currentIndex - 1 + items.length) % items.length : Math.max(currentIndex - 1, 0);
                }
                break;
            case KEYBOARD_KEYS.HOME:
                event.preventDefault();
                newIndex = 0;
                break;
            case KEYBOARD_KEYS.END:
                event.preventDefault();
                newIndex = items.length - 1;
                break;
            case KEYBOARD_KEYS.ENTER:
            case KEYBOARD_KEYS.SPACE:
                if (activateOnFocus) {
                    event.preventDefault();
                    items[currentIndex].click();
                }
                break;
        }

        if (newIndex !== currentIndex) {
            currentIndex = newIndex;
            items[currentIndex].focus();
        }
    };
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd want a more robust color parsing library
    const getLuminance = (color: string): number => {
        // This is a simplified version - you'd want proper color parsing
        const rgb = color.match(/\d+/g);
        if (!rgb) {return 0;}

        const [r, g, b] = rgb.map(c => {
            const val = parseInt(c) / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);

    return (brightest + 0.05) / (darkest + 0.05);
}

// Check if contrast meets WCAG standards
export function meetsContrastRequirement(
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA',
    size: 'normal' | 'large' = 'normal'
): boolean {
    const ratio = getContrastRatio(foreground, background);

    if (level === 'AAA') {
        return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    } else {
        return size === 'large' ? ratio >= 3 : ratio >= 4.5;
    }
}

// Debounce utility for accessibility events
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Skip link utility
export function createSkipLink(targetId: string, text: string = 'Skip to main content'): HTMLElement {
    const skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.textContent = text;
    skipLink.className = 'skip-link';
    skipLink.setAttribute('tabindex', '0');

    return skipLink;
}

// Live region manager
class LiveRegionManager {
    private regions: Map<string, HTMLElement> = new Map();

    createRegion(id: string, priority: 'polite' | 'assertive' = 'polite'): HTMLElement {
        if (this.regions.has(id)) {
            return this.regions.get(id)!;
        }

        const region = document.createElement('div');
        region.id = id;
        region.setAttribute('aria-live', priority);
        region.setAttribute('aria-atomic', 'true');
        region.className = 'sr-only';

        document.body.appendChild(region);
        this.regions.set(id, region);

        return region;
    }

    announce(regionId: string, message: string): void {
        const region = this.regions.get(regionId);
        if (region) {
            region.textContent = message;
        }
    }

    clear(regionId: string): void {
        const region = this.regions.get(regionId);
        if (region) {
            region.textContent = '';
        }
    }

    destroy(regionId: string): void {
        const region = this.regions.get(regionId);
        if (region) {
            document.body.removeChild(region);
            this.regions.delete(regionId);
        }
    }
}

export const liveRegionManager = new LiveRegionManager();

// Accessibility preferences manager
export class AccessibilityPreferences {
    private preferences: Map<string, any> = new Map();
    private listeners: Map<string, Set<(value: any) => void>> = new Map();

    constructor() {
        this.loadPreferences();
        this.setupMediaQueryListeners();
    }

    private loadPreferences(): void {
        try {
            const stored = localStorage.getItem('accessibility-preferences');
            if (stored) {
                const parsed = JSON.parse(stored);
                Object.entries(parsed).forEach(([key, value]) => {
                    this.preferences.set(key, value);
                });
            }
        } catch (error) {
            console.warn('Failed to load accessibility preferences:', error);
        }
    }

    private savePreferences(): void {
        try {
            const obj = Object.fromEntries(this.preferences);
            localStorage.setItem('accessibility-preferences', JSON.stringify(obj));
        } catch (error) {
            console.warn('Failed to save accessibility preferences:', error);
        }
    }

    private setupMediaQueryListeners(): void {
        // Listen for system preference changes
        const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

        reducedMotionQuery.addEventListener('change', (e) => {
            this.set('reducedMotion', e.matches);
        });

        highContrastQuery.addEventListener('change', (e) => {
            this.set('highContrast', e.matches);
        });

        darkModeQuery.addEventListener('change', (e) => {
            this.set('darkMode', e.matches);
        });

        // Set initial values
        this.set('reducedMotion', reducedMotionQuery.matches);
        this.set('highContrast', highContrastQuery.matches);
        this.set('darkMode', darkModeQuery.matches);
    }

    get<T>(key: string, defaultValue?: T): T {
        return this.preferences.get(key) ?? defaultValue;
    }

    set<T>(key: string, value: T): void {
        this.preferences.set(key, value);
        this.savePreferences();
        this.notifyListeners(key, value);
    }

    subscribe<T>(key: string, callback: (value: T) => void): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }

        this.listeners.get(key)!.add(callback);

        // Call immediately with current value
        callback(this.get(key));

        return () => {
            this.listeners.get(key)?.delete(callback);
        };
    }

    private notifyListeners(key: string, value: any): void {
        this.listeners.get(key)?.forEach(callback => callback(value));
    }
}

export const accessibilityPreferences = new AccessibilityPreferences();