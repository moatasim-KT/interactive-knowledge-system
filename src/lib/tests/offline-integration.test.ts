/**
 * Offline functionality integration tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineManager } from '../services/offlineManager.js';
import { networkService } from '../services/networkService.js';
import { offlineQueue } from '../services/offlineQueue.js';

// Mock IndexedDB
const mockIDBDatabase = {
    transaction: vi.fn().mockReturnValue({
        objectStore: vi.fn().mockReturnValue({
            get: vi.fn().mockReturnValue({ onsuccess: vi.fn(), onerror: vi.fn() }),
            put: vi.fn().mockReturnValue({ onsuccess: vi.fn(), onerror: vi.fn() }),
            add: vi.fn().mockReturnValue({ onsuccess: vi.fn(), onerror: vi.fn() }),
            delete: vi.fn().mockReturnValue({ onsuccess: vi.fn(), onerror: vi.fn() })
        }),
        oncomplete: vi.fn(),
        onerror: vi.fn()
    }),
    close: vi.fn()
};

const mockIDBRequest = {
    onsuccess: vi.fn(),
    onerror: vi.fn(),
    onupgradeneeded: vi.fn(),
    result: mockIDBDatabase
};

Object.defineProperty(window, 'indexedDB', {
    value: {
        open: vi.fn().mockReturnValue(mockIDBRequest)
    }
});

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
});

describe('Offline Integration Tests', () => {
    beforeEach(async () => {
        vi.clearAllMocks();

        // Reset navigator.onLine
        Object.defineProperty(navigator, 'onLine', { value: true });

        // Clear offline queue
        await offlineQueue.clear();

        // Trigger IDB success callback
        setTimeout(() => {
            if (mockIDBRequest.onsuccess) {
                mockIDBRequest.onsuccess({ target: mockIDBRequest } as any);
            }
        }, 0);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize offline functionality successfully', async () => {
        const result = await offlineManager.initialize({
            enableAutoSync: true,
            enableOfflineQueue: true,
            enableNetworkDetection: true,
            enableOptimisticUpdates: true
        });

        expect(result).toBeUndefined(); // Should not throw
        expect(offlineManager.isAvailable()).toBe(true);
    });

    it('should handle network status changes', () => {
        const status = networkService.getNetworkStatus();
        expect(status).toBeDefined();
        expect(typeof status.isOnline).toBe('boolean');
    });

    it('should queue operations when offline', async () => {
        // Initialize offline manager
        await offlineManager.initialize();

        // Simulate going offline
        Object.defineProperty(navigator, 'onLine', { value: false });

        // Create content while offline
        const contentData = {
            id: 'test-content-offline',
            title: 'Offline Content',
            blocks: [],
            metadata: {
                author: 'Test User',
                created: new Date(),
                modified: new Date(),
                version: 1,
                difficulty: 3,
                estimatedTime: 10,
                prerequisites: [],
                tags: ['test'],
                language: 'en'
            },
            relationships: { prerequisites: [], dependents: [], related: [] },
            analytics: { views: 0, completions: 0, averageScore: 0, averageTime: 0 }
        };

        // This should queue the operation instead of syncing immediately
        const operationId = await offlineManager.createContent(contentData);
        expect(operationId).toBeDefined();
        expect(typeof operationId).toBe('string');
    });

    it('should handle progress updates offline', async () => {
        await offlineManager.initialize();

        const progressData = {
            userId: 'test-user',
            moduleId: 'test-module',
            status: 'completed' as const,
            score: 95,
            timeSpent: 1800,
            lastAccessed: new Date(),
            attempts: 1,
            bookmarked: false,
            notes: 'Great module!'
        };

        const operationId = await offlineManager.updateProgress('test-module', progressData);
        expect(operationId).toBeDefined();
        expect(typeof operationId).toBe('string');
    });

    it('should handle settings updates offline', async () => {
        await offlineManager.initialize();

        const settingsData = {
            preferences: {
                theme: 'dark' as const,
                learningStyle: 'visual' as const,
                difficulty: 4,
                language: 'en',
                notifications: true,
                autoSave: true
            }
        };

        const operationId = await offlineManager.updateSettings(settingsData);
        expect(operationId).toBeDefined();
        expect(typeof operationId).toBe('string');
    });

    it('should provide comprehensive status information', async () => {
        await offlineManager.initialize();

        const status = offlineManager.getStatus();
        expect(status).toBeDefined();
        expect(typeof status.isOnline).toBe('boolean');
        expect(typeof status.isInitialized).toBe('boolean');
        expect(typeof status.queueSize).toBe('number');
        expect(typeof status.pendingUpdates).toBe('number');
        expect(typeof status.storageAvailable).toBe('boolean');
        expect(status.networkStatus).toBeDefined();
    });

    it('should provide statistics', async () => {
        await offlineManager.initialize();

        const stats = offlineManager.getStatistics();
        expect(stats).toBeDefined();
        expect(typeof stats.queueSize).toBe('number');
        expect(typeof stats.isOnline).toBe('boolean');
        expect(stats.config).toBeDefined();
    });

    it('should handle configuration updates', async () => {
        await offlineManager.initialize();

        const newConfig = {
            enableAutoSync: false,
            syncInterval: 60000,
            maxRetries: 5
        };

        expect(() => {
            offlineManager.updateConfig(newConfig);
        }).not.toThrow();

        const stats = offlineManager.getStatistics();
        expect(stats.config.enableAutoSync).toBe(false);
        expect(stats.config.syncInterval).toBe(60000);
        expect(stats.config.maxRetries).toBe(5);
    });

    it('should clear offline data', async () => {
        await offlineManager.initialize();

        // Add some test data
        await offlineManager.createContent({
            id: 'test-clear',
            title: 'Test Clear',
            blocks: [],
            metadata: {
                author: 'Test',
                created: new Date(),
                modified: new Date(),
                version: 1,
                difficulty: 3,
                estimatedTime: 5,
                prerequisites: [],
                tags: [],
                language: 'en'
            },
            relationships: { prerequisites: [], dependents: [], related: [] },
            analytics: { views: 0, completions: 0, averageScore: 0, averageTime: 0 }
        });

        // Clear offline data
        await offlineManager.clearOfflineData();

        // Verify data is cleared
        const status = offlineManager.getStatus();
        expect(status.queueSize).toBe(0);
        expect(status.pendingUpdates).toBe(0);
    });

    it('should handle errors gracefully', async () => {
        // Test with invalid configuration
        await expect(offlineManager.initialize({
            enableAutoSync: true,
            syncInterval: -1, // Invalid interval
            maxRetries: -1 // Invalid retries
        })).resolves.not.toThrow();

        // Should still be available even with invalid config
        expect(offlineManager.isAvailable()).toBe(true);
    });

    it('should handle content operations with missing data gracefully', async () => {
        await offlineManager.initialize();

        // Test with minimal content data
        const minimalContent = {
            id: 'minimal-test',
            title: 'Minimal Test'
        };

        // Should not throw even with incomplete data
        await expect(offlineManager.createContent(minimalContent)).resolves.toBeDefined();
    });
});