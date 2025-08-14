/**
 * Simple offline functionality tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineManager } from '../services/offlineManager.js';

// Mock browser environment
Object.defineProperty(window, 'indexedDB', {
    value: {
        open: vi.fn().mockReturnValue({
            onsuccess: vi.fn(),
            onerror: vi.fn(),
            onupgradeneeded: vi.fn()
        })
    }
});

describe('Offline Functionality - Simple Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize offline manager', async () => {
        expect(offlineManager).toBeDefined();
        expect(typeof offlineManager.initialize).toBe('function');
    });

    it('should check availability', () => {
        const isAvailable = offlineManager.isAvailable();
        expect(typeof isAvailable).toBe('boolean');
    });

    it('should get status', () => {
        const status = offlineManager.getStatus();
        expect(status).toBeDefined();
        expect(typeof status.isOnline).toBe('boolean');
        expect(typeof status.isInitialized).toBe('boolean');
        expect(typeof status.queueSize).toBe('number');
    });

    it('should handle configuration updates', () => {
        expect(() => {
            offlineManager.updateConfig({
                enableAutoSync: false,
                syncInterval: 60000
            });
        }).not.toThrow();
    });

    it('should get statistics', () => {
        const stats = offlineManager.getStatistics();
        expect(stats).toBeDefined();
        expect(typeof stats.queueSize).toBe('number');
    });
});