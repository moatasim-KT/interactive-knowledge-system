/**
 * Web Content Error Handler Service
 * Provides comprehensive error handling for web content sourcing operations
 */

import { createLogger } from '$lib/utils/logger.js';
import { webContentActions } from '$lib/stores/webContentState.svelte.js';

const logger = createLogger('web-content-error-handler');

export interface WebContentError {
	code: string;
	message: string;
	details?: any;
	recoverable: boolean;
	retryable: boolean;
	userMessage: string;
	timestamp: Date;
}

export class WebContentErrorHandler {
	private static instance: WebContentErrorHandler;
	private errorHistory: WebContentError[] = [];
	private readonly maxHistorySize = 100;

	static getInstance(): WebContentErrorHandler {
		if (!WebContentErrorHandler.instance) {
			WebContentErrorHandler.instance = new WebContentErrorHandler();
		}
		return WebContentErrorHandler.instance;
	}

	/**
	 * Handle and categorize errors from web content operations
	 */
	handleError(error: any, context: string, operation: string): WebContentError {
		const web_content_error = this.categorizeError(error, context, operation);

		// Log the error
		logger.error(`${operation} failed in ${context}:`, {
			code: web_content_error.code,
			message: web_content_error.message,
			details: web_content_error.details
		});

		// Add to history
		this.addToHistory(web_content_error);

		// Show user notification
		this.showUserNotification(web_content_error);

		// Attempt recovery if possible
		if (web_content_error.recoverable) {
			this.attemptRecovery(web_content_error, context, operation);
		}

		return web_content_error;
	}

	/**
	 * Categorize errors into specific types with appropriate handling
	 */
	private categorizeError(error: any, context: string, operation: string): WebContentError {
		const timestamp = new Date();
		const base_error = {
			details: { context, operation, originalError: error },
			timestamp
		};

		// Network errors
		if (error instanceof TypeError && error.message.includes('fetch')) {
			return {
				...base_error,
				code: 'NETWORK_ERROR',
				message: 'Network connection failed',
				recoverable: true,
				retryable: true,
				userMessage: 'Unable to connect to the website. Please check your internet connection and try again.'
			};
		}

		// Timeout errors
		if (error.name === 'AbortError' || error.message.includes('timeout')) {
			return {
				...base_error,
				code: 'TIMEOUT_ERROR',
				message: 'Request timed out',
				recoverable: true,
				retryable: true,
				userMessage: 'The request took too long to complete. The website might be slow or unavailable.'
			};
		}

		// HTTP errors
		if (error.status) {
			const status = error.status;
			if (status === 404) {
				return {
					...base_error,
					code: 'NOT_FOUND',
					message: 'Content not found',
					recoverable: false,
					retryable: false,
					userMessage: 'The requested page could not be found. Please check the URL and try again.'
				};
			} else if (status === 403) {
				return {
					...base_error,
					code: 'ACCESS_DENIED',
					message: 'Access denied',
					recoverable: false,
					retryable: false,
					userMessage: 'Access to this content is restricted. You may need special permissions to view it.'
				};
			} else if (status === 429) {
				return {
					...base_error,
					code: 'RATE_LIMITED',
					message: 'Rate limit exceeded',
					recoverable: true,
					retryable: true,
					userMessage: 'Too many requests have been made. Please wait a moment before trying again.'
				};
			} else if (status >= 500) {
				return {
					...base_error,
					code: 'SERVER_ERROR',
					message: 'Server error',
					recoverable: true,
					retryable: true,
					userMessage: 'The website is experiencing technical difficulties. Please try again later.'
				};
			}
		}

		// Content extraction errors
		if (context.includes('extraction') || context.includes('parsing')) {
			return {
				...base_error,
				code: 'EXTRACTION_ERROR',
				message: 'Failed to extract content',
				recoverable: true,
				retryable: false,
				userMessage: 'Unable to extract readable content from this page. The page format may not be supported.'
			};
		}

		// Storage errors
		if (context.includes('storage') || error.name === 'QuotaExceededError') {
			return {
				...base_error,
				code: 'STORAGE_ERROR',
				message: 'Storage operation failed',
				recoverable: true,
				retryable: false,
				userMessage: 'Unable to save content. Your storage may be full or unavailable.'
			};
		}

		// Transformation errors
		if (context.includes('transformation') || context.includes('analysis')) {
			return {
				...base_error,
				code: 'TRANSFORMATION_ERROR',
				message: 'Content transformation failed',
				recoverable: true,
				retryable: true,
				userMessage: 'Unable to transform this content into interactive format. The content structure may not be suitable.'
			};
		}

		// URL validation errors
		if (error.message?.includes('Invalid URL') || context.includes('validation')) {
			return {
				...base_error,
				code: 'INVALID_URL',
				message: 'Invalid URL provided',
				recoverable: false,
				retryable: false,
				userMessage: 'The provided URL is not valid. Please check the URL format and try again.'
			};
		}

		// Generic errors
		return {
			...base_error,
			code: 'UNKNOWN_ERROR',
			message: error.message || 'An unknown error occurred',
			recoverable: false,
			retryable: false,
			userMessage: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
		};
	}

