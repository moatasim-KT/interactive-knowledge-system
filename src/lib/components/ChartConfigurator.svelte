<script lang="ts">
	import type {
		VisualizationConfig,
		AnimationConfig,
		StyleConfig,
		LayoutConfig
	} from '$lib/types/web-content.js';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		config: VisualizationConfig;
		chartType?: string;
		onconfigChange?: (event: CustomEvent) => void;
		onexport?: (event: CustomEvent) => void;
		onimport?: (event: CustomEvent) => void;
		onerror?: (event: CustomEvent) => void;
	}

	let { config, chartType = 'line' }: Props = $props();

	const dispatch = createEventDispatcher();

	// Local types
	type Theme = StyleConfig['theme'];

	// Configuration sections
	let active_section = $state('layout');
	let show_advanced = $state(false);

	// Local config state
	let layout_config: LayoutConfig = $state({
		width: config.layout?.width || 800,
		height: config.layout?.height || 500,
		margin: config.layout?.margin || { top: 40, right: 40, bottom: 60, left: 60 },
		responsive: config.layout?.responsive ?? true
	});

	let style_config: StyleConfig = $state({
		theme: config.styling?.theme || 'light',
		colors: config.styling?.colors || ['#0066cc', '#ff6b35', '#28a745', '#ffc107', '#dc3545'],
		fonts: config.styling?.fonts || { family: 'system-ui', size: 12 }
	});

	let animation_config: AnimationConfig = $state({
		enabled: config.animations?.enabled ?? true,
		duration: config.animations?.duration || 300,
		easing: config.animations?.easing || 'ease-in-out',
		transitions: config.animations?.transitions || ['opacity', 'transform']
	});

	// Predefined options
	const themes: { value: Theme; label: string; preview: string }[] = [
		{ value: 'light', label: 'Light', preview: '#ffffff' },
		{ value: 'dark', label: 'Dark', preview: '#1a1a1a' },
		{ value: 'auto', label: 'Auto', preview: 'linear-gradient(45deg, #ffffff, #1a1a1a)' }
	];

	const color_palettes = [
		{ name: 'Default', colors: ['#0066cc', '#ff6b35', '#28a745', '#ffc107', '#dc3545'] },
		{ name: 'Viridis', colors: ['#440154', '#31688e', '#35b779', '#fde725'] },
		{ name: 'Plasma', colors: ['#0d0887', '#7e03a8', '#cc4778', '#f89441', '#f0f921'] },
		{ name: 'Cool', colors: ['#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'] },
		{ name: 'Warm', colors: ['#fee5d9', '#fcbba1', '#fc9272', '#fb6a4a', '#de2d26'] },
		{ name: 'Pastel', colors: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6'] }
	];

	const font_families = [
		'system-ui',
		'Arial, sans-serif',
		'Georgia, serif',
		'Courier New, monospace',
		'Helvetica, sans-serif',
		'Times New Roman, serif'
	];

	const easing_functions = [
		'linear',
		'ease',
		'ease-in',
		'ease-out',
		'ease-in-out',
		'cubic-bezier(0.4, 0, 0.2, 1)'
	];

	const transition_properties = [
		'opacity',
		'transform',
		'fill',
		'stroke',
		'stroke-width',
		'r',
		'width',
		'height'
	];

	// Configuration sections
	const sections = [
		{ id: 'layout', label: 'Layout', icon: '📐' },
		{ id: 'styling', label: 'Styling', icon: '🎨' },
		{ id: 'animations', label: 'Animations', icon: '🎬' },
		{ id: 'interactions', label: 'Interactions', icon: '🖱️' }
	];

	function update_config() {
		const updated_config: VisualizationConfig = {
			...config,
			layout: layout_config,
			styling: style_config,
			animations: animation_config
		};

		dispatch('configChange', { config: updated_config });
	}

	function apply_color_palette(palette: string[]) {
		style_config.colors = [...palette];
		update_config();
	}

	function add_custom_color() {
		style_config.colors = [...style_config.colors, '#000000'];
		update_config();
	}

	function remove_color(index: number) {
		if (style_config.colors.length > 1) {
			style_config.colors = style_config.colors.filter((_, i) => i !== index);
			update_config();
		}
	}

	function update_color(index: number, color: string) {
		style_config.colors = style_config.colors.map((c, i) => (i === index ? color : c));
		update_config();
	}

	function toggle_transition(property: string) {
		const transitions = animation_config.transitions;
		const index = transitions.indexOf(property);

		if (index >= 0) {
			animation_config.transitions = transitions.filter((t) => t !== property);
		} else {
			animation_config.transitions = [...transitions, property];
		}

		update_config();
	}

	function reset_to_defaults() {
		layout_config = {
			width: 800,
			height: 500,
			margin: { top: 40, right: 40, bottom: 60, left: 60 },
			responsive: true
		};

		style_config = {
			theme: 'light',
			colors: ['#0066cc', '#ff6b35', '#28a745', '#ffc107', '#dc3545'],
			fonts: { family: 'system-ui', size: 12 }
		};

		animation_config = {
			enabled: true,
			duration: 300,
			easing: 'ease-in-out',
			transitions: ['opacity', 'transform']
		};

		update_config();
	}

	function export_config() {
		const config_json = JSON.stringify(
			{
				layout: layout_config,
				styling: style_config,
				animations: animation_config
			},
			null,
			2
		);

		const blob = new Blob([config_json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `chart-config-${Date.now()}.json`;
		link.click();
		URL.revokeObjectURL(url);

		dispatch('export', { config: config_json });
	}

	function import_config(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				try {
					const imported_config = JSON.parse(e.target?.result as string);

					if (imported_config.layout) layout_config = imported_config.layout;
					if (imported_config.styling) style_config = imported_config.styling;
					if (imported_config.animations) animation_config = imported_config.animations;

					update_config();
					dispatch('import', { config: imported_config });
				} catch (error) {
					dispatch('error', { message: 'Invalid configuration file' });
				}
			};
			reader.readAsText(file);
		}
	}

	// Reactive updates
	$effect(() => {
		if (layout_config || style_config || animation_config) {
			update_config();
		}
	});
</script>

<div class="chart-configurator">
	<!-- Header -->
	<div class="configurator-header">
		<div class="header-title">
			<h3>Chart Configuration</h3>
			<span class="chart-type-indicator">({chartType})</span>
		</div>

		<div class="header-actions">
			<button
				class="toggle-advanced-btn"
				class:active={show_advanced}
				onclick={() => (show_advanced = !show_advanced)}
				type="button"
			>
				⚙️ Advanced
			</button>
			<button class="reset-btn" onclick={reset_to_defaults} type="button"> 🔄 Reset </button>
			<button class="export-btn" onclick={export_config} type="button"> 💾 Export </button>
			<label class="import-btn">
				📁 Import
				<input type="file" accept=".json" onchange={import_config} style="display: none;" />
			</label>
		</div>
	</div>

	<!-- Section Navigation -->
	<div class="section-nav">
		{#each sections as section (section.id)}
			<button
				class="section-btn"
				class:active={active_section === section.id}
				onclick={() => (active_section = section.id)}
				type="button"
			>
				<span class="section-icon">{section.icon}</span>
				<span class="section-label">{section.label}</span>
			</button>
		{/each}
	</div>

	<!-- Configuration Sections -->
	<div class="config-content">
		{#if active_section === 'layout'}
			<div class="config-section">
				<h4>Layout Configuration</h4>

				<div class="config-grid">
					<div class="config-group">
					<div class="config-label">Dimensions</div>
					<div class="dimension-controls">
						<div class="dimension-input">
							<label for="layout-width">Width:</label>
							<input
								type="number"
								bind:value={layout_config.width}
								id="layout-width"
								min="200"
								max="2000"
								step="50"
								class="number-input"
							/>
							<span class="unit">px</span>
						</div>
						<div class="dimension-input">
							<label for="layout-height">Height:</label>
							<input
								type="number"
								bind:value={layout_config.height}
								id="layout-height"
								min="200"
								max="1500"
								step="50"
								class="number-input"
							/>
							<span class="unit">px</span>
						</div>
					</div>
				</div>

					<div class="config-group">
					<div class="config-label">Margins</div>
					<div class="margin-controls">
						<div class="margin-input">
							<label for="margin-top">Top:</label>
							<input
								type="number"
								bind:value={layout_config.margin.top}
								id="margin-top"
								min="0"
								max="100"
								class="number-input small"
							/>
						</div>
						<div class="margin-input">
							<label for="margin-right">Right:</label>
							<input
								type="number"
								bind:value={layout_config.margin.right}
								id="margin-right"
								min="0"
								max="100"
								class="number-input small"
							/>
						</div>
						<div class="margin-input">
							<label for="margin-bottom">Bottom:</label>
							<input
								type="number"
								bind:value={layout_config.margin.bottom}
								id="margin-bottom"
								min="0"
								max="100"
								class="number-input small"
							/>
						</div>
						<div class="margin-input">
							<label for="margin-left">Left:</label>
							<input
								type="number"
								bind:value={layout_config.margin.left}
								id="margin-left"
								min="0"
								max="100"
								class="number-input small"
							/>
						</div>
					</div>
				</div>

					<div class="config-group">
						<label class="config-label">
							<input
								type="checkbox"
								bind:checked={layout_config.responsive}
								class="checkbox-input"
							/>
							Responsive Layout
						</label>
						<p class="config-description">
							Automatically adjust chart size based on container width
						</p>
					</div>
				</div>
			</div>
		{:else if active_section === 'styling'}
			<div class="config-section">
				<h4>Styling Configuration</h4>

				<div class="config-grid">
					<div class="config-group">
					<div class="config-label">Theme</div>
					<div class="theme-selector">
							{#each themes as theme (theme.value)}
								<button
									class="theme-btn"
									class:active={style_config.theme === theme.value}
									onclick={() => {
										style_config.theme = theme.value;
										update_config();
									}}
									type="button"
								>
									<div class="theme-preview" style="background: {theme.preview};"></div>
									<span class="theme-label">{theme.label}</span>
								</button>
							{/each}
						</div>
					</div>

					<div class="config-group">
					<div class="config-label">Color Palette</div>
					<div class="palette-selector">
							{#each color_palettes as palette (palette.name)}
								<button
									class="palette-btn"
									onclick={() => apply_color_palette(palette.colors)}
									type="button"
								>
									<div class="palette-preview">
										{#each palette.colors as color (color)}
											<div class="color-swatch" style="background-color: {color};"></div>
										{/each}
									</div>
									<span class="palette-name">{palette.name}</span>
								</button>
							{/each}
						</div>
					</div>

					<div class="config-group">
					<div class="config-label">Custom Colors</div>
					<div class="color-editor">
							{#each style_config.colors as color, index (index)}
								<div class="color-input-group">
									<input
										type="color"
										value={color}
										oninput={(e) => update_color(index, e.currentTarget.value)}
										class="color-input"
									/>
									<input
										type="text"
										value={color}
										oninput={(e) => update_color(index, e.currentTarget.value)}
										class="color-text-input"
									/>
									<button
										class="remove-color-btn"
										onclick={() => remove_color(index)}
										disabled={style_config.colors.length <= 1}
										type="button"
									>
										×
									</button>
								</div>
							{/each}
							<button class="add-color-btn" onclick={add_custom_color} type="button">
								+ Add Color
							</button>
						</div>
					</div>

					<div class="config-group">
					<div class="config-label">Typography</div>
					<div class="typography-controls">
						<div class="font-control">
							<label for="font-family">Font Family:</label>
							<select bind:value={style_config.fonts.family} class="font-select" id="font-family">
								{#each font_families as font (font)}
									<option value={font}>{font}</option>
								{/each}
							</select>
						</div>
						<div class="font-control">
							<label for="font-size">Font Size:</label>
							<input
								type="number"
								bind:value={style_config.fonts.size}
								id="font-size"
								min="8"
								max="24"
								class="number-input small"
							/>
							<span class="unit">px</span>
						</div>
					</div>
			</div>
		</div>
	</div>
	{:else if active_section === 'animations'}
			<div class="config-section">
				<h4>Animation Configuration</h4>

				<div class="config-grid">
					<div class="config-group">
						<label class="config-label" for="animation-enabled">
							<input
								type="checkbox"
								bind:checked={animation_config.enabled}
								id="animation-enabled"
								class="checkbox-input"
							/>
							Enable Animations
						</label>
						<p class="config-description">Turn on/off all chart animations and transitions</p>
					</div>

					{#if animation_config.enabled}
						<div class="config-group">
					<label class="config-label" for="animation-duration">Duration</label>
					<div class="duration-control">
						<input
							type="range"
							bind:value={animation_config.duration}
							id="animation-duration"
							min="100"
							max="2000"
							step="50"
							class="range-input"
						/>
						<span class="duration-value">{animation_config.duration}ms</span>
					</div>
				</div>

						<div class="config-group">
					<label class="config-label" for="easing-select">Easing Function</label>
					<select bind:value={animation_config.easing} class="easing-select" id="easing-select">
						{#each easing_functions as easing (easing)}
							<option value={easing}>{easing}</option>
						{/each}
					</select>
				</div>

						<div class="config-group">
					<div class="config-label">Transition Properties</div>
					<div class="transition-checkboxes">
								{#each transition_properties as property (property)}
									<label class="transition-checkbox">
										<input
											type="checkbox"
											checked={animation_config.transitions.includes(property)}
											onchange={() => toggle_transition(property)}
											class="checkbox-input"
										/>
										{property}
									</label>
								{/each}
							</div>
						</div>

						{#if show_advanced}
							<div class="config-group">
						<div class="config-label">Animation Preview</div>
						<div class="animation-preview">
									<div
										class="preview-element"
										style="
											transition: all {animation_config.duration}ms {animation_config.easing};
											background: {style_config.colors[0]};
										"
									></div>
									<button
										class="preview-trigger-btn"
										onclick={() => {
											const el = document.querySelector<HTMLElement>('.preview-element');
											if (el) {
												el.style.transform = el.style.transform
													? ''
													: 'translateX(100px) scale(1.2)';
											}
										}}
										type="button"
									>
										Test Animation
									</button>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		{:else if active_section === 'interactions'}
			<div class="config-section">
				<div>Interaction Configuration</div>

				<div class="config-grid">
					<div class="config-group">
					<div class="config-label">Hover Effects</div>
					<div class="interaction-options">
						<label class="interaction-checkbox">
							<input type="checkbox" checked class="checkbox-input" />
							Show tooltips on hover
						</label>
						<label class="interaction-checkbox">
							<input type="checkbox" checked class="checkbox-input" />
							Highlight data points
						</label>
						<label class="interaction-checkbox">
							<input type="checkbox" class="checkbox-input" />
							Show crosshairs
						</label>
					</div>
				</div>

					<div class="config-group">
					<div class="config-label">Click Interactions</div>
					<div class="interaction-options">
						<label class="interaction-checkbox">
							<input type="checkbox" checked class="checkbox-input" />
							Select data points
						</label>
						<label class="interaction-checkbox">
							<input type="checkbox" class="checkbox-input" />
							Drill down on click
						</label>
						<label class="interaction-checkbox">
							<input type="checkbox" class="checkbox-input" />
							Show detailed view
						</label>
					</div>
				</div>

					<div class="config-group">
					<div class="config-label">Zoom & Pan</div>
					<div class="interaction-options">
						<label class="interaction-checkbox">
							<input type="checkbox" checked class="checkbox-input" />
							Enable mouse wheel zoom
						</label>
						<label class="interaction-checkbox">
							<input type="checkbox" class="checkbox-input" />
							Enable pan with drag
						</label>
						<label class="interaction-checkbox">
							<input type="checkbox" class="checkbox-input" />
							Show zoom controls
						</label>
					</div>
				</div>

					{#if show_advanced}
						<div class="config-group">
						<div class="config-label">Advanced Interactions</div>
						<div class="interaction-options">
								<label class="interaction-checkbox">
									<input type="checkbox" class="checkbox-input" />
									Brush selection
								</label>
								<label class="interaction-checkbox">
									<input type="checkbox" class="checkbox-input" />
									Lasso selection
								</label>
								<label class="interaction-checkbox">
									<input type="checkbox" class="checkbox-input" />
									Multi-touch gestures
								</label>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- Live Preview -->
	<div class="config-preview">
		<h4>Live Preview</h4>
		<div class="preview-container">
			<div
				class="preview-chart"
				style="
					width: {layout_config.responsive ? '100%' : layout_config.width + 'px'};
					height: {layout_config.height}px;
					background: {style_config.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
					color: {style_config.theme === 'dark' ? '#ffffff' : '#1a1a1a'};
					font-family: {style_config.fonts.family};
					font-size: {style_config.fonts.size}px;
					border-radius: 6px;
					border: 1px solid {style_config.theme === 'dark' ? '#333' : '#e1e5e9'};
					display: flex;
					align-items: center;
					justify-content: center;
					position: relative;
					overflow: hidden;
				"
			>
				<!-- Sample chart elements -->
				<svg width="200" height="100" style="opacity: 0.7;">
					{#each style_config.colors.slice(0, 3) as color, i (i)}
						<rect
							x={i * 60 + 20}
							y={80 - (i + 1) * 20}
							width="40"
							height={(i + 1) * 20}
							fill={color}
							style="transition: all {animation_config.enabled
								? animation_config.duration + 'ms'
								: '0ms'} {animation_config.easing};"
						/>
					{/each}
				</svg>

				<div class="preview-label">
					Preview ({layout_config.width}×{layout_config.height})
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.chart-configurator {
		background: var(--configurator-bg, #ffffff);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.configurator-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.header-title h3 {
		margin: 0;
		font-size: 1.5rem;
		color: var(--text-primary, #1a1a1a);
	}

	.chart-type-indicator {
		font-size: 0.875rem;
		color: var(--text-secondary, #666666);
		background: var(--badge-bg, #e9ecef);
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-advanced-btn,
	.reset-btn,
	.export-btn,
	.import-btn {
		padding: 0.5rem 1rem;
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 4px;
		background: var(--button-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.toggle-advanced-btn:hover,
	.reset-btn:hover,
	.export-btn:hover,
	.import-btn:hover {
		background: var(--button-hover-bg, #e9ecef);
	}

	.toggle-advanced-btn.active {
		background: var(--button-active-bg, #0066cc);
		color: var(--button-active-text, #ffffff);
		border-color: var(--button-active-border, #0066cc);
	}

	.section-nav {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 1.5rem;
		background: var(--nav-bg, #f8f9fa);
		padding: 0.5rem;
		border-radius: 6px;
	}

	.section-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem;
		background: transparent;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
		flex: 1;
	}

	.section-btn:hover {
		background: var(--nav-item-hover-bg, #e9ecef);
	}

	.section-btn.active {
		background: var(--nav-item-active-bg, #ffffff);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.section-icon {
		font-size: 1.2rem;
	}

	.section-label {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.config-content {
		margin-bottom: 1.5rem;
	}

	.config-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1.2rem;
		color: var(--text-primary, #1a1a1a);
	}

	.config-grid {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.config-group {
		padding: 1rem;
		background: var(--group-bg, #f8f9fa);
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.config-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
		margin-bottom: 0.75rem;
	}

	.config-description {
		margin: 0.5rem 0 0 0;
		font-size: 0.875rem;
		color: var(--text-secondary, #666666);
		line-height: 1.4;
	}

	.dimension-controls,
	.margin-controls {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 1rem;
	}

	.dimension-input,
	.margin-input {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.dimension-input label,
	.margin-input label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		min-width: 50px;
	}

	.number-input {
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		font-size: 0.875rem;
		width: 80px;
	}

	.number-input.small {
		width: 60px;
	}

	.unit {
		font-size: 0.8rem;
		color: var(--text-secondary, #666666);
	}

	.checkbox-input {
		width: 16px;
		height: 16px;
		accent-color: var(--accent-color, #0066cc);
	}

	.theme-selector {
		display: flex;
		gap: 0.75rem;
	}

	.theme-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--button-bg, #ffffff);
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
		flex: 1;
	}

	.theme-btn:hover {
		background: var(--button-hover-bg, #e9ecef);
	}

	.theme-btn.active {
		background: var(--button-active-bg, #0066cc);
		color: var(--button-active-text, #ffffff);
		border-color: var(--button-active-border, #0066cc);
	}

	.theme-preview {
		width: 40px;
		height: 24px;
		border-radius: 4px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.theme-label {
		font-size: 0.8rem;
		font-weight: 500;
	}

	.palette-selector {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.75rem;
	}

	.palette-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--button-bg, #ffffff);
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.palette-btn:hover {
		background: var(--button-hover-bg, #e9ecef);
	}

	.palette-preview {
		display: flex;
		gap: 2px;
		height: 20px;
	}

	.color-swatch {
		width: 16px;
		height: 20px;
		border-radius: 2px;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.palette-name {
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.color-editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.color-input-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.color-input {
		width: 40px;
		height: 32px;
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 4px;
		cursor: pointer;
	}

	.color-text-input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		font-size: 0.875rem;
		font-family: monospace;
	}

	.remove-color-btn {
		width: 32px;
		height: 32px;
		background: var(--button-danger-bg, #dc3545);
		color: var(--button-danger-text, #ffffff);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1.2rem;
		line-height: 1;
	}

	.remove-color-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.add-color-btn {
		padding: 0.5rem 1rem;
		background: var(--button-success-bg, #28a745);
		color: var(--button-success-text, #ffffff);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.typography-controls {
		display: flex;
		gap: 1rem;
		align-items: end;
	}

	.font-control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex: 1;
	}

	.font-control label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.font-select,
	.easing-select {
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		font-size: 0.875rem;
	}

	.duration-control {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.range-input {
		flex: 1;
		accent-color: var(--accent-color, #0066cc);
	}

	.duration-value {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		min-width: 60px;
	}

	.transition-checkboxes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 0.5rem;
	}

	.transition-checkbox,
	.interaction-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-primary, #1a1a1a);
	}

	.interaction-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.animation-preview {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: var(--preview-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 4px;
	}

	.preview-element {
		width: 40px;
		height: 40px;
		border-radius: 4px;
	}

	.preview-trigger-btn {
		padding: 0.5rem 1rem;
		background: var(--button-bg, #0066cc);
		color: var(--button-text, #ffffff);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.config-preview {
		padding: 1rem;
		background: var(--preview-section-bg, #f8f9fa);
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.config-preview h4 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: var(--text-primary, #1a1a1a);
	}

	.preview-container {
		display: flex;
		justify-content: center;
		padding: 1rem;
		background: var(--preview-container-bg, #ffffff);
		border-radius: 4px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.preview-chart {
		position: relative;
		max-width: 100%;
	}

	.preview-label {
		position: absolute;
		bottom: 10px;
		right: 10px;
		font-size: 0.8rem;
		opacity: 0.7;
		background: rgba(0, 0, 0, 0.1);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	@media (max-width: 768px) {
		.chart-configurator {
			padding: 1rem;
		}

		.configurator-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.header-actions {
			justify-content: space-between;
		}

		.section-nav {
			flex-direction: column;
		}

		.section-btn {
			flex-direction: row;
			justify-content: flex-start;
		}

		.dimension-controls,
		.margin-controls {
			grid-template-columns: 1fr;
		}

		.theme-selector {
			flex-direction: column;
		}

		.palette-selector {
			grid-template-columns: 1fr;
		}

		.typography-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.transition-checkboxes {
			grid-template-columns: 1fr;
		}

		.animation-preview {
			flex-direction: column;
			align-items: center;
		}
	}
</style>
