<script lang="ts">
	import { appState, actions } from '../stores/appState.svelte.js';
	import { searchEngine, type SearchFilters } from '../utils/searchEngine.js';
	import { contentStorage } from '../storage/contentStorage.js';
	import type { SearchResult } from '../types/interactive.js';

	// Props
	interface Props {
		placeholder?: string;
		showFilters?: boolean;
		maxResults?: number;
		onResultSelect?: (result: SearchResult) => void;
	}

	let { placeholder = 'Search knowledge base...', showFilters = true, maxResults = 20, onResultSelect = () => {} }: Props = $props();

	// Component state
	let search_input = $state('');
	let is_searching = $state(false);
	let show_suggestions = $state(false);
	let suggestions = $state<string[]>([]);
	let search_results = $state<SearchResult[]>([]);
	let show_results = $state(false);
	let filters_open = $state(false);

	// Filter state
	let filters = $state<SearchFilters>({
		contentTypes: [],
		tags: [],
		difficulty: [],
		minRelevance: 0
	});

	// Available filter options
	let available_tags = $state<string[]>([]);
	let available_authors = $state<string[]>([]);
	let available_content_types = $state<string[]>(['module', 'lesson', 'folder']);

	// Debounce timer
	let debounce_timer: number | null = null;

	/**
	 * Initialize search engine with existing content
	 */
	async function initialize_search_engine() {
		try {
			// Load and index all modules
			const modules = await contentStorage.getAllModules();
			for (const module of modules) {
				searchEngine.indexModule(module);
			}

			// Index knowledge nodes
			for (const node of appState.content.nodes.values()) {
				searchEngine.indexNode(node);
			}

			// Extract available filter options
			const tags: string[] = [];
			const authors: string[] = [];

			for (const module of modules) {
				module.metadata.tags.forEach((tag) => {
					if (!tags.includes(tag)) tags.push(tag);
				});
				if (!authors.includes(module.metadata.author)) {
					authors.push(module.metadata.author);
				}
			}

			for (const node of appState.content.nodes.values()) {
				node.metadata.tags.forEach((tag) => {
					if (!tags.includes(tag)) tags.push(tag);
				});
			}

			available_tags = tags.sort();
			available_authors = authors.sort();
		} catch (error) {
			// Failed to initialize search engine
		}
	}

	/**
	 * Perform search with current query and filters
	 */
	async function perform_search() {
		if (!search_input.trim()) {
			search_results = [];
			show_results = false;
			return;
		}

		is_searching = true;
		show_suggestions = false;

		try {
			// Get modules for search
			const all_modules = await contentStorage.getAllModules();
			const modules_map = new Map<string, any>();
			for (const module of all_modules) {
				modules_map.set(module.id, module);
			}

			// Perform search
			const results = searchEngine.search(
				search_input,
				modules_map,
				appState.content.nodes,
				filters,
				maxResults
			);

			search_results = results;
			show_results = true;

			// Update app state
			actions.setSearchQuery(search_input);
			actions.setSearchResults(results);
		} catch (error) {
			// Search failed
			search_results = [];
		} finally {
			is_searching = false;
		}
	}

	/**
	 * Get search suggestions
	 */
	function get_suggestions() {
		if (search_input.length < 2) {
			suggestions = [];
			show_suggestions = false;
			return;
		}

		suggestions = searchEngine.getSuggestions(search_input, 5);
		show_suggestions = suggestions.length > 0;
	}

	/**
	 * Handle input changes with debouncing
	 */
	function handle_input() {
		if (debounce_timer) {
			clearTimeout(debounce_timer);
		}

		// Get suggestions immediately
		get_suggestions();

		// Debounce search
		debounce_timer = setTimeout(() => {
			perform_search();
		}, 300) as unknown as number;
	}

	/**
	 * Handle suggestion selection
	 */
	function select_suggestion(suggestion: string) {
		search_input = suggestion;
		show_suggestions = false;
		perform_search();
	}

	/**
	 * Handle result selection
	 */
	function select_result(result: SearchResult) {
		show_results = false;
		show_suggestions = false;

		onResultSelect(result);

		// Navigate to the selected content
		const node = appState.content.nodes.get(result.id);
		if (node) {
			actions.setCurrentNode(node);
		}
	}

	/**
	 * Clear search
	 */
	function clear_search() {
		search_input = '';
		search_results = [];
		suggestions = [];
		show_results = false;
		show_suggestions = false;
		actions.setSearchQuery('');
		actions.setSearchResults([]);
	}

	/**
	 * Toggle filter panel
	 */
	function toggle_filters() {
		filters_open = !filters_open;
	}

	/**
	 * Apply filters and re-search
	 */
	function apply_filters() {
		if (search_input.trim()) {
			perform_search();
		}
	}

	/**
	 * Clear all filters
	 */
	function clear_filters() {
		filters = {
			contentTypes: [],
			tags: [],
			difficulty: [],
			minRelevance: 0
		};
		apply_filters();
	}

	/**
	 * Handle clicks outside to close dropdowns
	 */
	function handle_click_outside(event: MouseEvent) {
		const target = event.target as Element;
		if (!target.closest('.search-container')) {
			show_suggestions = false;
			show_results = false;
		}
	}

	// Initialize on mount
	$effect(() => {
		initialize_search_engine();
		document.addEventListener('click', handle_click_outside);

		return () => {
			document.removeEventListener('click', handle_click_outside);
			if (debounce_timer) {
				clearTimeout(debounce_timer);
			}
		};
	});

	// Sync with app state search query
	$effect(() => {
		if (appState.content.searchQuery !== search_input) {
			search_input = appState.content.searchQuery;
			if (search_input) {
				perform_search();
			}
		}
	});
