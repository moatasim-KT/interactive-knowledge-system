<script lang="ts">
	import { generateId } from '$lib/utils/accessibility.js';

	interface Props {
		type?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel';
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		readonly?: boolean;
		required?: boolean;
		size?: 'sm' | 'md' | 'lg';
		variant?: 'default' | 'filled' | 'flushed';
		error?: boolean;
		success?: boolean;
		class?: string;
		id?: string;
		name?: string;
		autocomplete?: any;
		oninput?: (event: Event) => void;
		onchange?: (event: Event) => void;
		onfocus?: (event: FocusEvent) => void;
		onblur?: (event: FocusEvent) => void;
		onkeydown?: (event: KeyboardEvent) => void;
		// Accessibility props
		'aria-label'?: string;
		'aria-describedby'?: string;
		'aria-invalid'?: boolean;
		'aria-required'?: boolean;
		'aria-expanded'?: boolean;
		'aria-controls'?: string;
		min?: string | number;
		max?: string | number;
		'aria-activedescendant'?: string;
		role?: string;
		title?: string;
		// Helper text and validation
		helperText?: string;
		errorText?: string;
		successText?: string;
		label?: string;
		showLabel?: boolean;
	}

	let {
		type = 'text',
		value = $bindable(),
		placeholder,
		disabled = false,
		readonly = false,
		required = false,
		size = 'md',
		variant = 'default',
		error = false,
		success = false,
		class: className = '',
		id = generateId('input'),
		name,
		autocomplete,
		oninput,
		onchange,
		onfocus,
		onblur,
		onkeydown,
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedby,
		'aria-invalid': ariaInvalid,
		'aria-required': ariaRequired,
		'aria-expanded': ariaExpanded,
		'aria-controls': ariaControls,
		'aria-activedescendant': ariaActivedescendant,
		role,
		title,
		helperText,
		errorText,
		successText,
		label,
		showLabel = true,
		min,
		max,
		...rest
	}: Props = $props();

	const helperId = $derived(helperText || errorText || successText ? `${id}-helper` : undefined);
	const labelId = $derived(label ? `${id}-label` : undefined);
	
	// Combine aria-describedby with helper text ID
	const combinedAriaDescribedby = $derived(() => {
		const ids = [ariaDescribedby, helperId].filter(Boolean);
		return ids.length > 0 ? ids.join(' ') : undefined;
	});

	// Determine aria-invalid state
	const computedAriaInvalid = $derived(ariaInvalid ?? error);
	const computedAriaRequired = $derived(ariaRequired ?? required);

	const base_classes =
		'w-full border rounded-md transition focus-ring bg-surface text-text-primary placeholder-text-muted';

	const size_classes = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-4 py-2 text-base',
		lg: 'px-5 py-3 text-lg'
	};

	const variant_classes = {
		default: 'border-border focus:border-primary-500',
		filled: 'border-transparent bg-surface-secondary focus:bg-surface focus:border-primary-500',
		flushed: 'border-0 border-b-2 border-border rounded-none focus:border-primary-500 px-0'
	};

	const state_classes = error
		? 'border-error-500 focus:border-error-500'
		: success
			? 'border-success-500 focus:border-success-500'
			: '';

	const disabled_classes = disabled ? 'opacity-50 cursor-not-allowed bg-surface-secondary' : '';

	const classes = $derived(() =>
		[
			base_classes,
			size_classes[size],
			variant_classes[variant],
			state_classes,
			disabled_classes,
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<div class="input-wrapper">
	{#if label && showLabel}
		<label for={id} id={labelId} class="input-label">
			{label}
			{#if required}
				<span class="text-error-500" aria-label="required">*</span>
			{/if}
		</label>
	{/if}
	
	<input
		{type}
		bind:value
		{placeholder}
		{disabled}
		{readonly}
		required={computedAriaRequired}
		{id}
		{name}
		{autocomplete}
		class={classes}
		aria-label={ariaLabel}
		aria-describedby={combinedAriaDescribedby()}
		aria-invalid={computedAriaInvalid}
		aria-required={computedAriaRequired}
		aria-expanded={ariaExpanded}
		aria-controls={ariaControls}
		aria-activedescendant={ariaActivedescendant}
		{role}
		{title}
		{oninput}
		{onchange}
		{onfocus}
		{onblur}
		{onkeydown}
		{min}
		{max}
		{...rest}
	/>
	
	{#if helperText || errorText || successText}
		<div 
			id={helperId} 
			class="input-helper-text"
			class:error={error}
			class:success={success}
			role={error ? 'alert' : undefined}
			aria-live={error ? 'polite' : undefined}
		>
			{#if error && errorText}
				<span class="text-error-600">{errorText}</span>
			{:else if success && successText}
				<span class="text-success-600">{successText}</span>
			{:else if helperText}
				<span class="text-text-muted">{helperText}</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.input-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.input-label {
		font-size: var(--font-size-sm);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.input-helper-text {
		font-size: var(--font-size-sm);
		line-height: 1.4;
	}

	.input-helper-text.error {
		color: var(--color-error-600);
	}

	.input-helper-text.success {
		color: var(--color-success-600);
	}

	:global(.bg-surface) {
		background-color: var(--color-surface);
	}
	:global(.bg-surface-secondary) {
		background-color: var(--color-surface-secondary);
	}
	:global(.text-text-primary) {
		color: var(--color-text-primary);
	}
	:global(.text-text-muted) {
		color: var(--color-text-muted);
	}
	:global(.text-error-500) {
		color: var(--color-error-500);
	}
	:global(.text-error-600) {
		color: var(--color-error-600);
	}
	:global(.text-success-600) {
		color: var(--color-success-600);
	}
	:global(.placeholder-text-muted::placeholder) {
		color: var(--color-text-muted);
	}
	:global(.border-border) {
		border-color: var(--color-border);
	}
	:global(.focus\:border-primary-500:focus) {
		border-color: var(--color-primary-500);
	}
	:global(.focus\:bg-surface:focus) {
		background-color: var(--color-surface);
	}
	:global(.border-error-500) {
		border-color: var(--color-error-500);
	}
	:global(.focus\:border-error-500:focus) {
		border-color: var(--color-error-500);
	}
	:global(.border-success-500) {
		border-color: var(--color-success-500);
	}
	:global(.focus\:border-success-500:focus) {
		border-color: var(--color-success-500);
	}
</style>
