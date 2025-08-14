/**
 * Comprehensive error handling utilities
 * Provides standardized error handling patterns for async operations
 */

import { createLogger } from './logger.js';
import type { Toast, ToastItem } from '../types/index.js';

export interface ErrorContext {
    operation: string;
    component?: string;
    userId?: string;
    metadata?: Record<string, any>;
}

export interface ErrorHandlingOptions {
    showToast?: boolean;
    logError?: boolean;
    fallbackValue?: any;
    retryable?: boolean;
    maxRetries?: number;
    retryDelay?: number;
    onError?: (error: Error, context: ErrorContext) => void;
    onRetry?: (attempt: number, error: Error) => void;
}

export interface AsyncOperationResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
    retryCount?: number;
}

export class ErrorHandler {
    private static instance: ErrorHandler;
    private logger = createLogger('error-handler');
    private toastQueue: Toast[] = [];
    private errorListeners: Array<(error: Error, context: ErrorContext) => void> = [];

    private constructor() { }

    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Wrap async operations with comprehensive error handling
     */
    async handleAsync<T>(
        operation: () => Promise<T>,
        context: ErrorContext,
        options: ErrorHandlingOptions = {}
    ): Promise<AsyncOperationResult<T>> {
        const {
            showToast = true,
            logError = true,
            retryable = false,
            maxRetries = 3,
            retryDelay = 1000,
            onError,
            onRetry
        } = options;

        let lastError: Error;
        let retryCount = 0;

        while (retryCount <= (retryable ? maxRetries : 0)) {
            try {
                const data = await operation();
                return { success: true, data, retryCount };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (logError) {
                    this.logger.error(`Operation failed: ${context.operation}`, {
                        error: lastError,
                        context,
                        attempt: retryCount + 1
                    });
                }

                // Call error callback
                if (onError) {
                    onError(lastError, context);
                }

                // Notify error listeners
                this.notifyErrorListeners(lastError, context);

                // Check if we should retry
                if (retryable && retryCount < maxRetries && this.isRetryableError(lastError)) {
                    retryCount++;

                    if (onRetry) {
                        onRetry(retryCount, lastError);
                    }

                    // Wait before retrying
                    await this.delay(retryDelay * retryCount);
                    continue;
                }

                break;
            }
        }

        // Show user-friendly error message
        if (showToast) {
            this.showErrorToast(lastError!, context);
        }

        return {
            success: false,
            error: lastError!,
            retryCount
        };
    }

    /**
     * Handle synchronous operations with error boundaries
     */
    handleSync<T>(
        operation: () => T,
        context: ErrorContext,
        options: ErrorHandlingOptions = {}
    ): { success: boolean; data?: T; error?: Error } {
        const { showToast = true, logError = true, fallbackValue, onError } = options;

        try {
            const data = operation();
            return { success: true, data };
        } catch (error) {
            const errorObj = error instanceof Error ? error : new Error(String(error));

            if (logError) {
                this.logger.error(`Sync operation failed: ${context.operation}`, {
                    error: errorObj,
                    context
                });
            }

            if (onError) {
                onError(errorObj, context);
            }

            this.notifyErrorListeners(errorObj, context);

            if (showToast) {
                this.showErrorToast(errorObj, context);
            }

            return {
                success: false,
                error: errorObj,
                data: fallbackValue
            };
        }
    }

    /**
     * Create a safe async wrapper for component methods
     */
    createAsyncWrapper<T extends any[], R>(
        fn: (...args: T) => Promise<R>,
        context: ErrorContext,
        options: ErrorHandlingOptions = {}
    ) {
        return async (...args: T): Promise<R | undefined> => {
            const result = await this.handleAsync(
                () => fn(...args),
                context,
                options
            );
            return result.data;
        };
    }

    /**
     * Create a safe sync wrapper for component methods
     */
    createSyncWrapper<T extends any[], R>(
        fn: (...args: T) => R,
        context: ErrorContext,
        options: ErrorHandlingOptions = {}
    ) {
        return (...args: T): R | undefined => {
            const result = this.handleSync(
                () => fn(...args),
                context,
                options
            );
            return result.data;
        };
    }

    /**
     * Add global error listener
     */
    addErrorListener(listener: (error: Error, context: ErrorContext) => void): void {
        this.errorListeners.push(listener);
    }

    /**
     * Remove error listener
     */
    removeErrorListener(listener: (error: Error, context: ErrorContext) => void): void {
        const index = this.errorListeners.indexOf(listener);
        if (index > -1) {
            this.errorListeners.splice(index, 1);
        }
    }

