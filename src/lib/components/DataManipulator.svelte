<script lang="ts">
	import type { DataFilter } from '$lib/types/web-content.js';

	interface Props {
		data: any;
		filters?: DataFilter[];
		onDataChange?: (event: { data: any; filters: DataFilter[] }) => void;
	}

	let { data, filters = [], onDataChange }: Props = $props();

	let sort_field = $state('');
	let sort_direction = $state<'asc' | 'desc'>('asc');
	let search_query = $state('');
	let active_filters = $state([...filters]);
	let show_advanced_filters = $state(false);

	// Processed data based on current filters and sorting
	const processed_data = $derived(() => process_data(data, active_filters, sort_field, sort_direction, search_query));

	// Available fields for filtering and sorting (auto-detected from data)
	const available_fields = $derived(() => detect_fields(data));

	function detect_fields(raw_data): string[] {
		if (!raw_data) return [];

		if (Array.isArray(raw_data) && raw_data.length > 0) {
			const first_item = raw_data[0];
			if (typeof first_item === 'object' && first_item !== null) {
				return Object.keys(first_item);
			}
		}

		if (typeof raw_data === 'object' && raw_data !== null) {
			return Object.keys(raw_data);
		}

		return ['value', 'label']; // Default fields
	}

	function process_data(
		raw_data,
		current_filters,
		sort_by,
		direction: 'asc' | 'desc',
		search: string
	) {
		if (!raw_data) return [];

		let processed = Array.isArray(raw_data)
			? [...raw_data]
			: Object.entries(raw_data).map(([key, value]) => ({ key, value }));

		// Apply search filter
		if (search.trim()) {
			processed = processed.filter((item) => {
				const searchable_text = JSON.stringify(item).toLowerCase();
				return searchable_text.includes(search.toLowerCase());
			});
		}

		// Apply custom filters
		current_filters.forEach((filter) => {
			if (!filter.active) return;

			processed = processed.filter((item) => {
				const field_value = item[filter.field];

				switch (filter.operator) {
					case 'equals':
						return field_value === filter.value;
					case 'contains':
						return String(field_value).toLowerCase().includes(String(filter.value).toLowerCase());
					case 'greater':
						return Number(field_value) > Number(filter.value);
					case 'less':
						return Number(field_value) < Number(filter.value);
					case 'between':
						if (Array.isArray(filter.value) && filter.value.length === 2) {
							const val = Number(field_value);
							return val >= Number(filter.value[0]) && val <= Number(filter.value[1]);
						}
						return true;
					default:
						return true;
				}
			});
		});

		// Apply sorting
		if (sort_by) {
			processed.sort((a, b) => {
				const a_val = a[sort_by];
				const b_val = b[sort_by];

				let comparison = 0;
				if (typeof a_val === 'number' && typeof b_val === 'number') {
					comparison = a_val - b_val;
				} else {
					comparison = String(a_val).localeCompare(String(b_val));
				}

				return direction === 'desc' ? -comparison : comparison;
			});
		}

		return processed;
	}

	function handle_sort_change(field: string) {
		if (sort_field === field) {
			sort_direction = sort_direction === 'asc' ? 'desc' : 'asc';
		} else {
			sort_field = field;
			sort_direction = 'asc';
		}

		emit_data_change();
	}

	function handle_search_change(event: Event) {
		const target = event.target as HTMLInputElement;
		search_query = target.value;
		emit_data_change();
	}

	function add_filter() {
		const new_filter = {
			field: available_fields[0] || 'value',
			type: 'text',
			operator: 'contains',
			value: '',
			active: true
		};

		active_filters = [...active_filters, new_filter];
	}

	function remove_filter(index: number) {
		active_filters = active_filters.filter((_, i) => i !== index);
		emit_data_change();
	}

	function update_filter(index: number, updates: Partial<DataFilter>) {
		active_filters = active_filters.map((filter, i) =>
			i === index ? { ...filter, ...updates } : filter
		);
		emit_data_change();
	}

	function toggle_filter(index: number) {
		active_filters = active_filters.map((filter, i) =>
			i === index ? { ...filter, active: !filter.active } : filter
		);
		emit_data_change();
	}

	function clear_all_filters() {
		active_filters = [];
		search_query = '';
		sort_field = '';
		sort_direction = 'asc';
		emit_data_change();
	}

	function emit_data_change() {
		onDataChange?.({
			data: processed_data(),
			filters: active_filters,
			sort: { field: sort_field, direction: sort_direction },
			search: search_query
		});
	}

	// Emit data changes when processed data changes
	$effect(() => {
		if (processed_data()) {
			emit_data_change();
		}
	});
