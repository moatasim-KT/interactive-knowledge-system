<script lang="ts">
	import type { ContentBlock } from '$lib/types/content.js';
	import type { MediaFile } from '$lib/types/media';
	import { createEventDispatcher } from 'svelte';
	import ResponsiveImage from './ResponsiveImage.svelte';
	import LazyMedia from './LazyMedia.svelte';
	import MediaUpload from './MediaUpload.svelte';

	// Props
	interface Props {
		block: ContentBlock;
		isSelected: boolean;
		onupdate?: (event: CustomEvent<Partial<ContentBlock>>) => void;
	}

	let { block, isSelected }: Props = $props();

	// Event dispatcher for updates
	const dispatch = createEventDispatcher<{
		update: Partial<ContentBlock>;
	}>();

	// Update content and dispatch change
	function update_content(new_content: Partial<ContentBlock['content']>) {
		dispatch('update', {
			content: new_content,
			metadata: {
				...block.metadata,
				modified: new Date(),
				version: block.metadata.version + 1
			}
		});
	}

	// Text editor state
	let text_editor = $state<HTMLDivElement>();

	// Handle text content changes
	function handle_text_input() {
		if (text_editor && block.type === 'text') {
			update_content({
				html: text_editor.innerHTML
			});
		}
	}

	// Handle media upload
	function handle_media_upload(e: CustomEvent<MediaFile>) {
		const media_file = e.detail;
		update_content({
			...block.content,
			src: media_file.url,
			title: media_file.name,
			mediaId: media_file.id,
			thumbnailUrl: media_file.thumbnailUrl,
			optimized: media_file.optimized,
			metadata: {
				width: media_file.metadata.width,
				height: media_file.metadata.height,
				duration: media_file.metadata.duration
			}
		});
	}

	function handle_media_upload_error(e: CustomEvent<string>) {
		const error = e.detail;
		console.error('Media upload error:', error);
		// You could show a toast notification here
	}

	// Handle quiz option changes
	function update_quiz_option(index: number, value: string) {
		if (block.type === 'quiz') {
			const new_options = [...(block.content.options || [])];
			new_options[index] = value;
			update_content({
				...block.content,
				options: new_options
			});
		}
	}

	function add_quiz_option() {
		if (block.type === 'quiz') {
			const new_options = [...(block.content.options || []), 'New option'];
			update_content({
				...block.content,
				options: new_options
			});
		}
	}

	function remove_quiz_option(index: number) {
		if (block.type === 'quiz') {
			const new_options = [...(block.content.options || [])];
			new_options.splice(index, 1);
			update_content({
				...block.content,
				options: new_options
			});
		}
	}
</script>

