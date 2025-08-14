<script lang="ts">
	import { webContentState, webContentActions } from '$lib/stores/webContentState.svelte.ts';
	import { interactiveAnalyzer } from '$lib/services/interactiveAnalyzer.ts';
	import { createLogger } from '$lib/utils/logger.ts';
	import { Button, Card, LoadingSpinner, Badge } from '$lib/components/ui/index.ts';

	const logger = createLogger('web-content-analyzer');

	// Component props
	interface Props {
		contentId?: string;
		autoAnalyze?: boolean;
	}

	let { contentId, autoAnalyze = false }: Props = $props();

	// Component state
	let selected_content = $state<any>(null);
	let analysis_results = $state<any>(null);
	let is_analyzing = $state(false);
	let selected_opportunities = $state<string[]>([]);

	// Get current content
	$effect(() => {
		if (contentId) {
			selected_content = webContentState.content.items[contentId];
		} else {
			selected_content = webContentState.content.currentContent;
		}

		if (selected_content && autoAnalyze && !analysis_results) {
			analyze_content();
		}
	});

	// Analyze content for interactive opportunities
	async function analyze_content() {
		if (!selected_content) {
			webContentActions.addNotification({
				type: 'warning',
				message: 'No content selected for analysis'
			});
			return;
		}

		is_analyzing = true;
		webContentActions.setTransformationAnalyzing(true);

		try {
			logger.info(`Analyzing content: ${selected_content.id}`);

			const analysis = await interactiveAnalyzer.analyzeContent(selected_content.id);
			
			analysis_results = {
				contentId: selected_content.id,
				opportunities: analysis.opportunities,
				analyzedAt: new Date(),
				stats: {
					totalOpportunities: analysis.opportunities.length,
					highConfidence: analysis.opportunities.filter((op: any) => op.confidence > 0.8).length,
					mediumConfidence: analysis.opportunities.filter((op: any) => op.confidence > 0.5 && op.confidence <= 0.8).length,
					lowConfidence: analysis.opportunities.filter((op: any) => op.confidence <= 0.5).length
				}
			};

			webContentActions.setTransformationOpportunities(analysis.opportunities);

			webContentActions.addNotification({
				type: 'success',
				message: `Found ${analysis.opportunities.length} interactive opportunities`
			});

		} catch (error) {
			logger.error('Content analysis failed:', error);
			
			webContentActions.addNotification({
				type: 'error',
				message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		} finally {
			is_analyzing = false;
			webContentActions.setTransformationAnalyzing(false);
		}
	}

	// Transform selected opportunities
	async function transform_opportunities() {
		if (selected_opportunities.length === 0) {
			webContentActions.addNotification({
				type: 'warning',
				message: 'Please select opportunities to transform'
			});
			return;
		}

		const opportunities = selected_opportunities
			.map(id => analysis_results.opportunities.find((op: any) => op.id === id))
			.filter(Boolean);

		try {
			logger.info(`Transforming ${opportunities.length} opportunities`);

			for (const opportunity of opportunities) {
				const transformation = await interactiveAnalyzer.transform(selected_content.id, {
					type: (opportunity as any).type,
					domain: (opportunity as any).domain,
					parameters: (opportunity as any).parameters
				});

				webContentActions.addTransformationToHistory(transformation);
				webContentActions.setCurrentTransformation(transformation);
			}

			webContentActions.addNotification({
				type: 'success',
				message: `Successfully transformed ${opportunities.length} opportunities`
			});

			// Clear selection
			selected_opportunities = [];

		} catch (error) {
			logger.error('Transformation failed:', error);
			
			webContentActions.addNotification({
				type: 'error',
				message: `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		}
	}

	// Toggle opportunity selection
	function toggle_opportunity_selection(opportunity_id) {
		if (selected_opportunities.includes(opportunity_id)) {
			selected_opportunities = selected_opportunities.filter(id => id !== opportunity_id);
		} else {
			selected_opportunities = [...selected_opportunities, opportunity_id];
		}
	}

	// Select all opportunities
	function select_all_opportunities() {
		if (!analysis_results) return;
		selected_opportunities = analysis_results.opportunities.map((op: any) => op.id);
	}

	// Clear all selections
	function clear_all_selections() {
		selected_opportunities = [];
	}

	// Get confidence color
	function get_confidence_color(confidence: number): 'error' | 'success' | 'warning' | 'secondary' | 'primary' | 'outline' | 'default' {
		if (confidence > 0.8) return 'success';
		if (confidence > 0.5) return 'warning';
		return 'secondary';
	}

	// Get opportunity type icon
	function get_opportunity_icon(type: string): string {
		switch (type) {
			case 'visualization': return '📊';
			case 'simulation': return '🔬';
			case 'interactive-chart': return '📈';
			case 'quiz': return '❓';
			case 'flashcard': return '🃏';
			case 'code-playground': return '💻';
			case 'neural-network': return '🧠';
			case 'algorithm-viz': return '⚙️';
			default: return '✨';
		}
	}
</script>

<div class="web-content-analyzer">
	<div class="analyzer-header">
		<h2>Content Analysis & Transformation</h2>
		{#if selected_content}
			<p>Analyzing: <strong>{selected_content.title}</strong></p>
		{:else}
			<p>Select content to analyze for interactive opportunities</p>
		{/if}
	</div>

	{#if selected_content}
		<div class="analysis-controls">
			<Button
				onclick={analyze_content}
				disabled={is_analyzing}
				variant="primary"
			>
				{#if is_analyzing}
					<LoadingSpinner size="sm" />
					Analyzing...
				{:else}
					🔍 Analyze Content
				{/if}
			</Button>

			{#if analysis_results}
				<div class="analysis-stats">
					<Badge variant="secondary">
						{analysis_results.stats.totalOpportunities} opportunities
					</Badge>
					<Badge variant="success">
						{analysis_results.stats.highConfidence} high confidence
					</Badge>
					<Badge variant="warning">
						{analysis_results.stats.mediumConfidence} medium confidence
					</Badge>
				</div>
			{/if}
		</div>

		{#if analysis_results}
			<div class="opportunities-section">
				<div class="opportunities-header">
					<h3>Interactive Opportunities</h3>
					<div class="selection-controls">
						<Button onclick={select_all_opportunities} variant="outline" size="sm">
						Select All
					</Button>
					<Button onclick={clear_all_selections} variant="outline" size="sm">
						Clear All
					</Button>
					<Button
						onclick={transform_opportunities}
						disabled={selected_opportunities.length === 0}
						variant="primary"
						size="sm"
					>
						Transform Selected ({selected_opportunities.length})
					</Button>
					</div>
				</div>

				<div class="opportunities-grid">
					{#each analysis_results.opportunities as opportunity (opportunity.id)}
						<Card class="opportunity-card">
							<div class="opportunity-header">
								<div class="opportunity-info">
									<span class="opportunity-icon">
										{get_opportunity_icon(opportunity.type)}
									</span>
									<div>
										<h4>{opportunity.title}</h4>
										<p class="opportunity-description">{opportunity.description}</p>
									</div>
								</div>
								<div class="opportunity-meta">
									<Badge variant={get_confidence_color(opportunity.confidence)}>
										{Math.round(opportunity.confidence * 100)}% confidence
									</Badge>
									<label class="opportunity-checkbox">
										<input
											type="checkbox"
											checked={selected_opportunities.includes(opportunity.id)}
											onchange={() => toggle_opportunity_selection(opportunity.id)}
										/>
									</label>
								</div>
							</div>

							<div class="opportunity-details">
								<div class="detail-item">
									<strong>Type:</strong> {opportunity.type}
								</div>
								<div class="detail-item">
									<strong>Source:</strong> {opportunity.sourceElement}
								</div>
								{#if opportunity.parameters && Object.keys(opportunity.parameters).length > 0}
									<div class="detail-item">
										<strong>Parameters:</strong>
										<div class="parameters-list">
											{#each Object.entries(opportunity.parameters) as [key, param] (key)}
												<span class="parameter-tag">
													{key}: {(param as any).type}
												</span>
											{/each}
										</div>
									</div>
								{/if}
								{#if opportunity.reasoning}
									<div class="detail-item">
										<strong>Reasoning:</strong>
										<p class="reasoning-text">{opportunity.reasoning}</p>
									</div>
								{/if}
							</div>
						</Card>
					{/each}
				</div>

				{#if analysis_results.opportunities.length === 0}
					<div class="no-opportunities">
						<p>No interactive opportunities found in this content.</p>
						<p>Try analyzing different content or adjusting the analysis parameters.</p>
					</div>
				{/if}
			</div>

			<!-- Suggestions section removed: analysis_results no longer contains suggestions -->
		{/if}
	{:else}
		<div class="no-content-selected">
			<div class="empty-state">
				<span class="empty-icon">🔍</span>
				<h3>No Content Selected</h3>
				<p>Select content from your imported sources to analyze for interactive opportunities.</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.web-content-analyzer {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.analyzer-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.analyzer-header h2 {
		margin: 0 0 0.5rem 0;
		color: #333;
		font-size: 1.8rem;
	}

	.analyzer-header p {
		margin: 0;
		color: #666;
		font-size: 1rem;
	}

	.analysis-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 2rem;
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
	}

	.analysis-stats {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.opportunities-section {
		margin-bottom: 2rem;
	}

	.opportunities-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.opportunities-header h3 {
		margin: 0;
		color: #333;
		font-size: 1.4rem;
	}

	.selection-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.opportunities-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 1rem;
	}

	:global(.opportunity-card) {
		border: 2px solid transparent;
		transition: all 0.2s;
	}

	:global(.opportunity-card:hover) {
		border-color: #007bff;
		box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
	}

	.opportunity-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}

	.opportunity-info {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
		flex: 1;
	}

	.opportunity-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.opportunity-info h4 {
		margin: 0 0 0.25rem 0;
		color: #333;
		font-size: 1.1rem;
	}

	.opportunity-description {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.opportunity-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.opportunity-checkbox {
		cursor: pointer;
	}

	.opportunity-checkbox input {
		margin: 0;
		transform: scale(1.2);
	}

	.opportunity-details {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.detail-item {
		font-size: 0.9rem;
	}

	.detail-item strong {
		color: #333;
	}

	.parameters-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.25rem;
	}

	.parameter-tag {
		padding: 0.125rem 0.5rem;
		background: #e9ecef;
		border-radius: 12px;
		font-size: 0.8rem;
		color: #495057;
	}

	.reasoning-text {
		margin: 0.25rem 0 0 0;
		color: #666;
		font-style: italic;
		line-height: 1.4;
	}

	.no-opportunities {
		text-align: center;
		padding: 3rem 2rem;
		color: #666;
		background: #f8f9fa;
		border-radius: 8px;
		border: 1px solid #e0e0e0;
	}

	.no-content-selected {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.empty-state {
		text-align: center;
		color: #666;
	}

	.empty-icon {
		font-size: 4rem;
		display: block;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		margin: 0 0 1rem 0;
		color: #333;
		font-size: 1.4rem;
	}

	.empty-state p {
		margin: 0;
		max-width: 400px;
		line-height: 1.5;
	}

	@media (max-width: 768px) {
		.web-content-analyzer {
			padding: 1rem;
		}

		.analysis-controls {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.opportunities-header {
			flex-direction: column;
			gap: 1rem;
			align-items: stretch;
		}

		.selection-controls {
			justify-content: center;
		}

		.opportunities-grid {
			grid-template-columns: 1fr;
		}

		.opportunity-header {
			flex-direction: column;
			gap: 1rem;
		}

		.opportunity-meta {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
		}
	}
</style>