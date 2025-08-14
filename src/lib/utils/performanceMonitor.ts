/**
 * Performance monitoring and metrics collection utility
 * Provides comprehensive performance tracking for the application
 */

export interface PerformanceMetrics {
    // Page load metrics
    pageLoad: {
        domContentLoaded: number;
        loadComplete: number;
        firstContentfulPaint?: number;
        largestContentfulPaint?: number;
    };
    // Bundle metrics
    bundle: {
        totalSize: number;
        chunkCount: number;
        loadTime: number;
    };
    // Runtime metrics
    runtime: {
        memoryUsage?: number;
        renderTime: number;
        interactionTime: number;
    };
    // User experience metrics
    userExperience: {
        timeToInteractive?: number;
        cumulativeLayoutShift?: number;
        firstInputDelay?: number;
    };
}

export interface CustomPerformanceEntry {
    timestamp: number;
    page: string;
    metrics: PerformanceMetrics;
    userAgent: string;
    connectionType?: string;
}



class PerformanceMonitor {
    private entries: CustomPerformanceEntry[] = [];
    private observers: PerformanceObserver[] = [];
    private startTime: number = Date.now();

    constructor() {
        this.initializeObservers();
    }

    /**
     * Initialize performance observers for various metrics
     */
    private initializeObservers(): void {
        if (typeof window === 'undefined') { return; }

        // Navigation timing observer
        if ('PerformanceObserver' in window) {
            try {
                const navObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (entry.entryType === 'navigation') {
                            this.recordNavigationMetrics(entry as PerformanceNavigationTiming);
                        }
                    });
                });
                navObserver.observe({ entryTypes: ['navigation'] });
                this.observers.push(navObserver);
            } catch (error) {
                console.warn('Navigation timing observer not supported:', error);
            }

            // Paint timing observer
            try {
                const paintObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        if (entry.entryType === 'paint') {
                            this.recordPaintMetrics(entry);
                        }
                    });
                });
                paintObserver.observe({ entryTypes: ['paint'] });
                this.observers.push(paintObserver);
            } catch (error) {
                console.warn('Paint timing observer not supported:', error);
            }

            // Largest Contentful Paint observer
            try {
                const lcpObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    if (lastEntry) {
                        this.recordLCPMetrics(lastEntry);
                    }
                });
                lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
                this.observers.push(lcpObserver);
            } catch (error) {
                console.warn('LCP observer not supported:', error);
            }

            // Layout shift observer
            try {
                const clsObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        this.recordLayoutShiftMetrics(entry);
                    });
                });
                clsObserver.observe({ entryTypes: ['layout-shift'] });
                this.observers.push(clsObserver);
            } catch (error) {
                console.warn('Layout shift observer not supported:', error);
            }

            // First Input Delay observer
            try {
                const fidObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach((entry) => {
                        this.recordFirstInputDelay(entry);
                    });
                });
                fidObserver.observe({ entryTypes: ['first-input'] });
                this.observers.push(fidObserver);
            } catch (error) {
                console.warn('First input delay observer not supported:', error);
            }
        }
    }

    /**
     * Record navigation timing metrics
     */
    private recordNavigationMetrics(entry: PerformanceNavigationTiming): void {
        const metrics: Partial<PerformanceMetrics> = {
            pageLoad: {
                domContentLoaded: entry.domContentLoadedEventEnd - entry.fetchStart,
                loadComplete: entry.loadEventEnd - entry.fetchStart
            }
        };
        this.updateCurrentMetrics(metrics);
    }

    /**
     * Record paint timing metrics
     */
    private recordPaintMetrics(entry: globalThis.PerformanceEntry): void {
        const metrics: Partial<PerformanceMetrics> = {};
        if (entry.name === 'first-contentful-paint') {
            metrics.pageLoad = {
                ...this.getCurrentMetrics()?.pageLoad,
                firstContentfulPaint: entry.startTime
            };
        }
        this.updateCurrentMetrics(metrics);
    }

    /**
     * Record Largest Contentful Paint metrics
     */
    private recordLCPMetrics(entry: globalThis.PerformanceEntry): void {
        const metrics: Partial<PerformanceMetrics> = {
            pageLoad: {
                ...this.getCurrentMetrics()?.pageLoad,
                largestContentfulPaint: entry.startTime
            }
        };
        this.updateCurrentMetrics(metrics);
    }

    /**
     * Record layout shift metrics
     */
    private recordLayoutShiftMetrics(entry: any): void {
        if (!entry.hadRecentInput) {
            const currentMetrics = this.getCurrentMetrics();
            const currentCLS = currentMetrics?.userExperience?.cumulativeLayoutShift || 0;
            const metrics: Partial<PerformanceMetrics> = {
                userExperience: {
                    ...currentMetrics?.userExperience,
                    cumulativeLayoutShift: currentCLS + entry.value
                }
            };
            this.updateCurrentMetrics(metrics);
        }
    }

    /**
     * Record First Input Delay metrics
     */
    private recordFirstInputDelay(entry: any): void {
        const metrics: Partial<PerformanceMetrics> = {
            userExperience: {
                ...this.getCurrentMetrics()?.userExperience,
                firstInputDelay: entry.processingStart - entry.startTime
            }
        };
        this.updateCurrentMetrics(metrics);
    }

    /**
     * Measure component render time
     */
    public measureRenderTime(componentName: string, renderFn: () => void): number {
        const startTime = performance.now();
        renderFn();
        const endTime = performance.now();
        const renderTime = endTime - startTime;

        console.debug(`Component ${componentName} render time: ${renderTime.toFixed(2)}ms`);
        return renderTime;
    }

    /**
     * Measure async operation time
     */
    public async measureAsyncOperation<T>(
        operationName: string,
        operation: () => Promise<T>
    ): Promise<{ result: T; duration: number }> {
        const startTime = performance.now();
        const result = await operation();
        const endTime = performance.now();
        const duration = endTime - startTime;

        console.debug(`Operation ${operationName} completed in: ${duration.toFixed(2)}ms`);
        return { result, duration };
    }

    /**
     * Get memory usage information
     */
    public getMemoryUsage(): number | undefined {
        if (typeof window !== 'undefined' && 'memory' in performance) {
            const memory = (performance as any).memory;
            return memory.usedJSHeapSize;
        }
        return undefined;
    }

    /**
     * Get connection information
     */
    public getConnectionInfo(): string | undefined {
        if (typeof navigator !== 'undefined' && 'connection' in navigator) {
            const connection = (navigator as any).connection;
            return connection.effectiveType || connection.type;
        }
        return undefined;
    }

    /**
     * Record a complete performance entry
     */
    public recordEntry(page: string, additionalMetrics?: Partial<PerformanceMetrics>): void {
        const currentMetrics = this.getCurrentMetrics();
        const memoryUsage = this.getMemoryUsage();
        const connectionType = this.getConnectionInfo();

        const entry: CustomPerformanceEntry = {
            timestamp: Date.now(),
            page,
            metrics: {
                pageLoad: currentMetrics?.pageLoad || {
                    domContentLoaded: 0,
                    loadComplete: 0
                },
                bundle: currentMetrics?.bundle || {
                    totalSize: 0,
                    chunkCount: 0,
                    loadTime: 0
                },
                runtime: {
                    memoryUsage,
                    renderTime: currentMetrics?.runtime?.renderTime || 0,
                    interactionTime: currentMetrics?.runtime?.interactionTime || 0
                },
                userExperience: currentMetrics?.userExperience || {},
                ...additionalMetrics
            },
            userAgent: navigator.userAgent,
            connectionType
        };

        this.entries.push(entry);
        this.logPerformanceEntry(entry);
    }

    /**
     * Get current metrics
     */
    private getCurrentMetrics(): PerformanceMetrics | undefined {
        return this.entries[this.entries.length - 1]?.metrics;
    }

    /**
     * Update current metrics
     */
    private updateCurrentMetrics(newMetrics: Partial<PerformanceMetrics>): void {
        if (this.entries.length === 0) {
            // Create initial entry if none exists
            this.recordEntry(window.location.pathname);
        }

        const lastEntry = this.entries[this.entries.length - 1];
        lastEntry.metrics = {
            ...lastEntry.metrics,
            ...newMetrics,
            pageLoad: {
                ...lastEntry.metrics.pageLoad,
                ...newMetrics.pageLoad
            },
            runtime: {
                ...lastEntry.metrics.runtime,
                ...newMetrics.runtime
            },
            userExperience: {
                ...lastEntry.metrics.userExperience,
                ...newMetrics.userExperience
            }
        };
    }

    /**
     * Log performance entry to console
     */
    private logPerformanceEntry(entry: CustomPerformanceEntry): void {
        console.group(`Performance Metrics - ${entry.page}`);
        console.log('Timestamp:', new Date(entry.timestamp).toISOString());
        console.log('Page Load:', entry.metrics.pageLoad);
        console.log('Runtime:', entry.metrics.runtime);
        console.log('User Experience:', entry.metrics.userExperience);
        if (entry.connectionType) {
            console.log('Connection:', entry.connectionType);
        }
        console.groupEnd();
    }

    /**
     * Get all performance entries
     */
    public getEntries(): CustomPerformanceEntry[] {
        return [...this.entries];
    }

    /**
     * Get performance summary
     */
    public getSummary(): {
        totalEntries: number;
        averageLoadTime: number;
        averageRenderTime: number;
        averageMemoryUsage: number;
    } {
        if (this.entries.length === 0) {
            return {
                totalEntries: 0,
                averageLoadTime: 0,
                averageRenderTime: 0,
                averageMemoryUsage: 0
            };
        }

        const totalLoadTime = this.entries.reduce(
            (sum, entry) => sum + entry.metrics.pageLoad.loadComplete,
            0
        );
        const totalRenderTime = this.entries.reduce(
            (sum, entry) => sum + entry.metrics.runtime.renderTime,
            0
        );
        const totalMemoryUsage = this.entries.reduce(
            (sum, entry) => sum + (entry.metrics.runtime.memoryUsage || 0),
            0
        );

        return {
            totalEntries: this.entries.length,
            averageLoadTime: totalLoadTime / this.entries.length,
            averageRenderTime: totalRenderTime / this.entries.length,
            averageMemoryUsage: totalMemoryUsage / this.entries.length
        };
    }

    /**
     * Clear all entries
     */
    public clearEntries(): void {
        this.entries = [];
    }

    /**
     * Cleanup observers
     */
    public cleanup(): void {
        this.observers.forEach((observer) => {
            observer.disconnect();
        });
        this.observers = [];
    }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export utility functions
export const measureRenderTime = (componentName: string, renderFn: () => void): number =>
    performanceMonitor.measureRenderTime(componentName, renderFn);

export const measureAsyncOperation = <T>(
    operationName: string,
    operation: () => Promise<T>
): Promise<{ result: T; duration: number }> =>
    performanceMonitor.measureAsyncOperation(operationName, operation);

export const recordPerformanceEntry = (
    page: string,
    additionalMetrics?: Partial<PerformanceMetrics>
): void => performanceMonitor.recordEntry(page, additionalMetrics);

export const getPerformanceSummary = () => performanceMonitor.getSummary();