<div class="content-block" class:selected={isSelected}>
	{#if block.type === 'text'}
		<div
			class="text-editor"
			contenteditable="true"
			bind:this={text_editor}
			oninput={handle_text_input}
			onblur={handle_text_input}
		>
			{@html block.content.html || '<p>Enter your text here...</p>'}
		</div>
	{:else if block.type === 'image'}
		<div class="image-block">
			{#if block.content.src}
				<ResponsiveImage
					src={block.content.src}
					alt={block.content.alt || ''}
					webpSrc={block.content.optimized?.webp}
					sizes={block.content.optimized?.sizes}
					caption={block.content.caption}
					lazyLoad={true}
					width={block.content.metadata?.width}
					height={block.content.metadata?.height}
					class="block-image"
				/>
			{:else if isSelected}
				<MediaUpload
					accept="image/*"
					onupload={handle_media_upload}
					onerror={handle_media_upload_error}
					class="image-upload"
				/>
			{:else}
				<div class="image-placeholder">
					<span>📷 No image selected</span>
				</div>
			{/if}

			{#if isSelected && block.content.src}
				<div class="image-controls">
					<input
						type="text"
						placeholder="Alt text"
						value={block.content.alt || ''}
						oninput={(e) =>
							update_content({
								...block.content,
								alt: (e.currentTarget as HTMLInputElement).value
							})}
						class="text-input"
					/>

					<input
						type="text"
						placeholder="Caption"
						value={block.content.caption || ''}
						oninput={(e) =>
							update_content({
								...block.content,
								caption: (e.currentTarget as HTMLInputElement).value
							})}
						class="text-input"
					/>
				</div>
			{/if}
		</div>
	{:else if block.type === 'video'}
		<div class="video-block">
			{#if block.content.src}
				<LazyMedia
					src={block.content.src}
					type="video"
					controls={true}
					poster={block.content.thumbnailUrl}
					width={block.content.metadata?.width}
					height={block.content.metadata?.height}
					class="block-video"
				/>
			{:else if isSelected}
				<MediaUpload
					accept="video/*"
					onupload={handle_media_upload}
					onerror={handle_media_upload_error}
					class="video-upload"
				/>
			{:else}
				<div class="video-placeholder">
					<span>🎥 No video selected</span>
				</div>
			{/if}

			{#if isSelected && block.content.src}
				<div class="video-controls">
					<input
						type="text"
						placeholder="Video title"
						value={block.content.title || ''}
						oninput={(e) =>
							update_content({
								...block.content,
								title: (e.currentTarget as HTMLInputElement).value
							})}
						class="text-input"
					/>

					<textarea
						placeholder="Video description"
						value={block.content.description || ''}
						oninput={(e) =>
							update_content({
								...block.content,
								description: (e.currentTarget as HTMLTextAreaElement).value
							})}
						class="textarea-input"
						rows="3"
					></textarea>

					{#if block.content.metadata?.duration}
						<div class="video-info">
							Duration: {Math.round(block.content.metadata.duration)}s
							{#if block.content.metadata.width && block.content.metadata.height}
								• {block.content.metadata.width}×{block.content.metadata.height}
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{:else if block.type === 'code'}
		<div class="code-block">
			<!-- Fallback to simple textarea for now -->
			<div class="code-fallback">
				{#if isSelected}
					<div class="code-controls">
						<select
							value={block.content.language || 'javascript'}
							onchange={(e) =>
								update_content({
									...block.content,
									language: (e.currentTarget as HTMLSelectElement).value
								})}
							class="language-select"
						>
							<option value="javascript">JavaScript</option>
							<option value="typescript">TypeScript</option>
							<option value="python">Python</option>
							<option value="html">HTML</option>
							<option value="css">CSS</option>
							<option value="json">JSON</option>
							<option value="markdown">Markdown</option>
						</select>
					</div>
				{/if}

				<textarea
					value={block.content.code || ''}
					oninput={(e) =>
						update_content({
							...block.content,
							code: (e.currentTarget as HTMLTextAreaElement).value
						})}
					class="code-textarea"
					placeholder="Enter your code here..."
					spellcheck="false"
				></textarea>
			</div>
		</div>
	{:else if block.type === 'quiz'}
		<div class="quiz-block">
			{#if isSelected}
				<div class="quiz-controls">
					<input
						type="text"
						placeholder="Enter your question"
						value={block.content.question || ''}
						oninput={(e) =>
							update_content({
								...block.content,
								question: (e.currentTarget as HTMLInputElement).value
							})}
						class="question-input"
					/>

					<select
						value={block.content.type || 'multiple-choice'}
						onchange={(e) =>
							update_content({
								...block.content,
								type: (e.currentTarget as HTMLSelectElement).value
							})}
						class="quiz-type-select"
					>
						<option value="multiple-choice">Multiple Choice</option>
						<option value="true-false">True/False</option>
						<option value="fill-blank">Fill in the Blank</option>
					</select>
				</div>

				{#if block.content.type === 'multiple-choice'}
					<div class="quiz-options">
						{#each block.content.options || [] as option, index}
							<div class="quiz-option">
								<input
									type="radio"
									name="correct-{block.id}"
									checked={block.content.correctAnswer === index}
									onchange={() =>
										update_content({
											...block.content,
											correctAnswer: index
										})}
								/>
								<input
									type="text"
									value={option}
									oninput={(e) => update_quiz_option(index, (e.currentTarget as HTMLInputElement).value)}
									class="option-input"
								/>
								<button
									onclick={() => remove_quiz_option(index)}
									class="remove-option-btn"
									type="button"
								>
									❌
								</button>
							</div>
						{/each}

						<button onclick={add_quiz_option} class="add-option-btn" type="button">
							➕ Add Option
						</button>
					</div>
				{:else if block.content.type === 'true-false'}
					<div class="true-false-options">
						<label>
							<input
								type="radio"
								name="tf-{block.id}"
								value="true"
								checked={block.content.correctAnswer === true}
								onchange={() =>
									update_content({
										...block.content,
										correctAnswer: true
									})}
							/>
							True
						</label>
						<label>
							<input
								type="radio"
								name="tf-{block.id}"
								value="false"
								checked={block.content.correctAnswer === false}
								onchange={() =>
									update_content({
										...block.content,
										correctAnswer: false
									})}
							/>
							False
						</label>
					</div>
				{:else if block.content.type === 'fill-blank'}
					<div class="fill-blank-controls">
						<input
							type="text"
							placeholder="Correct answer"
							value={block.content.correctAnswer || ''}
							oninput={(e) =>
								update_content({
									...block.content,
									correctAnswer: (e.currentTarget as HTMLInputElement).value
								})}
							class="answer-input"
						/>
					</div>
				{/if}
			{:else}
				<div class="quiz-preview">
					<h4>{block.content.question || 'Quiz Question'}</h4>
					<p class="quiz-type">Type: {block.content.type || 'multiple-choice'}</p>
				</div>
			{/if}
		</div>
	{:else if block.type === 'flashcard'}
		<div class="flashcard-block">
			{#if isSelected}
				<div class="flashcard-editor">
					<div class="flashcard-side">
						<label for="flashcard-front-{block.id}">Front:</label>
						<textarea
							id="flashcard-front-{block.id}"
							value={block.content.front || ''}
							oninput={(e) =>
								update_content({
									...block.content,
									front: (e.currentTarget as HTMLTextAreaElement).value
								})}
							class="flashcard-textarea"
							placeholder="Front of the card"
						></textarea>
					</div>

					<div class="flashcard-side">
						<label for="flashcard-back-{block.id}">Back:</label>
						<textarea
							id="flashcard-back-{block.id}"
							value={block.content.back || ''}
							oninput={(e) =>
								update_content({
									...block.content,
									back: (e.currentTarget as HTMLTextAreaElement).value
								})}
							class="flashcard-textarea"
							placeholder="Back of the card"
						></textarea>
					</div>
				</div>
			{:else}
				<div class="flashcard-preview">
					<div class="flashcard-front">
						<strong>Front:</strong>
						{block.content.front || 'Front of card'}
					</div>
					<div class="flashcard-back">
						<strong>Back:</strong>
						{block.content.back || 'Back of card'}
					</div>
				</div>
			{/if}
		</div>
	{:else if block.type === 'diagram'}
		<div class="diagram-block">
			<div class="diagram-placeholder">
				<span>📊 Diagram support coming soon</span>
				<p>This will support flowcharts, mind maps, and other visual diagrams.</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.content-block {
		padding: 1rem;
		min-height: 100px;
	}

	.content-block.selected {
		background: rgba(0, 123, 255, 0.05);
	}

	/* Text Editor */
	.text-editor {
		min-height: 100px;
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		outline: none;
		line-height: 1.6;
	}

	.text-editor:focus {
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}

	/* Image Block */
	.image-block {
		text-align: center;
	}

	.image-placeholder,
	.video-placeholder,
	.diagram-placeholder {
		padding: 3rem;
		border: 2px dashed #ddd;
		border-radius: 8px;
		color: #666;
		background: #f9f9f9;
	}

	.image-controls,
	.video-controls {
		margin-top: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Video Block */

	/* Code Block */
	.code-controls {
		margin-bottom: 0.5rem;
	}

	.language-select {
		padding: 0.25rem 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		font-size: 0.9rem;
	}

	.code-textarea {
		width: 100%;
		min-height: 150px;
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: #f8f9fa;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.9rem;
		line-height: 1.4;
		resize: vertical;
	}

	.code-textarea:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}

	/* Quiz Block */
	.quiz-controls {
		margin-bottom: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.question-input {
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 1.1rem;
		font-weight: 500;
	}

	.quiz-type-select {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
	}

	.quiz-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.quiz-option {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border: 1px solid #eee;
		border-radius: 4px;
		background: white;
	}

	.option-input {
		flex: 1;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.remove-option-btn {
		padding: 0.25rem;
		border: none;
		background: transparent;
		cursor: pointer;
		border-radius: 4px;
	}

	.remove-option-btn:hover {
		background: rgba(220, 53, 69, 0.1);
	}

	.add-option-btn {
		padding: 0.5rem 1rem;
		border: 1px dashed #007bff;
		background: transparent;
		color: #007bff;
		border-radius: 4px;
		cursor: pointer;
	}

	.add-option-btn:hover {
		background: rgba(0, 123, 255, 0.1);
	}

	.true-false-options {
		display: flex;
		gap: 2rem;
		margin-top: 1rem;
	}

	.true-false-options label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.fill-blank-controls {
		margin-top: 1rem;
	}

	.answer-input {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
	}

	.quiz-preview {
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
	}

	.quiz-preview h4 {
		margin: 0 0 0.5rem 0;
		color: #333;
	}

	.quiz-type {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
	}

	/* Flashcard Block */
	.flashcard-block {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.flashcard-side label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	.flashcard-textarea {
		width: 100%;
		min-height: 100px;
		padding: 0.75rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		resize: vertical;
	}

	.flashcard-preview {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.flashcard-front,
	.flashcard-back {
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		min-height: 100px;
	}

	/* Common Input Styles */
	.text-input,
	.textarea-input {
		padding: 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
	}

	.text-input:focus,
	.textarea-input:focus {
		outline: none;
		border-color: #007bff;
		box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
	}

	.textarea-input {
		resize: vertical;
		font-family: inherit;
	}
</style>