</script>

<div class="data-manipulator">
	<div class="manipulator-header">
		<h4 class="manipulator-title">Data Controls</h4>
		<div class="header-actions">
			<button
				class="toggle-advanced-btn"
				onclick={() => (show_advanced_filters = !show_advanced_filters)}
				type="button"
			>
				{show_advanced_filters ? 'Hide' : 'Show'} Filters
			</button>
			<button
				class="clear-all-btn"
				onclick={clear_all_filters}
				type="button"
				disabled={!search_query && !sort_field && active_filters.length === 0}
			>
				Clear All
			</button>
		</div>
	</div>

	<!-- Search -->
	<div class="search-section">
		<div class="search-container">
			<input
				type="text"
				placeholder="Search data..."
				bind:value={search_query}
				oninput={handle_search_change}
				class="search-input"
			/>
			<span class="search-icon">🔍</span>
		</div>
	</div>

	<!-- Quick Sort -->
	<div class="sort-section">
		<label class="sort-label">Sort by:</label>
		<div class="sort-controls">
			<select bind:value={sort_field} onchange={emit_data_change} class="sort-select">
				<option value="">No sorting</option>
				{#each available_fields() as field (field)}
					<option value={field}>{field}</option>
				{/each}
			</select>
			{#if sortField}
				<button
					class="sort-direction-btn"
					onclick={() => handle_sort_change(sort_field)}
					type="button"
					title="Toggle sort direction"
				>
					{sort_direction === 'asc' ? '↑' : '↓'}
				</button>
			{/if}
		</div>
	</div>

	<!-- Advanced Filters -->
	{#if showAdvancedFilters}
		<div class="filters-section">
			<div class="filters-header">
				<h5 class="filters-title">Advanced Filters</h5>
				<button class="add-filter-btn" onclick={add_filter} type="button"> + Add Filter </button>
			</div>

			{#each activeFilters as filter, index (index)}
				<div class="filter-row" class:inactive={!filter.active}>
					<div class="filter-controls">
						<!-- Field Selection -->
						<select
							bind:value={filter.field}
							onchange={(e) => update_filter(index, { field: e.currentTarget.value })}
							class="filter-field-select"
						>
							{#each available_fields() as field (field)}
								<option value={field}>{field}</option>
							{/each}
						</select>

						<!-- Operator Selection -->
						<select
							bind:value={filter.operator}
							onchange={(e) => update_filter(index, { operator: e.currentTarget.value })}
							class="filter-operator-select"
						>
							<option value="contains">Contains</option>
							<option value="equals">Equals</option>
							<option value="greater">Greater than</option>
							<option value="less">Less than</option>
							<option value="between">Between</option>
						</select>

						<!-- Value Input -->
						{#if filter.operator === 'between'}
							<div class="range-inputs">
								<input
									type="number"
									placeholder="Min"
									value={Array.isArray(filter.value) ? filter.value[0] : ''}
									oninput={(e) => {
										const min = e.currentTarget.value;
										const max = Array.isArray(filter.value) ? filter.value[1] : '';
										update_filter(index, { value: [min, max] });
									}}
									class="filter-value-input range-input"
								/>
								<input
									type="number"
									placeholder="Max"
									value={Array.isArray(filter.value) ? filter.value[1] : ''}
									oninput={(e) => {
										const max = e.currentTarget.value;
										const min = Array.isArray(filter.value) ? filter.value[0] : '';
										update_filter(index, { value: [min, max] });
									}}
									class="filter-value-input range-input"
								/>
							</div>
						{:else}
							<input
								type={filter.operator === 'greater' || filter.operator === 'less'
									? 'number'
									: 'text'}
								placeholder="Filter value..."
								value={filter.value}
								oninput={(e) => update_filter(index, { value: e.currentTarget.value })}
								class="filter-value-input"
							/>
						{/if}
					</div>

					<div class="filter-actions">
						<button
							class="toggle-filter-btn"
							class:active={filter.active}
							onclick={() => toggle_filter(index)}
							type="button"
							title={filter.active ? 'Disable filter' : 'Enable filter'}
						>
							{filter.active ? '✓' : '○'}
						</button>
						<button
							class="remove-filter-btn"
							onclick={() => remove_filter(index)}
							type="button"
							title="Remove filter"
						>
							×
						</button>
					</div>
				</div>
			{/each}

			{#if active_filters.length === 0}
				<div class="no-filters">
					<p>No filters applied. Click "Add Filter" to create one.</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Data Summary -->
	<div class="data-summary">
		<span class="summary-text">
			Showing {processed_data.length} of {Array.isArray(data)
				? data.length
				: Object.keys(data || {}).length} items
		</span>
	</div>
</div>

<style>
	.data-manipulator {
		background: var(--manipulator-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		padding: 1rem;
	}

	.manipulator-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.manipulator-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-advanced-btn,
	.clear-all-btn {
		background: var(--button-secondary-bg, #6c757d);
		color: var(--button-secondary-text, #ffffff);
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background-color 0.2s;
	}

	.toggle-advanced-btn:hover,
	.clear-all-btn:hover:not(:disabled) {
		background: var(--button-secondary-hover-bg, #5a6268);
	}

	.clear-all-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.search-section {
		margin-bottom: 1rem;
	}

	.search-container {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input {
		width: 100%;
		padding: 0.5rem 2.5rem 0.5rem 0.75rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-size: 0.9rem;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--input-focus-border, #0066cc);
		box-shadow: 0 0 0 2px var(--input-focus-shadow, rgba(0, 102, 204, 0.2));
	}

	.search-icon {
		position: absolute;
		right: 0.75rem;
		color: var(--text-secondary, #666666);
		pointer-events: none;
	}

	.sort-section {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.sort-label {
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		white-space: nowrap;
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.sort-select {
		flex: 1;
		padding: 0.4rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-size: 0.9rem;
	}

	.sort-direction-btn {
		background: var(--button-bg, #0066cc);
		color: var(--button-text, #ffffff);
		border: none;
		padding: 0.4rem 0.6rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		transition: background-color 0.2s;
	}

	.sort-direction-btn:hover {
		background: var(--button-hover-bg, #0052a3);
	}

	.filters-section {
		border-top: 1px solid var(--border-light, #e9ecef);
		padding-top: 1rem;
		margin-top: 1rem;
	}

	.filters-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.filters-title {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.add-filter-btn {
		background: var(--button-success-bg, #28a745);
		color: var(--button-success-text, #ffffff);
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background-color 0.2s;
	}

	.add-filter-btn:hover {
		background: var(--button-success-hover-bg, #218838);
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		background: var(--filter-row-bg, #f8f9fa);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 4px;
		transition: opacity 0.2s;
	}

	.filter-row.inactive {
		opacity: 0.6;
	}

	.filter-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.filter-field-select,
	.filter-operator-select {
		padding: 0.4rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-size: 0.8rem;
		min-width: 100px;
	}

	.filter-value-input {
		flex: 1;
		padding: 0.4rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		font-size: 0.8rem;
	}

	.range-inputs {
		display: flex;
		gap: 0.25rem;
		flex: 1;
	}

	.range-input {
		flex: 1;
		min-width: 60px;
	}

	.filter-actions {
		display: flex;
		gap: 0.25rem;
	}

	.toggle-filter-btn,
	.remove-filter-btn {
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		line-height: 1;
		transition: background-color 0.2s;
	}

	.toggle-filter-btn {
		background: var(--toggle-inactive-bg, #e9ecef);
		color: var(--toggle-inactive-text, #6c757d);
	}

	.toggle-filter-btn.active {
		background: var(--toggle-active-bg, #28a745);
		color: var(--toggle-active-text, #ffffff);
	}

	.remove-filter-btn {
		background: var(--button-danger-bg, #dc3545);
		color: var(--button-danger-text, #ffffff);
	}

	.remove-filter-btn:hover {
		background: var(--button-danger-hover-bg, #c82333);
	}

	.no-filters {
		text-align: center;
		color: var(--text-secondary, #666666);
		font-style: italic;
		padding: 1rem;
	}

	.data-summary {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-light, #e9ecef);
		text-align: center;
	}

	.summary-text {
		font-size: 0.8rem;
		color: var(--text-secondary, #666666);
	}

	@media (max-width: 768px) {
		.manipulator-header {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.header-actions {
			justify-content: space-between;
		}

		.sort-section {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.filter-row {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.filter-controls {
			flex-direction: column;
		}

		.filter-actions {
			justify-content: center;
		}

		.range-inputs {
			flex-direction: column;
		}
	}
</style>
