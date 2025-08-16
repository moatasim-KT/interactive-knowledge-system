<script lang="ts">

	import { Toast } from './ui';
	import { errorHandler } from '../utils/errorHandler.js';
	import type { Toast as ToastType } from '$lib/types/unified';

	let toasts = $state<ToastType[]>([]);
	let toastContainer: HTMLElement;

    function addToast(toast: ToastType) {
		toasts.push(toast);
		
		// Auto-remove toast after duration
		if (toast.duration && toast.duration > 0) {
			setTimeout(() => {
				removeToast(toast.id);
			}, toast.duration);
		}
	}

	function removeToast(toastId: string) {
		const index = toasts.findIndex(t => t.id === toastId);
		if (index > -1) {
			toasts.splice(index, 1);
		}
	}

    function handleToastEvent(toast: any) {
        // Normalize to unified Toast shape
        const normalized: ToastType = {
            id: toast.id,
            type: toast.type,
            title: toast.title,
            message: toast.message,
            duration: toast.duration ?? 5000,
            dismissible: toast.dismissible ?? true
        };
        addToast(normalized);
	}

    function handleRetryEvent(_detail: { error: Error; context: any }) {
		// Show retry toast
		const retryToast: ToastType = {
			id: `retry_${Date.now()}`,
			type: 'info',
			title: 'Retrying...',
			message: 'Attempting to retry the operation.',
			duration: 3000,
			dismissible: true
		};
		addToast(retryToast);
	}

	$effect(() => {
		// Listen for toast events from error handler
		errorHandler.on('show-toast', handleToastEvent);
        errorHandler.on('error-retry', handleRetryEvent);

		// Add any queued toasts from error handler
        const queuedToasts = errorHandler.getToastQueue();
        queuedToasts.forEach(t => handleToastEvent(t));
		errorHandler.clearToastQueue();

		return () => {
			errorHandler.off('show-toast', handleToastEvent);
			errorHandler.off('error-retry', handleRetryEvent);
		};
	});
</script>

<div bind:this={toastContainer} class="error-toast-system">
	{#each toasts as toast (toast.id)}
		<Toast
			type={toast.type}
			title={toast.title}
			message={toast.message}
			onclose={() => removeToast(toast.id)}
		/>
	{/each}
</div>

<style>
	.error-toast-system {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 400px;
		pointer-events: none;
	}

	.error-toast-system :global(.toast) {
		pointer-events: auto;
	}
</style>