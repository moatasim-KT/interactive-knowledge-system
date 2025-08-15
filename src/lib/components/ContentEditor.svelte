<script lang="ts">

	import type { ContentBlock, EditorState } from '$lib/types/unified.js';
	import { appState, actions } from '$lib/stores/appState.svelte.js';
	import ContentBlockComponent from './ContentBlockComponent.svelte';

	// Props
	type Props = {
		initialBlocks?: ContentBlock[];
		onsave?: (blocks: ContentBlock[]) => void;
		autoSave?: boolean;
		autoSaveDelay?: number;
	}

	let { initialBlocks = [], onsave, autoSave = true, autoSaveDelay = 1000 }: Props = $props();

	// Editor state using Svelte 5 runes
	let editor_state = $state<EditorState>({
		blocks: [...initialBlocks],
		selectedBlock: null,
		isEditing: false,
		history: [structuredClone(initialBlocks)]
	});

	// Auto-save functionality with debouncing
	let auto_save_timeout: number | null = null;

	$effect(() => {
		if (autoSave && editor_state.blocks.length > 0) {
			if (auto_save_timeout) {
				clearTimeout(auto_save_timeout);
			}

			auto_save_timeout = setTimeout(() => {
				save_content();
			}, autoSaveDelay) as unknown as number;
		}
	});

	// Drag and drop state
	let dragged_block_index = $state<number | null>(null);
	let drop_target_index = $state<number | null>(null);

	// Create new content block
	function create_block(type: ContentBlock['type']): ContentBlock {
		return {
			id: crypto.randomUUID(),
			type,
			content: get_default_content(type),
			metadata: {
				created: new Date(),
				modified: new Date(),
				version: 1
			}
		};
	}

	// Get default content for block type
	function get_default_content(type: ContentBlock['type']) {
		switch (type) {
			case 'text':
				return { html: '<p>Enter your text here...</p>' };
			case 'image':
				return { src: '', alt: '', caption: '' };
			case 'video':
				return { src: '', title: '', description: '' };
			case 'code':
				return {
					code: '// Enter your code here',
					language: 'javascript',
					title: '',
					description: '',
					executable: true,
					version: 1,
					history: []
				};
			case 'quiz':
				return {
					question: 'Enter your question',
					type: 'multiple-choice',
					options: ['Option 1', 'Option 2'],
					correctAnswer: 0
				};
			case 'flashcard':
				return { front: 'Front of card', back: 'Back of card' };
			case 'diagram':
				return { type: 'flowchart', data: {} };
			default:
				return {};
		}
	}

	// Add new block
	function add_block(type: ContentBlock['type'], index?: number) {
		const new_block = create_block(type);
		const insert_index = index !== undefined ? index : editor_state.blocks.length;

		// Save current state to history
		save_to_history();

		// Insert the new block
		editor_state.blocks.splice(insert_index, 0, new_block);
		editor_state.selectedBlock = new_block.id;
		editor_state.isEditing = true;

		actions.addNotification({
			type: 'success',
			message: `Added new ${type} block`
		});
	}

	// Remove block
	function remove_block(block_id: string) {
		const index = editor_state.blocks.findIndex((b) => b.id === block_id);
		if (index > -1) {
			save_to_history();
			editor_state.blocks.splice(index, 1);

			if (editor_state.selectedBlock === block_id) {
				editor_state.selectedBlock = null;
			}

			actions.addNotification({
				type: 'info',
				message: 'Block removed'
			});
		}
	}

	// Update block content
	function update_block(block_id: string, updates: Partial<ContentBlock>) {
		const block = editor_state.blocks.find((b) => b.id === block_id);
		if (block) {
			Object.assign(block, updates);
			block.metadata.modified = new Date();
			block.metadata.version += 1;
		}
	}

	// Drag and drop handlers
	function handle_drag_start(event: DragEvent, index: number) {
		if (!event.dataTransfer) return;

		dragged_block_index = index;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', index.toString());

		// Add visual feedback
		const target = event.target as HTMLElement;
		target.style.opacity = '0.5';
	}

	function handle_drag_end(event: DragEvent) {
		const target = event.target as HTMLElement;
		target.style.opacity = '1';

		dragged_block_index = null;
		drop_target_index = null;
	}

	function handle_drag_over(event: DragEvent, index: number) {
		event.preventDefault();
		if (!event.dataTransfer) return;

		event.dataTransfer.dropEffect = 'move';
		drop_target_index = index;
	}

	function handle_drop(event: DragEvent, target_index: number) {
		event.preventDefault();

		if (dragged_block_index === null || dragged_block_index === target_index) {
			return;
		}

		save_to_history();

		// Reorder blocks
		const dragged_block = editor_state.blocks[dragged_block_index];
		editor_state.blocks.splice(dragged_block_index, 1);

		// Adjust target index if dragging from above
		const adjusted_index = dragged_block_index < target_index ? target_index - 1 : target_index;
		editor_state.blocks.splice(adjusted_index, 0, dragged_block);

		actions.addNotification({
			type: 'success',
			message: 'Block reordered'
		});
	}

	// History management
	function save_to_history() {
		const current_state = structuredClone(editor_state.blocks);
		editor_state.history.push(current_state);

		// Limit history size
		if (editor_state.history.length > 50) {
			editor_state.history.shift();
		}
	}

	function undo() {
		if (editor_state.history.length > 1) {
			editor_state.history.pop(); // Remove current state
			const previous_state = editor_state.history[editor_state.history.length - 1];
			editor_state.blocks = structuredClone(previous_state);

		actions.addNotification({
				type: 'info',
				message: 'Undid last action'
			});
		}
	}

	// Save content
	function save_content() {
		if (onsave) {
			onsave(editor_state.blocks);
		}

		actions.addNotification({
			type: 'success',
			message: 'Content saved'
		});
	}

	// Select block
	function select_block(block_id: string | null) {
		editor_state.selectedBlock = block_id;
		editor_state.isEditing = block_id !== null;
	}

	// Keyboard shortcuts
	function handle_keydown(event: KeyboardEvent) {
		if (event.ctrlKey || event.metaKey) {
			switch (event.key) {
				case 'z':
					event.preventDefault();
					undo();
					break;
				case 's':
					event.preventDefault();
					save_content();
					break;
			}
		}
	}
