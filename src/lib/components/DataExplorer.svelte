<script lang="ts">
	import type { DataFilter } from '$lib/types/unified';

	let {
		data = [],
		filters = [],
		groupBy = '',
		sortBy = '',
		sortDirection = 'asc',
		title,
		description,
		onExport = (detail: { format: string; data: any[] }) => {},
		onDataChange = (detail: {
			data: any[];
			filters: DataFilter[];
			groupBy: string;
			sortBy: string;
			sortDirection: 'asc' | 'desc';
			search: string;
			page: number;
			pageSize: number;
		}) => {}
	}: {
		data?: any[];
		filters?: DataFilter[];
		groupBy?: string;
		sortBy?: string;
		sortDirection?: 'asc' | 'desc';
		title?: string;
		description?: string;
		onExport?: (detail: { format: string; data: any[] }) => void;
		onDataChange?: (detail: {
			data: any[];
			filters: DataFilter[];
			groupBy: string;
			sortBy: string;
			sortDirection: 'asc' | 'desc';
			search: string;
			page: number;
			pageSize: number;
		}) => void;
	} = $props();

	// Data exploration state
	let search_query = $state('');
	let active_filters = $state([...filters]);
	let show_advanced_controls = $state(false);
	let selected_columns = $state<string[]>([]);
	let group_by_field = $state(groupBy);
	let sort_field = $state(sortBy);
	let sort_direction = $state(sortDirection);
	let page_size = $state(50);
	let current_page = $state(0);

	// Processed data
	const available_fields = $derived(() => detect_fields(data));
	const field_types = $derived(() => detect_field_types(data));
	const processed_data = $derived(() => process_data(data, active_filters, search_query, sort_field, sort_direction));
	const grouped_data = $derived(() => group_by_field ? group_data(processed_data(), group_by_field) : {});
	const data_summary = $derived(() => calculate_summary(processed_data()));
	const paginated_data = $derived(() => paginate_data(processed_data(), current_page, page_size));

	// Aggregation functions
	const aggregation_functions = [
		{ value: 'count', label: 'Count', icon: '#️⃣' },
		{ value: 'sum', label: 'Sum', icon: '➕' },
		{ value: 'avg', label: 'Average', icon: '📊' },
		{ value: 'min', label: 'Minimum', icon: '⬇️' },
		{ value: 'max', label: 'Maximum', icon: '⬆️' },
		{ value: 'median', label: 'Median', icon: '📈' }
	];

	let selected_aggregation = $state('count');

	function detect_fields(raw_data: any[]): string[] {
		if (!raw_data || !raw_data.length) return [];

		const first_item = raw_data[0];
		if (typeof first_item === 'object' && first_item !== null) {
			return Object.keys(first_item);
		}

		return ['value'];
	}

	function detect_field_types(raw_data: any[]): { [key: string]: string } {
		if (!raw_data || !raw_data.length) return {};

		const types: { [key: string]: string } = {};
		const sample_size = Math.min(100, raw_data.length);
		const fields = available_fields();

		fields.forEach((field) => {
			const sample_values = raw_data
				.slice(0, sample_size)
				.map((item) => item[field])
				.filter((v) => v != null);

			if (sample_values.length === 0) {
				types[field] = 'unknown';
				return;
			}

			const numeric_count = sample_values.filter(
				(v) => typeof v === 'number' || !isNaN(Number(v))
			).length;
			const date_count = sample_values.filter((v) => !isNaN(Date.parse(v))).length;
			const boolean_count = sample_values.filter(
				(v) => typeof v === 'boolean' || v === 'true' || v === 'false'
			).length;

			if (numeric_count / sample_values.length > 0.8) {
				types[field] = 'number';
			} else if (date_count / sample_values.length > 0.8) {
				types[field] = 'date';
			} else if (boolean_count / sample_values.length > 0.8) {
				types[field] = 'boolean';
			} else {
				types[field] = 'text';
			}
		});

		return types;
	}

	function process_data(
		raw_data: any[],
		current_filters: DataFilter[],
		search: string,
		sort_by: string,
		direction: 'asc' | 'desc'
	): any[] {
		if (!raw_data) return [];

		let processed = [...raw_data];

		// Apply search filter
		if (search.trim()) {
			const search_lower = search.toLowerCase();
			const fields = available_fields();
			processed = processed.filter((item) => {
				return fields.some((field) => {
					const value = String(item[field] || '').toLowerCase();
					return value.includes(search_lower);
				});
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
					case 'between': {
						if (Array.isArray(filter.value) && filter.value.length === 2) {
							const val = Number(field_value);
							return val >= Number(filter.value[0]) && val <= Number(filter.value[1]);
						}
						return true;
					}
					default:
						return true;
				}
			});
		});

		// Apply sorting
		if (sort_by) {
			const types = field_types();
			processed.sort((a, b) => {
				const a_val = a[sort_by];
				const b_val = b[sort_by];

				let comparison = 0;
				if (types[sort_by] === 'number') {
					comparison = Number(a_val) - Number(b_val);
				} else if (types[sort_by] === 'date') {
					comparison = new Date(a_val).getTime() - new Date(b_val).getTime();
				} else {
					comparison = String(a_val).localeCompare(String(b_val));
				}

				return direction === 'desc' ? -comparison : comparison;
			});
		}

		return processed;
	}

	function group_data(data: any[], group_field: string): { [key: string]: any[] } {
		if (!group_field || !data.length) return {};

		return data.reduce(
			(groups, item) => {
				const key = String(item[group_field] || 'Unknown');
				if (!groups[key]) {
					groups[key] = [];
				}
				groups[key].push(item);
				return groups;
			},
			{} as { [key: string]: any[] }
		);
	}

	function calculate_summary(data: any[]): any {
		if (!data.length) return {};

		const summary: any = {
			total_rows: data.length,
			fields: {}
		};

		const fields = available_fields();
		const types = field_types();

		fields.forEach((field) => {
			const values = data.map((item) => item[field]).filter((v) => v != null);
			const field_summary: any = {
				non_null_count: values.length,
				null_count: data.length - values.length
			};

			if (types[field] === 'number') {
				const numeric_values = values.map((v) => Number(v)).filter((v) => !isNaN(v));
				if (numeric_values.length > 0) {
					field_summary.min = Math.min(...numeric_values);
					field_summary.max = Math.max(...numeric_values);
					field_summary.avg = numeric_values.reduce((a, b) => a + b, 0) / numeric_values.length;
					field_summary.sum = numeric_values.reduce((a, b) => a + b, 0);
				}
			} else {
				const unique_values = [...new Set(values)];
				field_summary.unique_count = unique_values.length;
				field_summary.most_common = find_most_common(values);
			}

			summary.fields[field] = field_summary;
		});

		return summary;
	}

	function find_most_common(values: any[]): { value: any; count: number } | null {
		if (!values.length) return null;

		const counts = values.reduce((acc, val) => {
			acc[val] = (acc[val] || 0) + 1;
			return acc;
		}, {});

		const most_common = Object.entries(counts).reduce((a, b) =>
			counts[a[0]] > counts[b[0]] ? a : b
		);

		return { value: most_common[0], count: most_common[1] as number };
	}

	function paginate_data(data: any[], page: number, size: number): any[] {
		const start = page * size;
		return data.slice(start, start + size);
	}

	function calculate_aggregation(data: any[], field: string, func: string): number {
		const values = data.map((item) => item[field]).filter((v) => v != null);

		switch (func) {
			case 'count':
				return values.length;
			case 'sum':
				return values.reduce((a, b) => Number(a) + Number(b), 0);
			case 'avg':
				return values.length > 0
					? values.reduce((a, b) => Number(a) + Number(b), 0) / values.length
					: 0;
			case 'min':
				return Math.min(...values.map((v) => Number(v)));
			case 'max':
				return Math.max(...values.map((v) => Number(v)));
			case 'median': {
				const sorted = values.map((v) => Number(v)).sort((a, b) => a - b);
				const mid = Math.floor(sorted.length / 2);
				return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
			}
			default:
				return 0;
		}
	}

	// Event handlers
	function handle_search_change(event: Event) {
		const target = event.target as HTMLInputElement;
		search_query = target.value;
		current_page = 0;
		emit_data_change();
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

	function handle_group_change(event: Event) {
		const target = event.target as HTMLSelectElement;
		group_by_field = target.value;
		emit_data_change();
	}

	function add_filter() {
		const fields = available_fields();
		const types = field_types();
		const new_filter: DataFilter = {
			field: fields[0] || 'value',
						type: (types[fields[0]] || 'text') as DataFilter['type'],
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
		group_by_field = '';
		current_page = 0;
		emit_data_change();
	}

	function change_page(new_page: number) {
		current_page = Math.max(
			0,
			Math.min(new_page, Math.ceil(processed_data().length / page_size) - 1)
		);
		emit_data_change();
	}

	export function export_data() {
		const data_to_export = processed_data();
		const csv_content = convert_to_csv(data_to_export);
		const blob = new Blob([csv_content], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `data-export-${Date.now()}.csv`;
		link.click();
		URL.revokeObjectURL(url);

		onExport({ format: 'csv', data: data_to_export });
	}

	function convert_to_csv(data: any[]): string {
		if (!data.length) return '';

		const fields = available_fields();
		const headers = fields.join(',');
		const rows = data.map((item) =>
			fields
				.map((field) => {
					const value = item[field];
					return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
				})
				.join(',')
		);

		return [headers, ...rows].join('\n');
	}

	function emit_data_change() {
		onDataChange({
			data: processed_data(),
			filters: active_filters,
			groupBy: group_by_field,
			sortBy: sort_field,
			sortDirection: sort_direction,
			search: search_query,
			page: current_page,
			pageSize: page_size
		});
	}

	// Emit data changes when processed data changes
	$effect(() => {
		if (processed_data()) {
			emit_data_change();
		}
	});
</script>


<div class="data-explorer">
	<!-- Header Controls -->
	<div class="explorer-header">
		<div class="header-title">
			<h3>{title || 'Data Explorer'}</h3>
			{#if description}
				<p class="description">{description}</p>
			{/if}
			<span class="data-count">{processed_data().length} of {data.length} rows</span>
		</div>

		<div class="header-actions">
			<button
				class="toggle-btn"
				class:active={show_advanced_controls}
				onclick={() => (show_advanced_controls = !show_advanced_controls)}
				type="button"
			>
				⚙️ Advanced
			</button>
			<button class="export-btn" onclick={export_data} type="button"> 💾 Export CSV </button>
			<button
				class="clear-btn"
				onclick={clear_all_filters}
				disabled={!search_query && !sort_field && !group_by_field && active_filters.length === 0}
				type="button"
			>
				🗑️ Clear All
			</button>
		</div>
	</div>

	<!-- Search and Quick Controls -->
	<div class="quick-controls">
		<div class="search-container">
			<input
				type="text"
				placeholder="Search across all fields..."
				bind:value={search_query}
				oninput={handle_search_change}
				class="search-input"
			/>
			<span class="search-icon">🔍</span>
		</div>

		<div class="quick-filters">
			<div class="control-group">
				<label for="group-by-select">Group by:</label>
				<select id="group-by-select" bind:value={group_by_field} onchange={handle_group_change} class="group-select">
					<option value="">No grouping</option>
					{#each available_fields() as field (field)}
						<option value={field}>{field} ({field_types()[field]})</option>
					{/each}
				</select>
			</div>

			<div class="control-group">
				<label for="sort-by-select">Sort by:</label>
				<select
					id="sort-by-select"
					bind:value={sort_field}
					onchange={(e) => {
						sort_field = e.currentTarget.value;
						emit_data_change();
					}}
					class="sort-select"
				>
					<option value="">No sorting</option>
					{#each available_fields() as field (field)}
						<option value={field}>{field}</option>
					{/each}
				</select>
				{#if sort_field}
					<button
						class="sort-direction-btn"
						onclick={() => handle_sort_change(sort_field)}
						title="Toggle sort direction"
						type="button"
					>
						{sort_direction === 'asc' ? '↑' : '↓'}
					</button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Advanced Controls -->
	{#if show_advanced_controls}
		<div class="advanced-controls">
			<div class="filters-section">
				<div class="section-header">
					<h4>Advanced Filters</h4>
					<button class="add-filter-btn" onclick={add_filter} type="button"> + Add Filter </button>
				</div>

				{#each active_filters as filter, index (index)}
					<div class="filter-row" class:inactive={!filter.active}>
						<select
							bind:value={filter.field}
							onchange={(e) =>
								update_filter(index, {
									field: e.currentTarget.value,
									type: field_types()[e.currentTarget.value] as DataFilter['type']
								})}
							class="filter-field-select"
						>
							{#each available_fields() as field (field)}
								<option value={field}>{field} ({field_types()[field]})</option>
							{/each}
						</select>

						<select
							bind:value={filter.operator}
							onchange={(e) => update_filter(index, { operator: e.currentTarget.value as DataFilter['operator'] })}
							class="filter-operator-select"
						>
							<option value="contains">Contains</option>
							<option value="equals">Equals</option>
							{#if field_types()[filter.field] === 'number'}
								<option value="greater">Greater than</option>
								<option value="less">Less than</option>
								<option value="between">Between</option>
							{/if}
						</select>

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
									class="filter-value-input"
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
									class="filter-value-input"
								/>
							</div>
						{:else}
							<input
								type={field_types()[filter.field] === 'number'
									? 'number'
									: field_types()[filter.field] === 'date'
										? 'date'
										: 'text'}
								placeholder="Filter value..."
								bind:value={filter.value}
								oninput={(e) => update_filter(index, { value: e.currentTarget.value })}
								class="filter-value-input"
							/>
						{/if}

						<div class="filter-actions">
							<button
								class="toggle-filter-btn"
								class:active={filter.active}
								onclick={() => toggle_filter(index)}
								title={filter.active ? 'Disable filter' : 'Enable filter'}
								type="button"
							>
								{filter.active ? '✓' : '○'}
							</button>
							<button
								class="remove-filter-btn"
								onclick={() => remove_filter(index)}
								title="Remove filter"
								type="button"
							>
								×
							</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Data Summary -->
			<div class="summary-section">
				<h4>Data Summary</h4>
				<div class="summary-grid">
					{#each available_fields() as field (field)}
						<div class="field-summary">
							<div class="field-header">
								<strong>{field}</strong>
								<span class="field-type">({field_types()[field]})</span>
							</div>
							<div class="field-stats">
								{#if data_summary().fields?.[field]}
									{@const stats = data_summary().fields[field]}
									<div class="stat-item">Non-null: {stats.non_null_count}</div>
									{#if stats.unique_count !== undefined}
										<div class="stat-item">Unique: {stats.unique_count}</div>
									{/if}
									{#if stats.min !== undefined}
										<div class="stat-item">
											Range: {stats.min.toFixed(2)} - {stats.max.toFixed(2)}
										</div>
										<div class="stat-item">Avg: {stats.avg.toFixed(2)}</div>
									{/if}
									{#if stats.most_common}
										<div class="stat-item">
											Most common: {stats.most_common.value} ({stats.most_common.count})
										</div>
									{/if}
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Grouped Data Display -->
	{#if group_by_field && Object.keys(grouped_data()).length > 0}
		<div class="grouped-data">
			<h4>Grouped by {group_by_field}</h4>
			<div class="aggregation-controls">
				<label for="aggregation-select">Aggregation:</label>
				<select id="aggregation-select" bind:value={selected_aggregation} class="aggregation-select">
					{#each aggregation_functions as func (func.value)}
						<option value={func.value}>{func.icon} {func.label}</option>
					{/each}
				</select>
			</div>

			<div class="groups-container">
				{#each Object.entries(grouped_data()) as [group_key, group_items] (group_key)}
					<div class="group-item">
						<div class="group-header">
							<h5>{group_key}</h5>
							<span class="group-count">({group_items.length} items)</span>
						</div>

						{#if selected_aggregation !== 'count'}
							<div class="group-aggregations">
								{#each available_fields().filter((f) => field_types()[f] === 'number') as field (field)}
									<div class="aggregation-result">
										<span class="agg-field">{field}:</span>
										<span class="agg-value"
											>{calculate_aggregation(group_items, field, selected_aggregation).toFixed(
												2
											)}</span
										>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Data Table -->
	<div class="data-table-container">
		<div class="table-header">
			<h4>Data Table</h4>
			<div class="pagination-info">
				Page {current_page + 1} of {Math.ceil(processed_data().length / page_size)}
			</div>
		</div>

		<div class="table-wrapper">
			<table class="data-table">
				<thead>
					<tr>
						{#each available_fields() as field (field)}
							<th
								class="sortable-header"
								class:sorted={sort_field === field}
								onclick={() => handle_sort_change(field)}
							>
								<div class="header-content">
									<span class="field-name">{field}</span>
									<span class="field-type">({field_types()[field]})</span>
									{#if sort_field === field}
										<span class="sort-indicator">{sort_direction === 'asc' ? '↑' : '↓'}</span>
									{/if}
								</div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each paginated_data() as row, index (index)}
						<tr>
							{#each available_fields() as field (field)}
								<td class="data-cell" class:numeric={field_types()[field] === 'number'}>
									{#if field_types()[field] === 'number'}
										{typeof row[field] === 'number' ? row[field].toFixed(2) : row[field]}
									{:else if field_types()[field] === 'date'}
										{row[field] ? new Date(row[field]).toLocaleDateString() : ''}
									{:else}
										{row[field] || ''}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if Math.ceil(processed_data().length / page_size) > 1}
			<div class="pagination">
				<button
					class="page-btn"
					disabled={current_page === 0}
					onclick={() => change_page(current_page - 1)}
					type="button"
				>
					← Previous
				</button>

				<div class="page-numbers">
					{#each Array(Math.min(5, Math.ceil(processed_data().length / page_size))) as _, i (i)}
						{@const page_num = Math.max(0, current_page - 2) + i}
						{#if page_num < Math.ceil(processed_data().length / page_size)}
							<button
								class="page-number-btn"
								class:active={page_num === current_page}
								onclick={() => change_page(page_num)}
								type="button"
							>
								{page_num + 1}
							</button>
						{/if}
					{/each}
				</div>

				<button
					class="page-btn"
					disabled={current_page >= Math.ceil(processed_data().length / page_size) - 1}
					onclick={() => change_page(current_page + 1)}
					type="button"
				>
					Next →
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.data-explorer {
		background: var(--explorer-bg, #ffffff);
		border: 1px solid var(--border-color, #e1e5e9);
		border-radius: 8px;
		padding: 1.5rem;
		font-family:
			system-ui,
			-apple-system,
			sans-serif;
	}

	.explorer-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.header-title h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1.5rem;
		color: var(--text-primary, #1a1a1a);
	}

	.description {
		margin: 0.25rem 0 0.5rem 0;
		font-size: 0.9rem;
		color: var(--text-secondary, #666666);
		line-height: 1.4;
	}

	.data-count {
		font-size: 0.875rem;
		color: var(--text-secondary, #666666);
	}

	.header-actions {
		display: flex;
		gap: 0.75rem;
	}

	.toggle-btn,
	.export-btn,
	.clear-btn {
		padding: 0.5rem 1rem;
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 4px;
		background: var(--button-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s;
	}

	.toggle-btn:hover,
	.export-btn:hover,
	.clear-btn:hover:not(:disabled) {
		background: var(--button-hover-bg, #e9ecef);
	}

	.toggle-btn.active {
		background: var(--button-active-bg, #0066cc);
		color: var(--button-active-text, #ffffff);
		border-color: var(--button-active-border, #0066cc);
	}

	.clear-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.quick-controls {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--controls-bg, #f8f9fa);
		border-radius: 6px;
	}

	.search-container {
		position: relative;
		flex: 1;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 3rem 0.75rem 1rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		font-size: 1rem;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--input-focus-border, #0066cc);
		box-shadow: 0 0 0 2px var(--input-focus-shadow, rgba(0, 102, 204, 0.2));
	}

	.search-icon {
		position: absolute;
		right: 1rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-secondary, #666666);
		pointer-events: none;
	}

	.quick-filters {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
	}

	.control-group {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.control-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
		white-space: nowrap;
	}

	.group-select,
	.sort-select,
	.aggregation-select {
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		font-size: 0.875rem;
		min-width: 150px;
	}

	.sort-direction-btn {
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--button-bg, #ffffff);
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
	}

	.advanced-controls {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--advanced-bg, #f8f9fa);
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h4 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--text-primary, #1a1a1a);
	}

	.add-filter-btn {
		background: var(--button-success-bg, #28a745);
		color: var(--button-success-text, #ffffff);
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		background: var(--filter-row-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 4px;
	}

	.filter-row.inactive {
		opacity: 0.6;
	}

	.filter-field-select,
	.filter-operator-select {
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		font-size: 0.875rem;
		min-width: 120px;
	}

	.filter-value-input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid var(--input-border, #ced4da);
		border-radius: 4px;
		background: var(--input-bg, #ffffff);
		font-size: 0.875rem;
	}

	.range-inputs {
		display: flex;
		gap: 0.5rem;
		flex: 1;
	}

	.filter-actions {
		display: flex;
		gap: 0.25rem;
	}

	.toggle-filter-btn,
	.remove-filter-btn {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
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

	.summary-section {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 1px solid var(--border-light, #e9ecef);
	}

	.summary-section h4 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: var(--text-primary, #1a1a1a);
	}

	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.field-summary {
		padding: 1rem;
		background: var(--summary-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 4px;
	}

	.field-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.field-type {
		font-size: 0.8rem;
		color: var(--text-secondary, #666666);
	}

	.field-stats {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.stat-item {
		font-size: 0.875rem;
		color: var(--text-secondary, #666666);
	}

	.grouped-data {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--grouped-bg, #f8f9fa);
		border-radius: 6px;
		border: 1px solid var(--border-light, #e9ecef);
	}

	.grouped-data h4 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: var(--text-primary, #1a1a1a);
	}

	.aggregation-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.groups-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.group-item {
		padding: 1rem;
		background: var(--group-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 4px;
	}

	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.group-header h5 {
		margin: 0;
		font-size: 1rem;
		color: var(--text-primary, #1a1a1a);
	}

	.group-count {
		font-size: 0.8rem;
		color: var(--text-secondary, #666666);
	}

	.group-aggregations {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.aggregation-result {
		display: flex;
		justify-content: space-between;
		font-size: 0.875rem;
	}

	.agg-field {
		color: var(--text-secondary, #666666);
	}

	.agg-value {
		font-weight: 500;
		color: var(--text-primary, #1a1a1a);
	}

	.data-table-container {
		background: var(--table-bg, #ffffff);
		border: 1px solid var(--border-light, #e9ecef);
		border-radius: 6px;
		overflow: hidden;
	}

	.table-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: var(--table-header-bg, #f8f9fa);
		border-bottom: 1px solid var(--border-light, #e9ecef);
	}

	.table-header h4 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--text-primary, #1a1a1a);
	}

	.pagination-info {
		font-size: 0.875rem;
		color: var(--text-secondary, #666666);
	}

	.table-wrapper {
		overflow-x: auto;
		max-height: 600px;
		overflow-y: auto;
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.sortable-header {
		background: var(--table-header-bg, #f8f9fa);
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--border-light, #e9ecef);
		cursor: pointer;
		user-select: none;
		position: sticky;
		top: 0;
		z-index: 1;
	}

	.sortable-header:hover {
		background: var(--table-header-hover-bg, #e9ecef);
	}

	.sortable-header.sorted {
		background: var(--table-header-sorted-bg, #e3f2fd);
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.field-name {
		font-weight: 600;
		color: var(--text-primary, #1a1a1a);
	}

	.field-type {
		font-size: 0.75rem;
		color: var(--text-secondary, #666666);
	}

	.sort-indicator {
		font-size: 0.8rem;
		color: var(--text-primary, #1a1a1a);
	}

	.data-cell {
		padding: 0.75rem;
		border-bottom: 1px solid var(--border-light, #e9ecef);
		color: var(--text-primary, #1a1a1a);
	}

	.data-cell.numeric {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--pagination-bg, #f8f9fa);
		border-top: 1px solid var(--border-light, #e9ecef);
	}

	.page-btn,
	.page-number-btn {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--border-color, #ced4da);
		border-radius: 4px;
		background: var(--button-bg, #ffffff);
		color: var(--text-primary, #1a1a1a);
		cursor: pointer;
		font-size: 0.875rem;
	}

	.page-btn:hover:not(:disabled),
	.page-number-btn:hover {
		background: var(--button-hover-bg, #e9ecef);
	}

	.page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-number-btn.active {
		background: var(--button-active-bg, #0066cc);
		color: var(--button-active-text, #ffffff);
		border-color: var(--button-active-border, #0066cc);
	}

	.page-numbers {
		display: flex;
		gap: 0.25rem;
	}

	@media (max-width: 768px) {
		.data-explorer {
			padding: 1rem;
		}

		.explorer-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.header-actions {
			justify-content: space-between;
		}

		.quick-filters {
			flex-direction: column;
			gap: 1rem;
		}

		.control-group {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.filter-row {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.filter-actions {
			justify-content: center;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.groups-container {
			grid-template-columns: 1fr;
		}

		.table-header {
			flex-direction: column;
			gap: 0.5rem;
			align-items: stretch;
		}

		.pagination {
			flex-wrap: wrap;
		}
	}
</style>