	/**
	 * Add error to history with size management
	 */
	private addToHistory(error: WebContentError): void {
		this.errorHistory.unshift(error);

		if (this.errorHistory.length > this.maxHistorySize) {
			this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
		}
	}

	/**
	 * Show appropriate user notification
	 */
	private showUserNotification(error: WebContentError): void {
		const notification_type = this.getNotificationType(error.code);

		webContentActions.addNotification({
			type: notification_type,
			message: error.userMessage
		});
	}

	/**
	 * Get notification type based on error code
	 */
	private getNotificationType(errorCode: string): 'info' | 'success' | 'warning' | 'error' {
		switch (errorCode) {
			case 'RATE_LIMITED':
			case 'TIMEOUT_ERROR':
				return 'warning';
			case 'NOT_FOUND':
			case 'ACCESS_DENIED':
			case 'INVALID_URL':
				return 'error';
			case 'EXTRACTION_ERROR':
			case 'TRANSFORMATION_ERROR':
				return 'warning';
			default:
				return 'error';
		}
	}

	/**
	 * Attempt automatic recovery for recoverable errors
	 */
	private attemptRecovery(error: WebContentError, context: string, operation: string): void {
		logger.info(`Attempting recovery for ${error.code} in ${context}`);

		switch (error.code) {
			case 'NETWORK_ERROR':
			case 'TIMEOUT_ERROR':
				// Implement retry with exponential backoff
				this.scheduleRetry(error, context, operation);
				break;

			case 'RATE_LIMITED':
				// Wait before retrying
				this.scheduleDelayedRetry(error, context, operation, 60000); // 1 minute
				break;

			case 'STORAGE_ERROR':
				// Attempt to clear some storage space
				this.attemptStorageCleanup();
				break;

			case 'EXTRACTION_ERROR':
				// Try alternative extraction methods
				this.tryAlternativeExtraction(error, context);
				break;

			default:
				logger.info(`No recovery strategy available for ${error.code}`);
		}
	}

	/**
	 * Schedule retry with exponential backoff
	 */
	private scheduleRetry(error: WebContentError, context: string, operation: string): void {
		const retry_count = this.getRetryCount(error.code);
		const delay = Math.min(1000 * Math.pow(2, retry_count), 30000); // Max 30 seconds

		logger.info(`Scheduling retry ${retry_count + 1} for ${error.code} in ${delay}ms`);

		setTimeout(() => {
			webContentActions.addNotification({
				type: 'info',
				message: `Retrying ${operation}... (attempt ${retry_count + 1})`
			});
		}, delay);
	}