</script>

<svelte:window onkeydown={handle_keydown} />

<div class="content-editor">
	<!-- Toolbar -->
	<div class="toolbar">
		<div class="toolbar-section">
			<h3>Content Editor</h3>
		</div>

		<div class="toolbar-section">
			<button class="toolbar-btn" onclick={() => add_block('text')} title="Add Text Block">
				📝 Text
			</button>

			<button class="toolbar-btn" onclick={() => add_block('image')} title="Add Image Block">
				🖼️ Image
			</button>

			<button class="toolbar-btn" onclick={() => add_block('video')} title="Add Video Block">
				🎥 Video
			</button>

			<button class="toolbar-btn" onclick={() => add_block('code')} title="Add Code Block">
				💻 Code
			</button>

			<button class="toolbar-btn" onclick={() => add_block('quiz')} title="Add Quiz Block">
				❓ Quiz
			</button>

			<button class="toolbar-btn" onclick={() => add_block('flashcard')} title="Add Flashcard Block">
				🃏 Flashcard
			</button>
		</div>

		<div class="toolbar-section">
			<button
				class="toolbar-btn"
				onclick={undo}
				disabled={editor_state.history.length <= 1}
				title="Undo (Ctrl+Z)"
			>
				↶ Undo
			</button>

			<button class="toolbar-btn primary" onclick={save_content} title="Save (Ctrl+S)">
				💾 Save
			</button>
		</div>
	</div>

	<!-- Content Blocks -->
	<div class="editor-content">
		{#if editor_state.blocks.length === 0}
			<div class="empty-state">
				<h4>Start creating your content</h4>
				<p>Add your first content block using the toolbar above.</p>
			</div>
		{:else}
			{#each editor_state.blocks as block, index (block.id)}
				<div
					class="block-container"
					class:selected={editor_state.selectedBlock === block.id}
					class:drop-target={drop_target_index === index}
					draggable="true"
					ondragstart={(e) => handle_drag_start(e, index)}
					ondragend={handle_drag_end}
					ondragover={(e) => handle_drag_over(e, index)}
					ondrop={(e) => handle_drop(e, index)}
					onclick={() => select_block(block.id)}
					onkeydown={(e) => e.key === 'Enter' && select_block(block.id)}
					role="button"
					tabindex="0"
				>
					<div class="block-header">
						<span class="block-type">{block.type}</span>
						<div class="block-actions">
							<button
								class="block-action-btn"
								onclick={(e) => {
									e.stopPropagation();
									add_block('text', index + 1);
								}}
								title="Add block below"
							>
								➕
							</button>
							<button
								class="block-action-btn danger"
								onclick={(e) => {
									e.stopPropagation();
									remove_block(block.id);
								}}
								title="Remove block"
							>
								🗑️
							</button>
						</div>
					</div>

					<ContentBlockComponent
						{block}
						isSelected={editor_state.selectedBlock === block.id}
						onupdate={(e) => update_block(block.id, e)}
					/>
				</div>
			{/each}
		{/if}
	</div>

	<!-- Status Bar -->
	<div class="status-bar">
		<span class="status-item">
			{editor_state.blocks.length} blocks
		</span>

		{#if autoSave}
			<span class="status-item"> Auto-save enabled </span>
		{/if}

		{#if editor_state.selectedBlock}
			<span class="status-item">
				Selected: {editor_state.blocks.find((b) => b.id === editor_state.selectedBlock)?.type}
			</span>
		{/if}
	</div>
</div>

<style>
	.content-editor {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: #fff;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid #e0e0e0;
		background: #f8f9fa;
		border-radius: 8px 8px 0 0;
	}

	.toolbar-section {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.toolbar-section h3 {
		margin: 0;
		color: #333;
	}

	.toolbar-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		background: #fff;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.toolbar-btn:hover:not(:disabled) {
		background: #f0f0f0;
		border-color: #ccc;
	}

	.toolbar-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toolbar-btn.primary {
		background: #007bff;
		color: white;
		border-color: #007bff;
	}

	.toolbar-btn.primary:hover:not(:disabled) {
		background: #0056b3;
		border-color: #0056b3;
	}

	.editor-content {
		flex: 1;
		padding: 1rem;
		overflow-y: auto;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		color: #666;
	}

	.empty-state h4 {
		margin: 0 0 1rem 0;
		color: #333;
	}

	.block-container {
		margin-bottom: 1rem;
		border: 2px solid transparent;
		border-radius: 8px;
		background: #f9f9f9;
		transition: all 0.2s;
		cursor: pointer;
	}

	.block-container:hover {
		border-color: #ddd;
	}

	.block-container.selected {
		border-color: #007bff;
		background: #f0f8ff;
	}

	.block-container.drop-target {
		border-color: #28a745;
		background: #f0fff0;
	}

	.block-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		background: rgba(0, 0, 0, 0.05);
		border-radius: 8px 8px 0 0;
		font-size: 0.9rem;
	}

	.block-type {
		font-weight: 600;
		text-transform: capitalize;
		color: #555;
	}

	.block-actions {
		display: flex;
		gap: 0.25rem;
	}

	.block-action-btn {
		padding: 0.25rem 0.5rem;
		border: none;
		background: transparent;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8rem;
		transition: background 0.2s;
	}

	.block-action-btn:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	.block-action-btn.danger:hover {
		background: rgba(220, 53, 69, 0.1);
		color: #dc3545;
	}

	.status-bar {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1rem;
		border-top: 1px solid #e0e0e0;
		background: #f8f9fa;
		border-radius: 0 0 8px 8px;
		font-size: 0.9rem;
		color: #666;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
</style>