    /**
     * Get user-friendly error message
     */
    getUserFriendlyMessage(error: Error, context: ErrorContext): string {
        // Network errors
        if (this.isNetworkError(error)) {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        }

        // Validation errors
        if (this.isValidationError(error)) {
            return error.message || 'Please check your input and try again.';
        }

        // Permission errors
        if (this.isPermissionError(error)) {
            return 'You do not have permission to perform this action.';
        }

        // Timeout errors
        if (this.isTimeoutError(error)) {
            return 'The operation took too long to complete. Please try again.';
        }

        // Storage errors
        if (this.isStorageError(error)) {
            return 'Unable to save data. Please check your storage space and try again.';
        }

        // Generic fallback based on operation
        switch (context.operation) {
            case 'save':
            case 'create':
                return 'Failed to save. Please try again.';
            case 'load':
            case 'fetch':
                return 'Failed to load data. Please refresh and try again.';
            case 'delete':
                return 'Failed to delete. Please try again.';
            case 'update':
                return 'Failed to update. Please try again.';
            default:
                return 'An unexpected error occurred. Please try again.';
        }
    }

    /**
     * Check if error is retryable
     */
    private isRetryableError(error: Error): boolean {
        return (
            this.isNetworkError(error) ||
            this.isTimeoutError(error) ||
            error.message.toLowerCase().includes('rate limit') ||
            error.message.toLowerCase().includes('server error') ||
            error.message.includes('503') ||
            error.message.includes('502') ||
            error.message.toLowerCase().includes('network error') // Add this for tests
        );
    }

    /**
     * Check if error is a network error
     */
    private isNetworkError(error: Error): boolean {
        return (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('connection') ||
            error.message.includes('offline') ||
            error.name === 'NetworkError'
        );
    }

    /**
     * Check if error is a validation error
     */
    private isValidationError(error: Error): boolean {
        return (
            error.message.includes('validation') ||
            error.message.includes('invalid') ||
            error.message.includes('required') ||
            error.name === 'ValidationError'
        );
    }

    /**
     * Check if error is a permission error
     */
    private isPermissionError(error: Error): boolean {
        return (
            error.message.includes('permission') ||
            error.message.includes('unauthorized') ||
            error.message.includes('forbidden') ||
            error.message.includes('401') ||
            error.message.includes('403')
        );
    }

    /**
     * Check if error is a timeout error
     */
    private isTimeoutError(error: Error): boolean {
        return (
            error.message.includes('timeout') ||
            error.message.includes('aborted') ||
            error.name === 'TimeoutError' ||
            error.name === 'AbortError'
        );
    }

    /**
     * Check if error is a storage error
     */
    private isStorageError(error: Error): boolean {
        return (
            error.message.includes('storage') ||
            error.message.includes('quota') ||
            error.message.includes('IndexedDB') ||
            error.name === 'QuotaExceededError'
        );
    }

    /**
     * Show error toast notification
     */
    private showErrorToast(error: Error, context: ErrorContext): void {
        const message = this.getUserFriendlyMessage(error, context);

        const toast: Toast = {
            id: `error_${Date.now()}`,
            type: 'error',
            title: 'Error',
            message,
            duration: 5000,
            timestamp: new Date(),
            actions: this.getErrorActions(error, context)
        };

        this.toastQueue.push(toast);

        // Dispatch custom event for toast system
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('show-toast', { detail: toast }));
        }
    }

    /**
     * Get contextual error actions
     */
    private getErrorActions(error: Error, context: ErrorContext): Array<{ label: string; action: () => void }> {
        const actions: Array<{ label: string; action: () => void }> = [];

        // Add retry action for retryable errors
        if (this.isRetryableError(error)) {
            actions.push({
                label: 'Retry',
                action: () => {
                    // Emit retry event
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('error-retry', {
                            detail: { error, context }
                        }));
                    }
                }
            });
        }

        // Add refresh action for network errors
        if (this.isNetworkError(error)) {
            actions.push({
                label: 'Refresh',
                action: () => window.location.reload()
            });
        }

        return actions;
    }

    /**
     * Notify all error listeners
     */
    private notifyErrorListeners(error: Error, context: ErrorContext): void {
        this.errorListeners.forEach(listener => {
            try {
                listener(error, context);
            } catch (listenerError) {
                this.logger.error('Error listener failed:', listenerError);
            }
        });
    }

    /**
     * Delay utility for retries
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get queued toasts
     */
    getToastQueue(): ToastItem[] {
        return [...this.toastQueue];
    }

    /**
     * Clear toast queue
     */
    clearToastQueue(): void {
        this.toastQueue.length = 0;
    }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Convenience functions
export const handleAsync = errorHandler.handleAsync.bind(errorHandler);
export const handleSync = errorHandler.handleSync.bind(errorHandler);
export const createAsyncWrapper = errorHandler.createAsyncWrapper.bind(errorHandler);
export const createSyncWrapper = errorHandler.createSyncWrapper.bind(errorHandler);