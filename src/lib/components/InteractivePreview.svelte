<script lang="ts">
	import { interactiveDocumentGenerator } from '$lib/services/InteractiveDocumentGenerator.js';
	import type { ContentBlock } from '$lib/types/unified';

	interface Props {
		blocks: ContentBlock[];
	}

	let { blocks }: Props = $props();

	let previewHtml = $derived(interactiveDocumentGenerator.generatePreviewHtml(blocks));
</script>

<div class="interactive-preview">
	<h3>Interactive Preview</h3>
	<div class="preview-content">
		{@html previewHtml}
	</div>
</div>

<style>
	.interactive-preview {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		padding: 1rem;
		background: #fdfdfd;
		box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.05);
		overflow-y: auto;
		max-height: 500px; /* Adjust as needed */
	}

	.interactive-preview h3 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: #333;
		font-size: 1.2rem;
		border-bottom: 1px solid #eee;
		padding-bottom: 0.5rem;
	}

	.preview-content :global(div) {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px dashed #eee;
	}

	.preview-content :global(div:last-child) {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}

	.preview-content :global(h2) {
		color: #0056b3;
		margin-top: 0;
		margin-bottom: 0.5rem;
	}

	.preview-content :global(p) {
		line-height: 1.6;
		color: #555;
	}

	.preview-content :global(pre) {
		background: #e9ecef;
		padding: 0.8rem;
		border-radius: 4px;
		overflow-x: auto;
	}

	.preview-content :global(code) {
		font-family: 'Fira Code', 'Consolas', monospace;
		color: #333;
	}

	.preview-content :global(h4) {
		color: #007bff;
		margin-top: 0;
		margin-bottom: 0.75rem;
	}

	.preview-content :global(ul) {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.preview-content :global(li) {
		background: #f0f8ff;
		border: 1px solid #cce5ff;
		padding: 0.5rem 0.75rem;
		margin-bottom: 0.5rem;
		border-radius: 4px;
		color: #004085;
	}

	.preview-content :global(img) {
		max-width: 100%;
		height: auto;
		display: block;
		margin: 0 auto 0.5rem auto;
		border-radius: 4px;
	}

	.preview-content :global(video) {
		max-width: 100%;
		height: auto;
		display: block;
		margin: 0 auto 0.5rem auto;
		border-radius: 4px;
	}

	.preview-content :global(.preview-visualization),
	.preview-content :global(.preview-chart),
	.preview-content :global(.preview-simulation),
	.preview-content :global(.preview-diagram) {
		background: #e6f7ff;
		border: 1px dashed #91d5ff;
		padding: 1rem;
		text-align: center;
		color: #0056b3;
		font-style: italic;
		border-radius: 4px;
	}

	.preview-content :global(.preview-flashcard) {
		background: #fffbe6;
		border: 1px solid #ffe58f;
		padding: 1rem;
		border-radius: 4px;
		text-align: center;
	}

	.preview-content :global(.preview-flashcard .front) {
		font-weight: bold;
		margin-bottom: 0.5rem;
		color: #874d00;
	}

	.preview-content :global(.preview-flashcard .back) {
		color: #874d00;
	}

	.preview-content :global(.preview-unknown) {
		background: #ffe6e6;
		border: 1px solid #ffb3b3;
		padding: 1rem;
		border-radius: 4px;
		color: #cc0000;
		font-style: italic;
	}
</style>
