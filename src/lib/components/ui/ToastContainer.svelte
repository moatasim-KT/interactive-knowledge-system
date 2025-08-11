<script lang="ts">
	import { onMount } from 'svelte';
	import Toast from './Toast.svelte';

	interface ToastItem {
		id: string;
		type: 'success' | 'error' | 'warning' | 'info';
		title?: string;
		message: string;
		duration?: number;
	}

	interface Props {
		position?:
			| 'top-right'
			| 'top-left'
			| 'bottom-right'
			| 'bottom-left'
			| 'top-center'
			| 'bottom-center';
		maxToasts?: number;
	}

	let { position = 'top-right', maxToasts = 5 }: Props = $props();

	let toasts = $state<ToastItem[]>([]);

	const position_classes = {
		'top-right': 'top-4 right-4',
		'top-left': 'top-4 left-4',
		'bottom-right': 'bottom-4 right-4',
		'bottom-left': 'bottom-4 left-4',
		'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
		'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
	};

	function add_toast(toast: Omit<ToastItem, 'id'>) {
		const new_toast = {
			...toast,
			id: crypto.randomUUID()
		};

		toasts = [new_toast, ...toasts].slice(0, maxToasts);
	}

	function remove_toast(id: string) {
		toasts = toasts.filter((toast) => toast.id !== id);
	}

	// Global toast functions
	const toast_api = {
		success: (message: string, title?: string, duration?: number) =>
			add_toast({ type: 'success', message, title, duration }),
		error: (message: string, title?: string, duration?: number) =>
			add_toast({ type: 'error', message, title, duration }),
		warning: (message: string, title?: string, duration?: number) =>
			add_toast({ type: 'warning', message, title, duration }),
		info: (message: string, title?: string, duration?: number) =>
			add_toast({ type: 'info', message, title, duration })
	};

	let container_classes = $derived(
		[
			'fixed z-toast flex flex-col gap-2 pointer-events-none',
			position_classes[position],
			'max-w-sm w-full'
		].join(' ')
	);

	onMount(() => {
		// Make toast API globally available
		(window as any).toast = toast_api;

		// Listen for custom toast events
		function handle_toast_event(event: CustomEvent) {
			add_toast(event.detail);
		}

		window.addEventListener('show-toast', handleToastEvent as EventListener);

		return () => {
			window.removeEventListener('show-toast', handleToastEvent as EventListener);
			delete (window as any).toast;
		};
	});
</script>

<div class={containerClasses}>
	{#each toasts as toast (toast.id)}
		<div class="pointer-events-auto">
			<Toast
				type={toast.type}
				title={toast.title}
				message={toast.message}
				duration={toast.duration}
				onDismiss={() => remove_toast(toast.id)}
			/>
		</div>
	{/each}
</div>

<style>
	/* Position utilities */
	:global(.top-4) {
		top: 1rem;
	}
	:global(.right-4) {
		right: 1rem;
	}
	:global(.left-4) {
		left: 1rem;
	}
	:global(.bottom-4) {
		bottom: 1rem;
	}
	:global(.left-1\/2) {
		left: 50%;
	}
	:global(.-translate-x-1\/2) {
		transform: translateX(-50%);
	}
</style>