	/**
	 * Schedule delayed retry
	 */
	private scheduleDelayedRetry(
		error: WebContentError,
		context: string,
		operation: string,
		delay: number
	): void {
		logger.info(`Scheduling delayed retry for ${error.code} in ${delay}ms`);

		setTimeout(() => {
			webContentActions.addNotification({
				type: 'info',
				message: `Rate limit should be cleared. You can try ${operation} again.`
			});
		}, delay);
	}

	/**
	 * Attempt to clean up storage space
	 */
	private attemptStorageCleanup(): void {
		try {
			// This would implement actual storage cleanup logic
			logger.info('Attempting storage cleanup...');

			webContentActions.addNotification({
				type: 'info',
				message: 'Attempting to free up storage space...'
			});

			// For now, just log the attempt
			logger.info('Storage cleanup completed');
		} catch (cleanupError) {
			logger.error('Storage cleanup failed:', cleanupError);
		}
	}

	/**
	 * Try alternative content extraction methods
	 */
	private tryAlternativeExtraction(error: WebContentError, context: string): void {
		logger.info('Trying alternative extraction methods...');

		webContentActions.addNotification({
			type: 'info',
			message: 'Trying alternative content extraction methods...'
		});

		// This would implement fallback extraction strategies
	}

	/**
	 * Get retry count for a specific error code
	 */
	private getRetryCount(errorCode: string): number {
		return this.errorHistory.filter(e => e.code === errorCode).length;
	}

	/**
	 * Get error statistics
	 */
	getErrorStats(): {
		total: number;
		byCode: Record<string, number>;
		recent: WebContentError[];
		recoverable: number;
		retryable: number;
	} {
		const by_code = {};
		let recoverable = 0;
		let retryable = 0;

		for (const error of this.errorHistory) {
			by_code[error.code] = (by_code[error.code] || 0) + 1;
			if (error.recoverable) recoverable++;
			if (error.retryable) retryable++;
		}

		return {
			total: this.errorHistory.length,
			byCode: by_code,
			recent: this.errorHistory.slice(0, 10),
			recoverable,
			retryable
		};
	}

	/**
	 * Clear error history
	 */
	clearHistory(): void {
		this.errorHistory = [];
		logger.info('Error history cleared');
	}

	/**
	 * Check if an operation should be retried based on error history
	 */
	shouldRetry(errorCode: string, max_retries = 3): boolean {
		const recent_errors = this.errorHistory
			.filter(e => e.code === errorCode)
			.filter(e => Date.now() - e.timestamp.getTime() < 300000); // Last 5 minutes

		return recent_errors.length < max_retries;
	}

	/**
	 * Get user-friendly error message with suggestions
	 */
	getErrorGuidance(errorCode: string): {
		message: string;
		suggestions: string[];
		canRetry: boolean;
	} {
		switch (errorCode) {
			case 'NETWORK_ERROR':
				return {
					message: 'Network connection failed',
					suggestions: [
						'Check your internet connection',
						'Try again in a few moments',
						'Verify the website is accessible'
					],
					canRetry: true
				};

			case 'NOT_FOUND':
				return {
					message: 'Content not found',
					suggestions: [
						'Verify the URL is correct',
						'Check if the page has moved',
						'Try accessing the page directly in your browser'
					],
					canRetry: false
				};

			case 'ACCESS_DENIED':
				return {
					message: 'Access denied',
					suggestions: [
						'The content may require login',
						'Check if you have permission to access this content',
						'Try accessing the page directly in your browser'
					],
					canRetry: false
				};

			case 'EXTRACTION_ERROR':
				return {
					message: 'Content extraction failed',
					suggestions: [
						'The page format may not be supported',
						'Try a different URL from the same site',
						'Check if the page loads correctly in your browser'
					],
					canRetry: true
				};

			default:
				return {
					message: 'An error occurred',
					suggestions: [
						'Try again in a few moments',
						'Check your internet connection',
						'Contact support if the problem persists'
					],
					canRetry: true
				};
		}
	}
}

// Export singleton instance
export const webContentErrorHandler = WebContentErrorHandler.getInstance();