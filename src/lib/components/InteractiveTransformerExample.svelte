<!--
  Interactive Content Transformer Example Component
  Demonstrates how to use the InteractiveTransformer service
-->

<script lang="ts">
	import { InteractiveTransformer } from '../services/interactiveTransformer.js';
	import { EnhancedDocumentProcessor } from '../services/enhancedDocumentProcessor.js';
	import type { InteractiveArticle } from '../services/interactiveTransformer.js';

	let transformer = $state<InteractiveTransformer | null>(null);
	let documentProcessor = $state<EnhancedDocumentProcessor | null>(null);
	let interactiveArticle = $state<InteractiveArticle | null>(null);
	let isProcessing = $state(false);
	let error = $state<string | null>(null);

	// Sample markdown content for demonstration
	const sampleMarkdown = `# Interactive Content Example

This is a demonstration of how static content can be transformed into interactive elements.

## Expandable Sections

This section contains enough content to be made expandable. When users click to expand, they'll see the full content with enhanced readability and navigation features. The system automatically detects long sections and makes them expandable to improve the user experience.

## Code Execution

Here's an example of executable JavaScript code:

\`\`\`javascript
function greetUser(name) {
    return \`Hello, ${name}! Welcome to the interactive knowledge system.
\`;
}

console.log(greetUser("Developer"));
\`\`\`

This code block will be enhanced with syntax highlighting and execution capabilities.

## Interactive Features

The transformation process adds several interactive features:
- Expandable sections for long content
- Embedded quizzes based on the content
- Code execution environments
- Related content suggestions
- Progress tracking and bookmarks

## Conclusion

This example demonstrates the power of transforming static documents into engaging, interactive learning experiences.`;

	$effect(() => {
		transformer = new InteractiveTransformer({
			enableExpandableSections: true,
			generateQuizzes: true,
			enhanceCodeBlocks: true,
			findRelatedContent: true,
			aiEnhancement: true
		});

		documentProcessor = new EnhancedDocumentProcessor({
			detectCodeBlocks: true,
			generateToc: true,
			minSectionLength: 100
		});
	});

	async function transformContent() {
		if (!transformer || !documentProcessor) return;

		isProcessing = true;
		error = null;

		try {
			// First, process the markdown document
			const processedDoc = await documentProcessor.processMarkdown(
				sampleMarkdown,
				'interactive-example.md'
			);

			// Then transform it to interactive article
			interactiveArticle = await transformer.transformToInteractive(processedDoc);
		} catch (err) {
			error = err instanceof Error ? err.message : 'An unknown error occurred';
			console.error('Transformation error:', err);
		} finally {
			isProcessing = false;
		}
	}

	function getInteractivityLevelText(level: string): string {
		switch (level) {
			case 'static':
				return 'Static Content';
			case 'basic':
				return 'Basic Interactivity';
			case 'advanced':
				return 'Advanced Interactivity';
			default:
				return 'Unknown';
		}
	}

	function getFeatureDescription(type: string): string {
		switch (type) {
			case 'expandable':
				return 'Expandable sections for long content';
			case 'quiz':
				return 'Embedded quizzes and assessments';
			case 'code-execution':
				return 'Executable code blocks';
			case 'related-content':
				return 'Related content suggestions';
			case 'progress-tracking':
				return 'Reading progress tracking';
			case 'annotation':
				return 'User annotations and bookmarks';
			default:
				return type;
		}
	}
</script>

