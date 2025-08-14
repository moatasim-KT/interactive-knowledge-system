/**
 * Bundle analysis and optimization utility
 * Provides insights into bundle size and loading performance
 */

export interface BundleInfo {
    name: string;
    size: number;
    gzipSize?: number;
    loadTime: number;
    isLazy: boolean;
    dependencies: string[];
}

export interface BundleAnalysis {
    totalSize: number;
    totalGzipSize: number;
    chunkCount: number;
    largestChunk: BundleInfo;
    loadingStrategy: 'eager' | 'lazy' | 'mixed';
    recommendations: string[];
}

class BundleAnalyzer {
    private bundles: Map<string, BundleInfo> = new Map();
    private loadStartTimes: Map<string, number> = new Map();

    /**
     * Track bundle loading start
     */
    public trackBundleLoadStart(bundleName: string): void {
        this.loadStartTimes.set(bundleName, performance.now());
    }

    /**
     * Track bundle loading completion
     */
    public trackBundleLoadComplete(
        bundleName: string,
        size: number,
        gzipSize?: number,
        isLazy: boolean = false,
        dependencies: string[] = []
    ): void {
        const startTime = this.loadStartTimes.get(bundleName);
        const loadTime = startTime ? performance.now() - startTime : 0;

        const bundleInfo: BundleInfo = {
            name: bundleName,
            size,
            gzipSize,
            loadTime,
            isLazy,
            dependencies
        };

        this.bundles.set(bundleName, bundleInfo);
        this.loadStartTimes.delete(bundleName);

        console.debug(`Bundle ${bundleName} loaded:`, {
            size: this.formatBytes(size),
            gzipSize: gzipSize ? this.formatBytes(gzipSize) : 'unknown',
            loadTime: `${loadTime.toFixed(2)}ms`,
            isLazy
        });
    }

    /**
     * Analyze current bundle state
     */
    public analyzeBundles(): BundleAnalysis {
        const bundles = Array.from(this.bundles.values());

        if (bundles.length === 0) {
            return {
                totalSize: 0,
                totalGzipSize: 0,
                chunkCount: 0,
                largestChunk: {
                    name: '',
                    size: 0,
                    loadTime: 0,
                    isLazy: false,
                    dependencies: []
                },
                loadingStrategy: 'eager',
                recommendations: ['No bundles tracked yet']
            };
        }

        const totalSize = bundles.reduce((sum, bundle) => sum + bundle.size, 0);
        const totalGzipSize = bundles.reduce((sum, bundle) => sum + (bundle.gzipSize || 0), 0);
        const largestChunk = bundles.reduce((largest, current) =>
            current.size > largest.size ? current : largest
        );

        const lazyBundles = bundles.filter(b => b.isLazy).length;
        const eagerBundles = bundles.filter(b => !b.isLazy).length;

        let loadingStrategy: 'eager' | 'lazy' | 'mixed' = 'eager';
        if (lazyBundles > 0 && eagerBundles > 0) {
            loadingStrategy = 'mixed';
        } else if (lazyBundles > eagerBundles) {
            loadingStrategy = 'lazy';
        }

        const recommendations = this.generateRecommendations(bundles, totalSize);

        return {
            totalSize,
            totalGzipSize,
            chunkCount: bundles.length,
            largestChunk,
            loadingStrategy,
            recommendations
        };
    }

    /**
     * Generate optimization recommendations
     */
    private generateRecommendations(bundles: BundleInfo[], totalSize: number): string[] {
        const recommendations: string[] = [];

        // Check for large bundles
        const largeBundles = bundles.filter(b => b.size > 500 * 1024); // 500KB
        if (largeBundles.length > 0) {
            recommendations.push(
                `Consider code splitting for large bundles: ${largeBundles.map(b => b.name).join(', ')}`
            );
        }

        // Check for slow loading bundles
        const slowBundles = bundles.filter(b => b.loadTime > 1000); // 1 second
        if (slowBundles.length > 0) {
            recommendations.push(
                `Optimize loading for slow bundles: ${slowBundles.map(b => b.name).join(', ')}`
            );
        }

        // Check total bundle size
        if (totalSize > 2 * 1024 * 1024) { // 2MB
            recommendations.push('Total bundle size is large. Consider lazy loading non-critical components.');
        }

        // Check for eager loading of large components
        const largeEagerBundles = bundles.filter(b => !b.isLazy && b.size > 200 * 1024); // 200KB
        if (largeEagerBundles.length > 0) {
            recommendations.push(
                `Consider lazy loading for large eager bundles: ${largeEagerBundles.map(b => b.name).join(', ')}`
            );
        }

        // Check for unused dependencies
        const bundlesWithManyDeps = bundles.filter(b => b.dependencies.length > 10);
        if (bundlesWithManyDeps.length > 0) {
            recommendations.push(
                'Review dependencies for bundles with many imports to identify unused code'
            );
        }

        if (recommendations.length === 0) {
            recommendations.push('Bundle configuration looks optimal!');
        }

        return recommendations;
    }

    /**
     * Get bundle information
     */
    public getBundleInfo(bundleName: string): BundleInfo | undefined {
        return this.bundles.get(bundleName);
    }

    /**
     * Get all bundles
     */
    public getAllBundles(): BundleInfo[] {
        return Array.from(this.bundles.values());
    }

    /**
     * Format bytes to human readable format
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) {return '0 Bytes';}

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Log bundle analysis to console
     */
    public logAnalysis(): void {
        const analysis = this.analyzeBundles();

        console.group('Bundle Analysis');
        console.log('Total Size:', this.formatBytes(analysis.totalSize));
        console.log('Total Gzip Size:', this.formatBytes(analysis.totalGzipSize));
        console.log('Chunk Count:', analysis.chunkCount);
        console.log('Largest Chunk:', analysis.largestChunk.name, this.formatBytes(analysis.largestChunk.size));
        console.log('Loading Strategy:', analysis.loadingStrategy);
        console.log('Recommendations:', analysis.recommendations);
        console.groupEnd();
    }

    /**
     * Clear all bundle data
     */
    public clear(): void {
        this.bundles.clear();
        this.loadStartTimes.clear();
    }
}

// Create singleton instance
export const bundleAnalyzer = new BundleAnalyzer();

// Utility functions for tracking bundles
export const trackBundleLoad = (bundleName: string, size: number, gzipSize?: number, isLazy?: boolean, dependencies?: string[]) => {
    bundleAnalyzer.trackBundleLoadComplete(bundleName, size, gzipSize, isLazy, dependencies);
};

export const startBundleTracking = (bundleName: string) => {
    bundleAnalyzer.trackBundleLoadStart(bundleName);
};

export const getBundleAnalysis = () => bundleAnalyzer.analyzeBundles();

export const logBundleAnalysis = () => bundleAnalyzer.logAnalysis();