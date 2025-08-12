<script lang="ts">
	import { onMount } from 'svelte';
	import type {
		ContentLink,
		RelationshipType,
		ContentRecommendation
	} from '../types/relationships.js';
	import type { ContentModule } from '../types/content.js';
	import { relationshipStorage } from '../storage/relationshipStorage.js';
	import { similarityEngine } from '../utils/similarityEngine.js';

	interface Props {
		currentModule: ContentModule;
		allModules: ContentModule[];
		completedContent: Set<string>;
		onRelationshipChange?: () => void;
	}

	let { currentModule, allModules, completedContent, onRelationshipChange }: Props = $props();

	let existing_links = $state([]);
	let recommendations: ContentRecommendation[] = $state([]);
	let show_add_relationship = $state(false);
	let selected_module = $state('');
	let selected_relation_type = $state('related');
	let relationship_strength = $state(1.0);
	let loading = $state(false);

	const relationship_types = [
		{
			value: 'prerequisite',
			label: 'Prerequisite',
			description: 'This content must be completed first'
		},
		{
			value: 'dependent',
			label: 'Dependent',
			description: 'This content depends on the current module'
		},
		{ value: 'related', label: 'Related', description: 'Topically related content' },
		{ value: 'similar', label: 'Similar', description: 'Similar difficulty or content type' },
		{ value: 'sequence', label: 'Sequence', description: 'Next in a learning sequence' },
		{ value: 'reference', label: 'Reference', description: 'Referenced by this content' },
		{ value: 'example', label: 'Example', description: 'Provides examples for this content' },
		{ value: 'practice', label: 'Practice', description: 'Provides practice exercises' }
	];

	onMount(async () => {
		await load_existing_links();
		await load_recommendations();
	});

	/**
	 * Load existing relationships for the current module
	 */
	async function load_existing_links() {
		loading = true;
		try {
			existing_links = await relationshipStorage.getLinksForContent(currentModule.id);
		} catch (error) {
			console.error('Failed to load existing links:', error);
		} finally {
			loading = false;
		}
	}

	/**
	 * Load content recommendations
	 */
	async function load_recommendations() {
		try {
			recommendations = await similarityEngine.generateRecommendations(
				'current-user', // TODO: Get from user context
				completedContent,
				currentModule.id,
				allModules,
				5
			);
		} catch (error) {
			console.error('Failed to load recommendations:', error);
		}
	}

	/**
	 * Add a new relationship
	 */
	async function add_relationship() {
		if (!selected_module) return;

		loading = true;
		try {
			await relationshipStorage.createLink(
				currentModule.id,
				selected_module,
				selected_relation_type,
				relationship_strength,
				`${selected_relation_type} relationship`,
				false
			);

			// Reload links and notify parent
			await load_existing_links();
			onRelationshipChange?.();

			// Reset form
			selected_module = '';
			selected_relation_type = 'related';
			relationship_strength = 1.0;
			show_add_relationship = false;
		} catch (error) {
			console.error('Failed to add relationship:', error);
		} finally {
			loading = false;
		}
	}

	/**
	 * Remove a relationship
	 */
	async function remove_relationship(link_id) {
		loading = true;
		try {
			await relationshipStorage.deleteLink(link_id);
			await load_existing_links();
			onRelationshipChange?.();
		} catch (error) {
			console.error('Failed to remove relationship:', error);
		} finally {
			loading = false;
		}
	}

	/**
	 * Update relationship strength
	 */
	async function update_relationship_strength(link: ContentLink, new_strength) {
		loading = true;
		try {
			const updated_link = {
				...link,
				strength: Math.max(0, Math.min(1, new_strength))
			};
			await relationshipStorage.updateLink(updated_link);
			await load_existing_links();
			onRelationshipChange?.();
		} catch (error) {
			console.error('Failed to update relationship:', error);
		} finally {
			loading = false;
		}
	}

	/**
	 * Get module title by ID
	 */
	function get_module_title(module_id): string {
		const module = allModules.find((m) => m.id === module_id);
		return module ? module.title : 'Unknown Module';
	}

	/**
	 * Get relationship type label
	 */
	function get_relationship_type_label(type: RelationshipType): string {
		const type_info = relationship_types.find((t) => t.value === type);
		return type_info ? type_info.label : type;
	}

	/**
	 * Get available modules for relationship (exclude current and already linked)
	 */
	function get_available_modules(): ContentModule[] {
		const linked_module_ids = new Set(
			existing_links.flatMap((link) => [link.sourceId, link.targetId])
		);
		return allModules.filter(
			(module) => module.id !== currentModule.id && !linked_module_ids.has(module.id)
		);
	}

	/**
	 * Accept a recommendation and create the relationship
	 */
	async function accept_recommendation(recommendation: ContentRecommendation) {
		loading = true;
		try {
			const relationship_type = get_recommendation_relation_type(recommendation.type);
			await relationshipStorage.createLink(
				currentModule.id,
				recommendation.contentId,
				relationship_type,
				recommendation.score,
				`Auto-generated from recommendation`,
				true
			);

			await load_existing_links();
			await load_recommendations();
			onRelationshipChange?.();
		} catch (error) {
			console.error('Failed to accept recommendation:', error);
		} finally {
			loading = false;
		}
	}

	/**
	 * Map recommendation type to relationship type
	 */
	function get_recommendation_relation_type(rec_type): RelationshipType {
		switch (rec_type) {
			case 'next-in-sequence':
				return 'sequence';
			case 'related-topic':
				return 'related';
			case 'practice':
				return 'practice';
			case 'similar-difficulty':
				return 'similar';
			case 'review':
				return 'related';
			default:
				return 'related';
		}
	}
