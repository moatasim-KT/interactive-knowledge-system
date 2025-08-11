<script lang="ts">
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
		autocomplete?: string;
		oninput?: (event: Event) => void;
		onchange?: (event: Event) => void;
		onfocus?: (event: FocusEvent) => void;
		onblur?: (event: FocusEvent) => void;
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
		id,
		name,
		autocomplete,
		oninput,
		onchange,
		onfocus,
		onblur,
		...rest
	}: Props = $props();

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

<input
	{type}
	bind:value
	{placeholder}
	{disabled}
	{readonly}
	{required}
	{id}
	{name}
	{autocomplete}
	class={classes}
	{oninput}
	{onchange}
	{onfocus}
	{onblur}
	{...rest}
/>

<style>
	:global(.bg-surface) {
		background-color: var(--color-surface);
	}
	:global(.bg-surface-secondary) {
		background-color: var(--color-surface-secondary);
	}
	:global(.text-text-primary) {
		color: var(--color-text-primary);
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
