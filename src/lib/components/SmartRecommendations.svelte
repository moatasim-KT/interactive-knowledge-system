<script lang="ts">
    import { onMount } from 'svelte';
    import type { ContentModule, ContentRecommendation, RecommendationReason } from '$lib/types/unified';
    import { relationshipService } from '../services/relationshipService.js';
    import { similarityEngine } from '../utils/similarityEngine.js';
    import { difficultyToRank } from '$lib/types/unified';

    function dispatch(name: string, detail: unknown) {
        // @ts-ignore
        dispatchEvent(new CustomEvent(name, { detail }));
    }

	interface Props {
		currentContentId?: string | null;
		modules: ContentModule[];
		completedContent: Set<string>;
		userInterests?: string[];
		learningGoals?: string[];
		maxRecommendations?: number;
		showExplanations?: boolean;
		enableFiltering?: boolean;
		autoRefresh?: boolean;
		refreshInterval?: number;
	}

	let {
		currentContentId = null,
		modules,
		completedContent,
		userInterests = [],
		learningGoals = [],
		maxRecommendations = 10,
		showExplanations = true,
		enableFiltering = true,
		autoRefresh = false,
		refreshInterval = 30000
	}: Props = $props();

	interface RecommendationGroup {
		type: string;
		title: string;
		description: string;
		icon: string;
		recommendations: ContentRecommendation[];
		color: string;
	}

	interface DismissedRecommendation {
		contentId: string;
		reason: string;
		timestamp: Date;
	}

	// State
	let recommendationGroups = $state<RecommendationGroup[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let lastRefresh = $state<Date | null>(null);
	let selectedGroup = $state<string | null>(null);
	let dismissedRecommendations = $state<DismissedRecommendation[]>([]);

	// Filters
	let difficultyFilter = $state<[number, number]>([1, 5]);
	let typeFilter = $state<string[]>([]);
	let minConfidence = $state(0.3);
	let sortBy = $state<'confidence' | 'difficulty' | 'title'>('confidence');
	let sortOrder = $state<'asc' | 'desc'>('desc');

	// Available recommendation types
	const recommendationTypes = [
		{
			type: 'next-in-sequence',
			title: 'Next Steps',
			description: 'Logical next content in your learning path',
			icon: '➡️',
			color: '#3b82f6'
		},
		{
			type: 'related-topic',
			title: 'Related Topics',
			description: 'Content similar to what you\'re currently studying',
			icon: '🔗',
			color: '#8b5cf6'
		},
		{
			type: 'practice',
			title: 'Practice Opportunities',
			description: 'Exercises to reinforce your learning',
			icon: '🎯',
			color: '#f97316'
		},
		{
			type: 'review',
			title: 'Review Suggestions',
			description: 'Previously completed content worth revisiting',
			icon: '🔄',
			color: '#06b6d4'
		},
		{
			type: 'similar-difficulty',
			title: 'Similar Difficulty',
			description: 'Content at your current skill level',
			icon: '⚖️',
			color: '#10b981'
		}
	];

	let refreshTimer: NodeJS.Timeout | null = null;

	$effect(() => {
		(async () => {
			await loadRecommendations();
			loadDismissedRecommendations();
		})();

		let refreshTimer: ReturnType<typeof setInterval> | null = null;
		if (autoRefresh && refreshInterval > 0) {
			refreshTimer = setInterval(loadRecommendations, refreshInterval);
		}

		return () => {
			if (refreshTimer) {
				clearInterval(refreshTimer);
			}
		};
	});

	/**
	 * Load smart recommendations
	 */
	async function loadRecommendations() {
		if (!currentContentId && completedContent.size === 0) {
			// No context for recommendations
			return;
		}

		loading = true;
		error = null;

		try {
			let allRecommendations: ContentRecommendation[] = [];

			if (currentContentId) {
				// Get contextual recommendations based on current content
				const smartSuggestions = await relationshipService.generateSmartSuggestions(
					currentContentId,
					modules,
					completedContent,
					userInterests,
					learningGoals
				);

				allRecommendations = [
					...smartSuggestions.nextSteps,
					...smartSuggestions.relatedContent,
					...smartSuggestions.practiceOpportunities,
					...smartSuggestions.reviewSuggestions
				];
			} else {
				// Generate general recommendations based on completed content
				const userId = 'current-user'; // TODO: Get from user context
				allRecommendations = await similarityEngine.generateRecommendations(
					userId,
					completedContent,
					null,
					modules,
					maxRecommendations
				);
			}

			// Filter out dismissed recommendations
			const dismissedIds = new Set(dismissedRecommendations.map(d => d.contentId));
			allRecommendations = allRecommendations.filter(rec =>
				!dismissedIds.has(rec.contentId)
			);

			// Group recommendations by type
			recommendationGroups = groupRecommendations(allRecommendations);
			lastRefresh = new Date();

		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load recommendations';
			console.error('Recommendation loading error:', err);
		} finally {
			loading = false;
		}
	}

	/**
	 * Group recommendations by type
	 */
	function groupRecommendations(recommendations: ContentRecommendation[]): RecommendationGroup[] {
		const groups = new Map<string, ContentRecommendation[]>();

		// Group by type
		recommendations.forEach(rec => {
			if (!groups.has(rec.type)) {
				groups.set(rec.type, []);
			}
			groups.get(rec.type)!.push(rec);
		});

		// Convert to RecommendationGroup objects
		return Array.from(groups.entries()).map(([type, recs]) => {
			const typeInfo = recommendationTypes.find(t => t.type === type);
			return {
				type,
				title: typeInfo?.title || type,
				description: typeInfo?.description || '',
				icon: typeInfo?.icon || '📚',
				color: typeInfo?.color || '#6b7280',
				recommendations: applySorting(applyFilters(recs))
			};
		}).filter(group => group.recommendations.length > 0);
	}

	/**
	 * Apply current filters to recommendations
	 */
	function applyFilters(recommendations: ContentRecommendation[]): ContentRecommendation[] {
		return recommendations.filter(rec => {
			const module = modules.find(m => m.id === rec.contentId);
			if (!module) return false;

			// Difficulty filter
            if (difficultyToRank(module.metadata.difficulty) < difficultyFilter[0] ||
                difficultyToRank(module.metadata.difficulty) > difficultyFilter[1]) {
				return false;
			}

			// Type filter
			if (typeFilter.length > 0 && !typeFilter.includes(rec.type)) {
				return false;
			}

			// Confidence filter
			if (rec.score < minConfidence) {
				return false;
			}

			return true;
		});
	}

	/**
	 * Apply current sorting to recommendations
	 */
	function applySorting(recommendations: ContentRecommendation[]): ContentRecommendation[] {
		return [...recommendations].sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case 'confidence':
					comparison = a.score - b.score;
					break;
				case 'difficulty':
					const moduleA = modules.find(m => m.id === a.contentId);
					const moduleB = modules.find(m => m.id === b.contentId);
                    comparison = (moduleA && moduleA.metadata.difficulty ? difficultyToRank(moduleA.metadata.difficulty) : 0) - (moduleB && moduleB.metadata.difficulty ? difficultyToRank(moduleB.metadata.difficulty) : 0);
					break;
				case 'title':
					const titleA = modules.find(m => m.id === a.contentId)?.title || '';
					const titleB = modules.find(m => m.id === b.contentId)?.title || '';
					comparison = titleA.localeCompare(titleB);
					break;
			}

			return sortOrder === 'desc' ? -comparison : comparison;
		});
	}

	/**
	 * Handle recommendation acceptance
	 */
	function acceptRecommendation(recommendation: ContentRecommendation) {
		dispatch('accept', { recommendation });
	}

	/**
	 * Handle recommendation dismissal
	 */
	function dismissRecommendation(recommendation: ContentRecommendation, reason: string = 'not-interested') {
		const dismissal: DismissedRecommendation = {
			contentId: recommendation.contentId,
			reason,
			timestamp: new Date()
		};

		dismissedRecommendations = [...dismissedRecommendations, dismissal];
		saveDismissedRecommendations();

		// Refresh recommendations to remove dismissed item
		loadRecommendations();

		dispatch('dismiss', { recommendation, reason });
	}

	/**
	 * Get more information about a recommendation
	 */
	function getRecommendationDetails(recommendation: ContentRecommendation) {
		dispatch('details', { recommendation });
	}

	/**
	 * Save dismissed recommendations to localStorage
	 */
	function saveDismissedRecommendations() {
		try {
			const data = {
				dismissed: dismissedRecommendations,
				timestamp: new Date().toISOString()
			};
			localStorage.setItem('smart-recommendations-dismissed', JSON.stringify(data));
		} catch (error) {
			console.warn('Failed to save dismissed recommendations:', error);
		}
	}

	/**
	 * Load dismissed recommendations from localStorage
	 */
	function loadDismissedRecommendations() {
		try {
			const stored = localStorage.getItem('smart-recommendations-dismissed');
			if (stored) {
				const data = JSON.parse(stored);
				// Only keep dismissals from the last 7 days
				const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
				dismissedRecommendations = data.dismissed.filter((d: DismissedRecommendation) =>
					new Date(d.timestamp) > weekAgo
				);
			}
		} catch (error) {
			console.warn('Failed to load dismissed recommendations:', error);
		}
	}

	/**
	 * Clear all dismissed recommendations
	 */
	function clearDismissed() {
		dismissedRecommendations = [];
		saveDismissedRecommendations();
		loadRecommendations();
	}

	/**
	 * Get module information
	 */
	function getModuleInfo(contentId: string): ContentModule | undefined {
		return modules.find(m => m.id === contentId);
	}

	/**
	 * Format confidence score as percentage
	 */
	function formatConfidence(score: number): string {
		return Math.round(score * 100) + '%';
	}

	/**
	 * Get reason description
	 */
	function getReasonDescription(reason: RecommendationReason): string {
		const descriptions: Record<string, string> = {
			'prerequisite-completed': 'You\'ve completed the prerequisites',
			'similar-content': 'Similar to your current interests',
			'user-interest': 'Matches your learning goals',
			'difficulty-match': 'Appropriate for your skill level',
			'topic-continuation': 'Continues your current topic'
		};

		return descriptions[reason.type] || reason.description;
	}

	// Reactive updates
	$effect(() => {
		// Re-group and re-filter when filters change
		if (recommendationGroups.length > 0) {
			recommendationGroups = recommendationGroups.map(group => ({
				...group,
				recommendations: applySorting(applyFilters(group.recommendations))
			}));
		}
	});

	$effect(() => {
		if (currentContentId) {
			loadRecommendations();
		}
	});
