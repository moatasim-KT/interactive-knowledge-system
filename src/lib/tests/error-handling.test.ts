/**
 * Comprehensive error handling tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { errorHandler } from '../utils/errorHandler.js';
import type { ErrorContext } from '../utils/errorHandler.js';

describe('Error Handler', () => {
    beforeEach(() => {
        // Clear any existing error listeners
        errorHandler.clearToastQueue();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('handleAsync', () => {
        it('should handle successful async operations', async () => {
            const operation = vi.fn().mockResolvedValue('success');
            const context: ErrorContext = { operation: 'test', component: 'test' };

            const result = await errorHandler.handleAsync(operation, context);

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(result.error).toBeUndefined();
        });

        it('should handle async operation failures', async () => {
            const testError = new Error('Test error');
            const operation = vi.fn().mockRejectedValue(testError);
            const context: ErrorContext = { operation: 'test', component: 'test' };

            const result = await errorHandler.handleAsync(operation, context, {
                showToast: false,
                logError: false
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe(testError);
            expect(result.data).toBeUndefined();
        });

        it('should retry retryable operations', async () => {
            const testError = new Error('Network error');
            const operation = vi.fn()
                .mockRejectedValueOnce(testError)
                .mockRejectedValueOnce(testError)
                .mockResolvedValue('success');

            const context: ErrorContext = { operation: 'test', component: 'test' };

            const result = await errorHandler.handleAsync(operation, context, {
                showToast: false,
                logError: false,
                retryable: true,
                maxRetries: 3,
                retryDelay: 10
            });

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(result.retryCount).toBe(2);
            expect(operation).toHaveBeenCalledTimes(3);
        });

        it('should call error callbacks', async () => {
            const testError = new Error('Test error');
            const operation = vi.fn().mockRejectedValue(testError);
            const onError = vi.fn();
            const context: ErrorContext = { operation: 'test', component: 'test' };

            await errorHandler.handleAsync(operation, context, {
                showToast: false,
                logError: false,
                onError
            });

            expect(onError).toHaveBeenCalledWith(testError, context);
        });
    });

    describe('handleSync', () => {
        it('should handle successful sync operations', () => {
            const operation = vi.fn().mockReturnValue('success');
            const context: ErrorContext = { operation: 'test', component: 'test' };

            const result = errorHandler.handleSync(operation, context);

            expect(result.success).toBe(true);
            expect(result.data).toBe('success');
            expect(result.error).toBeUndefined();
        });

        it('should handle sync operation failures', () => {
            const testError = new Error('Test error');
            const operation = vi.fn().mockImplementation(() => { throw testError; });
            const context: ErrorContext = { operation: 'test', component: 'test' };

            const result = errorHandler.handleSync(operation, context, {
                showToast: false,
                logError: false
            });

            expect(result.success).toBe(false);
            expect(result.error).toBe(testError);
            expect(result.data).toBeUndefined();
        });

        it('should return fallback value on error', () => {
            const testError = new Error('Test error');
            const operation = vi.fn().mockImplementation(() => { throw testError; });
            const context: ErrorContext = { operation: 'test', component: 'test' };
            const fallbackValue = 'fallback';

            const result = errorHandler.handleSync(operation, context, {
                showToast: false,
                logError: false,
                fallbackValue
            });

            expect(result.success).toBe(false);
            expect(result.data).toBe(fallbackValue);
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('should return network error message for network errors', () => {
            const error = new Error('fetch failed');
            const context: ErrorContext = { operation: 'test', component: 'test' };

            const message = errorHandler.getUserFriendlyMessage(error, context);

            expect(message).toContain('connection');
        });

        it('should return timeout error message for timeout errors', () => {
            const error = new Error('timeout');
            const context: ErrorContext = { operation: 'test', component: 'test' };

            const message = errorHandler.getUserFriendlyMessage(error, context);

            expect(message).toContain('too long');
        });

        it('should return operation-specific message', () => {
            const error = new Error('generic error');
            const context: ErrorContext = { operation: 'save', component: 'test' };

            const message = errorHandler.getUserFriendlyMessage(error, context);

            expect(message).toContain('save');
        });
    });

    describe('createAsyncWrapper', () => {
        it('should create a wrapped async function', async () => {
            const originalFn = vi.fn().mockResolvedValue('success');
            const context: ErrorContext = { operation: 'test', component: 'test' };

            const wrappedFn = errorHandler.createAsyncWrapper(originalFn, context, {
                showToast: false,
                logError: false
            });

            const result = await wrappedFn('arg1', 'arg2');

            expect(result).toBe('success');
            expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2');
        });

        it('should handle errors in wrapped function', async () => {
            const testError = new Error('Test error');
            const originalFn = vi.fn().mockRejectedValue(testError);
            const context: ErrorContext = { operation: 'test', component: 'test' };

            const wrappedFn = errorHandler.createAsyncWrapper(originalFn, context, {
                showToast: false,
                logError: false
            });

            const result = await wrappedFn();

            expect(result).toBeUndefined();
        });
    });

    describe('error listeners', () => {
        it('should add and call error listeners', async () => {
            const listener = vi.fn();
            const testError = new Error('Test error');
            const operation = vi.fn().mockRejectedValue(testError);
            const context: ErrorContext = { operation: 'test', component: 'test' };

            errorHandler.addErrorListener(listener);

            await errorHandler.handleAsync(operation, context, {
                showToast: false,
                logError: false
            });

            expect(listener).toHaveBeenCalledWith(testError, context);

            errorHandler.removeErrorListener(listener);
        });

        it('should remove error listeners', async () => {
            const listener = vi.fn();
            const testError = new Error('Test error');
            const operation = vi.fn().mockRejectedValue(testError);
            const context: ErrorContext = { operation: 'test', component: 'test' };

            errorHandler.addErrorListener(listener);
            errorHandler.removeErrorListener(listener);

            await errorHandler.handleAsync(operation, context, {
                showToast: false,
                logError: false
            });

            expect(listener).not.toHaveBeenCalled();
        });
    });
});

describe('Service Error Wrapper', () => {
    // Mock service for testing
    class TestService {
        async asyncMethod(value: string): Promise<string> {
            if (value === 'error') {
                throw new Error('Test async error');
            }
            return `async-${value}`;
        }

        syncMethod(value: string): string {
            if (value === 'error') {
                throw new Error('Test sync error');
            }
            return `sync-${value}`;
        }

        get property(): string {
            return 'property-value';
        }
    }

    it('should wrap service methods with error handling', async () => {
        const { wrapService } = await import('../utils/serviceErrorWrapper.js');

        const service = new TestService();
        const wrappedService = wrapService(service, {
            serviceName: 'TestService',
            enableToasts: false,
            enableLogging: false
        });

        // Test successful async method
        const asyncResult = await wrappedService.asyncMethod('test');
        expect(asyncResult).toBe('async-test');

        // Test successful sync method
        const syncResult = wrappedService.syncMethod('test');
        expect(syncResult).toBe('sync-test');

        // Test property access
        expect(wrappedService.property).toBe('property-value');
    });

    it('should handle errors in wrapped service methods', async () => {
        const { wrapService } = await import('../utils/serviceErrorWrapper.js');

        const service = new TestService();
        const wrappedService = wrapService(service, {
            serviceName: 'TestService',
            enableToasts: false,
            enableLogging: false
        });

        // Test async method error
        await expect(wrappedService.asyncMethod('error')).rejects.toThrow('Test async error');

        // Test sync method error
        expect(() => wrappedService.syncMethod('error')).toThrow('Test sync error');
    });
});

describe('Safe Storage Operations', () => {
    beforeEach(() => {
        // Mock localStorage
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn(),
                setItem: vi.fn(),
                removeItem: vi.fn(),
                clear: vi.fn()
            },
            writable: true
        });
    });

    it('should handle localStorage operations safely', async () => {
        const { safeLocalStorage } = await import('../utils/serviceErrorWrapper.js');

        // Mock successful operations
        (window.localStorage.getItem as any).mockReturnValue('test-value');
        (window.localStorage.setItem as any).mockImplementation(() => { });

        const value = safeLocalStorage.getItem('test-key');
        expect(value).toBe('test-value');

        safeLocalStorage.setItem('test-key', 'new-value');
        expect(window.localStorage.setItem).toHaveBeenCalledWith('test-key', 'new-value');
    });

    it('should handle localStorage errors gracefully', async () => {
        const { safeLocalStorage } = await import('../utils/serviceErrorWrapper.js');

        // Mock localStorage error
        (window.localStorage.getItem as any).mockImplementation(() => {
            throw new Error('Storage error');
        });

        const value = safeLocalStorage.getItem('test-key');
        expect(value).toBeNull(); // Should return fallback value
    });
});

describe('Safe Fetch Operations', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should handle successful fetch operations', async () => {
        const { safeFetch } = await import('../utils/serviceErrorWrapper.js');

        const mockResponse = new Response('test data', { status: 200 });
        (global.fetch as any).mockResolvedValue(mockResponse);

        const response = await safeFetch('https://example.com/api/test');
        expect(response).toBe(mockResponse);
        expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/test', {});
    });

    it('should handle fetch errors with retries', async () => {
        const { safeFetch } = await import('../utils/serviceErrorWrapper.js');

        const mockError = new Error('Network error');
        (global.fetch as any)
            .mockRejectedValueOnce(mockError)
            .mockRejectedValueOnce(mockError)
            .mockResolvedValue(new Response('success', { status: 200 }));

        const response = await safeFetch('https://example.com/api/test');
        expect(response.status).toBe(200);
        expect(global.fetch).toHaveBeenCalledTimes(3);
    });
});