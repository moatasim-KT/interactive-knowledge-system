<script lang="ts">
	import { onMount } from 'svelte';
	import { accessibilityPreferences } from '$lib/utils/accessibility.js';
	import Button from './Button.svelte';
	import Modal from './Modal.svelte';

	interface Props {
		open?: boolean;
		onclose?: () => void;
	}

	let { open = $bindable(false), onclose }: Props = $props();

	let high_contrast = $state(false);
	let font_size = $state('normal');
	let reduced_motion = $state(false);
	let dark_mode = $state(false);

	const font_size_options = [
		{ value: 'small', label: 'Small', class: 'text-size-small' },
		{ value: 'normal', label: 'Normal', class: 'text-size-normal' },
		{ value: 'large', label: 'Large', class: 'text-size-large' },
		{ value: 'extra-large', label: 'Extra Large', class: 'text-size-extra-large' }
	];

	function apply_high_contrast(enabled: boolean) {
		if (enabled) {
			document.documentElement.setAttribute('data-high-contrast', 'true');
		} else {
			document.documentElement.removeAttribute('data-high-contrast');
		}
		accessibilityPreferences.set('highContrast', enabled);
	}

	function apply_font_size(size: string) {
		// Remove existing font size classes
		font_size_options.forEach(option => {
			document.documentElement.classList.remove(option.class);
		});
		
		// Apply new font size class
		const selected_option = font_size_options.find(option => option.value === size);
		if (selected_option) {
			document.documentElement.classList.add(selected_option.class);
		}
		
		accessibilityPreferences.set('fontSize', size);
	}

	function apply_reduced_motion(enabled: boolean) {
		if (enabled) {
			document.documentElement.setAttribute('data-reduced-motion', 'true');
		} else {
			document.documentElement.removeAttribute('data-reduced-motion');
		}
		accessibilityPreferences.set('reducedMotion', enabled);
	}

	function apply_dark_mode(enabled: boolean) {
		if (enabled) {
			document.documentElement.setAttribute('data-theme', 'dark');
		} else {
			document.documentElement.setAttribute('data-theme', 'light');
		}
		accessibilityPreferences.set('darkMode', enabled);
	}

	function handle_high_contrast_change(event: Event) {
		const target = event.target as HTMLInputElement;
		high_contrast = target.checked;
		apply_high_contrast(high_contrast);
	}

	function handle_font_size_change(event: Event) {
		const target = event.target as HTMLSelectElement;
		font_size = target.value;
		apply_font_size(font_size);
	}

	function handle_reduced_motion_change(event: Event) {
		const target = event.target as HTMLInputElement;
		reduced_motion = target.checked;
		apply_reduced_motion(reduced_motion);
	}

	function handle_dark_mode_change(event: Event) {
		const target = event.target as HTMLInputElement;
		dark_mode = target.checked;
		apply_dark_mode(dark_mode);
	}

	function reset_to_defaults() {
		high_contrast = false;
		font_size = 'normal';
		reduced_motion = false;
		dark_mode = false;

		apply_high_contrast(false);
		apply_font_size('normal');
		apply_reduced_motion(false);
		apply_dark_mode(false);
	}

	function handle_close() {
		open = false;
		onclose?.();
	}

	$effect(() => {
		// Load saved preferences
		const unsubscribers = [
			accessibilityPreferences.subscribe('highContrast', (value) => {
				high_contrast = (value as boolean) ?? false;
				apply_high_contrast(high_contrast);
			}),
			accessibilityPreferences.subscribe('fontSize', (value) => {
				font_size = (value as string) ?? 'normal';
				apply_font_size(font_size);
			}),
			accessibilityPreferences.subscribe('reducedMotion', (value) => {
				reduced_motion = (value as boolean) ?? false;
				apply_reduced_motion(reduced_motion);
			}),
			accessibilityPreferences.subscribe('darkMode', (value) => {
				dark_mode = (value as boolean) ?? false;
				apply_dark_mode(dark_mode);
			})
		];

		return () => {
			unsubscribers.forEach(unsubscribe => unsubscribe());
		};
	});
</script>

<Modal
	bind:open
	title="Accessibility Settings"
	size="md"
	onclose={handle_close}
	aria-describedby="accessibility-settings-description"
