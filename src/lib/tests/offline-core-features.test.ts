/**
 * Core offline functionality tests - focused on essential features
 */

import { describe, it, expect, vi } from 'vitest';

describe('Offline Core Features', () => {
    it('should have offline manager available', async () => {
        const { offlineManager } = await import('../services/offlineManager.js');
        expect(offlineManager).toBeDefined();
        expect(typeof offlineManager.isAvailable).toBe('function');
        expect(typeof offlineManager.getStatus).toBe('function');
    });

    it('should have network service available', async () => {
        const { networkService } = await import('../services/networkService.js');
        expect(networkService).toBeDefined();
        expect(typeof networkService.isOnline).toBe('function');
        expect(typeof networkService.getNetworkStatus).toBe('function');
    });

    it('should have offline queue available', async () => {
        const { offlineQueue } = await import('../services/offlineQueue.js');
        expect(offlineQueue).toBeDefined();
        expect(typeof offlineQueue.size).toBe('function');
        expect(typeof offlineQueue.isEmpty).toBe('function');
    });

    it('should have sync service available', async () => {
        const { syncService } = await import('../services/syncService.js');
        expect(syncService).toBeDefined();
        expect(typeof syncService.getSyncStatus).toBe('function');
    });

    it('should have optimistic update manager available', async () => {
        const { optimisticUpdateManager } = await import('../services/optimisticUpdates.js');
        expect(optimisticUpdateManager).toBeDefined();
        expect(typeof optimisticUpdateManager.getPendingUpdates).toBe('function');
    });

    it('should have storage available', async () => {
        const { storage } = await import('../storage/indexeddb.js');
        expect(storage).toBeDefined();
        expect(typeof storage.init).toBe('function');
    });

    it('should handle offline manager status without initialization', async () => {
        const { offlineManager } = await import('../services/offlineManager.js');

        // Should not throw when getting status before initialization
        expect(() => {
            const status = offlineManager.getStatus();
            expect(status).toBeDefined();
            expect(typeof status.isInitialized).toBe('boolean');
        }).not.toThrow();
    });

    it('should handle network service basic operations', async () => {
        const { networkService } = await import('../services/networkService.js');

        // Should not throw when getting network status
        expect(() => {
            const status = networkService.getNetworkStatus();
            expect(status).toBeDefined();
            expect(typeof status.isOnline).toBe('boolean');
        }).not.toThrow();

        expect(() => {
            const isOnline = networkService.isOnline();
            expect(typeof isOnline).toBe('boolean');
        }).not.toThrow();
    });

    it('should handle offline queue basic operations', async () => {
        const { offlineQueue } = await import('../services/offlineQueue.js');

        // Should not throw when getting queue info
        expect(() => {
            const size = offlineQueue.size();
            expect(typeof size).toBe('number');
        }).not.toThrow();

        expect(() => {
            const isEmpty = offlineQueue.isEmpty();
            expect(typeof isEmpty).toBe('boolean');
        }).not.toThrow();
    });

    it('should handle configuration updates safely', async () => {
        const { offlineManager } = await import('../services/offlineManager.js');

        expect(() => {
            offlineManager.updateConfig({
                enableAutoSync: false,
                syncInterval: 60000
            });
        }).not.toThrow();
    });

    it('should provide meaningful error messages', async () => {
        const { offlineManager } = await import('../services/offlineManager.js');

        // Test error handling for uninitialized operations
        try {
            await offlineManager.createContent({});
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain('not initialized');
        }
    });

    it('should handle browser environment detection', async () => {
        const { offlineManager } = await import('../services/offlineManager.js');

        // Should handle both browser and non-browser environments
        const isAvailable = offlineManager.isAvailable();
        expect(typeof isAvailable).toBe('boolean');
    });

    it('should provide statistics without errors', async () => {
        const { offlineManager } = await import('../services/offlineManager.js');

        expect(() => {
            const stats = offlineManager.getStatistics();
            expect(stats).toBeDefined();
            expect(typeof stats.queueSize).toBe('number');
        }).not.toThrow();
    });
});