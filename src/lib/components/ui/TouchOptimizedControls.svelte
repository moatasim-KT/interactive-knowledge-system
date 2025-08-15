<script lang="ts">
	type Props = {
		actions: Array<{
			id: string;
			label: string;
			icon: string;
			variant?: 'primary' | 'secondary' | 'danger';
			disabled?: boolean;
		}>;
		layout?: 'horizontal' | 'vertical' | 'grid';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		onaction?: (event: CustomEvent<{ id: string; action: any }>) => void;
	}

	let {
		actions,
		layout = 'horizontal',
		size = 'md',
		class: className = '',
		onaction
	}: Props = $props();

	function handleAction(action: any) {
		if (!action.disabled) {
			onaction?.(new CustomEvent('action', { detail: { id: action.id, action } }));
		}
	}

	const containerClasses = $derived(() =>
		[
			'touch-controls',
			`touch-controls--${layout}`,
			`touch-controls--${size}`,
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class={containerClasses}>
	{#each actions as action (action.id)}
		<button
			class="touch-control-button"
			class:touch-control-button--primary={action.variant === 'primary'}
			class:touch-control-button--secondary={action.variant === 'secondary'}
			class:touch-control-button--danger={action.variant === 'danger'}
			class:touch-control-button--disabled={action.disabled}
			onclick={() => handleAction(action)}
			disabled={action.disabled}
			aria-label={action.label}
			type="button"
		>
			<span class="touch-control-icon" aria-hidden="true">
				{action.icon}
			</span>
			<span class="touch-control-label">
				{action.label}
			</span>
		</button>
	{/each}
</div>

<style>
	.touch-controls {
		display: flex;
		gap: 0.5rem;
	}

	.touch-controls--horizontal {
		flex-direction: row;
		flex-wrap: wrap;
	}

	.touch-controls--vertical {
		flex-direction: column;
	}

	.touch-controls--grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
	}

	.touch-control-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0.75rem;
		background: var(--color-surface, white);
		border: 1px solid var(--color-border, #e0e0e0);
		border-radius: 0.75rem;
		color: var(--color-text-primary, #333);
		cursor: pointer;
		transition: all 0.2s ease;
		-webkit-tap-highlight-color: transparent;
		touch-action: manipulation;
		user-select: none;
	}

	.touch-control-button:hover:not(.touch-control-button--disabled) {
		background: var(--color-surface-secondary, #f8f9fa);
		border-color: var(--color-border-hover, #d0d0d0);
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.touch-control-button:active:not(.touch-control-button--disabled) {
		transform: translateY(0);
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
	}

	.touch-control-button--primary {
		background: var(--color-primary-600, #007bff);
		color: white;
		border-color: var(--color-primary-600, #007bff);
	}

	.touch-control-button--primary:hover:not(.touch-control-button--disabled) {
		background: var(--color-primary-700, #0056b3);
		border-color: var(--color-primary-700, #0056b3);
	}

	.touch-control-button--secondary {
		background: var(--color-secondary-600, #6c757d);
		color: white;
		border-color: var(--color-secondary-600, #6c757d);
	}

	.touch-control-button--secondary:hover:not(.touch-control-button--disabled) {
		background: var(--color-secondary-700, #545b62);
		border-color: var(--color-secondary-700, #545b62);
	}

	.touch-control-button--danger {
		background: var(--color-error-600, #dc3545);
		color: white;
		border-color: var(--color-error-600, #dc3545);
	}

	.touch-control-button--danger:hover:not(.touch-control-button--disabled) {
		background: var(--color-error-700, #c82333);
		border-color: var(--color-error-700, #c82333);
	}

	.touch-control-button--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	.touch-control-icon {
		font-size: 1.25rem;
		line-height: 1;
		margin-bottom: 0.25rem;
	}

	.touch-control-label {
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	/* Size variants */
	.touch-controls--sm .touch-control-button {
		min-width: 36px;
		min-height: 36px;
		padding: 0.5rem;
	}

	.touch-controls--sm .touch-control-icon {
		font-size: 1rem;
	}

	.touch-controls--sm .touch-control-label {
		font-size: 0.625rem;
	}

	.touch-controls--lg .touch-control-button {
		min-width: 56px;
		min-height: 56px;
		padding: 1rem;
	}

	.touch-controls--lg .touch-control-icon {
		font-size: 1.5rem;
	}

	.touch-controls--lg .touch-control-label {
		font-size: 0.875rem;
	}

	/* Mobile optimizations */
	@media (max-width: 768px) {
		.touch-control-button {
			min-width: 48px;
			min-height: 48px;
		}

		.touch-controls--horizontal {
			justify-content: center;
		}

		.touch-controls--grid {
			grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: high) {
		.touch-control-button {
			border-width: 2px;
		}

		.touch-control-button:hover:not(.touch-control-button--disabled) {
			border-width: 3px;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.touch-control-button {
			transition: none;
		}

		.touch-control-button:hover:not(.touch-control-button--disabled) {
			transform: none;
		}
	}
</style>