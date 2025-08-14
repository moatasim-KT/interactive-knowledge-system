<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import AccessibleNavigation from '$lib/components/ui/AccessibleNavigation.svelte';
	import AccessibilitySettings from '$lib/components/ui/AccessibilitySettings.svelte';
	import { announceToScreenReader, liveRegionManager } from '$lib/utils/accessibility.js';

	let modal_open = $state(false);
	let settings_open = $state(false);
	let form_data = $state({
		name: '',
		email: '',
		message: ''
	});
	let form_errors = $state({
		name: '',
		email: '',
		message: ''
	});
	let loading = $state(false);
	let announcement_text = $state('');

	const navigation_items = [
		{ id: 'home', label: 'Home', href: '/', current: false },
		{ id: 'about', label: 'About', href: '/about', current: false },
		{
			id: 'services',
			label: 'Services',
			current: false,
			children: [
				{ id: 'web-dev', label: 'Web Development', href: '/services/web' },
				{ id: 'mobile-dev', label: 'Mobile Development', href: '/services/mobile' },
				{ id: 'consulting', label: 'Consulting', href: '/services/consulting' }
			]
		},
		{ id: 'accessibility', label: 'Accessibility Test', href: '/accessibility-test', current: true },
		{ id: 'contact', label: 'Contact', href: '/contact', current: false }
	];

	function validate_form() {
		const errors = { name: '', email: '', message: '' };
		let is_valid = true;

		if (!form_data.name.trim()) {
			errors.name = 'Name is required';
			is_valid = false;
		}

		if (!form_data.email.trim()) {
			errors.email = 'Email is required';
			is_valid = false;
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form_data.email)) {
			errors.email = 'Please enter a valid email address';
			is_valid = false;
		}

		if (!form_data.message.trim()) {
			errors.message = 'Message is required';
			is_valid = false;
		}

		form_errors = errors;
		return is_valid;
	}

	async function handle_form_submit(event: Event) {
		event.preventDefault();
		
		if (!validate_form()) {
			announceToScreenReader('Please correct the errors in the form', 'assertive');
			return;
		}

		loading = true;
		announceToScreenReader('Submitting form...', 'polite');

		// Simulate form submission
		setTimeout(() => {
			loading = false;
			announceToScreenReader('Form submitted successfully!', 'polite');
			
			// Reset form
			form_data = { name: '', email: '', message: '' };
			form_errors = { name: '', email: '', message: '' };
		}, 2000);
	}

	function handle_announcement() {
		if (announcement_text.trim()) {
			announceToScreenReader(announcement_text, 'polite');
			announcement_text = '';
		}
	}

	function open_modal() {
		modal_open = true;
		announceToScreenReader('Modal opened', 'polite');
	}

	function close_modal() {
		modal_open = false;
		announceToScreenReader('Modal closed', 'polite');
	}

	function open_settings() {
		settings_open = true;
	}

	function close_settings() {
		settings_open = false;
	}

	onMount(() => {
		// Create live regions for announcements
		liveRegionManager.createRegion('main-announcements', 'polite');
		liveRegionManager.createRegion('urgent-announcements', 'assertive');

		// Add skip link
		const skip_link = document.createElement('a');
		skip_link.href = '#main-content';
		skip_link.textContent = 'Skip to main content';
		skip_link.className = 'skip-link';
		document.body.insertBefore(skip_link, document.body.firstChild);

		return () => {
			// Cleanup
			liveRegionManager.destroy('main-announcements');
			liveRegionManager.destroy('urgent-announcements');
		};
	});
</script>

<svelte:head>
	<title>Accessibility Test Page - Interactive Knowledge System</title>
	<meta name="description" content="Comprehensive accessibility testing page with WCAG compliance features" />
</svelte:head>

