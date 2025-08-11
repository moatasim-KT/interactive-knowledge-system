<script lang="ts">
	import { onMount, createEventDispatcher } from 'svelte';
	import { EditorView, basicSetup } from 'codemirror';
	import { EditorState } from '@codemirror/state';
	import { javascript } from '@codemirror/lang-javascript';
	import { python } from '@codemirror/lang-python';
	import { html } from '@codemirror/lang-html';
	import { css } from '@codemirror/lang-css';
	import { json } from '@codemirror/lang-json';
	import { markdown } from '@codemirror/lang-markdown';
	import { oneDark } from '@codemirror/theme-one-dark';
	import { linter, lintGutter } from '@codemirror/lint';
	import type { CodeBlockContent, CodeExecutionResult } from '$lib/types/code';
	import { SUPPORTED_LANGUAGES } from '$lib/types/code';
	import { codeExecutionService } from '$lib/utils/codeExecution.js';
	import { codeVersioningService } from '$lib/utils/codeVersioning.js';

	// Props
	interface Props {
		content: CodeBlockContent;
		readonly?: boolean;
		theme?: 'light' | 'dark';
		showLineNumbers?: boolean;
		showExecuteButton?: boolean;
		showVersionHistory?: boolean;
		height?: string;
		onContentChange?: (content: CodeBlockContent) => void;
	}

	let {
		content = $bindable(),
		readonly = false,
		theme = 'light',
		showLineNumbers = true,
		showExecuteButton = true,
		showVersionHistory = true,
		height = '300px',
		onContentChange
	}: Props = $props();

	// Event dispatcher
	const dispatch = createEventDispatcher<{ 
		execute: CodeExecutionResult;
		save: CodeBlockContent;
		versionCreated: CodeBlockContent;
	}>();

	// Component state
	let editorContainer;
	let editorView = null;
	let isExecuting = $state(false);
	let executionResult = $state<CodeExecutionResult | null>(null);
	let showVersionPanel = $state(false);
	let versionHistory = $state(codeVersioningService.getVersionHistory(content));

	// Language support mapping
	const languageSupport = {
		javascript: javascript(),
		typescript: javascript({ typescript: true }),
		python: python(),
		html: html(),
		css: css(),
		json: json(),
		markdown: markdown()
	};

	// Initialize editor on mount
	onMount(() => {
		createEditor();
		return () => {
			if (editorView) {
				editorView.destroy();
			}
		};
	});

	// Recreate editor when language changes
	$effect(() => {
		if (editorView && content.language) {
			createEditor();
		}
	});

	function createEditor() {
		if (editorView) {
			editorView.destroy();
		}

		const extensions = [
			basicSetup,
			EditorView.theme({
				'&': { height: height },
				'.cm-scroller': { fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' },
				'.cm-focused': { outline: 'none' }
			}),
			EditorView.updateListener.of((update) => {
				if (update.docChanged && !readonly) {
					const newCode = update.state.doc.toString();
					updateContent({ code: newCode });
				}
			})
		];

		// Add language support
		const langSupport = languageSupport[content.language as keyof typeof languageSupport];
		if (langSupport) {
			extensions.push(langSupport);
		}

		// Add theme
		if (theme === 'dark') {
			extensions.push(oneDark);
		}

		// Add linting for supported languages
		if (content.language === 'javascript' || content.language === 'typescript') {
			extensions.push(linter(jsLinter), lintGutter());
		}

		// Create editor state
		const state = EditorState.create({
			doc: content.code || '',
			extensions
		});

		// Create editor view
		editorView = new EditorView({
			state,
			parent: editorContainer
		});

		// Set readonly if needed
		if (readonly) {
			editorView.dispatch({
				effects: EditorView.editable.of(false)
			});
		}
	}

	// Simple JavaScript linter
	function jsLinter(view: EditorView) {
		const diagnostics = [];
		const code = view.state.doc.toString();

		try {
			// Basic syntax check using Function constructor
			new Function(code);
		} catch (error) {
			if (error instanceof SyntaxError) {
				// Try to extract line number from error message
				const lineMatch = error.message.match(/line (\d+)/);
				const line = lineMatch ? parseInt(lineMatch[1]) - 1 : 0;
				const pos = view.state.doc.line(Math.min(line + 1, view.state.doc.lines)).from;

				diagnostics.push({
					from: pos,
					to: pos + 1,
					severity: 'error',
					message: error.message
				});
			}
		}

		return diagnostics;
	}

	function updateContent(updates: Partial<CodeBlockContent>) {
		content = { ...content, ...updates };
		if (onContentChange) {
			onContentChange(content);
		}
	}

	async function executeCode() {
		if (!codeExecutionService.isLanguageExecutable(content.language)) {
			executionResult = {
				success: false,
				error: `Execution not supported for ${content.language}`,
				executionTime: 0,
				timestamp: new Date()
			};
			return;
		}

		isExecuting = true;
		executionResult = null;

		try {
			const result = await codeExecutionService.executeCode(content.code, content.language);
			executionResult = result;

			updateContent({
				output: result.output,
				error: result.error,
				lastExecuted: result.timestamp
			});

			dispatch('execute', result);
		} catch (error) {
			executionResult = {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown execution error',
				executionTime: 0,
				timestamp: new Date()
			};
		} finally {
			isExecuting = false;
		}
	}

	function saveVersion(description?: string) {
		const newContent = codeVersioningService.createVersion(
			content,
			content.code,
			description,
			'User'
		);

		content = newContent;
		versionHistory = codeVersioningService.getVersionHistory(content);

		dispatch('versionCreated', newContent);
		if (onContentChange) {
			onContentChange(newContent);
		}
	}

	function restoreVersion(versionId) {
		const restoredContent = codeVersioningService.restoreToVersion(content, versionId);
		if (restoredContent) {
			content = restoredContent;
			versionHistory = codeVersioningService.getVersionHistory(content);

			// Update editor content
			if (editorView) {
				editorView.dispatch({
					changes: {
						from: 0,
						to: editorView.state.doc.length,
						insert: content.code
					}
				});
			}

			if (onContentChange) {
				onContentChange(content);
			}
		}
	}

	function exportVersionHistory() {
		const exportData = codeVersioningService.exportVersionHistory(content);
		const blob = new Blob([exportData], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = `code-history-${content.title || 'untitled'}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function formatCode() {
		// Basic code formatting (could be enhanced with prettier or similar)
		let formattedCode = content.code;

		if (content.language === 'javascript' || content.language === 'typescript') {
			// Basic JavaScript formatting
			formattedCode = formattedCode
				.replace(/;/g, ';
')
				.replace(/{/g, '{
')
				.replace(/}/g, '\n}')
				.replace(/\n\s*\n/g, '\n');
		}

		if (editorView) {
			editorView.dispatch({
				changes: {
					from: 0,
					to: editorView.state.doc.length,
					insert: formattedCode
				}
			});
		}

		updateContent({ code: formattedCode });
	}

	// Get current language info
	let currentLanguage = $derived(SUPPORTED_LANGUAGES.find((lang) => lang.id === content.language));
	let isExecutable = $derived(currentLanguage?.executable && showExecuteButton);
</script>

<div class="code-editor" class:dark={theme === 'dark'}>
	<!-- Header -->
	<div class="editor-header">
		<div class="editor-info">
			<select bind:value={content.language} disabled={readonly} class="language-select">
				{#each SUPPORTED_LANGUAGES as lang (lang.id)}
					<option value={lang.id}>{lang.name}</option>
				{/each}
			</select>

			{#if content.title}
				<span class="code-title">{content.title}</span>
			{/if}

			<span class="version-info">v{content.version}</span>
		</div>

		<div class="editor-actions">
			{#if !readonly}
				<button onclick={formatCode} class="action-btn" title="Format code"> 🎨 </button>

				<button onclick={() => saveVersion()} class="action-btn" title="Save version"> 💾 </button>
			{/if}

			{#if showVersionHistory}
				<button
					onclick={() => (showVersionPanel = !showVersionPanel)}
					class="action-btn"
					class:active={showVersionPanel}
					title="Version history"
				>
					📚
				</button>
			{/if}

			{#if isExecutable}
				<button
					onclick={executeCode}
					disabled={isExecuting || readonly}
					class="action-btn execute-btn"
					title="Execute code"
				>
					{#if isExecuting}
						⏳
					{:else}
						▶️
					{/if}
				</button>
			{/if}
		</div>
	</div>

	<!-- Editor Container -->
	<div class="editor-container">
		<div bind:this={editorContainer} class="editor-mount"></div>
	</div>

	<!-- Execution Output -->
	{#if executionResult}
		<div class="execution-output" class:error={!executionResult.success}>
			<div class="output-header">
				<span class="output-label">
					{executionResult.success ? '✅ Output' : '❌ Error'}
				</span>
				<span class="execution-time">
					{executionResult.executionTime.toFixed(2)}ms
				</span>
			</div>
			<pre class="output-content">{executionResult.success
					? executionResult.output
					: executionResult.error}</pre>
		</div>
	{/if}

	<!-- Version History Panel -->
	{#if showVersionPanel}
		<div class="version-panel">
			<div class="version-header">
				<h4>Version History</h4>
				<div class="version-actions">
					<button onclick={exportVersionHistory} class="action-btn" title="Export history">
						📤
					</button>
					<button onclick={() => (showVersionPanel = false)} class="action-btn"> ✖️ </button>
				</div>
			</div>

			<div class="version-list">
				{#each versionHistory as version (version.id)}
					<div class="version-item" class:current={version.id === 'current'}>
						<div class="version-info">
							<div class="version-meta">
								<span class="version-description">{version.description}</span>
								<span class="version-author">{version.author}</span>
							</div>
							<div class="version-timestamp">
								{version.timestamp.toLocaleString()}
							</div>
							{#if version.diffStats}
								<div class="diff-stats">
									{#if version.diffStats.added > 0}
										<span class="diff-added">+{version.diffStats.added}</span>
									{/if}
									{#if version.diffStats.removed > 0}
										<span class="diff-removed">-{version.diffStats.removed}</span>
									{/if}
									{#if version.diffStats.modified > 0}
										<span class="diff-modified">~{version.diffStats.modified}</span>
									{/if}
								</div>
							{/if}
						</div>

					{#if version.id !== 'current' && !readonly}
						<button
							onclick={() => restoreVersion(version.id)}
							class="restore-btn"
							title="Restore this version"
						>
							↶
						</button>
					{/if}
					{/each}
				</div>
			</div>
		{/if}
</div>

<style>
	.code-editor {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		background: #fff;
		overflow: hidden;
	}

	.code-editor.dark {
		border-color: #333;
		background: #1e1e1e;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
	}

	.dark .editor-header {
		background: #2d2d2d;
		border-bottom-color: #444;
	}

	.editor-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.language-select {
		padding: 0.25rem 0.5rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		background: white;
		font-size: 0.9rem;
	}

	.dark .language-select {
		background: #333;
		border-color: #555;
		color: white;
	}

	.code-title {
		font-weight: 600;
		color: #333;
	}

	.dark .code-title {
		color: #fff;
	}

	.version-info {
		font-size: 0.8rem;
		color: #666;
		background: #e9ecef;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
	}

	.dark .version-info {
		background: #444;
		color: #ccc;
	}

	.editor-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		padding: 0.5rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.action-btn:hover:not(:disabled) {
		background: #f0f0f0;
		border-color: #ccc;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-btn.active {
		background: #007bff;
		color: white;
		border-color: #007bff;
	}

	.execute-btn {
		background: #28a745;
		color: white;
		border-color: #28a745;
	}

	.execute-btn:hover:not(:disabled) {
		background: #218838;
		border-color: #1e7e34;
	}

	.dark .action-btn {
		background: #333;
		border-color: #555;
		color: white;
	}

	.dark .action-btn:hover:not(:disabled) {
		background: #444;
		border-color: #666;
	}

	.editor-container {
		position: relative;
	}

	.editor-mount {
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
	}

	.execution-output {
		border-top: 1px solid #e0e0e0;
		background: #f8f9fa;
	}

	.execution-output.error {
		background: #fff5f5;
		border-top-color: #fed7d7;
	}

	.dark .execution-output {
		background: #2d2d2d;
		border-top-color: #444;
	}

	.dark .execution-output.error {
		background: #3d2d2d;
		border-top-color: #644;
	}

	.output-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		font-weight: 600;
	}

	.output-label {
		color: #333;
	}

	.execution-output.error .output-label {
		color: #e53e3e;
	}

	.dark .output-label {
		color: #fff;
	}

	.execution-time {
		color: #666;
		font-size: 0.8rem;
	}

	.dark .execution-time {
		color: #ccc;
	}

	.output-content {
		margin: 0;
		padding: 1rem;
		background: white;
		border: none;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.9rem;
		white-space: pre-wrap;
		overflow-x: auto;
	}

	.execution-output.error .output-content {
		background: #fff5f5;
		color: #e53e3e;
	}

	.dark .output-content {
		background: #1e1e1e;
		color: #fff;
	}

	.dark .execution-output.error .output-content {
		background: #2d1e1e;
		color: #ff6b6b;
	}

	.version-panel {
		border-top: 1px solid #e0e0e0;
		background: #f8f9fa;
		max-height: 300px;
		overflow-y: auto;
	}

	.dark .version-panel {
		background: #2d2d2d;
		border-top-color: #444;
	}

	.version-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e0e0e0;
	}

	.dark .version-header {
		border-bottom-color: #444;
	}

	.version-header h4 {
		margin: 0;
		color: #333;
		font-size: 1rem;
	}

	.dark .version-header h4 {
		color: #fff;
	}

	.version-actions {
		display: flex;
		gap: 0.25rem;
	}

	.version-list {
		padding: 0.5rem;
	}

	.version-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		background: white;
		border: 1px solid #e0e0e0;
		border-radius: 4px;
	}

	.version-item.current {
		border-color: #007bff;
		background: #f0f8ff;
	}

	.dark .version-item {
		background: #333;
		border-color: #555;
	}

	.dark .version-item.current {
		background: #1a365d;
		border-color: #3182ce;
	}

	.version-info {
		flex: 1;
	}

	.version-meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.25rem;
	}

	.version-description {
		font-weight: 600;
		color: #333;
	}

	.dark .version-description {
		color: #fff;
	}

	.version-author {
		font-size: 0.8rem;
		color: #666;
		background: #e9ecef;
		padding: 0.1rem 0.4rem;
		border-radius: 8px;
	}

	.dark .version-author {
		background: #444;
		color: #ccc;
	}

	.version-timestamp {
		font-size: 0.8rem;
		color: #666;
	}

	.dark .version-timestamp {
		color: #ccc;
	}

	.diff-stats {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.25rem;
		font-size: 0.8rem;
	}

	.diff-added {
		color: #28a745;
		font-weight: 600;
	}

	.diff-removed {
		color: #dc3545;
		font-weight: 600;
	}

	.diff-modified {
		color: #ffc107;
		font-weight: 600;
	}

	.restore-btn {
		padding: 0.25rem 0.5rem;
		border: 1px solid #007bff;
		background: transparent;
		color: #007bff;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.restore-btn:hover {
		background: #007bff;
		color: white;
	}

	.dark .restore-btn {
		border-color: #3182ce;
		color: #3182ce;
	}

	.dark .restore-btn:hover {
		background: #3182ce;
		color: white;
	}
</style>
