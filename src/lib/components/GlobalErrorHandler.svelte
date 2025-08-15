<script lang="ts">

	import { ErrorToastSystem } from './index.js';
	import { errorHandler } from '../utils/errorHandler.js';
	import { appState, actions } from '../stores/appState.svelte.js';

	// Global error tracking
	let globalErrors = $state<Array<{ error: Error; context: any; timestamp: Date }>>([]);
	let errorCount = $state(0);
	let lastErrorTime = $state<Date | null>(null);

	function handleGlobalError(event: ErrorEvent) {
		const error = new Error(event.message);
		const context = {
			operation: 'global-error',
			component: 'window',
			metadata: {
				filename: event.filename,
				lineno: event.lineno,
				colno: event.colno,
				stack: event.error?.stack
			}
		};

		logGlobalError(error, context);
		
		// Show user-friendly notification for critical errors
		if (shouldShowGlobalErrorToast(error)) {
			actions.addNotification({
				type: 'error',
				message: 'An unexpected error occurred. The page may need to be refreshed.'
			});
		}
	}

	function handleUnhandledRejection(event: PromiseRejectionEvent) {
		const error = new Error(`Unhandled promise rejection: ${event.reason}`);
		const context = {
			operation: 'unhandled-rejection',
			component: 'promise',
			metadata: {
				reason: event.reason,
				promise: event.promise
			}
		};

		logGlobalError(error, context);

		// Prevent default browser behavior for unhandled rejections
		event.preventDefault();

		// Show user-friendly notification
		actions.addNotification({
			type: 'warning',
			message: 'A background operation failed. Some features may not work correctly.'
		});
	}

	function logGlobalError(error: Error, context: any) {
		errorCount++;
		lastErrorTime = new Date();
		
		// Add to global error log
		globalErrors.push({ error, context, timestamp: new Date() });
		
		// Keep only last 50 errors to prevent memory issues
		if (globalErrors.length > 50) {
			globalErrors = globalErrors.slice(-50);
		}

		// Log through error handler
		errorHandler.handleSync(
			() => { throw error; },
			context,
			{ showToast: false, logError: true }
		);

		// Update app state
		// Note: setErrorState method not available in current appState
		// actions.setErrorState({
		// 	hasErrors: true,
		// 	errorCount,
		// 	lastError: error.message,
		// 	lastErrorTime
		// });
	}

	function shouldShowGlobalErrorToast(error: Error): boolean {
		// Don't show toasts for certain types of errors
		const message = error.message.toLowerCase();
		
		// Skip script loading errors (common and usually not critical)
		if (message.includes('script') && message.includes('load')) {
			return false;
		}
		
		// Skip network errors (handled by specific components)
		if (message.includes('fetch') || message.includes('network')) {
			return false;
		}
		
		// Skip ResizeObserver errors (common and harmless)
		if (message.includes('resizeobserver')) {
			return false;
		}

		return true;
	}

	function clearErrorLog() {
		globalErrors = [];
		errorCount = 0;
		lastErrorTime = null;
		
		// Note: setErrorState method not available in current appState
		// actions.setErrorState({
		// 	hasErrors: false,
		// 	errorCount: 0,
		// 	lastError: null,
		// 	lastErrorTime: null
		// });
	}

	// Expose error statistics for debugging
	function getErrorStatistics() {
		return {
			totalErrors: errorCount,
			recentErrors: globalErrors.slice(-10),
			lastErrorTime,
			errorsByType: globalErrors.reduce((acc, { error }) => {
				const type = error.name || 'Unknown';
				acc[type] = (acc[type] || 0) + 1;
				return acc;
			}, {} as Record<string, number>)
		};
	}

	// Add to window for debugging
	$effect(() => {
		// Set up global error handlers
		window.addEventListener('error', handleGlobalError);
		window.addEventListener('unhandledrejection', handleUnhandledRejection);

		// Add error statistics to window for debugging
		if (typeof window !== 'undefined') {
			(window as any).getErrorStatistics = getErrorStatistics;
			(window as any).clearErrorLog = clearErrorLog;
		}

		// Add global error listener to error handler
		errorHandler.addErrorListener((error, context) => {
			// Additional global error processing if needed
			console.debug('Global error listener:', error, context);
		});

		return () => {
			window.removeEventListener('error', handleGlobalError);
			window.removeEventListener('unhandledrejection', handleUnhandledRejection);
		};
	});
</script>

<!-- Error Toast System -->
<ErrorToastSystem />

<!-- Development Error Display -->
{#if import.meta.env.DEV && errorCount > 0}
	<div class="dev-error-indicator">
		<button 
			onclick={() => console.log('Error Statistics:', getErrorStatistics())}
			class="error-count-badge"
			title="Click to log error statistics to console"
		>
			⚠️ {errorCount}
		</button>
	</div>
{/if}

<style>
	.dev-error-indicator {
		position: fixed;
		bottom: 1rem;
		left: 1rem;
		z-index: 9998;
	}

	.error-count-badge {
		background: #ef4444;
		color: white;
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		font-size: 12px;
		font-weight: bold;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		transition: transform 0.2s;
	}

	.error-count-badge:hover {
		transform: scale(1.1);
	}
</style>