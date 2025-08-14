<script lang="ts">
	import { appState, actions } from '$lib/stores/appState.svelte';
	import { ContentEditor } from '$lib/components';
	import type { ContentBlock } from '$lib/types/content';

	// Current view state
	let current_view = $state<'demo' | 'editor'>('demo');

	// Sample content for editor
	let sampleBlocks: ContentBlock[] = [
		{
			id: 'sample-text-1',
			type: 'text' as const,
			content: {
				html: '<h2>Welcome to the Content Editor</h2><p>This is a sample text block. You can edit this content directly.</p>'
			},
			metadata: {
				created: new Date(),
				modified: new Date(),
				version: 1
			}
		},
		{
			id: 'sample-code-1',
			type: 'code' as const,
			content: {
				code: 'function hello() {\n  console.log("Hello, World!");\n}',
				language: 'javascript'
			},
			metadata: {
				created: new Date(),
				modified: new Date(),
				version: 1
			}
		}
	];

	// Demo function to test reactive state
	function addSampleContent() {
		const new_node = {
			id: `sample-${Date.now()}`,
			title: `Sample Module ${appState.content.nodes.size + 1}`,
			type: 'module' as const,
			metadata: {
				difficulty: (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
				estimatedTime: Math.floor(Math.random() * 60) + 15,
				prerequisites: [],
				tags: ['sample', 'demo']
			},
			progress: {
				completed: false,
				lastAccessed: new Date()
			}
		};

		actions.addKnowledgeNode(new_node);
		actions.addNotification({
			type: 'success',
			message: `Added new module: ${new_node.title}`
		});
	}

	function testOfflineMode() {
		actions.setOnlineStatus(!appState.sync.isOnline);
		actions.addNotification({
			type: 'info',
			message: `Switched to ${appState.sync.isOnline ? 'online' : 'offline'} mode`
		});
	}

	
	function handleContentSave(blocks: ContentBlock[]) {
		console.log('Content saved:', blocks);
		actions.addNotification({
			type: 'success',
			message: `Saved ${blocks.length} content blocks`
		});
	}
</script>

<div class="app-container">
	<!-- Navigation -->
	<nav class="nav-bar">
		<h1>Interactive Knowledge System</h1>
		<div class="nav-buttons">
			<a class="nav-btn" href="/articles/machine-learning">🧠 ML Article</a>
			<button
				class="nav-btn"
				class:active={current_view === 'demo'}
				onclick={() => (current_view = 'demo')}
			>
				📊 Demo
			</button>
			<button
				class="nav-btn"
				class:active={current_view === 'editor'}
				onclick={() => (current_view = 'editor')}
			>
				✏️ Content Editor
			</button>
		</div>
	</nav>

	<!-- Main Content -->
	<main class="main-content">
		{#if current_view === 'demo'}
			<div class="welcome">
				<h2>Welcome to the Interactive Knowledge System</h2>
				<p>
					This demonstrates the core foundation with Svelte 5 runes-based reactive state management
					and the new Content Editor component.
				</p>

				<div class="demo-actions">
					<h3>Demo Actions</h3>
					<button onclick={addSampleContent}> Add Sample Content </button>
					<button onclick={testOfflineMode}> Toggle Online/Offline Mode </button>
					<button
						onclick={() => actions.addNotification({ type: 'info', message: 'Test notification!' })}
					>
						Show Test Notification
					</button>
				</div>

				<div class="features">
					<h3>Implemented Features</h3>
					<ul>
						<li>✅ TypeScript interfaces for all core data models</li>
						<li>✅ Svelte 5 runes-based reactive state management</li>
						<li>✅ Global application state with derived values</li>
						<li>✅ Side effects using $effect rune</li>
						<li>✅ Auto-save functionality with debouncing</li>
						<li>✅ Online/offline status monitoring</li>
						<li>✅ Notification system</li>
						<li>✅ Content Editor with rich text editing</li>
						<li>✅ Content block system (text, image, video, code, quiz, flashcard)</li>
						<li>✅ Drag-and-drop functionality for reordering blocks</li>
						<li>✅ Keyboard shortcuts (Ctrl+S to save, Ctrl+Z to undo)</li>
					</ul>
				</div>

				<div class="state-debug">
					<h3>Current State (Debug)</h3>
					<details>
						<summary>View Raw State</summary>
						<pre>{JSON.stringify(
								{
									contentNodes: appState.content.nodes.size,
									currentView: appState.ui.currentView,
									isOnline: appState.sync.isOnline,
									notifications: appState.ui.notifications.length,
									searchQuery: appState.content.searchQuery
								},
								null,
								2
							)}</pre>
					</details>
				</div>
			</div>
		{:else if current_view === 'editor'}
			<div class="editor-container">
				<ContentEditor
					initialBlocks={sampleBlocks}
					onsave={handleContentSave}
					autoSave={true}
					autoSaveDelay={2000}
				/>
			</div>
		{/if}
	</main>
</div>

<style>
	.app-container {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.nav-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 2rem;
		background: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
	}

	.nav-bar h1 {
		margin: 0;
		color: #333;
		font-size: 1.5rem;
	}

	.nav-buttons {
		display: flex;
		gap: 0.5rem;
	}

	.nav-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.nav-btn:hover {
		background: #f0f0f0;
	}

	.nav-btn.active {
		background: #007bff;
		color: white;
		border-color: #007bff;
	}

	.main-content {
		flex: 1;
		padding: 2rem;
		background: #f5f5f5;
	}

	.welcome {
		max-width: 800px;
		margin: 0 auto;
		background: white;
		padding: 2rem;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.editor-container {
		max-width: 1200px;
		margin: 0 auto;
		height: calc(100vh - 8rem);
	}

	.demo-actions {
		margin: 2rem 0;
		padding: 1rem;
		border: 1px solid var(--border-color, #e0e0e0);
		border-radius: 8px;
	}

	.demo-actions button {
		margin: 0.5rem;
		padding: 0.5rem 1rem;
		background: #007bff;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.demo-actions button:hover {
		background: #0056b3;
	}

	.features {
		margin: 2rem 0;
	}

	.features ul {
		list-style: none;
		padding: 0;
	}

	.features li {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border-color, #e0e0e0);
	}

	.state-debug {
		margin: 2rem 0;
		padding: 1rem;
		background: var(--bg-color, #f8f9fa);
		border-radius: 8px;
	}

	.state-debug pre {
		background: #f1f3f4;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.9rem;
	}
</style>
