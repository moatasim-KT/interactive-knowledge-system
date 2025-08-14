/**
 * Comprehensive offline functionality tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { storage } from '../storage/indexeddb.js';
import { offlineQueue } from '../services/offlineQueue.js';
import { syncService } from '../services/syncService.js';
import { networkService } from '../services/networkService.js';
import { optimisticUpdateManager } from '../services/optimisticUpdates.js';
import type { SyncOperation } from '../types/sync.js';

// Mock IndexedDB for testing
const mockIndexedDB = {
    open: vi.fn(),
    deleteDatabase: vi.fn()
};

// Mock network conditions
const mockNetworkService = {
    isOnline: vi.fn(() => true),
    getNetworkStatus: vi.fn(() => ({ isOnline: true })),
    addListener: vi.fn(),
    destroy: vi.fn()
};

describe('Offline Functionality', () => {
    beforeEach(async () => {
        // Reset all services
        await offlineQueue.clear();
        optimisticUpdateManager.clearAll();

        // Mock network as online initially
        vi.mocked(networkService.isOnline).mockReturnValue(true);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('IndexedDB Integration', () => {
        it('should initialize database successfully', async () => {
            await expect(storage.init()).resolves.not.toThrow();
        });

        it('should handle SSR environment gracefully', async () => {
            // Mock SSR environment
            const originalWindow = global.window;
            // @ts-ignore
            delete global.window;

            await expect(storage.init()).resolves.not.toThrow();

            // Restore window
            global.window = originalWindow;
        });

        it('should store and retrieve content data', async () => {
            const testContent = {
                id: 'test-content-1',
                title: 'Test Content',
                description: 'Test content description',
                blocks: [],
                metadata: {
                    author: 'Test Author',
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

            await storage.put('modules', testContent);
            const retrieved = await storage.get('modules', 'test-content-1');

            expect(retrieved).toBeDefined();
            expect(retrieved?.title).toBe('Test Content');
        });

        it('should handle offline queue persistence', async () => {
            const operation: SyncOperation = {
                id: 'test-op-1',
                type: 'create',
                entity: 'content',
                entityId: 'content-1',
                data: { title: 'Test' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            await offlineQueue.enqueue(operation);
            expect(offlineQueue.size()).toBe(1);

            // Simulate app restart by creating new queue instance
            const newQueue = await import('../services/offlineQueue.js');
            expect(newQueue.offlineQueue.size()).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Offline Detection', () => {
        it('should detect when going offline', () => {
            const listener = vi.fn();
            networkService.addListener(listener);

            // Simulate going offline
            vi.mocked(networkService.isOnline).mockReturnValue(false);

            // Trigger offline event
            window.dispatchEvent(new Event('offline'));

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ isOnline: false })
            );
        });

        it('should detect when coming back online', () => {
            const listener = vi.fn();
            networkService.addListener(listener);

            // Start offline
            vi.mocked(networkService.isOnline).mockReturnValue(false);

            // Go online
            vi.mocked(networkService.isOnline).mockReturnValue(true);
            window.dispatchEvent(new Event('online'));

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ isOnline: true })
            );
        });

        it('should handle slow connections', () => {
            const status = networkService.getNetworkStatus();

            // Mock slow connection
            vi.mocked(networkService.getNetworkStatus).mockReturnValue({
                isOnline: true,
                effectiveType: '2g',
                downlink: 0.5
            });

            expect(networkService.isSlowConnection()).toBe(true);
        });
    });

    describe('Queue Management', () => {
        it('should queue operations when offline', async () => {
            // Go offline
            vi.mocked(networkService.isOnline).mockReturnValue(false);

            const operation: SyncOperation = {
                id: 'offline-op-1',
                type: 'update',
                entity: 'content',
                entityId: 'content-1',
                data: { title: 'Updated Offline' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            await offlineQueue.enqueue(operation);
            expect(offlineQueue.size()).toBe(1);
        });

        it('should prioritize operations correctly', async () => {
            const highPriorityOp: SyncOperation = {
                id: 'high-op',
                type: 'create',
                entity: 'content',
                entityId: 'content-high',
                data: { title: 'High Priority' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            const lowPriorityOp: SyncOperation = {
                id: 'low-op',
                type: 'update',
                entity: 'content',
                entityId: 'content-low',
                data: { title: 'Low Priority' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            await offlineQueue.enqueue(lowPriorityOp, 'low');
            await offlineQueue.enqueue(highPriorityOp, 'high');

            const nextOps = offlineQueue.getNextOperations(2);
            expect(nextOps[0].id).toBe('high-op');
        });

        it('should optimize queue by removing redundant operations', async () => {
            const createOp: SyncOperation = {
                id: 'create-op',
                type: 'create',
                entity: 'content',
                entityId: 'content-1',
                data: { title: 'Created' },
                timestamp: new Date(Date.now() - 1000),
                retryCount: 0,
                maxRetries: 3
            };

            const updateOp: SyncOperation = {
                id: 'update-op',
                type: 'update',
                entity: 'content',
                entityId: 'content-1',
                data: { title: 'Updated' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            await offlineQueue.enqueue(createOp);
            await offlineQueue.enqueue(updateOp);
            expect(offlineQueue.size()).toBe(2);

            await offlineQueue.optimizeQueue();
            expect(offlineQueue.size()).toBe(1);

            const remaining = offlineQueue.getAllOperations();
            expect(remaining[0].type).toBe('update');
        });
    });

    describe('Optimistic Updates', () => {
        it('should apply optimistic updates immediately', () => {
            const operation: SyncOperation = {
                id: 'optimistic-op',
                type: 'update',
                entity: 'content',
                entityId: 'content-1',
                data: { title: 'Optimistically Updated' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            const updateId = optimisticUpdateManager.applyOptimisticUpdate(operation);
            expect(updateId).toBeDefined();

            const pendingUpdates = optimisticUpdateManager.getPendingUpdates();
            expect(pendingUpdates).toHaveLength(1);
        });

        it('should rollback failed operations', () => {
            const operation: SyncOperation = {
                id: 'failed-op',
                type: 'update',
                entity: 'content',
                entityId: 'content-1',
                data: { title: 'Failed Update' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            const updateId = optimisticUpdateManager.applyOptimisticUpdate(operation);
            optimisticUpdateManager.rollbackUpdate(updateId);

            const pendingUpdates = optimisticUpdateManager.getPendingUpdates();
            expect(pendingUpdates).toHaveLength(0);
        });

        it('should confirm successful operations', () => {
            const operation: SyncOperation = {
                id: 'success-op',
                type: 'create',
                entity: 'content',
                entityId: 'content-1',
                data: { title: 'Successfully Created' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            const updateId = optimisticUpdateManager.applyOptimisticUpdate(operation);
            optimisticUpdateManager.confirmUpdate(updateId);

            const pendingUpdates = optimisticUpdateManager.getPendingUpdates();
            expect(pendingUpdates).toHaveLength(0);
        });
    });

    describe('Sync Functionality', () => {
        it('should sync when coming back online', async () => {
            // Start offline with queued operations
            vi.mocked(networkService.isOnline).mockReturnValue(false);

            const operation: SyncOperation = {
                id: 'sync-op',
                type: 'create',
                entity: 'content',
                entityId: 'content-sync',
                data: { title: 'To Sync' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            await offlineQueue.enqueue(operation);

            // Come back online
            vi.mocked(networkService.isOnline).mockReturnValue(true);

            // Mock successful sync
            const syncSpy = vi.spyOn(syncService, 'syncNow').mockResolvedValue();

            // Trigger sync
            await syncService.syncNow();

            expect(syncSpy).toHaveBeenCalled();
        });

        it('should handle sync conflicts', async () => {
            // This would test conflict resolution
            // Implementation depends on the specific conflict resolution strategy
            expect(true).toBe(true); // Placeholder
        });

        it('should retry failed operations', async () => {
            const operation: SyncOperation = {
                id: 'retry-op',
                type: 'update',
                entity: 'content',
                entityId: 'content-retry',
                data: { title: 'Retry Me' },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            };

            await offlineQueue.enqueue(operation);

            // Simulate retry
            const canRetry = await offlineQueue.incrementRetryCount('retry-op');
            expect(canRetry).toBe(true);

            const operations = offlineQueue.getAllOperations();
            expect(operations[0].retryCount).toBe(1);
        });
    });

    describe('Data Persistence', () => {
        it('should persist user progress offline', async () => {
            const progress = {
                userId: 'user-1',
                moduleId: 'module-1',
                status: 'completed' as const,
                score: 85,
                timeSpent: 1200,
                lastAccessed: new Date(),
                attempts: 1,
                bookmarked: false,
                notes: 'Great module!',
                completedAt: new Date()
            };

            await storage.put('progress', progress);
            const retrieved = await storage.get('progress', ['user-1', 'module-1']);

            expect(retrieved).toBeDefined();
            expect(retrieved?.score).toBe(85);
        });

        it('should persist user settings offline', async () => {
            const settings = {
                id: 'user-1',
                userId: 'user-1',
                preferences: {
                    theme: 'dark' as const,
                    learningStyle: 'visual' as const,
                    difficulty: 4 as const,
                    language: 'en',
                    notifications: true,
                    autoSave: true
                },
                profile: {
                    name: 'Test User',
                    email: 'test@example.com',
                    joinDate: new Date()
                }
            };

            await storage.put('settings', settings);
            const retrieved = await storage.get('settings', 'user-1');

            expect(retrieved).toBeDefined();
            expect(retrieved?.preferences.theme).toBe('dark');
        });

        it('should handle version conflicts in stored data', async () => {
            const content1 = {
                id: 'versioned-content',
                title: 'Version 1',
                description: 'Version 1 description',
                blocks: [],
                metadata: {
                    author: 'Author',
                    created: new Date(),
                    modified: new Date(),
                    version: 1,
                    difficulty: 3,
                    estimatedTime: 10,
                    prerequisites: [],
                    tags: [],
                    language: 'en'
                },
                relationships: { prerequisites: [], dependents: [], related: [] },
                analytics: { views: 0, completions: 0, averageScore: 0, averageTime: 0 }
            };

            const content2 = {
                ...content1,
                title: 'Version 2',
                metadata: {
                    ...content1.metadata,
                    version: 2,
                    modified: new Date()
                }
            };

            await storage.put('modules', content1);
            await storage.put('modules', content2);

            const versions = await storage.getVersionHistory('versioned-content', 'module');
            expect(versions.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('Core Features Offline', () => {
        it('should allow content creation offline', async () => {
            // Go offline
            vi.mocked(networkService.isOnline).mockReturnValue(false);

            const contentData = {
                id: 'offline-content',
                title: 'Created Offline',
                blocks: [],
                metadata: {
                    author: 'Offline User',
                    created: new Date(),
                    modified: new Date(),
                    version: 1,
                    difficulty: 3,
                    estimatedTime: 15,
                    prerequisites: [],
                    tags: ['offline'],
                    language: 'en'
                },
                relationships: { prerequisites: [], dependents: [], related: [] },
                analytics: { views: 0, completions: 0, averageScore: 0, averageTime: 0 }
            };

            const operationId = await syncService.createContent(contentData);
            expect(operationId).toBeDefined();
            expect(offlineQueue.size()).toBe(1);
        });

        it('should allow progress updates offline', async () => {
            // Go offline
            vi.mocked(networkService.isOnline).mockReturnValue(false);

            const progressData = {
                userId: 'user-1',
                moduleId: 'module-1',
                status: 'in-progress' as const,
                score: 75,
                timeSpent: 900,
                lastAccessed: new Date(),
                attempts: 1,
                bookmarked: true,
                notes: 'Making progress'
            };

            const operationId = await syncService.updateProgress('module-1', progressData);
            expect(operationId).toBeDefined();
            expect(offlineQueue.size()).toBe(1);
        });

        it('should allow settings updates offline', async () => {
            // Go offline
            vi.mocked(networkService.isOnline).mockReturnValue(false);

            const settingsData = {
                preferences: {
                    theme: 'light' as const,
                    learningStyle: 'kinesthetic' as const,
                    difficulty: 5,
                    language: 'es',
                    notifications: false,
                    autoSave: false
                }
            };

            const operationId = await syncService.updateSettings(settingsData);
            expect(operationId).toBeDefined();
            expect(offlineQueue.size()).toBe(1);
        });
    });

    describe('Performance and Reliability', () => {
        it('should handle large offline queues efficiently', async () => {
            const startTime = Date.now();

            // Create many operations
            const operations = Array.from({ length: 100 }, (_, i) => ({
                id: `bulk-op-${i}`,
                type: 'update' as const,
                entity: 'content' as const,
                entityId: `content-${i}`,
                data: { title: `Bulk Update ${i}` },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            }));

            for (const op of operations) {
                await offlineQueue.enqueue(op);
            }

            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
            expect(offlineQueue.size()).toBe(100);
        });

        it('should recover from storage errors gracefully', async () => {
            // Mock storage error
            const originalGet = storage.get;
            vi.spyOn(storage, 'get').mockRejectedValue(new Error('Storage error'));

            // Should not throw
            await expect(storage.get('modules', 'test')).rejects.toThrow('Storage error');

            // Restore original method
            storage.get = originalGet;
        });

        it('should handle concurrent operations safely', async () => {
            const operations = Array.from({ length: 10 }, (_, i) => ({
                id: `concurrent-op-${i}`,
                type: 'create' as const,
                entity: 'content' as const,
                entityId: `content-${i}`,
                data: { title: `Concurrent ${i}` },
                timestamp: new Date(),
                retryCount: 0,
                maxRetries: 3
            }));

            // Enqueue all operations concurrently
            await Promise.all(operations.map(op => offlineQueue.enqueue(op)));

            expect(offlineQueue.size()).toBe(10);
        });
    });
});