</script>

<div class="smart-recommendations">
	<!-- Header -->
	<div class="header">
		<div class="title-section">
			<h3>Smart Recommendations</h3>
			{#if lastRefresh}
				<div class="last-refresh">
					Last updated: {lastRefresh.toLocaleTimeString()}
				</div>
			{/if}
		</div>

		<div class="header-actions">
			<button
				class="btn btn-secondary refresh-btn"
				onclick={() => loadRecommendations()}
				disabled={loading}
			>
				{loading ? '⏳' : '🔄'} Refresh
			</button>

			{#if dismissedRecommendations.length > 0}
				<button
					class="btn btn-secondary"
					onclick={clearDismissed}
					title="Clear dismissed recommendations"
				>
					Clear Dismissed ({dismissedRecommendations.length})
				</button>
			{/if}
		</div>
	</div>

	<!-- Loading State -->
	{#if loading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Finding personalized recommendations...</p>
		</div>
	{/if}

	<!-- Error State -->
	{#if error}
		<div class="error">
			<p>{error}</p>
			<button class="btn btn-primary" onclick={() => loadRecommendations()}>
				Try Again
			</button>
		</div>
	{/if}

	<!-- Filters -->
	{#if enableFiltering && !loading && !error && recommendationGroups.length > 0}
		<div class="filters">
			<div class="filter-group">
				<label for="difficulty-range-min">Difficulty Range:</label>
				<input
					id="difficulty-range-min"
					type="range"
					min="1"
					max="5"
					bind:value={difficultyFilter[0]}
					class="range-input"
				/>
				<span>{difficultyFilter[0]} - {difficultyFilter[1]}</span>
				<input
					id="difficulty-range-max"
					type="range"
					min="1"
					max="5"
					bind:value={difficultyFilter[1]}
					class="range-input"
				/>
			</div>

			<div class="filter-group">
				<label for="min-confidence">Min Confidence:</label>
				<input
					id="min-confidence"
					type="range"
					min="0"
					max="1"
					step="0.1"
					bind:value={minConfidence}
				/>
				<span>{formatConfidence(minConfidence)}</span>
			</div>

			<div class="filter-group">
				<label for="sort-by">Sort by:</label>
				<select id="sort-by" bind:value={sortBy}>
					<option value="confidence">Confidence</option>
                    <option value="difficulty">Difficulty</option>
					<option value="title">Title</option>
				</select>
				<select bind:value={sortOrder}>
					<option value="desc">Descending</option>
					<option value="asc">Ascending</option>
				</select>
			</div>

			<div class="filter-group">
				<div class="filter-label" id="types-label">Types:</div>
				<div class="type-filters" role="group" aria-labelledby="types-label">
					{#each recommendationTypes as type}
						<label class="type-filter">
							<input
								type="checkbox"
								checked={typeFilter.includes(type.type)}
								onchange={(e) => {
									if (e.currentTarget.checked) {
										typeFilter = [...typeFilter, type.type];
									} else {
										typeFilter = typeFilter.filter(t => t !== type.type);
									}
								}}
							/>
							<span style="color: {type.color}">{type.icon}</span>
							{type.title}
						</label>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Recommendations -->
	{#if !loading && !error}
		{#if recommendationGroups.length === 0}
			<div class="empty-state">
				<div class="empty-icon">🎯</div>
				<h4>No Recommendations Available</h4>
				<p>Complete some content or set learning goals to get personalized recommendations.</p>
			</div>
		{:else}
			<div class="recommendation-groups">
				{#each recommendationGroups as group (group.type)}
					{#if group.recommendations.length > 0}
						<div class="recommendation-group">
							<button
								type="button"
								class="group-header"
								onclick={() => selectedGroup = selectedGroup === group.type ? null : group.type}
								onkeydown={(e) => e.key === 'Enter' && (selectedGroup = selectedGroup === group.type ? null : group.type)}
							>
								<div class="group-info">
									<span class="group-icon" style="color: {group.color}">{group.icon}</span>
									<div>
										<h4 class="group-title">{group.title}</h4>
										<p class="group-description">{group.description}</p>
									</div>
								</div>
								<div class="group-meta">
									<span class="count">{group.recommendations.length}</span>
									<span class="expand-icon">
										{selectedGroup === group.type ? '▼' : '▶'}
									</span>
								</div>
							</button>

							{#if selectedGroup === group.type || selectedGroup === null}
								<div class="recommendations-list">
									{#each group.recommendations as recommendation (recommendation.contentId)}
										{@const module = getModuleInfo(recommendation.contentId)}
										{#if module}
											<div class="recommendation-card">
												<div class="card-main">
													<div class="content-info">
														<h5 class="content-title">{module.title}</h5>
														<p class="content-description">{module.description}</p>
														<div class="content-meta">
															<span class="difficulty">
                                                                Difficulty: {module.metadata.difficulty}
															</span>
															<span class="time">
																⏱️ {module.metadata.estimatedTime}min
															</span>
															<span class="tags">
																{module.metadata.tags.slice(0, 3).join(', ')}
															</span>
														</div>
													</div>

													<div class="recommendation-score">
														<div class="confidence-bar">
															<div
																class="confidence-fill"
																style="width: {recommendation.score * 100}%; background-color: {group.color};"
															></div>
														</div>
														<span class="confidence-text">
															{formatConfidence(recommendation.score)}
														</span>
													</div>
												</div>

												{#if showExplanations && recommendation.reasons.length > 0}
													<div class="explanation">
														<div class="reasons">
															{#each recommendation.reasons.slice(0, 2) as reason}
																<div class="reason">
																	<span class="reason-text">
																		{getReasonDescription(reason)}
																	</span>
																	<span class="reason-weight">
																		{Math.round(reason.weight * 100)}%
																	</span>
																</div>
															{/each}
														</div>
													</div>
												{/if}

												<div class="card-actions">
													<button
														class="btn btn-primary action-btn"
														onclick={() => acceptRecommendation(recommendation)}
													>
														View Content
													</button>
													<button
														class="btn btn-secondary action-btn"
														onclick={() => getRecommendationDetails(recommendation)}
													>
														Details
													</button>
													<button
														class="btn btn-ghost action-btn dismiss-btn"
														onclick={() => dismissRecommendation(recommendation)}
														title="Not interested"
													>
														✕
													</button>
												</div>
											</div>
										{/if}
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.smart-recommendations {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 20px;
		font-family: system-ui, -apple-system, sans-serif;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid #e5e7eb;
	}

	.title-section h3 {
		margin: 0 0 4px 0;
		color: #1f2937;
		font-size: 18px;
		font-weight: 600;
	}

	.last-refresh {
		font-size: 12px;
		color: #6b7280;
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}

	.loading, .error {
		text-align: center;
		padding: 40px;
	}

	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 16px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.filters {
		background: #f9fafb;
		padding: 16px;
		border-radius: 6px;
		margin-bottom: 20px;
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		align-items: center;
	}

	.filter-group {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
	}

	.filter-group label {
		font-weight: 500;
		color: #374151;
		white-space: nowrap;
	}

	.filter-group select,
	.filter-group input[type="range"] {
		padding: 4px 8px;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 12px;
	}

	.range-input {
		width: 60px;
	}

	.type-filters {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
	}

	.type-filter {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		cursor: pointer;
	}

	.empty-state {
		text-align: center;
		padding: 40px;
		color: #6b7280;
	}

	.empty-icon {
		font-size: 48px;
		margin-bottom: 16px;
	}

	.empty-state h4 {
		margin: 0 0 8px 0;
		color: #374151;
	}

	.recommendation-groups {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.recommendation-group {
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		overflow: hidden;
	}

	.group-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.group-header:hover {
		background: #f3f4f6;
	}

	.group-info {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.group-icon {
		font-size: 20px;
	}

	.group-title {
		margin: 0 0 2px 0;
		font-size: 14px;
		font-weight: 600;
		color: #1f2937;
	}

	.group-description {
		margin: 0;
		font-size: 12px;
		color: #6b7280;
	}

	.group-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: #6b7280;
	}

	.count {
		background: #e5e7eb;
		color: #374151;
		padding: 2px 6px;
		border-radius: 12px;
		font-weight: 500;
	}

	.recommendations-list {
		display: flex;
		flex-direction: column;
		gap: 1px;
		background: #f3f4f6;
	}

	.recommendation-card {
		background: white;
		padding: 16px;
		transition: all 0.2s ease;
	}

	.recommendation-card:hover {
		background: #f9fafb;
	}

	.card-main {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 12px;
		gap: 16px;
	}

	.content-info {
		flex: 1;
		min-width: 0;
	}

	.content-title {
		margin: 0 0 4px 0;
		font-size: 15px;
		font-weight: 600;
		color: #1f2937;
	}

	.content-description {
		margin: 0 0 8px 0;
		font-size: 13px;
		color: #6b7280;
		line-height: 1.4;
	}

	.content-meta {
		display: flex;
		gap: 12px;
		font-size: 11px;
		color: #9ca3af;
		flex-wrap: wrap;
	}

	.recommendation-score {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
		min-width: 80px;
	}

	.confidence-bar {
		width: 60px;
		height: 6px;
		background: #e5e7eb;
		border-radius: 3px;
		overflow: hidden;
	}

	.confidence-fill {
		height: 100%;
		transition: width 0.3s ease;
	}

	.confidence-text {
		font-size: 12px;
		font-weight: 500;
		color: #374151;
	}

	.explanation {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 8px 12px;
		margin-bottom: 12px;
	}

	.reasons {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.reason {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 11px;
	}

	.reason-text {
		color: #374151;
	}

	.reason-weight {
		color: #6b7280;
		font-weight: 500;
	}

	.card-actions {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.action-btn {
		padding: 6px 12px;
		font-size: 12px;
	}

	.dismiss-btn {
		margin-left: auto;
		width: 28px;
		height: 28px;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		color: #6b7280;
	}

	.dismiss-btn:hover {
		background: #fee2e2;
		color: #dc2626;
	}

	.btn {
		border: none;
		border-radius: 4px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: #2563eb;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #4b5563;
	}

	.btn-ghost {
		background: transparent;
		color: #6b7280;
		border: 1px solid #d1d5db;
	}

	.btn-ghost:hover:not(:disabled) {
		background: #f3f4f6;
		color: #374151;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.header {
			flex-direction: column;
			gap: 12px;
			align-items: stretch;
		}

		.filters {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}

		.filter-group {
			flex-direction: column;
			align-items: flex-start;
			gap: 4px;
		}

		.type-filters {
			flex-direction: column;
		}

		.card-main {
			flex-direction: column;
			gap: 8px;
		}

		.recommendation-score {
			align-items: flex-start;
		}

		.content-meta {
			flex-direction: column;
			gap: 4px;
		}

		.card-actions {
			flex-wrap: wrap;
		}
	}
</style>
