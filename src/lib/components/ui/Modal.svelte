
<script lang="ts">
    import { trapFocus, generateId, KEYBOARD_KEYS } from '$lib/utils/accessibility.js';
    import { onDestroy } from 'svelte';
    

    // Runes props
    let {
        open = $bindable(false),
        size = 'md',
        closable = true,
        title,
        className,
        ariaLabel,
        ariaDescribedby,
        id = generateId('modal'),
        role = 'dialog',
        closeOnBackdropClick = true,
        closeOnEscape = true,
        initialFocus,
        returnFocus = true,
        children
    }: {
        open?: boolean;
        size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
        closable?: boolean;
        title?: string;
        className?: string;
        ariaLabel?: string;
        ariaDescribedby?: string;
        id?: string;
        role?: 'dialog' | 'alertdialog';
        closeOnBackdropClick?: boolean;
        closeOnEscape?: boolean;
        initialFocus?: string;
        returnFocus?: boolean;
        // accept standard class attr on component usage
        class?: string;
        children?: import('svelte').Snippet;
    } = $props();

	let dialog_element: HTMLDialogElement;
	let content_element: HTMLElement;
	let is_animating = false;
	let previous_active_element: Element | null = null;
	let cleanup_focus_trap: (() => void) | null = null;

	const size_classes = {
		sm: 'max-w-sm',
		md: 'max-w-md',
		lg: 'max-w-lg',
		xl: 'max-w-xl',
		full: 'max-w-full mx-4'
	};

    // Compute ids as plain strings for attributes
    const _titleId: string | undefined = $derived(() => (title ? `${id}-title` : undefined)) as any;
    const _descId: string | undefined = $derived(() => (ariaDescribedby ? (ariaDescribedby as string) : undefined)) as any;

    function handle_close() {
		if (!closable) return;

		is_animating = true;
		setTimeout(() => {
			open = false;
			is_animating = false;
            // Dispatch a component event without createEventDispatcher
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - Svelte runtime augments component event dispatching
            // In runes mode, parent components should listen with on:close
            // This triggers the component 'close' event
            // falls back to DOM CustomEvent for environments that require it
            // The following pattern avoids deprecated createEventDispatcher
            // and works with Svelte 5's event system
            // @ts-ignore
            dispatchEvent(new CustomEvent('close'));
		}, 200);
	}

	function handle_backdrop_click(event: MouseEvent) {
		if (closeOnBackdropClick && event.target === dialog_element) {
			handle_close();
		}
	}

	function handle_keydown(event: KeyboardEvent) {
		if (event.key === KEYBOARD_KEYS.ESCAPE && closable && closeOnEscape) {
			event.preventDefault();
			handle_close();
		}
	}

	function setup_focus_management() {
		if (!open || !content_element) return;

		// Store the previously focused element
		previous_active_element = document.activeElement;

		// Set up focus trap
		cleanup_focus_trap = trapFocus(content_element);

		// Focus initial element or first focusable element
		if (initialFocus) {
			const initialElement = content_element.querySelector(initialFocus) as HTMLElement;
			if (initialElement) {
				initialElement.focus();
			}
		}
	}

	function cleanup_focus_management() {
		// Clean up focus trap
		if (cleanup_focus_trap) {
			cleanup_focus_trap();
			cleanup_focus_trap = null;
		}

		// Return focus to previously focused element
		if (returnFocus && previous_active_element instanceof HTMLElement) {
			previous_active_element.focus();
		}
	}

	onDestroy(() => {
		cleanup_focus_management();
		document.body.style.overflow = '';
	});

    $effect(() => {
        if (!dialog_element) return;
        if (open) {
            dialog_element.showModal();
            document.body.style.overflow = 'hidden';
            document.body.setAttribute('aria-hidden', 'true');
            setTimeout(setup_focus_management, 0);
        } else {
            dialog_element.close();
            document.body.style.overflow = '';
            document.body.removeAttribute('aria-hidden');
            cleanup_focus_management();
        }
    });

    const modal_classes = $derived(() => [
        'fixed inset-0 z-modal bg-transparent p-4 flex items-center justify-center',
        'backdrop:bg-black backdrop:bg-opacity-50 backdrop:backdrop-blur-sm',
        open && !is_animating ? 'animate-fade-in' : '',
        is_animating ? 'animate-fade-out' : ''
    ]
        .filter(Boolean)
        .join(' '));

    const content_classes = $derived(() => [
        'bg-surface rounded-lg shadow-xl border border-border w-full transition-all duration-200',
        size_classes[size],
        open && !is_animating ? 'animate-slide-in-up' : '',
        is_animating ? 'opacity-0 scale-95' : '',
        (className ?? '')
    ]
        .filter(Boolean)
        .join(' '));
</script>

<dialog
	bind:this={dialog_element}
	{id}
	class={modal_classes}
	onclick={handle_backdrop_click}
	onkeydown={handle_keydown}
	aria-modal="true"
	aria-labelledby={_titleId}
	aria-describedby={_descId}
	aria-label={ariaLabel}
	{role}
>
    <div 
		bind:this={content_element}
        class={content_classes} 
		onpointerdown={(e) => e.stopPropagation()} 
		onpointerup={(e) => e.stopPropagation()}
	>
		{#if title || closable}
			<header class="flex items-center justify-between p-6 border-b border-border">
				{#if title}
					<h2 id={_titleId} class="text-lg font-semibold text-text-primary">
						{title}
					</h2>
				{/if}

				{#if closable}
					<button
						class="text-text-muted hover:text-text-primary transition-colors p-1 rounded-md hover:bg-surface-secondary touch-target"
						onclick={handle_close}
						aria-label="Close modal"
						type="button"
					>
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
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

        <div class="p-6" id={_descId}>
            {#if children}
                {@render children()}
            {/if}
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