</script>

<div class="search-container">
	<!-- Search Input -->
	<div class="search-input-container">
		<div class="search-input-wrapper">
			<input
				type="text"
				bind:value={search_input}
				oninput={handle_input}
				onfocus={() => {
					if (search_input.length >= 2) {
						get_suggestions();
					}
				}}
				{placeholder}
				class="search-input"
				class:has-value={search_input.length > 0}
			/>

			<div class="search-actions">
				{#if is_searching}
					<div class="search-spinner" aria-label="Searching...">⟳</div>
				{:else if search_input.length > 0}
					<button onclick={clear_search} class="clear-button" aria-label="Clear search"> ✕ </button>
				{/if}

				{#if showFilters}
					<button
						onclick={toggle_filters}
						class="filter-button"
						class:active={filters_open}
						aria-label="Toggle filters"
					>
						⚙
					</button>
				{/if}
			</div>
		</div>

		<!-- Search Suggestions -->
		{#if show_suggestions && suggestions.length > 0}
			<div class="suggestions-dropdown">
				{#each suggestions as suggestion (suggestion)}
					<button onclick={() => select_suggestion(suggestion)} class="suggestion-item">
						<span class="suggestion-icon">🔍</span>
						{suggestion}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Search Results -->
		{#if show_results && search_results.length > 0}
			<div class="results-dropdown">
				<div class="results-header">
					<span class="results-count">
						{search_results.length} result{search_results.length !== 1 ? 's' : ''}
					</span>
				</div>

				{#each search_results as result (result.id)}
					<button onclick={() => select_result(result)} class="result-item">
						<div class="result-header">
							<span class="result-title">{result.title}</span>
							<span class="result-type">{result.type}</span>
						</div>

						{#if result.snippet}
							<div class="result-snippet">{result.snippet}</div>
						{/if}

						{#if result.tags.length > 0}
							<div class="result-tags">
								{#each result.tags.slice(0, 3) as tag (tag)}
									<span class="result-tag">{tag}</span>
								{/each}
								{#if result.tags.length > 3}
									<span class="result-tag-more">+{result.tags.length - 3}</span>
								{/if}
							</div>
						{/if}

						<div class="result-relevance">
							Relevance: {Math.round(result.relevance)}
						</div>
					</button>
				{/each}
			</div>
		{:else if show_results && search_results.length === 0 && search_input.trim()}
			<div class="no-results">
				<div class="no-results-icon">🔍</div>
				<div class="no-results-text">No results found for "{search_input}"</div>
				<button onclick={clear_filters} class="clear-filters-btn"> Clear filters </button>
			</div>
		{/if}
	</div>

	<!-- Filter Panel -->
	{#if showFilters && filters_open}
		<div class="filters-panel">
			<div class="filters-header">
				<h3>Search Filters</h3>
				<button onclick={clear_filters} class="clear-filters-btn"> Clear All </button>
			</div>

			<!-- Content Type Filter -->
			<div class="filter-group">
				<fieldset>
					<legend class="filter-label">Content Types</legend>
					<div class="filter-options">
						{#each available_content_types as type (type)}
							<label class="filter-checkbox">
								<input
									type="checkbox"
									bind:group={filters.contentTypes}
									value={type}
									onchange={apply_filters}
								/>
								{type}
							</label>
						{/each}
					</div>
				</fieldset>
			</div>

			<!-- Tags Filter -->
			{#if available_tags.length > 0}
				<div class="filter-group">
					<fieldset>
						<legend class="filter-label">Tags</legend>
						<div class="filter-options">
							{#each available_tags.slice(0, 10) as tag (tag)}
								<label class="filter-checkbox">
									<input
										type="checkbox"
										bind:group={filters.tags}
										value={tag}
										onchange={apply_filters}
									/>
									{tag}
								</label>
							{/each}
						</div>
					</fieldset>
				</div>
			{/if}

			<!-- Difficulty Filter -->
			<div class="filter-group">
				<fieldset>
					<legend class="filter-label">Difficulty</legend>
					<div class="filter-options">
						{#each [1, 2, 3, 4, 5] as difficulty (difficulty)}
							<label class="filter-checkbox">
								<input
									id="difficulty-filter-{difficulty}"
									type="checkbox"
									bind:group={filters.difficulty}
									value={difficulty}
									onchange={apply_filters}
								/>
								Level {difficulty}
							</label>
						{/each}
					</div>
				</fieldset>
			</div>

			<!-- Minimum Relevance Filter -->
			<div class="filter-group">
				<label class="filter-label" for="min-relevance-filter">
					Minimum Relevance: {filters.minRelevance}
				</label>
				<input
					id="min-relevance-filter"
					type="range"
					min="0"
					max="100"
					bind:value={filters.minRelevance}
					onchange={apply_filters}
					class="relevance-slider"
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	.search-container {
		position: relative;
		width: 100%;
		max-width: 600px;
	}

	.search-input-container {
		position: relative;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 3rem 0.75rem 1rem;
		border: 2px solid var(--border-color, #e0e0e0);
		border-radius: 8px;
		font-size: 1rem;
		background: var(--bg-color, white);
		color: var(--text-color, #333);
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary-color, #007bff);
		box-shadow: 0 0 0 3px var(--primary-color-alpha, rgba(0, 123, 255, 0.1));
	}

	.search-input.has-value {
		border-color: var(--primary-color, #007bff);
	}

	.search-actions {
		position: absolute;
		right: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.search-spinner {
		animation: spin 1s linear infinite;
		font-size: 1.2rem;
		color: var(--primary-color, #007bff);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.clear-button,
	.filter-button {
		padding: 0.25rem;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 4px;
		color: var(--text-secondary, #666);
		font-size: 1rem;
		transition: all 0.2s ease;
	}

	.clear-button:hover,
	.filter-button:hover {
		background: var(--hover-bg, #f0f0f0);
		color: var(--text-color, #333);
	}

	.filter-button.active {
		background: var(--primary-color, #007bff);
		color: white;
	}

	.suggestions-dropdown,
	.results-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-color, white);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 8px;
		box-shadow: 0 4px 12px var(--shadow-color, rgba(0, 0, 0, 0.1));
		z-index: 1000;
		max-height: 400px;
		overflow-y: auto;
		margin-top: 0.25rem;
	}

	.suggestion-item,
	.result-item {
		width: 100%;
		padding: 0.75rem 1rem;
		border: none;
		background: none;
		text-align: left;
		cursor: pointer;
		border-bottom: 1px solid var(--border-light, #f0f0f0);
		transition: background-color 0.2s ease;
	}

	.suggestion-item:hover,
	.result-item:hover {
		background: var(--hover-bg, #f8f9fa);
	}

	.suggestion-item:last-child,
	.result-item:last-child {
		border-bottom: none;
	}

	.suggestion-icon {
		margin-right: 0.5rem;
		opacity: 0.6;
	}

	.results-header {
		padding: 0.5rem 1rem;
		background: var(--bg-secondary, #f8f9fa);
		border-bottom: 1px solid var(--border-color, #e0e0e0);
		font-size: 0.875rem;
		color: var(--text-secondary, #666);
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.25rem;
	}

	.result-title {
		font-weight: 600;
		color: var(--text-color, #333);
	}

	.result-type {
		font-size: 0.75rem;
		padding: 0.125rem 0.5rem;
		background: var(--primary-color-light, #e3f2fd);
		color: var(--primary-color, #007bff);
		border-radius: 12px;
		text-transform: capitalize;
	}

	.result-snippet {
		font-size: 0.875rem;
		color: var(--text-secondary, #666);
		margin-bottom: 0.5rem;
		line-height: 1.4;
	}

	.result-tags {
		display: flex;
		gap: 0.25rem;
		margin-bottom: 0.25rem;
		flex-wrap: wrap;
	}

	.result-tag {
		font-size: 0.75rem;
		padding: 0.125rem 0.375rem;
		background: var(--tag-bg, #f0f0f0);
		color: var(--tag-color, #666);
		border-radius: 8px;
	}

	.result-tag-more {
		font-size: 0.75rem;
		color: var(--text-secondary, #666);
	}

	.result-relevance {
		font-size: 0.75rem;
		color: var(--text-secondary, #666);
		opacity: 0.8;
	}

	.no-results {
		padding: 2rem 1rem;
		text-align: center;
		color: var(--text-secondary, #666);
	}

	.no-results-icon {
		font-size: 2rem;
		margin-bottom: 0.5rem;
		opacity: 0.5;
	}

	.no-results-text {
		margin-bottom: 1rem;
	}

	.filters-panel {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: var(--bg-color, white);
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 8px;
		box-shadow: 0 4px 12px var(--shadow-color, rgba(0, 0, 0, 0.1));
		z-index: 999;
		margin-top: 0.25rem;
		padding: 1rem;
		max-height: 400px;
		overflow-y: auto;
	}

	.filters-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-light, #f0f0f0);
	}

	.filters-header h3 {
		margin: 0;
		font-size: 1rem;
		color: var(--text-color, #333);
	}

	.clear-filters-btn {
		padding: 0.25rem 0.75rem;
		border: 1px solid var(--border-color, #e0e0e0);
		background: var(--bg-color, white);
		color: var(--text-secondary, #666);
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.clear-filters-btn:hover {
		background: var(--hover-bg, #f8f9fa);
		border-color: var(--primary-color, #007bff);
		color: var(--primary-color, #007bff);
	}

	.filter-group {
		margin-bottom: 1rem;
	}

	.filter-label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: var(--text-color, #333);
		font-size: 0.875rem;
	}

	.filter-options {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.filter-checkbox {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-secondary, #666);
		cursor: pointer;
	}

	.filter-checkbox input[type='checkbox'] {
		margin: 0;
	}

	.relevance-slider {
		width: 100%;
		margin-top: 0.5rem;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.search-container {
			max-width: 100%;
		}

		.filters-panel {
			position: fixed;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			width: 90vw;
			max-width: 400px;
			max-height: 80vh;
		}

		.result-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}
	}
</style>