<div class="accessibility-test">
	<!-- Skip Link Target -->
	<div id="main-content" tabindex="-1" class="sr-only">Main content starts here</div>

	<header class="accessibility-test__header">
		<div class="container">
			<h1 class="accessibility-test__title">Accessibility Test Page</h1>
			<p class="accessibility-test__description">
				This page demonstrates comprehensive accessibility features including ARIA labels, 
				keyboard navigation, screen reader support, and WCAG compliance.
			</p>
			
			<div class="accessibility-test__actions">
				<Button onclick={open_settings} aria-label="Open accessibility settings">
					⚙️ Accessibility Settings
				</Button>
			</div>
		</div>
	</header>

	<nav class="accessibility-test__nav" aria-label="Test page navigation">
		<div class="container">
			<AccessibleNavigation 
				items={navigation_items}
				orientation="horizontal"
				label="Main navigation"
			/>
		</div>
	</nav>

	<main class="accessibility-test__main">
		<div class="container">
			<section class="accessibility-test__section" aria-labelledby="button-tests">
				<h2 id="button-tests">Button Tests</h2>
				<p>Testing various button states and accessibility features:</p>
				
				<div class="accessibility-test__button-grid">
					<Button variant="primary">Primary Button</Button>
					<Button variant="secondary">Secondary Button</Button>
					<Button variant="outline">Outline Button</Button>
					<Button variant="ghost">Ghost Button</Button>
					<Button variant="danger">Danger Button</Button>
					<Button disabled>Disabled Button</Button>
					<Button loading loadingText="Processing your request...">
						Loading Button
					</Button>
					<Button 
						aria-expanded={modal_open}
						aria-controls="test-modal"
						onclick={open_modal}
					>
						Open Modal
					</Button>
				</div>
			</section>

			<section class="accessibility-test__section" aria-labelledby="form-tests">
				<h2 id="form-tests">Form Tests</h2>
				<p>Testing form accessibility with validation and error handling:</p>
				
				<form class="accessibility-test__form" onsubmit={handle_form_submit}>
					<fieldset class="accessibility-test__fieldset">
						<legend>Contact Information</legend>
						
						<Input
							label="Full Name"
							bind:value={form_data.name}
							error={!!form_errors.name}
							errorText={form_errors.name}
							required
							helperText="Enter your first and last name"
							autocomplete="name"
						/>

						<Input
							label="Email Address"
							type="email"
							bind:value={form_data.email}
							error={!!form_errors.email}
							errorText={form_errors.email}
							required
							helperText="We'll never share your email"
							autocomplete="email"
						/>

						<div class="input-wrapper">
							<label for="message-textarea" class="input-label">
								Message
								<span class="text-error-500" aria-label="required">*</span>
							</label>
							<textarea
								id="message-textarea"
								bind:value={form_data.message}
								class="accessibility-test__textarea"
								class:error={!!form_errors.message}
								rows="4"
								required
								aria-describedby="message-help message-error"
								aria-invalid={!!form_errors.message}
							></textarea>
							<div id="message-help" class="input-helper-text">
								Tell us how we can help you
							</div>
							{#if form_errors.message}
								<div id="message-error" class="input-helper-text error" role="alert">
									{form_errors.message}
								</div>
							{/if}
						</div>
					</fieldset>

					<div class="accessibility-test__form-actions">
						<Button 
							type="submit" 
							variant="primary"
							loading={loading}
							loadingText="Submitting your message..."
							disabled={loading}
						>
							Submit Form
						</Button>
						<Button 
							type="button" 
							variant="outline"
							onclick={() => {
								form_data = { name: '', email: '', message: '' };
								form_errors = { name: '', email: '', message: '' };
								announceToScreenReader('Form cleared', 'polite');
							}}
						>
							Clear Form
						</Button>
					</div>
				</form>
			</section>

			<section class="accessibility-test__section" aria-labelledby="announcement-tests">
				<h2 id="announcement-tests">Screen Reader Announcements</h2>
				<p>Test live region announcements for screen readers:</p>
				
				<div class="accessibility-test__announcement-controls">
					<Input
						label="Announcement Text"
						bind:value={announcement_text}
						placeholder="Enter text to announce to screen readers"
						helperText="This will be announced using aria-live regions"
					/>
					<Button onclick={handle_announcement} disabled={!announcement_text.trim()}>
						Make Announcement
					</Button>
				</div>

				<div class="accessibility-test__preset-announcements">
					<h3>Preset Announcements:</h3>
					<Button onclick={() => announceToScreenReader('This is a polite announcement', 'polite')}>
						Polite Announcement
					</Button>
					<Button onclick={() => announceToScreenReader('This is an urgent announcement!', 'assertive')}>
						Assertive Announcement
					</Button>
				</div>
			</section>

			<section class="accessibility-test__section" aria-labelledby="keyboard-tests">
				<h2 id="keyboard-tests">Keyboard Navigation Tests</h2>
				<p>Use Tab, Shift+Tab, Enter, Space, and Arrow keys to navigate:</p>
				
				<div class="accessibility-test__keyboard-grid" role="grid" aria-label="Keyboard navigation test grid">
					<div role="row">
						<Button role="gridcell" tabindex={0}>Cell 1,1</Button>
						<Button role="gridcell" tabindex={-1}>Cell 1,2</Button>
						<Button role="gridcell" tabindex={-1}>Cell 1,3</Button>
					</div>
					<div role="row">
						<Button role="gridcell" tabindex={-1}>Cell 2,1</Button>
						<Button role="gridcell" tabindex={-1}>Cell 2,2</Button>
						<Button role="gridcell" tabindex={-1}>Cell 2,3</Button>
					</div>
				</div>
			</section>

			<section class="accessibility-test__section" aria-labelledby="status-tests">
				<h2 id="status-tests">Status and Progress Tests</h2>
				<p>Testing status indicators and progress announcements:</p>
				
				<div class="accessibility-test__status-indicators">
					<div role="status" aria-live="polite" aria-label="Current status">
						{#if loading}
							Processing your request...
						{:else}
							Ready
						{/if}
					</div>
					
					<div role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100" aria-label="Upload progress">
						<div class="progress-bar">
							<div class="progress-fill" style="width: 75%"></div>
						</div>
						<span class="sr-only">75% complete</span>
					</div>
				</div>
			</section>
		</div>
	</main>

	<!-- Modal Component -->
	<Modal
		bind:open={modal_open}
		title="Accessibility Test Modal"
		id="test-modal"
		onclose={close_modal}
		aria-describedby="modal-description"
	>
		<div id="modal-description">
			<p>This modal demonstrates proper focus management, keyboard navigation, and ARIA attributes.</p>
			<p>Try using the Escape key to close, or Tab to navigate between elements.</p>
			
			<div class="modal-actions">
				<Button variant="primary" onclick={close_modal}>
					Confirm
				</Button>
				<Button variant="outline" onclick={close_modal}>
					Cancel
				</Button>
			</div>
		</div>
	</Modal>

	<!-- Accessibility Settings Modal -->
	<AccessibilitySettings bind:open={settings_open} onclose={close_settings} />
</div>

<style>
	.accessibility-test {
		min-height: 100vh;
		background: var(--color-background);
	}

	.accessibility-test__header {
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
		padding: 2rem 0;
	}

	.accessibility-test__title {
		font-size: var(--font-size-3xl);
		font-weight: var(--font-weight-bold);
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
	}

	.accessibility-test__description {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		line-height: var(--line-height-relaxed);
		margin: 0 0 1.5rem 0;
		max-width: 60ch;
	}

	.accessibility-test__actions {
		display: flex;
		gap: 1rem;
	}

	.accessibility-test__nav {
		background: var(--color-surface-secondary);
		border-bottom: 1px solid var(--color-border);
		padding: 1rem 0;
	}

	.accessibility-test__main {
		padding: 2rem 0;
	}

	.accessibility-test__section {
		margin-bottom: 3rem;
		padding: 2rem;
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		border: 1px solid var(--color-border);
	}

	.accessibility-test__section h2 {
		font-size: var(--font-size-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		margin: 0 0 1rem 0;
		border-bottom: 2px solid var(--color-primary-200);
		padding-bottom: 0.5rem;
	}

	.accessibility-test__section p {
		color: var(--color-text-secondary);
		line-height: var(--line-height-relaxed);
		margin: 0 0 1.5rem 0;
	}

	.accessibility-test__button-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.accessibility-test__form {
		max-width: 600px;
	}

	.accessibility-test__fieldset {
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 1.5rem;
		margin: 0 0 1.5rem 0;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.accessibility-test__fieldset legend {
		font-weight: var(--font-weight-semibold);
		color: var(--color-text-primary);
		padding: 0 0.5rem;
	}

	.accessibility-test__textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-family: inherit;
		font-size: var(--font-size-base);
		line-height: var(--line-height-normal);
		resize: vertical;
		transition: all var(--transition-base);
	}

	.accessibility-test__textarea:focus {
		outline: 2px solid var(--color-primary-500);
		outline-offset: 0;
		border-color: var(--color-primary-500);
	}

	.accessibility-test__textarea.error {
		border-color: var(--color-error-500);
	}

	.accessibility-test__form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
	}

	.accessibility-test__announcement-controls {
		display: flex;
		gap: 1rem;
		align-items: end;
		margin-bottom: 1.5rem;
	}

	.accessibility-test__preset-announcements {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.accessibility-test__preset-announcements h3 {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-primary);
		margin: 0 0 0.5rem 0;
	}

	.accessibility-test__keyboard-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		max-width: 400px;
	}

	.accessibility-test__keyboard-grid [role="row"] {
		display: contents;
	}

	.accessibility-test__status-indicators {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.progress-bar {
		width: 100%;
		height: 1rem;
		background: var(--color-surface-secondary);
		border-radius: var(--radius-full);
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary-600);
		transition: width var(--transition-base);
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	/* Input wrapper styles for consistency */
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
		color: var(--color-text-muted);
	}

	.input-helper-text.error {
		color: var(--color-error-600);
	}

	/* Mobile responsive */
	@media (max-width: 768px) {
		.accessibility-test__announcement-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.accessibility-test__form-actions {
			flex-direction: column;
		}

		.accessibility-test__button-grid {
			grid-template-columns: 1fr;
		}
	}
</style>