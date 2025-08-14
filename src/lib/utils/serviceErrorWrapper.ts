/**
 * Service Error Wrapper
 * Adds comprehensive error handling to existing service methods
 */

import { errorHandler } from './errorHandler.js';
import type { ErrorContext, ErrorHandlingOptions } from './errorHandler.js';

export interface ServiceWrapperOptions extends ErrorHandlingOptions {
    serviceName: string;
    enableLogging?: boolean;
    enableToasts?: boolean;
    enableRetries?: boolean;
}

/**
 * Wrap a service class with error handling
 */
export function wrapService<T extends object>(
    service: T,
    options: ServiceWrapperOptions
): T {
    const {
        serviceName,
        enableLogging = true,
        enableToasts = true,
        enableRetries = false,
        ...errorOptions
    } = options;

    const wrappedService = Object.create(Object.getPrototypeOf(service));

    // Copy all properties and wrap methods
    for (const [key, value] of Object.entries(service)) {
        if (typeof value === 'function') {
            const originalMethod = value.bind(service);

            const context: ErrorContext = {
                operation: key,
                component: serviceName,
                metadata: { args: 0 }
            };

            const wrapperOptions = {
                showToast: enableToasts,
                logError: enableLogging,
                retryable: enableRetries,
                ...errorOptions
            };

            // Create a wrapper that handles both sync and async methods
            (wrappedService as any)[key] = function (...args: any[]) {
                const methodContext = { ...context, metadata: { args: args.length } };

                try {
                    const result = originalMethod(...args);

                    // Check if result is a Promise (async method)
                    if (result && typeof result.then === 'function') {
                        return errorHandler.handleAsync(
                            () => result,
                            methodContext,
                            wrapperOptions
                        ).then(handlerResult => {
                            if (!handlerResult.success) {
                                throw handlerResult.error;
                            }
                            return handlerResult.data;
                        });
                    } else {
                        // Sync method - just return the result
                        return result;
                    }
                } catch (error) {
                    // Handle immediate errors
                    const handlerResult = errorHandler.handleSync(
                        () => { throw error; },
                        methodContext,
                        wrapperOptions
                    );

                    if (!handlerResult.success) {
                        throw handlerResult.error;
                    }

                    return handlerResult.data;
                }
            };
        } else {
            // Copy non-function properties as-is
            (wrappedService as any)[key] = value;
        }
    }

    return wrappedService;
}

/**
 * Wrap individual service methods with error handling
 */
export function wrapServiceMethod<T extends any[], R>(
    method: (...args: T) => Promise<R>,
    context: ErrorContext,
    options: ErrorHandlingOptions = {}
): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
        const result = await errorHandler.handleAsync(
            () => method(...args),
            context,
            options
        );

        if (!result.success) {
            throw result.error!;
        }

        return result.data!;
    };
}

/**
 * Wrap sync service methods with error handling
 */
export function wrapSyncServiceMethod<T extends any[], R>(
    method: (...args: T) => R,
    context: ErrorContext,
    options: ErrorHandlingOptions = {}
): (...args: T) => R {
    return (...args: T): R => {
        const result = errorHandler.handleSync(
            () => method(...args),
            context,
            options
        );

        if (!result.success) {
            throw result.error!;
        }

        return result.data!;
    };
}

/**
 * Create a safe version of a service with automatic error handling
 */
export function createSafeService<T extends object>(
    ServiceClass: new (...args: any[]) => T,
    serviceName: string,
    options: Partial<ServiceWrapperOptions> = {}
) {
    return class SafeService extends (ServiceClass as any) {
        constructor(...args: any[]) {
            super(...args);

            // Wrap all methods after construction
            const wrappedInstance = wrapService(this, {
                serviceName,
                enableLogging: true,
                enableToasts: true,
                enableRetries: false,
                ...options
            });

            // Copy wrapped methods back to this instance
            Object.assign(this, wrappedInstance);
        }
    } as new (...args: any[]) => T;
}

/**
 * Decorator for adding error handling to service methods
 */
export function withErrorHandling(
    context: Partial<ErrorContext>,
    options: ErrorHandlingOptions = {}
) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const fullContext: ErrorContext = {
                operation: propertyKey,
                component: target.constructor.name,
                ...context
            };

            const result = await errorHandler.handleAsync(
                () => originalMethod.apply(this, args),
                fullContext,
                options
            );

            if (!result.success) {
                throw result.error;
            }

            return result.data;
        };

        return descriptor;
    };
}

/**
 * Add error handling to fetch operations
 */
export function safeFetch(
    url: string,
    options: RequestInit = {},
    context: Partial<ErrorContext> = {}
): Promise<Response> {
    const fetchContext: ErrorContext = {
        operation: 'fetch',
        component: 'network',
        metadata: { url, method: options.method || 'GET' },
        ...context
    };

    return errorHandler.handleAsync(
        () => fetch(url, options),
        fetchContext,
        {
            retryable: true,
            maxRetries: 3,
            retryDelay: 1000,
            showToast: true
        }
    ).then(result => {
        if (!result.success) {
            throw result.error!;
        }
        return result.data!;
    });
}

/**
 * Add error handling to localStorage operations
 */
export const safeLocalStorage = {
    getItem(key: string): string | null {
        const result = errorHandler.handleSync(
            () => localStorage.getItem(key),
            { operation: 'localStorage.getItem', component: 'storage' },
            { showToast: false, fallbackValue: null }
        );
        return result.data;
    },

    setItem(key: string, value: string): void {
        errorHandler.handleSync(
            () => localStorage.setItem(key, value),
            { operation: 'localStorage.setItem', component: 'storage' },
            { showToast: true }
        );
    },

    removeItem(key: string): void {
        errorHandler.handleSync(
            () => localStorage.removeItem(key),
            { operation: 'localStorage.removeItem', component: 'storage' },
            { showToast: false }
        );
    },

    clear(): void {
        errorHandler.handleSync(
            () => localStorage.clear(),
            { operation: 'localStorage.clear', component: 'storage' },
            { showToast: true }
        );
    }
};

/**
 * Add error handling to IndexedDB operations
 */
export function safeIndexedDB<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: ErrorHandlingOptions = {}
): Promise<T> {
    return errorHandler.handleAsync(
        operation,
        { operation: operationName, component: 'indexedDB' },
        {
            retryable: true,
            maxRetries: 2,
            showToast: true,
            ...options
        }
    ).then(result => {
        if (!result.success) {
            throw result.error!;
        }
        return result.data!;
    });
}