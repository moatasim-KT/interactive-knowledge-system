<script lang="ts">
    import { onMount } from 'svelte';
    import { KnowledgeMap, RelationshipManager } from '$lib/components';
    import { contentStorage, relationshipStorage } from '$lib/storage';
    import { similarityEngine } from '$lib/utils/similarityEngine';
    import type { ContentModule, ContentRecommendation } from '$lib/types';

    let modules: ContentModule[] = $state([]);
    let selected_module = $state<ContentModule | null>(null);
    let completed_content = $state(new Set<string>());
    let recommendations: ContentRecommendation[] = $state([]);
    let loading = $state(true);
    let error = $state('');

    // Demo data
    const demo_modules = [
        {
            id: 'html-basics',
            title: 'HTML Basics',
            description: 'Learn the fundamentals of HTML markup language',
            blocks: [],
            relationships: { prerequisites: [], dependents: [], related: [] },
            analytics: { views: 150, completions: 120, averageScore: 85, averageTime: 60 }
        },
        {
            id: 'css-fundamentals',
            title: 'CSS Fundamentals',
            description: 'Understanding CSS styling and layout',
            blocks: [],
            relationships: { prerequisites: ['html-basics'], dependents: [], related: [] },
            analytics: { views: 130, completions: 100, averageScore: 78, averageTime: 90 }
        },
        {
            id: 'javascript-intro',
            title: 'JavaScript Introduction',
            description: 'Getting started with JavaScript programming',
            blocks: [],
            relationships: { prerequisites: ['html-basics'], dependents: [], related: [] },
            analytics: { views: 140, completions: 110, averageScore: 82, averageTime: 120 }
        },
        {
            id: 'responsive-design',
            title: 'Responsive Web Design',
            description: 'Creating websites that work on all devices',
            blocks: [],
            relationships: { prerequisites: ['css-fundamentals'], dependents: [], related: [] },
            analytics: { views: 100, completions: 75, averageScore: 80, averageTime: 150 }
        },
        {
            id: 'dom-manipulation',
            title: 'DOM Manipulation',
            description: 'Using JavaScript to interact with HTML elements',
            blocks: [],
            relationships: {
                prerequisites: ['javascript-intro', 'css-fundamentals'],
                dependents: [],
                related: []
            },
            analytics: { views: 90, completions: 65, averageScore: 75, averageTime: 180 }
        },
        {
            id: 'web-accessibility',
            title: 'Web Accessibility',
            description: 'Making websites accessible to all users',
            blocks: [],
            relationships: { prerequisites: ['html-basics'], dependents: [], related: [] },
            analytics: { views: 80, completions: 60, averageScore: 88, averageTime: 100 }
        }
    ];

    onMount(async () => {
        try {
            await initialize_demo_data();
            await load_modules();
            await load_recommendations();
        } catch (err) {
            error = `Failed to initialize demo: ${err}`;
        } finally {
            loading = false;
        }
    });

    /**
     * Initialize demo data if not already present
     */
    async function initialize_demo_data() {
        const existing_modules = await contentStorage.getAllModules();

        if (existing_modules.length === 0) {
            // Create demo modules
            for (const module_data of demo_modules) {
                const full_module = {
                    ...module_data,
                    metadata: {
                        author: 'demo-instructor',
                        created: new Date(),
                        modified: new Date(),
                        version: 1,
                        difficulty: Math.floor(Math.random() * 3) + 1,
                        estimatedTime: 60 + Math.floor(Math.random() * 120),
                        prerequisites: module_data.relationships.prerequisites,
                        tags: generate_tags(module_data.title, module_data.description),
                        language: 'en'
                    }
                };

                await contentStorage.createModule(full_module);
            }

            // Create demo relationships
            await create_demo_relationships();
        }
    }

    /**
     * Generate tags based on title and description
     */
    function generate_tags(title: string, description: string): string[] {
        const text = `${title} ${description}`.toLowerCase();
        const tags: string[] = [];

        if (text.includes('html')) tags.push('html');
        if (text.includes('css')) tags.push('css');
        if (text.includes('javascript')) tags.push('javascript');
        if (text.includes('web')) tags.push('web-development');
        if (text.includes('design')) tags.push('design');
        if (text.includes('responsive')) tags.push('responsive');
        if (text.includes('accessibility')) tags.push('accessibility');
        if (text.includes('dom')) tags.push('dom');
        if (text.includes('basic') || text.includes('fundamental') || text.includes('intro'))
            tags.push('beginner');

        return tags.length > 0 ? tags : ['web-development'];
    }

    /**
     * Create demo relationships between modules
     */
    async function create_demo_relationships() {
        // Prerequisites
        await relationshipStorage.createLink('html-basics', 'css-fundamentals', 'prerequisite', 1.0);
        await relationshipStorage.createLink('html-basics', 'javascript-intro', 'prerequisite', 0.8);
        await relationshipStorage.createLink(
            'css-fundamentals',
            'responsive-design',
            'prerequisite',
            1.0
        );
        await relationshipStorage.createLink(
            'javascript-intro',
            'dom-manipulation',
            'prerequisite',
            1.0
        );
        await relationshipStorage.createLink(
            'css-fundamentals',
            'dom-manipulation',
            'prerequisite',
            0.6
        );
        await relationshipStorage.createLink('html-basics', 'web-accessibility', 'prerequisite', 0.7);

        // Related content
        await relationshipStorage.createLink('css-fundamentals', 'responsive-design', 'related', 0.8);
        await relationshipStorage.createLink('html-basics', 'web-accessibility', 'related', 0.9);
        await relationshipStorage.createLink('javascript-intro', 'dom-manipulation', 'related', 0.7);

        // Similar content
        await relationshipStorage.createLink('css-fundamentals', 'responsive-design', 'similar', 0.6);
    }

    /**
     * Load all modules
     */
    async function load_modules() {
        modules = await contentStorage.getAllModules();
        if (modules.length > 0 && !selected_module) {
            selected_module = modules[0];
        }
    }

    /**
     * Load recommendations for the current user state
     */
    async function load_recommendations() {
        if (modules.length === 0) return;

        try {
            recommendations = await similarityEngine.generateRecommendations(
                'demo-user',
                completed_content,
                selected_module?.id || null,
                modules,
                5
            );
        } catch (err) {
            console.error('Failed to load recommendations:', err);
        }
    }

    /**
     * Handle node click in knowledge map
     */
    function handle_node_click(node_id: string) {
        const module = modules.find((m) => m.id === node_id);
        if (module) {
            selected_module = module;
            load_recommendations();
        }
    }

    /**
     * Toggle completion status of a module
     */
    async function toggle_completion(module_id: string) {
        if (completed_content.has(module_id)) {
            completed_content.delete(module_id);
        } else {
            completed_content.add(module_id);
        }
        completed_content = new Set(completed_content); // Trigger reactivity
        await load_recommendations();
    }

    /**
     * Handle relationship changes
     */
    async function handle_relationship_change() {
        await load_recommendations();
    }

    /**
     * Reset demo data
     */
    async function reset_demo() {
        loading = true;
        try {
            // Clear existing data
            const existing_modules = await contentStorage.getAllModules();
            for (const module of existing_modules) {
                await contentStorage.deleteModule(module.id);
            }

            const existing_links = await relationshipStorage.getLinksForContent('');
            // Note: This is a simplified cleanup - in practice you'd need to get all links

            completed_content.clear();
            selected_module = null;
            recommendations = [];

            // Reinitialize
            await initialize_demo_data();
            await load_modules();
            await load_recommendations();
        } catch (err) {
            error = `Failed to reset demo: ${err}`;
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Relationship System Demo - Interactive Knowledge System</title>
</svelte:head>

<div class="demo-container">
    <header class="demo-header">
        <h1>Content Relationship System Demo</h1>
        <p>
            Explore how content pieces are connected through prerequisites, similarities, and
            recommendations.
        </p>

        <div class="demo-controls">
            <button class="btn btn-secondary" onclick={reset_demo} disabled={loading}> Reset Demo </button>
        </div>
    </header>

    {#if loading}
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading relationship system...</p>
        </div>
    {:else if error}
        <div class="error-state">
            <h3>Error</h3>
            <p>{error}</p>
            <button class="btn btn-primary" onclick={reset_demo}>Try Again</button>
        </div>
    {:else}
        <div class="demo-content">
            <!-- Knowledge Map Section -->
            <section class="map-section">
                <h2>Knowledge Map</h2>
                <p>Visual representation of content relationships. Click nodes to explore connections.</p>

                <div class="map-container">
                    <KnowledgeMap
                        {modules}
                        completedContent={completed_content}
                        currentContent={selected_module?.id}
                        width={800}
                        height={500}
                        onNodeClick={handle_node_click}
                    />
                </div>

                <!-- Completion Controls -->
                <div class="completion-controls">
                    <h3>Mark as Completed:</h3>
                    <div class="module-checkboxes">
                        {#each modules as module}
                            <label class="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={completed_content.has(module.id)}
                                    onchange={() => toggle_completion(module.id)}
                                />
                                {module.title}
                            </label>
                        {/each}
                    </div>
                </div>
            </section>

            <!-- Selected Module Details -->
            {#if selected_module}
                <section class="module-details">
                    <h2>Selected Module: {selected_module.title}</h2>
                    <p>{selected_module.description}</p>

                    <div class="module-info">
                        <div class="info-item">
                            <strong>Difficulty:</strong>
                            {selected_module.metadata.difficulty}/5
                        </div>
                        <div class="info-item">
                            <strong>Estimated Time:</strong>
                            {selected_module.metadata.estimatedTime} minutes
                        </div>
                        <div class="info-item">
                            <strong>Tags:</strong>
                            {selected_module.metadata.tags.join(', ')}
                        </div>
                        <div class="info-item">
                            <strong>Prerequisites:</strong>
                            {#if selected_module.metadata.prerequisites.length > 0}
                                {selected_module.metadata.prerequisites
                                    .map((id: string) => modules.find((m) => m.id === id)?.title || id)
                                    .join(', ')}
                            {:else}
                                None
                            {/if}
                        </div>
                    </div>

                    <!-- Relationship Manager -->
                    <RelationshipManager
                        currentModule={selected_module}
                        allModules={modules}
                        completedContent={completed_content}
                        onRelationshipChange={handle_relationship_change}
                    />
                </section>
            {/if}

            <!-- Recommendations Section -->
            {#if recommendations.length > 0}
                <section class="recommendations-section">
                    <h2>Personalized Recommendations</h2>

    <div class="demo-container">
        <header class="demo-header">
            <h1>Content Relationship System Demo</h1>
            <p>
                Explore how content pieces are connected through prerequisites, similarities, and
                recommendations.
            </p>

            <div class="demo-controls">
                <button class="btn btn-secondary" onclick={reset_demo} disabled={loading}> Reset Demo </button>
            </div>
        </header>

        {#if loading}
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading relationship system...</p>
            </div>
        {:else if error}
            <div class="error-state">
                <h3>Error</h3>
                <p>{error}</p>
                <button class="btn btn-primary" onclick={reset_demo}>Try Again</button>
            </div>
        {:else}
            <div class="demo-content">
                <!-- Knowledge Map Section -->
                <section class="map-section">
                    <h2>Knowledge Map</h2>
                    <p>Visual representation of content relationships. Click nodes to explore connections.</p>

                    <div class="map-container">
                        <KnowledgeMap
                            {modules}
                            completedContent={completed_content}
                            currentContent={selected_module?.id}
                            width={800}
                            height={500}
                            onNodeClick={handle_node_click}
                        />
                    </div>

                    <!-- Completion Controls -->
                    <div class="completion-controls">
                        <h3>Mark as Completed:</h3>
                        <div class="module-checkboxes">
                            {#each modules as module}
                                <label class="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={completed_content.has(module.id)}
                                        onchange={() => toggle_completion(module.id)}
                                    />
                                    {module.title}
                                </label>
                            {/each}
                        </div>
                    </div>
                </section>

                <!-- Selected Module Details -->
                {#if selected_module}
                    <section class="module-details">
                        <h2>Selected Module: {selected_module.title}</h2>
                        <p>{selected_module.description}</p>

                        <div class="module-info">
                            <div class="info-item">
                                <strong>Difficulty:</strong>
                                {selected_module.metadata.difficulty}/5
                            </div>
                            <div class="info-item">
                                <strong>Estimated Time:</strong>
                                {selected_module.metadata.estimatedTime} minutes
                            </div>
                            <div class="info-item">
                                <strong>Tags:</strong>
                                {selected_module.metadata.tags.join(', ')}
                            </div>
                            <div class="info-item">
                                <strong>Prerequisites:</strong>
                                {#if selected_module.metadata.prerequisites.length > 0}
                                    {selected_module.metadata.prerequisites
                                        .map((id: string) => modules.find((m) => m.id === id)?.title || id)
                                        .join(', ')}
                                {:else}
                                    None
                                {/if}
                            </div>
                        </div>

                        <!-- Relationship Manager -->
                        <RelationshipManager
                            currentModule={selected_module}
                            allModules={modules}
                            completedContent={completed_content}
                            onRelationshipChange={handle_relationship_change}
                        />
                    </div>
                </section>
            {/if}

            <!-- System Statistics -->
            <section class="stats-section">
                <h2>System Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-number">{modules.length}</div>
                        <div class="stat-label">Total Modules</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{completed_content.size}</div>
                        <div class="stat-label">Completed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">{recommendations.length}</div>
                        <div class="stat-label">Recommendations</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-number">
                            {Math.round((completed_content.size / modules.length) * 100)}%
                        </div>
                        <div class="stat-label">Progress</div>
                    </div>
                </div>
            </section>
        </div>
    {/if}
										{#each recommendation.reasons as reason}
											<li>{reason.description} (weight: {Math.round(reason.weight * 100)}%)</li>
										{/each}
									</ul>
								</div>

								<button
									class="btn btn-primary btn-small"
									onclick={() => handle_node_click(recommendation.contentId)}
								>
									View Module
								</button>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- System Statistics -->
			<section class="stats-section">
				<h2>System Statistics</h2>
				<div class="stats-grid">
					<div class="stat-card">
						<div class="stat-number">{modules.length}</div>
						<div class="stat-label">Total Modules</div>
					</div>
					<div class="stat-card">
						<div class="stat-number">{completed_content.size}</div>
						<div class="stat-label">Completed</div>
					</div>
					<div class="stat-card">
						<div class="stat-number">{recommendations.length}</div>
						<div class="stat-label">Recommendations</div>
					</div>
					<div class="stat-card">
						<div class="stat-number">
							{Math.round((completed_content.size / modules.length) * 100)}%
						</div>
						<div class="stat-label">Progress</div>
					</div>
				</div>
			</section>
		</div>
	{/if}
</div>

<style>
	.demo-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.demo-header {
		text-align: center;
		margin-bottom: 40px;
		padding-bottom: 20px;
		border-bottom: 2px solid #e5e7eb;
	}

	.demo-header h1 {
		color: #1f2937;
		margin-bottom: 10px;
	}

	.demo-header p {
		color: #6b7280;
		font-size: 16px;
		margin-bottom: 20px;
	}

	.demo-controls {
		display: flex;
		justify-content: center;
		gap: 10px;
	}

	.loading-state,
	.error-state {
		text-align: center;
		padding: 60px 20px;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f4f6;
		border-top: 4px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 20px;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	.demo-content {
		display: flex;
		flex-direction: column;
		gap: 40px;
	}

	.map-section {
		background: white;
		border-radius: 12px;
		padding: 30px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.map-section h2 {
		margin: 0 0 10px 0;
		color: #1f2937;
	}

	.map-section p {
		color: #6b7280;
		margin-bottom: 20px;
	}

	.map-container {
		display: flex;
		justify-content: center;
		margin-bottom: 30px;
	}

	.completion-controls {
		border-top: 1px solid #e5e7eb;
		padding-top: 20px;
	}

	.completion-controls h3 {
		margin: 0 0 15px 0;
		color: #374151;
	}

	.module-checkboxes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 10px;
	}

	.checkbox-label {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		border-radius: 6px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.checkbox-label:hover {
		background-color: #f9fafb;
	}

	.module-details {
		background: white;
		border-radius: 12px;
		padding: 30px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.module-details h2 {
		margin: 0 0 10px 0;
		color: #1f2937;
	}

	.module-info {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 15px;
		margin: 20px 0;
		padding: 20px;
		background: #f9fafb;
		border-radius: 8px;
	}

	.info-item {
		color: #374151;
	}

	.info-item strong {
		color: #1f2937;
	}

	.recommendations-section {
		background: white;
		border-radius: 12px;
		padding: 30px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.recommendations-section h2 {
		margin: 0 0 10px 0;
		color: #1f2937;
	}

	.recommendations-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
		margin-top: 20px;
	}

	.recommendation-card {
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 20px;
		background: #f9fafb;
	}

	.recommendation-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 10px;
	}

	.recommendation-header h3 {
		margin: 0;
		color: #1f2937;
		font-size: 16px;
	}

	.recommendation-score {
		background: #dbeafe;
		color: #1e40af;
		padding: 4px 8px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
	}

	.recommendation-type {
		margin-bottom: 10px;
		font-size: 14px;
		color: #374151;
	}

	.type-badge {
		padding: 2px 6px;
		border-radius: 4px;
		font-size: 11px;
		font-weight: 500;
		text-transform: uppercase;
	}

	.type-next-in-sequence {
		background: #dcfce7;
		color: #166534;
	}
	.type-related-topic {
		background: #fef3c7;
		color: #92400e;
	}
	.type-practice {
		background: #e0e7ff;
		color: #3730a3;
	}
	.type-similar-difficulty {
		background: #fce7f3;
		color: #be185d;
	}
	.type-review {
		background: #f3e8ff;
		color: #7c3aed;
	}

	.recommendation-reasons {
		margin-bottom: 15px;
		font-size: 14px;
		color: #374151;
	}

	.recommendation-reasons ul {
		margin: 5px 0 0 0;
		padding-left: 20px;
	}

	.recommendation-reasons li {
		margin-bottom: 2px;
		color: #6b7280;
	}

	.stats-section {
		background: white;
		border-radius: 12px;
		padding: 30px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.stats-section h2 {
		margin: 0 0 20px 0;
		color: #1f2937;
		text-align: center;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 20px;
	}

	.stat-card {
		text-align: center;
		padding: 20px;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #e5e7eb;
	}

	.stat-number {
		font-size: 32px;
		font-weight: 700;
		color: #3b82f6;
		margin-bottom: 5px;
	}

	.stat-label {
		font-size: 14px;
		color: #6b7280;
		font-weight: 500;
	}

	.btn {
		padding: 8px 16px;
		border: none;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
		display: inline-block;
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

	.btn-small {
		padding: 6px 12px;
		font-size: 12px;
	}

	@media (max-width: 768px) {
		.demo-container {
			padding: 10px;
		}

		.map-container {
			overflow-x: auto;
		}

		.module-checkboxes {
			grid-template-columns: 1fr;
		}

		.recommendations-list {
			grid-template-columns: 1fr;
		}

		.stats-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
