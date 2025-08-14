/**
 * Lazy loading utility for components and modules
 * Provides dynamic imports with loading states and error handling
 */

import { startBundleTracking, trackBundleLoad } from './bundleAnalyzer.js';

export interface LazyLoadOptions {
    fallback?: any;
    errorComponent?: any;
    loadingComponent?: any;
    timeout?: number;
    retries?: number;
}

export interface LazyLoadResult<T> {
    component: T | null;
    loading: boolean;
    error: Error | null;
    retry: () => Promise<void>;
}

class LazyLoader {
    private cache = new Map<string, Promise<any>>();
    private loadingStates = new Map<string, boolean>();
    private errors = new Map<string, Error>();

    /**
     * Lazy load a component with caching
     */
    public async loadComponent<T>(
        importFn: () => Promise<{ default: T }>,
        componentName: string,
        options: LazyLoadOptions = {}
    ): Promise<LazyLoadResult<T>> {
        const { timeout = 10000, retries = 3 } = options;

        // Check cache first
        if (this.cache.has(componentName)) {
            try {
                const cached = await this.cache.get(componentName);
                return {
                    component: cached.default,
                    loading: false,
                    error: null,
                    retry: () => this.retryLoad(importFn, componentName, options)
                };
            } catch (error) {
                // Cache hit but failed, continue to retry
            }
        }

        // Check if currently loading
        if (this.loadingStates.get(componentName)) {
            return {
                component: null,
                loading: true,
                error: null,
                retry: () => this.retryLoad(importFn, componentName, options)
            };
        }

        // Start loading
        this.loadingStates.set(componentName, true);
        this.errors.delete(componentName);

        try {
            startBundleTracking(componentName);

            const loadPromise = this.loadWithTimeout(importFn, timeout);
            this.cache.set(componentName, loadPromise);

            const module = await loadPromise;

            // Track bundle loading completion
            // Note: In a real implementation, you'd get actual size from build stats
            trackBundleLoad(componentName, 0, 0, true, []);

            this.loadingStates.set(componentName, false);

            return {
                component: module.default,
                loading: false,
                error: null,
                retry: () => this.retryLoad(importFn, componentName, options)
            };
        } catch (error) {
            this.loadingStates.set(componentName, false);
            this.errors.set(componentName, error as Error);
            this.cache.delete(componentName); // Remove failed cache entry

            console.error(`Failed to load component ${componentName}:`, error);

            return {
                component: null,
                loading: false,
                error: error as Error,
                retry: () => this.retryLoad(importFn, componentName, options)
            };
        }
    }

    /**
     * Load with timeout
     */
    private loadWithTimeout<T>(
        importFn: () => Promise<T>,
        timeout: number
    ): Promise<T> {
        return Promise.race([
            importFn(),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Load timeout')), timeout)
            )
        ]);
    }

    /**
     * Retry loading a component
     */
    private async retryLoad<T>(
        importFn: () => Promise<{ default: T }>,
        componentName: string,
        options: LazyLoadOptions
    ): Promise<void> {
        // Clear cache and error state
        this.cache.delete(componentName);
        this.errors.delete(componentName);

        // Retry loading
        await this.loadComponent(importFn, componentName, options);
    }

    /**
     * Preload a component
     */
    public preloadComponent<T>(
        importFn: () => Promise<{ default: T }>,
        componentName: string
    ): Promise<void> {
        if (this.cache.has(componentName)) {
            return Promise.resolve();
        }

        startBundleTracking(componentName);
        const loadPromise = importFn();
        this.cache.set(componentName, loadPromise);

        return loadPromise
            .then(() => {
                trackBundleLoad(componentName, 0, 0, true, []);
                console.debug(`Preloaded component: ${componentName}`);
            })
            .catch((error) => {
                this.cache.delete(componentName);
                console.warn(`Failed to preload component ${componentName}:`, error);
            });
    }

    /**
     * Check if component is loaded
     */
    public isLoaded(componentName: string): boolean {
        return this.cache.has(componentName) && !this.loadingStates.get(componentName);
    }

    /**
     * Check if component is loading
     */
    public isLoading(componentName: string): boolean {
        return this.loadingStates.get(componentName) || false;
    }

    /**
     * Get loading error
     */
    public getError(componentName: string): Error | null {
        return this.errors.get(componentName) || null;
    }

    /**
     * Clear cache for a component
     */
    public clearCache(componentName: string): void {
        this.cache.delete(componentName);
        this.loadingStates.delete(componentName);
        this.errors.delete(componentName);
    }

    /**
     * Clear all cache
     */
    public clearAllCache(): void {
        this.cache.clear();
        this.loadingStates.clear();
        this.errors.clear();
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): {
        cached: number;
        loading: number;
        errors: number;
    } {
        return {
            cached: this.cache.size,
            loading: Array.from(this.loadingStates.values()).filter(Boolean).length,
            errors: this.errors.size
        };
    }
}

// Create singleton instance
export const lazyLoader = new LazyLoader();

// Utility functions
export const loadComponent = <T>(
    importFn: () => Promise<{ default: T }>,
    componentName: string,
    options?: LazyLoadOptions
) => lazyLoader.loadComponent(importFn, componentName, options);

export const preloadComponent = <T>(
    importFn: () => Promise<{ default: T }>,
    componentName: string
) => lazyLoader.preloadComponent(importFn, componentName);

export const isComponentLoaded = (componentName: string) => lazyLoader.isLoaded(componentName);

export const isComponentLoading = (componentName: string) => lazyLoader.isLoading(componentName);

export const getComponentError = (componentName: string) => lazyLoader.getError(componentName);

export const clearComponentCache = (componentName: string) => lazyLoader.clearCache(componentName);

/**
 * Svelte action for lazy loading components on intersection
 */
export function lazyLoadOnIntersection(
    node: HTMLElement,
    {
        importFn,
        componentName,
        options = {}
    }: {
        importFn: () => Promise<{ default: any }>;
        componentName: string;
        options?: LazyLoadOptions;
    }
) {
    let observer: IntersectionObserver;

    if ('IntersectionObserver' in window) {
        observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        loadComponent(importFn, componentName, options);
                        observer.unobserve(node);
                    }
                });
            },
            {
                rootMargin: '50px'
            }
        );

        observer.observe(node);
    } else {
        // Fallback for browsers without IntersectionObserver
        loadComponent(importFn, componentName, options);
    }

    return {
        destroy() {
            if (observer) {
                observer.disconnect();
            }
        }
    };
}

/**
 * Preload components based on user interaction hints
 */
export function preloadOnHover(
    node: HTMLElement,
    {
        importFn,
        componentName
    }: {
        importFn: () => Promise<{ default: any }>;
        componentName: string;
    }
) {
    let hasPreloaded = false;

    const handleMouseEnter = () => {
        if (!hasPreloaded && !isComponentLoaded(componentName)) {
            preloadComponent(importFn, componentName);
            hasPreloaded = true;
        }
    };

    node.addEventListener('mouseenter', handleMouseEnter);

    return {
        destroy() {
            node.removeEventListener('mouseenter', handleMouseEnter);
        }
    };
}