</script>

<div class="relationship-manager">
	<div class="header">
		<h3>Content Relationships</h3>
		<button
			class="btn btn-primary"
			onclick={() => (show_add_relationship = !show_add_relationship)}
			disabled={loading}
		>
			{show_add_relationship ? 'Cancel' : 'Add Relationship'}
		</button>
	</div>

	{#if loading}
		<div class="loading">Loading relationships...</div>
	{/if}

	<!-- Add Relationship Form -->
	{#if show_add_relationship}
		<div class="add-relationship-form">
			<h4>Add New Relationship</h4>

			<div class="form-group">
				<label for="module-select">Related Module:</label>
				<select id="module-select" bind:value={selected_module}>
					<option value="">Select a module...</option>
					{#each get_available_modules() as module}
						<option value={module.id}>{module.title}</option>
					{/each}
				</select>
			</div>

			<div class="form-group">
				<label for="relationship-type">Relationship Type:</label>
				<select id="relationship-type" bind:value={selected_relation_type}>
					{#each relationship_types as type}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
				<small class="help-text">
					{relationship_types.find((t) => t.value === selected_relation_type)?.description}
				</small>
			</div>

			<div class="form-group">
				<label for="strength">Relationship Strength:</label>
				<input
					id="strength"
					type="range"
					min="0.1"
					max="1.0"
					step="0.1"
					bind:value={relationship_strength}
				/>
				<span class="strength-value">{relationship_strength.toFixed(1)}</span>
			</div>

			<div class="form-actions">
				<button
					class="btn btn-primary"
					onclick={addRelationship}
					disabled={!selected_module || loading}
				>
					Add Relationship
				</button>
				<button class="btn btn-secondary" onclick={() => (show_add_relationship = false)}>
					Cancel
				</button>
			</div>
		</div>
	{/if}

	<!-- Existing Relationships -->
	<div class="existing-relationships">
		<h4>Current Relationships ({existing_links.length})</h4>

		{#if existing_links.length === 0}
			<p class="no-relationships">No relationships defined yet.</p>
		{:else}
			<div class="relationships-list">
				{#each existingLinks as link (link.id)}
					<div class="relationship-item">
						<div class="relationship-info">
							<div class="relationship-title">
								<strong>{get_relationship_type_label(link.type)}</strong>
								{#if link.sourceId === currentModule.id}
									→ {get_module_title(link.targetId)}
								{:else}
									← {get_module_title(link.sourceId)}
								{/if}
							</div>
							<div class="relationship-meta">
								Strength: {link.strength.toFixed(1)} •
								{link.metadata.automatic ? 'Auto-generated' : 'Manual'} • Created: {link.metadata.created.toLocaleDateString()}
							</div>
							{#if link.metadata.description}
								<div class="relationship-description">{link.metadata.description}</div>
							{/if}
						</div>

						<div class="relationship-actions">
							<input
								type="range"
								min="0.1"
								max="1.0"
								step="0.1"
								value={link.strength}
								onchange={(e) => update_relationship_strength(link, parseFloat(e.target.value))}
								disabled={loading}
								class="strength-slider"
							/>
							<button
								class="btn btn-danger btn-small"
								onclick={() => remove_relationship(link.id)}
								disabled={loading}
							>
								Remove
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Recommendations -->
	{#if recommendations.length > 0}
		<div class="recommendations">
			<h4>Suggested Relationships</h4>
			<div class="recommendations-list">
				{#each recommendations as recommendation (recommendation.contentId)}
					<div class="recommendation-item">
						<div class="recommendation-info">
							<div class="recommendation-title">
								<strong>{get_module_title(recommendation.contentId)}</strong>
								<span class="recommendation-type">{recommendation.type}</span>
							</div>
							<div class="recommendation-score">
								Confidence: {Math.round(recommendation.score * 100)}%
							</div>
							<div class="recommendation-reasons">
								{#each recommendation.reasons as reason}
									<span class="reason-tag">{reason.description}</span>
								{/each}
							</div>
						</div>
						<button
							class="btn btn-primary btn-small"
							onclick={() => accept_recommendation(recommendation)}
							disabled={loading}
						>
							Accept
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.relationship-manager {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 20px;
		margin: 20px 0;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	.header h3 {
		margin: 0;
		color: #1f2937;
	}

	.loading {
		text-align: center;
		padding: 20px;
		color: #6b7280;
	}

	.add-relationship-form {
		background: #f9fafb;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		padding: 16px;
		margin-bottom: 20px;
	}

	.add-relationship-form h4 {
		margin: 0 0 16px 0;
		color: #1f2937;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		margin-bottom: 4px;
		font-weight: 500;
		color: #374151;
	}

	.form-group select,
	.form-group input[type='range'] {
		width: 100%;
		padding: 8px;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 14px;
	}

	.help-text {
		display: block;
		margin-top: 4px;
		font-size: 12px;
		color: #6b7280;
	}

	.strength-value {
		margin-left: 8px;
		font-weight: 500;
		color: #374151;
	}

	.form-actions {
		display: flex;
		gap: 8px;
		margin-top: 16px;
	}

	.existing-relationships h4,
	.recommendations h4 {
		margin: 0 0 16px 0;
		color: #1f2937;
	}

	.no-relationships {
		color: #6b7280;
		font-style: italic;
		text-align: center;
		padding: 20px;
	}

	.relationships-list,
	.recommendations-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.relationship-item,
	.recommendation-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		background: #f9fafb;
	}

	.relationship-info,
	.recommendation-info {
		flex: 1;
	}

	.relationship-title,
	.recommendation-title {
		font-weight: 500;
		color: #1f2937;
		margin-bottom: 4px;
	}

	.relationship-meta,
	.recommendation-score {
		font-size: 12px;
		color: #6b7280;
		margin-bottom: 4px;
	}

	.relationship-description {
		font-size: 12px;
		color: #4b5563;
		font-style: italic;
	}

	.recommendation-type {
		background: #dbeafe;
		color: #1e40af;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: normal;
		margin-left: 8px;
	}

	.recommendation-reasons {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 4px;
	}

	.reason-tag {
		background: #f3f4f6;
		color: #374151;
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 11px;
	}

	.relationship-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.strength-slider {
		width: 80px;
	}

	.recommendations {
		margin-top: 24px;
		padding-top: 20px;
		border-top: 1px solid #e5e7eb;
	}

	.btn {
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		font-size: 14px;
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

	.btn-danger {
		background: #ef4444;
		color: white;
	}

	.btn-danger:hover:not(:disabled) {
		background: #dc2626;
	}

	.btn-small {
		padding: 4px 8px;
		font-size: 12px;
	}
</style>
