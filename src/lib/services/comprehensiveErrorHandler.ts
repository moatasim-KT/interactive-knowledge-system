/**
 * Comprehensive Error Handling and Logging System
 * Provides centralized error management, categorization, recovery, and user-friendly messaging
 */

import { logger } from '../utils/logger.js';
import { appState, actions } from '../stores/appState.svelte.js';
import { webContentActions } from '../stores/webContentState.svelte.js';

export interface ErrorContext {
    component?: string;
    operation?: string;
    userId?: string;
    sessionId?: string;
    timestamp?: Date;
    userAgent?: string;
    url?: string;
    additionalData?: Record<string, any>;
}

export interface ErrorClassification {
    category: 'network' | 'validation' | 'processing' | 'system' | 'user' | 'security' | 'performance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    recoverable: boolean;
    userActionRequired: boolean;
    retryable: boolean;
}

export interface ErrorRecoveryStrategy {
    type: 'retry' | 'fallback' | 'graceful-degradation' | 'user-intervention' | 'system-restart';
    maxAttempts?: number;
    retryDelay?: number;
    fallbackAction?: () => Promise<any>;
    userMessage?: string;
    recoveryInstructions?: string[];
}

export interface ProcessedError {
    id: string;
    originalError: Error;
    classification: ErrorClassification;
    context: ErrorContext;
    userMessage: string;
    technicalMessage: string;
    recoveryStrategy: ErrorRecoveryStrategy;
    timestamp: Date;
    stackTrace?: string;
    breadcrumbs: ErrorBreadcrumb[];
}

export interface ErrorBreadcrumb {
    timestamp: Date;
    category: string;
    message: string;
    level: 'debug' | 'info' | 'warning' | 'error';
    data?: Record<string, any>;
}

export interface ErrorMetrics {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoverySuccessRate: number;
    averageRecoveryTime: number;
    topErrors: Array<{ message: string; count: number; lastOccurred: Date }>;
}

/**
 * Comprehensive Error Handler class
 */
export class ComprehensiveErrorHandler {
    private errorHistory: ProcessedError[] = [];
    private breadcrumbs: ErrorBreadcrumb[] = [];
    private maxHistorySize = 1000;
    private maxBreadcrumbs = 100;
    private retryAttempts: Map<string, number> = new Map();
    private recoveryMetrics: ErrorMetrics = {
        totalErrors: 0,
        errorsByCategory: {},
        errorsBySeverity: {},
        recoverySuccessRate: 0,
        averageRecoveryTime: 0,
        topErrors: []
    };

    constructor() {
        this.initializeErrorHandling();
    }