<div class="interactive-transformer-example">
	<div class="header">
		<h2>Interactive Content Transformer Demo</h2>
		<p>
			This example shows how the InteractiveTransformer service converts static markdown content
			into an interactive article with enhanced features.
		</p>
	</div>

	<div class="controls">
		<button
			onclick={transformContent}
			disabled={isProcessing || !transformer || !documentProcessor}
			class="transform-button"
		>
			{isProcessing ? 'Transforming...' : 'Transform Content'}
		</button>
	</div>

	{#if error}
		<div class="error">
			<h3>Error</h3>
			<p>{error}</p>
		</div>
	{/if}

	{#if isProcessing}
		<div class="loading">
			<div class="spinner"></div>
			<p>Processing document and applying interactive transformations...</p>
		</div>
	{/if}

	{#if interactiveArticle}
		<div class="results">
			<h3>Transformation Results</h3>

			<div class="metadata">
				<h4>Article Metadata</h4>
				<div class="metadata-grid">
					<div class="metadata-item">
						<strong>Title:</strong>
						{interactiveArticle.title}
					</div>
					<div class="metadata-item">
						<strong>Content Blocks:</strong>
						{interactiveArticle.content.length}
					</div>
					<div class="metadata-item">
						<strong>Interactivity Level:</strong>
						{interactiveArticle.metadata.interactivityLevel}/10
					</div>
					<div class="metadata-item">
						<strong>Estimated Reading Time:</strong>
						{interactiveArticle.metadata.estimatedReadingTime} minutes
					</div>
					<div class="metadata-item">
						<strong>AI Enhanced:</strong>
						{interactiveArticle.metadata.aiEnhanced ? 'Yes' : 'No'}
					</div>
				</div>
			</div>

			<div class="content-blocks">
				<h4>Interactive Content Blocks</h4>
				{#each interactiveArticle.content as block, index}
					<div class="content-block">
						<div class="block-header">
							<h5>Block {index + 1}: {block.type}</h5>
								<span class="interactivity-level">
									{getInteractivityLevelText(block.interactivity.level)}
								</span>
							</div>

							<div class="block-details">
								{#if block.interactivity.features.length > 0}
									<div class="features">
										<strong>Interactive Features:</strong>
										<ul>
											{#each block.interactivity.features as feature}
												<li class:enabled={feature.enabled}>
													{getFeatureDescription(feature.type)}
													{feature.enabled ? '✓' : '✗'}
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								{#if block.enhancements.length > 0}
									<div class="enhancements">
										<strong>Content Enhancements:</strong>
										<ul>
											{#each block.enhancements as enhancement}
												<li>
													{enhancement.type} ({enhancement.position})
													{enhancement.generated ? '(AI Generated)' : '(Manual)'}
												</li>
											{/each}
										</ul>
									</div>
								{/if}

								{#if block.type === 'text' && block.interactivity.expandable}
									<div class="expandable-config">
										<strong>Expandable Configuration:</strong>
										<ul>
											<li>Default Expanded: {block.interactivity.expandable.defaultExpanded}</li>
											<li>Preview Length: {block.interactivity.expandable.previewLength} characters</li>
											<li>Animation Duration: {block.interactivity.expandable.animationDuration}ms</li>
										</ul>
									</div>
								{/if}

								{#if block.type === 'code' && block.interactivity.executable}
									<div class="executable-config">
										<strong>Code Execution Configuration:</strong>
										<ul>
											<li>Language: {block.interactivity.executable.language}</li>
											<li>Runtime: {block.interactivity.executable.runtime}</li>
											<li>Timeout: {block.interactivity.executable.timeoutMs}ms</li>
										</ul>
									</div>
								{/if}
							</div>
					</div>
				{/each}
			</div>

			<div class="structure">
				<h4>Interactive Structure</h4>
				<div class="structure-details">
					<div class="navigation-config">
						<strong>Navigation Features:</strong>
						<ul>
							<li>Table of Contents: {interactiveArticle.structure.navigation.showTableOfContents ? '✓' : '✗'}</li>
							<li>Progress Bar: {interactiveArticle.structure.navigation.showProgressBar ? '✓' : '✗'}</li>
							<li>Keyboard Navigation: {interactiveArticle.structure.navigation.enableKeyboardNavigation ? '✓' : '✗'}</li>
							<li>Breadcrumbs: {interactiveArticle.structure.navigation.breadcrumbs ? '✓' : '✗'}</li>
						</ul>
					</div>

					<div class="progress-config">
						<strong>Progress Tracking:</strong>
						<ul>
							<li>Reading Progress: {interactiveArticle.structure.progressTracking.trackReadingProgress ? '✓' : '✗'}</li>
							<li>Interaction Progress: {interactiveArticle.structure.progressTracking.trackInteractionProgress ? '✓' : '✗'}</li>
							<li>Bookmarks: {interactiveArticle.structure.progressTracking.saveBookmarks ? '✓' : '✗'}</li>
							<li>Time Estimation: {interactiveArticle.structure.progressTracking.estimateCompletionTime ? '✓' : '✗'}</li>
						</ul>
					</div>
				</div>
			</div>

			{#if interactiveArticle.relationships.length > 0}
				<div class="relationships">
					<h4>Content Relationships</h4>
					{#each interactiveArticle.relationships as relationship}
						<div class="relationship">
							<strong>{relationship.type}:</strong>
							{relationship.description}
							(Strength: {relationship.strength.toFixed(2)})
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.interactive-transformer-example {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.header h2 {
		color: #2563eb;
		margin-bottom: 0.5rem;
	}

	.controls {
		text-align: center;
		margin-bottom: 2rem;
	}

	.transform-button {
		background: #2563eb;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.transform-button:hover:not(:disabled) {
		background: #1d4ed8;
	}

	.transform-button:disabled {
		background: #9ca3af;
		cursor: not-allowed;
	}

	.error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 0.5rem;
		padding: 1rem;
		margin-bottom: 2rem;
	}

	.error h3 {
		color: #dc2626;
		margin: 0 0 0.5rem 0;
	}

	.loading {
		text-align: center;
		padding: 2rem;
	}

	.spinner {
		width: 2rem;
		height: 2rem;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #2563eb;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.results {
		background: #f9fafb;
		border-radius: 0.5rem;
		padding: 2rem;
	}

	.metadata-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.metadata-item {
		background: white;
		padding: 1rem;
		border-radius: 0.375rem;
		border: 1px solid #e5e7eb;
	}

	.content-blocks {
		margin-top: 2rem;
	}

	.content-block {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		margin-bottom: 1rem;
		overflow: hidden;
	}

	.block-header {
		background: #f3f4f6;
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid #e5e7eb;
	}

	.block-header h5 {
		margin: 0;
		color: #374151;
	}

	.interactivity-level {
		background: #dbeafe;
		color: #1e40af;
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		font-size: 0.875rem;
	}

	.block-details {
		padding: 1rem;
	}

	.features ul,
	.enhancements ul,
	.expandable-config ul,
	.executable-config ul,
	.navigation-config ul,
	.progress-config ul {
		margin: 0.5rem 0 0 0;
		padding-left: 1.5rem;
	}

	.features li.enabled {
		color: #059669;
	}

	.features li:not(.enabled) {
		color: #dc2626;
	}

	.structure {
		margin-top: 2rem;
	}

	.structure-details {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		margin-top: 1rem;
	}

	.navigation-config,
	.progress-config {
		background: white;
		padding: 1rem;
		border-radius: 0.375rem;
		border: 1px solid #e5e7eb;
	}

	.relationships {
		margin-top: 2rem;
	}

	.relationship {
		background: white;
		padding: 1rem;
		border-radius: 0.375rem;
		border: 1px solid #e5e7eb;
		margin-bottom: 0.5rem;
	}

	@media (max-width: 768px) {
		.interactive-transformer-example {
			padding: 1rem;
		}

		.metadata-grid {
			grid-template-columns: 1fr;
		}

		.structure-details {
			grid-template-columns: 1fr;
		}
	}
</style>