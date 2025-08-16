/**
 * Comprehensive offline functionality manager
 * Coordinates all offline-related services and provides a unified API
 */

import { storage } from '../storage/indexeddb.js';
import { offlineQueue } from './offlineQueue.js';
import { syncService } from './syncService.js';
import { networkService } from './networkService.js';
import { optimisticUpdateManager } from './optimisticUpdates.js';
import { appState, actions } from '../stores/appState.svelte.js';
import type { SyncOperation, NetworkStatus } from '$lib/types/unified';

export interface OfflineManagerConfig {
    enableAutoSync: boolean;
    syncInterval: number;
    maxRetries: number;
    enableOptimisticUpdates: boolean;
    enableOfflineQueue: boolean;
    enableNetworkDetection: boolean;
}

export interface OfflineStatus {
    isOnline: boolean;
    isInitialized: boolean;
    queueSize: number;
    pendingUpdates: number;
    lastSync: Date | null;
    storageAvailable: boolean;
    networkStatus: NetworkStatus;
}

export class OfflineManager {
    private static instance: OfflineManager;
    private initialized = false;
    private config: OfflineManagerConfig = {
        enableAutoSync: true,
        syncInterval: 30000, // 30 seconds
        maxRetries: 3,
        enableOptimisticUpdates: true,
        enableOfflineQueue: true,
        enableNetworkDetection: true
    };

    private constructor() { }

    static getInstance(): OfflineManager {
        if (!OfflineManager.instance) {
            OfflineManager.instance = new OfflineManager();
        }
        return OfflineManager.instance;
    }

    /**
     * Initialize offline functionality
     */
    async initialize(config?: Partial<OfflineManagerConfig>): Promise<void> {
        if (this.initialized) {
            return;
        }

        // Update configuration
        if (config) {
            this.config = { ...this.config, ...config };
        }

        try {
            // Initialize storage
            await storage.init();

            // Initialize network monitoring if enabled
            if (this.config.enableNetworkDetection) {
                this.setupNetworkMonitoring();
            }

            // Initialize sync service if enabled
            if (this.config.enableAutoSync) {
                await this.initializeSyncService();
            }

            // Set up periodic maintenance
            this.setupPeriodicMaintenance();

            this.initialized = true;

            // Notify app of successful initialization
            actions.addNotification({
                type: 'info',
                message: 'Offline functionality initialized'
            });

        } catch (error) {
            console.error('Failed to initialize offline functionality:', error);

            // Initialize with limited functionality
            this.initialized = true;

            actions.addNotification({
                type: 'warning',
                message: 'Offline functionality initialized with limited features'
            });
        }
    }

    /**
     * Check if offline functionality is available
     */
    isAvailable(): boolean {
        return this.initialized && typeof window !== 'undefined';
    }

    /**
     * Get comprehensive offline status
     */
    getStatus(): OfflineStatus {
        return {
            isOnline: networkService.isOnline(),
            isInitialized: this.initialized,
            queueSize: offlineQueue.size(),
            pendingUpdates: optimisticUpdateManager.getPendingUpdates().length,
            lastSync: appState.sync.lastSync,
            storageAvailable: typeof window !== 'undefined' && 'indexedDB' in window,
            networkStatus: networkService.getNetworkStatus()
        };
    }

    /**
     * Create content with offline support
     */
    async createContent(contentData: any): Promise<string> {
        if (!this.initialized) {
            throw new Error('Offline manager not initialized');
        }

        // Store locally first
        try {
            await storage.put('modules', contentData);
        } catch (error) {
            console.warn('Failed to store content locally:', error);
        }

        // Queue for sync
        return await syncService.createContent(contentData);
    }

    /**
     * Update content with offline support
     */
    async updateContent(contentId: string, updates: any): Promise<string> {
        if (!this.initialized) {
            throw new Error('Offline manager not initialized');
        }

        // Update locally first
        try {
            const existing = await storage.get('modules', contentId);
            if (existing) {
                const updated = { ...existing, ...updates };
                await storage.put('modules', updated);
            }
        } catch (error) {
            console.warn('Failed to update content locally:', error);
        }

        // Queue for sync
        return await syncService.updateContent(contentId, updates);
    }

    /**
     * Delete content with offline support
     */
    async deleteContent(contentId: string): Promise<string> {
        if (!this.initialized) {
            throw new Error('Offline manager not initialized');
        }

        // Mark as deleted locally
        try {
            await storage.delete('modules', contentId);
        } catch (error) {
            console.warn('Failed to delete content locally:', error);
        }

        // Queue for sync
        return await syncService.deleteContent(contentId);
    }

    /**
     * Update user progress with offline support
     */
    async updateProgress(moduleId: string, progressData: any): Promise<string> {
        if (!this.initialized) {
            throw new Error('Offline manager not initialized');
        }

        // Store progress locally
        try {
            const progressKey = [progressData.userId, moduleId];
            await storage.put('progress', { ...progressData, moduleId });
        } catch (error) {
            console.warn('Failed to store progress locally:', error);
        }

        // Queue for sync
        return await syncService.updateProgress(moduleId, progressData);
    }