    /**
     * Initialize global error handling
     */
    private initializeErrorHandling(): void {
        // Global error handler for unhandled errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error, {
                component: 'global',
                operation: 'unhandled-error',
                url: window.location.href,
                additionalData: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        });

        // Global handler for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(new Error(event.reason), {
                component: 'global',
                operation: 'unhandled-promise-rejection',
                url: window.location.href,
                additionalData: {
                    reason: event.reason
                }
            });
        });

        logger.info('Comprehensive error handler initialized');
    }

    /**
     * Main error handling method
     */
    async handleError(error: Error | unknown, context: ErrorContext = {}): Promise<ProcessedError> {
        const processedError = this.processError(error, context);

        // Log the error
        this.logError(processedError);

        // Update metrics
        this.updateMetrics(processedError);

        // Store in history
        this.addToHistory(processedError);

        // Attempt recovery if applicable
        await this.attemptRecovery(processedError);

        // Notify user if necessary
        this.notifyUser(processedError);

        // Update application state
        this.updateApplicationState(processedError);

        return processedError;
    }

    /**
     * Process and classify an error
     */
    private processError(error: Error | unknown, context: ErrorContext): ProcessedError {
        const actualError = error instanceof Error ? error : new Error(String(error));
        const errorId = this.generateErrorId();
        const timestamp = new Date();

        // Classify the error
        const classification = this.classifyError(actualError, context);

        // Determine recovery strategy
        const recoveryStrategy = this.determineRecoveryStrategy(actualError, classification, context);

        // Generate user-friendly message
        const userMessage = this.generateUserMessage(actualError, classification, context);

        // Generate technical message
        const technicalMessage = this.generateTechnicalMessage(actualError, context);

        return {
            id: errorId,
            originalError: actualError,
            classification,
            context: {
                ...context,
                timestamp,
                userAgent: navigator.userAgent,
                url: window.location.href
            },
            userMessage,
            technicalMessage,
            recoveryStrategy,
            timestamp,
            stackTrace: actualError.stack,
            breadcrumbs: [...this.breadcrumbs]
        };
    }

    /**
     * Classify error by category, severity, and recoverability
     */
    private classifyError(error: Error, context: ErrorContext): ErrorClassification {
        const message = error.message.toLowerCase();
        const name = error.name.toLowerCase();

        // Network errors
        if (message.includes('fetch') || message.includes('network') || message.includes('timeout') ||
            message.includes('connection') || name.includes('networkerror')) {
            return {
                category: 'network',
                severity: 'medium',
                recoverable: true,
                userActionRequired: false,
                retryable: true
            };
        }

        // Validation errors
        if (message.includes('validation') || message.includes('invalid') || message.includes('required') ||
            name.includes('validationerror')) {
            return {
                category: 'validation',
                severity: 'low',
                recoverable: true,
                userActionRequired: true,
                retryable: false
            };
        }

        // Processing errors
        if (message.includes('processing') || message.includes('transform') || message.includes('parse') ||
            context.operation?.includes('process')) {
            return {
                category: 'processing',
                severity: 'medium',
                recoverable: true,
                userActionRequired: false,
                retryable: true
            };
        }

        // Security errors
        if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden') ||
            message.includes('security') || name.includes('securityerror')) {
            return {
                category: 'security',
                severity: 'high',
                recoverable: false,
                userActionRequired: true,
                retryable: false
            };
        }

        // Performance errors
        if (message.includes('memory') || message.includes('quota') || message.includes('limit') ||
            message.includes('performance')) {
            return {
                category: 'performance',
                severity: 'medium',
                recoverable: true,
                userActionRequired: false,
                retryable: false
            };
        }

        // System errors
        if (message.includes('system') || message.includes('internal') || name.includes('internalerror')) {
            return {
                category: 'system',
                severity: 'high',
                recoverable: false,
                userActionRequired: false,
                retryable: true
            };
        }

        // Default to user error
        return {
            category: 'user',
            severity: 'low',
            recoverable: true,
            userActionRequired: true,
            retryable: false
        };
    }

    /**
     * Determine appropriate recovery strategy
     */
    private determineRecoveryStrategy(
        error: Error,
        classification: ErrorClassification,
        context: ErrorContext
    ): ErrorRecoveryStrategy {
        if (classification.retryable) {
            return {
                type: 'retry',
                maxAttempts: this.getMaxRetryAttempts(classification.category),
                retryDelay: this.getRetryDelay(classification.category),
                userMessage: 'Retrying operation...'
            };
        }

        if (classification.category === 'network') {
            return {
                type: 'fallback',
                fallbackAction: this.createNetworkFallback(context),
                userMessage: 'Using offline mode or cached data',
                recoveryInstructions: [
                    'Check your internet connection',
                    'Try refreshing the page',
                    'Contact support if the problem persists'
                ]
            };
        }

        if (classification.category === 'validation') {
            return {
                type: 'user-intervention',
                userMessage: 'Please correct the input and try again',
                recoveryInstructions: [
                    'Check that all required fields are filled',
                    'Ensure data is in the correct format',
                    'Review any validation messages'
                ]
            };
        }

        if (classification.category === 'processing') {
            return {
                type: 'graceful-degradation',
                fallbackAction: this.createProcessingFallback(context),
                userMessage: 'Using simplified processing mode',
                recoveryInstructions: [
                    'Try with a smaller file or simpler content',
                    'Check file format compatibility',
                    'Contact support for assistance'
                ]
            };
        }

        // Default strategy
        return {
            type: 'graceful-degradation',
            userMessage: 'An error occurred, but the application will continue to work',
            recoveryInstructions: [
                'Try refreshing the page',
                'Clear your browser cache',
                'Contact support if the problem persists'
            ]
        };
    }

    /**
     * Attempt error recovery based on strategy
     */
    private async attemptRecovery(processedError: ProcessedError): Promise<boolean> {
        const { recoveryStrategy, id, classification } = processedError;
        const startTime = Date.now();

        try {
            switch (recoveryStrategy.type) {
                case 'retry':
                    return await this.attemptRetry(processedError);

                case 'fallback':
                    if (recoveryStrategy.fallbackAction) {
                        await recoveryStrategy.fallbackAction();
                        return true;
                    }
                    break;

                case 'graceful-degradation':
                    return await this.attemptGracefulDegradation(processedError);

                case 'user-intervention':
                    // User intervention required - no automatic recovery
                    return false;

                case 'system-restart':
                    return await this.attemptSystemRestart(processedError);
            }

            return false;
        } catch (recoveryError) {
            logger.error('Recovery attempt failed', {
                originalErrorId: id,
                recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
            });
            return false;
        } finally {
            const recoveryTime = Date.now() - startTime;
            this.updateRecoveryMetrics(classification.category, recoveryTime);
        }
    }

    /**
     * Attempt retry with exponential backoff
     */
    private async attemptRetry(processedError: ProcessedError): Promise<boolean> {
        const { id, recoveryStrategy } = processedError;
        const currentAttempts = this.retryAttempts.get(id) || 0;
        const maxAttempts = recoveryStrategy.maxAttempts || 3;

        if (currentAttempts >= maxAttempts) {
            logger.warn(`Max retry attempts reached for error ${id}`);
            return false;
        }

        const delay = (recoveryStrategy.retryDelay || 1000) * Math.pow(2, currentAttempts);

        this.retryAttempts.set(id, currentAttempts + 1);

        logger.info(`Retrying operation (attempt ${currentAttempts + 1}/${maxAttempts}) after ${delay}ms`);

        await new Promise(resolve => setTimeout(resolve, delay));

        // The actual retry would be handled by the calling code
        return true;
    }

    /**
     * Attempt graceful degradation
     */
    private async attemptGracefulDegradation(processedError: ProcessedError): Promise<boolean> {
        const { context } = processedError;

        // Implement graceful degradation strategies based on context
        if (context.component === 'document-processor') {
            // Fall back to simpler processing
            logger.info('Falling back to basic document processing');
            return true;
        }

        if (context.component === 'interactive-transformer') {
            // Fall back to static content
            logger.info('Falling back to static content transformation');
            return true;
        }

        return false;
    }

    /**
     * Attempt system restart (for critical errors)
     */
    private async attemptSystemRestart(processedError: ProcessedError): Promise<boolean> {
        logger.warn('Attempting system restart due to critical error');

        // Clear caches and reset state
        this.clearErrorHistory();

        // Reload the page as last resort
        if (processedError.classification.severity === 'critical') {
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }

        return true;
    }

    /**
     * Generate user-friendly error message
     */
    private generateUserMessage(error: Error, classification: ErrorClassification, context: ErrorContext): string {
        const baseMessages = {
            network: 'Connection problem. Please check your internet connection and try again.',
            validation: 'Please check your input and correct any errors.',
            processing: 'There was a problem processing your request. Please try again.',
            system: 'A system error occurred. Our team has been notified.',
            user: 'Please review your input and try again.',
            security: 'Access denied. Please check your permissions.',
            performance: 'The operation is taking longer than expected. Please try with smaller content.'
        };

        let message = baseMessages[classification.category] || 'An unexpected error occurred.';

        // Add context-specific information
        if (context.operation) {
            const operationMessages = {
                'fetch': 'Failed to fetch content from the URL.',
                'upload': 'Failed to upload the file.',
                'process': 'Failed to process the document.',
                'transform': 'Failed to transform the content.',
                'save': 'Failed to save your changes.'
            };

            const operationMessage = operationMessages[context.operation as keyof typeof operationMessages];
            if (operationMessage) {
                message = operationMessage + ' ' + message;
            }
        }

        return message;
    }

    /**
     * Generate technical error message for logging
     */
    private generateTechnicalMessage(error: Error, context: ErrorContext): string {
        const parts = [
            `Error: ${error.name}: ${error.message}`,
            context.component ? `Component: ${context.component}` : null,
            context.operation ? `Operation: ${context.operation}` : null,
            context.url ? `URL: ${context.url}` : null
        ].filter(Boolean);

        return parts.join(' | ');
    }

    /**
     * Add breadcrumb for error tracking
     */
    addBreadcrumb(category: string, message: string, level: ErrorBreadcrumb['level'] = 'info', data?: Record<string, any>): void {
        const breadcrumb: ErrorBreadcrumb = {
            timestamp: new Date(),
            category,
            message,
            level,
            data
        };

        this.breadcrumbs.push(breadcrumb);

        // Keep only the most recent breadcrumbs
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
        }
    }

    /**
     * Log error with appropriate level
     */
    private logError(processedError: ProcessedError): void {
        const { classification, technicalMessage, context, stackTrace } = processedError;

        const logData = {
            errorId: processedError.id,
            category: classification.category,
            severity: classification.severity,
            context,
            stackTrace
        };

        switch (classification.severity) {
            case 'critical':
                logger.error(technicalMessage, logData);
                break;
            case 'high':
                logger.error(technicalMessage, logData);
                break;
            case 'medium':
                logger.warn(technicalMessage, logData);
                break;
            case 'low':
                logger.info(technicalMessage, logData);
                break;
        }
    }

    /**
     * Notify user about the error
     */
    private notifyUser(processedError: ProcessedError): void {
        const { classification, userMessage, recoveryStrategy } = processedError;

        // Don't notify for low-severity errors that are automatically recovered
        if (classification.severity === 'low' && !classification.userActionRequired) {
            return;
        }

        const notificationType = this.getNotificationType(classification.severity);

        actions.addNotification({
            type: notificationType,
            message: userMessage
        });

        // Add recovery instructions if available
        if (recoveryStrategy.recoveryInstructions && recoveryStrategy.recoveryInstructions.length > 0) {
            setTimeout(() => {
                actions.addNotification({
                    type: 'info',
                    message: `Recovery suggestions: ${recoveryStrategy.recoveryInstructions!.join(', ')}`
                });
            }, 1000);
        }
    }

    /**
     * Update application state with error information
     */
    private updateApplicationState(processedError: ProcessedError): void {
        // Update error state
        appState.ui.hasErrors = true;
        appState.ui.errorCount++;
        appState.ui.lastError = processedError.userMessage;
        appState.ui.lastErrorTime = processedError.timestamp;

        // Add to web content state if relevant
        if (processedError.context.component?.includes('web-content')) {
            webContentActions.addNotification({
                type: this.getNotificationType(processedError.classification.severity),
                message: processedError.userMessage
            });
        }
    }

    /**
     * Update error metrics
     */
    private updateMetrics(processedError: ProcessedError): void {
        const { classification } = processedError;

        this.recoveryMetrics.totalErrors++;

        // Update category counts
        this.recoveryMetrics.errorsByCategory[classification.category] =
            (this.recoveryMetrics.errorsByCategory[classification.category] || 0) + 1;

        // Update severity counts
        this.recoveryMetrics.errorsBySeverity[classification.severity] =
            (this.recoveryMetrics.errorsBySeverity[classification.severity] || 0) + 1;

        // Update top errors
        this.updateTopErrors(processedError);
    }

    /**
     * Update recovery metrics
     */
    private updateRecoveryMetrics(category: string, recoveryTime: number): void {
        // Update average recovery time
        const currentAvg = this.recoveryMetrics.averageRecoveryTime;
        const totalErrors = this.recoveryMetrics.totalErrors;

        this.recoveryMetrics.averageRecoveryTime =
            (currentAvg * (totalErrors - 1) + recoveryTime) / totalErrors;
    }

    /**
     * Update top errors list
     */
    private updateTopErrors(processedError: ProcessedError): void {
        const message = processedError.originalError.message;
        const existing = this.recoveryMetrics.topErrors.find(e => e.message === message);

        if (existing) {
            existing.count++;
            existing.lastOccurred = processedError.timestamp;
        } else {
            this.recoveryMetrics.topErrors.push({
                message,
                count: 1,
                lastOccurred: processedError.timestamp
            });
        }

        // Keep only top 10 errors
        this.recoveryMetrics.topErrors.sort((a, b) => b.count - a.count);
        this.recoveryMetrics.topErrors = this.recoveryMetrics.topErrors.slice(0, 10);
    }

    /**
     * Add error to history
     */
    private addToHistory(processedError: ProcessedError): void {
        this.errorHistory.push(processedError);

        // Keep only recent errors
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
        }
    }

    // Utility methods

    private generateErrorId(): string {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getNotificationType(severity: string): 'info' | 'success' | 'warning' | 'error' {
        switch (severity) {
            case 'critical':
            case 'high':
                return 'error';
            case 'medium':
                return 'warning';
            case 'low':
            default:
                return 'info';
        }
    }

    private getMaxRetryAttempts(category: string): number {
        const attempts = {
            network: 3,
            processing: 2,
            system: 1,
            validation: 0,
            user: 0,
            security: 0,
            performance: 1
        };
        return attempts[category as keyof typeof attempts] || 1;
    }

    private getRetryDelay(category: string): number {
        const delays = {
            network: 1000,
            processing: 2000,
            system: 5000,
            validation: 0,
            user: 0,
            security: 0,
            performance: 3000
        };
        return delays[category as keyof typeof delays] || 1000;
    }

    private createNetworkFallback(context: ErrorContext): () => Promise<any> {
        return async () => {
            logger.info('Attempting network fallback');
            // Implement network fallback logic
        };
    }

    private createProcessingFallback(context: ErrorContext): () => Promise<any> {
        return async () => {
            logger.info('Attempting processing fallback');
            // Implement processing fallback logic
        };
    }

    // Public API methods

    /**
     * Get error history
     */
    getErrorHistory(): ProcessedError[] {
        return [...this.errorHistory];
    }

    /**
     * Get error metrics
     */
    getErrorMetrics(): ErrorMetrics {
        return { ...this.recoveryMetrics };
    }

    /**
     * Clear error history
     */
    clearErrorHistory(): void {
        this.errorHistory = [];
        this.breadcrumbs = [];
        this.retryAttempts.clear();
    }

    /**
     * Get recent breadcrumbs
     */
    getBreadcrumbs(): ErrorBreadcrumb[] {
        return [...this.breadcrumbs];
    }
}

// Export singleton instance
export const comprehensiveErrorHandler = new ComprehensiveErrorHandler();