>
	<div id="accessibility-settings-description" class="accessibility-settings">
		<p class="accessibility-settings__description">
			Customize the interface to meet your accessibility needs. These settings will be saved and applied across all pages.
		</p>

		<div class="accessibility-settings__section">
			<h3 class="accessibility-settings__section-title">Visual Settings</h3>
			
			<div class="accessibility-settings__field">
				<label class="accessibility-settings__label">
					<input
						type="checkbox"
						class="accessibility-settings__checkbox"
						checked={high_contrast}
						onchange={handle_high_contrast_change}
						aria-describedby="high-contrast-help"
					/>
					<span class="accessibility-settings__label-text">High Contrast Mode</span>
				</label>
				<p id="high-contrast-help" class="accessibility-settings__help">
					Increases contrast between text and background colors for better readability.
				</p>
			</div>

			<div class="accessibility-settings__field">
				<label for="font-size-select" class="accessibility-settings__label-text">
					Font Size
				</label>
				<select
					id="font-size-select"
					class="accessibility-settings__select"
					value={font_size}
					onchange={handle_font_size_change}
					aria-describedby="font-size-help"
				>
					{#each font_size_options as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
				<p id="font-size-help" class="accessibility-settings__help">
					Adjust the size of text throughout the interface.
				</p>
			</div>

			<div class="accessibility-settings__field">
				<label class="accessibility-settings__label">
					<input
						type="checkbox"
						class="accessibility-settings__checkbox"
						checked={dark_mode}
						onchange={handle_dark_mode_change}
						aria-describedby="dark-mode-help"
					/>
					<span class="accessibility-settings__label-text">Dark Mode</span>
				</label>
				<p id="dark-mode-help" class="accessibility-settings__help">
					Use a dark color scheme that may be easier on the eyes in low-light conditions.
				</p>
			</div>
		</div>

		<div class="accessibility-settings__section">
			<h3 class="accessibility-settings__section-title">Motion Settings</h3>
			
			<div class="accessibility-settings__field">
				<label class="accessibility-settings__label">
					<input
						type="checkbox"
						class="accessibility-settings__checkbox"
						checked={reduced_motion}
						onchange={handle_reduced_motion_change}
						aria-describedby="reduced-motion-help"
					/>
					<span class="accessibility-settings__label-text">Reduce Motion</span>
				</label>
				<p id="reduced-motion-help" class="accessibility-settings__help">
					Minimizes animations and transitions that may cause discomfort or distraction.
				</p>
			</div>
		</div>

		<div class="accessibility-settings__actions">
			<Button variant="outline" onclick={reset_to_defaults}>
				Reset to Defaults
			</Button>
			<Button variant="primary" onclick={handle_close}>
				Save Settings
			</Button>
		</div>
	</div>
</Modal>

<style>
	.accessibility-settings {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.accessibility-settings__description {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: var(--line-height-relaxed);
		margin: 0;
	}

	.accessibility-settings__section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.accessibility-settings__section-title {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin: 0;
		border-bottom: 1px solid var(--color-border);
		padding-bottom: 0.5rem;
	}

	.accessibility-settings__field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.accessibility-settings__label {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		cursor: pointer;
	}

	.accessibility-settings__label-text {
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		font-size: var(--font-size-base);
	}

	.accessibility-settings__checkbox {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		cursor: pointer;
		position: relative;
		appearance: none;
		transition: all var(--transition-base);
	}

	.accessibility-settings__checkbox:checked {
		background: var(--color-primary-600);
		border-color: var(--color-primary-600);
	}

	.accessibility-settings__checkbox:checked::after {
		content: '✓';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: white;
		font-size: 0.875rem;
		font-weight: bold;
	}

	.accessibility-settings__checkbox:focus-visible {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 2px;
	}

	.accessibility-settings__select {
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-size: var(--font-size-base);
		cursor: pointer;
		transition: all var(--transition-base);
	}

	.accessibility-settings__select:focus {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 0;
		border-color: var(--color-primary-500);
	}

	.accessibility-settings__help {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		line-height: var(--line-height-normal);
		margin: 0;
	}

	.accessibility-settings__actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 1px solid var(--color-border);
	}

	/* High contrast mode adjustments */
	:global([data-high-contrast="true"]) .accessibility-settings__checkbox {
		border-width: 3px;
	}

	:global([data-high-contrast="true"]) .accessibility-settings__select {
		border-width: 2px;
	}

	/* Reduced motion adjustments */
	:global([data-reduced-motion="true"]) .accessibility-settings__checkbox,
	:global([data-reduced-motion="true"]) .accessibility-settings__select {
		transition: none;
	}

	/* Mobile responsive */
	@media (max-width: 640px) {
		.accessibility-settings__actions {
			flex-direction: column;
		}
	}
</style>