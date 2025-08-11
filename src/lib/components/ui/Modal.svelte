<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		open?: boolean;
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
		closable?: boolean;
		title?: string;
		onClose?: () => void;
		class?: string;
		children?: any;
	}

	let {
		open = $bindable(false),
		size = 'md',
		closable = true,
		title,
		onClose,
		class: className = '',
		children
	}: Props = $props();

	let dialog_element;
	let is_animating = $state(false);

	const size_classes = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		full: 'max-w-full mx-4'
	};

	function handle_close() {
		if (!closable) return;

		is_animating = true;
		setTimeout(() => {
			open = false;
			is_animating = false;
			onClose?.();
		}, 200);
	}

	function handle_backdrop_click(event: MouseEvent) {
		if (event.target === dialog_element) {
			handle_close();
		}
	}

	function handle_keydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && closable) {
			handle_close();
		}
	}

	onMount(() => {
		function handle_document_keydown(event: KeyboardEvent) {
			if (open && event.key === 'Escape' && closable) {
				handle_close();
			}
		}

		document.addEventListener('keydown', handle_document_keydown);

		return () => {
			document.removeEventListener('keydown', handle_document_keydown);
		};
	});

	$: if (dialog_element) {
		if (open) {
			dialog_element.showModal();
			document.body.style.overflow = 'hidden';
		} else {
			dialog_element.close();
			document.body.style.overflow = '';
		}
	}

	const modal_classes = $derived(() =>
		[
			'fixed inset-0 z-modal bg-transparent p-4 flex items-center justify-center',
			'backdrop:bg-black backdrop:bg-opacity-50 backdrop:backdrop-blur-sm',
			open && !is_animating ? 'animate-fade-in' : '',
			is_animating ? 'animate-fade-out' : ''
		]
			.filter(Boolean)
			.join(' ')
	);

	const content_classes = $derived(() =>
		[
			'bg-surface rounded-lg shadow-xl border border-border w-full transition-all duration-200',
			size_classes[size],
			open && !is_animating ? 'animate-slide-in-up' : '',
			is_animating ? 'opacity-0 scale-95' : '',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<dialog
	bind:this={dialogElement}
	class={modalClasses()}
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	aria-modal="true"
	aria-labelledby={title ? 'modal-title' : undefined}
>
	<div class={contentClasses()} onclick={(e) => e.stopPropagation()}>
		{#if title || closable}
			<header class="flex items-center justify-between p-6 border-b border-border">
				{#if title}
					<h2 id="modal-title" class="text-lg font-semibold text-text-primary">
						{title}
					</h2>
				{/if}

				{#if closable}
					<button
						class="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md hover:bg-surface-secondary"
						onclick={handleClose}
						aria-label="Close modal"
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				{/if}
			</header>
		{/if}

		<div class="p-6">
			{@render children?.()}
		</div>
	</div>
</dialog>

<style>
	dialog {
		border: none;
		outline: none;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
	}

	:global(.bg-surface) {
		background-color: var(--color-surface);
	}
	:global(.border-border) {
		border-color: var(--color-border);
	}
	:global(.text-text-primary) {
		color: var(--color-text-primary);
	}
	:global(.text-text-muted) {
		color: var(--color-text-muted);
	}
	:global(.hover\:text-text-primary:hover) {
		color: var(--color-text-primary);
	}
	:global(.hover\:bg-surface-secondary:hover) {
		background-color: var(--color-surface-secondary);
	}
</style>