    /**
     * Update user settings with offline support
     */
    async updateSettings(settingsData: any): Promise<string> {
        if (!this.initialized) {
            throw new Error('Offline manager not initialized');
        }

        // Store settings locally
        try {
            const settings = {
                id: appState.user.id || 'default-user',
                userId: appState.user.id || 'default-user',
                ...settingsData
            };
            await storage.put('settings', settings);
        } catch (error) {
            console.warn('Failed to store settings locally:', error);
        }

        // Queue for sync
        return await syncService.updateSettings(settingsData);
    }

    /**
     * Force synchronization
     */
    async forceSync(): Promise<void> {
        if (!this.initialized) {
            throw new Error('Offline manager not initialized');
        }

        if (!networkService.isOnline()) {
            actions.addNotification({
                type: 'warning',
                message: 'Cannot sync while offline'
            });
            return;
        }

        await syncService.syncNow();
    }

    /**
     * Clear all offline data
     */
    async clearOfflineData(): Promise<void> {
        if (!this.initialized) {
            throw new Error('Offline manager not initialized');
        }

        // Clear queue
        await offlineQueue.clear();

        // Clear optimistic updates
        optimisticUpdateManager.clearAll();

        // Clear pending changes
        appState.sync.pendingChanges.length = 0;

        actions.addNotification({
            type: 'info',
            message: 'Offline data cleared'
        });
    }

    /**
     * Get offline statistics
     */
    getStatistics() {
        const queueStats = syncService.getOfflineStats();
        const status = this.getStatus();

        return {
            ...queueStats,
            ...status,
            config: this.config
        };
    }

    /**
     * Enable/disable offline features
     */
    updateConfig(newConfig: Partial<OfflineManagerConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Apply configuration changes
        if (!newConfig.enableNetworkDetection && this.config.enableNetworkDetection) {
            // Disable network monitoring
            networkService.destroy();
        } else if (newConfig.enableNetworkDetection && !this.config.enableNetworkDetection) {
            // Enable network monitoring
            this.setupNetworkMonitoring();
        }
    }

    /**
     * Setup network monitoring
     */
    private setupNetworkMonitoring(): void {
        networkService.addListener((status) => {
            // Update app state
            actions.setOnlineStatus(status.isOnline);

            // Handle online/offline transitions
            if (status.isOnline) {
                this.handleOnline();
            } else {
                this.handleOffline();
            }
        });
    }

    /**
     * Handle coming online
     */
    private handleOnline(): void {
        const queueSize = offlineQueue.size();

        if (queueSize > 0) {
            actions.addNotification({
                type: 'info',
                message: `Back online! ${queueSize} operations queued for sync`
            });

            // Trigger sync after a short delay
            if (this.config.enableAutoSync) {
                setTimeout(() => {
                    syncService.syncNow().catch(error => {
                        console.error('Auto-sync failed:', error);
                    });
                }, 1000);
            }
        }
    }

    /**
     * Handle going offline
     */
    private handleOffline(): void {
        actions.addNotification({
            type: 'warning',
            message: 'You are now offline. Changes will be synced when connection is restored.'
        });
    }

    /**
     * Initialize sync service
     */
    private async initializeSyncService(): Promise<void> {
        // Initialize with default config if no cloud config is provided
        // This allows offline functionality to work without cloud sync
        try {
            await syncService.initialize();
        } catch (error) {
            console.warn('Sync service initialization failed, continuing with offline-only mode:', error);
        }
    }

    /**
     * Setup periodic maintenance tasks
     */
    private setupPeriodicMaintenance(): void {
        if (typeof window === 'undefined') {
            return;
        }

        // Optimize queue every 5 minutes
        setInterval(async () => {
            try {
                if (offlineQueue.size() > 10) {
                    await offlineQueue.optimizeQueue();
                }
            } catch (error) {
                console.error('Queue optimization failed:', error);
            }
        }, 5 * 60 * 1000);

        // Clean up old optimistic updates every 10 minutes
        setInterval(() => {
            try {
                const pendingUpdates = optimisticUpdateManager.getPendingUpdates();
                const oldUpdates = pendingUpdates.filter(
                    update => Date.now() - update.timestamp.getTime() > 10 * 60 * 1000
                );

                oldUpdates.forEach(update => {
                    optimisticUpdateManager.rollbackUpdate(update.id);
                });
            } catch (error) {
                console.error('Optimistic update cleanup failed:', error);
            }
        }, 10 * 60 * 1000);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        if (!this.initialized) {
            return;
        }

        // Cleanup services
        syncService.destroy();
        networkService.destroy();
        optimisticUpdateManager.clearAll();

        // Close storage
        storage.close();

        this.initialized = false;
    }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance();