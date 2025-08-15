<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { ProcessedDocument, ContentBlock, DocumentSection, TocEntry } from '$lib/types/content.js';
	import type { Question, QuizState } from '$lib/types/interactive.js';
	import Card from './ui/Card.svelte';
	import Button from './ui/Button.svelte';
	import ProgressBar from './ui/ProgressBar.svelte';
	import { generateId } from '$lib/utils/accessibility.js';

	type Props = {
		document: ProcessedDocument;
		showToc?: boolean;
		enableBookmarks?: boolean;
		enableAnnotations?: boolean;
		enableProgressTracking?: boolean;
		class?: string;
	}

	let {
		document,
		showToc = true,
		enableBookmarks = true,
		enableAnnotations = true,
		enableProgressTracking = true,
		class: className = ''
	}: Props = $props();

	// State management
	let currentSection = $state(0);
	let readingProgress = $state(0);
	let bookmarks = $state<string[]>([]);
	let annotations = $state<Map<string, string>>(new Map());
	let expandedSections = $state<Set<string>>(new Set());
	let quizStates = $state<Map<string, QuizState>>(new Map());
	let tocVisible = $state(false);
	let annotationMode = $state(false);
	let selectedText = $state('');
	let annotationTarget = $state<string | null>(null);

	// Refs
	let articleContainer: HTMLElement;
	let tocContainer = $state<HTMLElement>();
	let sections: HTMLElement[] = [];

	// Computed values
	const totalSections = $derived(document.structure.sections.length);
	const progressPercentage = $derived((currentSection / Math.max(totalSections - 1, 1)) * 100);
	const currentSectionData = $derived(document.structure.sections[currentSection]);

	// Initialize component
	$effect(() => {
		setupIntersectionObserver();
		loadUserData();
		setupKeyboardNavigation();
		return () => {
			saveUserData();
		};
	});

	function setupIntersectionObserver() {
		if (!articleContainer) return;

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const sectionIndex = parseInt(entry.target.getAttribute('data-section-index') || '0');
						currentSection = sectionIndex;
						updateReadingProgress();
					}
				});
			},
			{
				root: articleContainer,
				rootMargin: '-20% 0px -60% 0px',
				threshold: 0.1
			}
		);

		sections.forEach((section) => {
			if (section) observer.observe(section);
		});

		return () => observer.disconnect();
	}

	function setupKeyboardNavigation() {
		function handleKeydown(event: KeyboardEvent) {
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (event.key) {
				case 'ArrowUp':
				case 'k':
					event.preventDefault();
					navigateToSection(Math.max(0, currentSection - 1));
					break;
				case 'ArrowDown':
				case 'j':
					event.preventDefault();
					navigateToSection(Math.min(totalSections - 1, currentSection + 1));
					break;
				case 't':
					event.preventDefault();
					tocVisible = !tocVisible;
					break;
				case 'b':
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						toggleBookmark(currentSectionData?.id || '');
					}
					break;
				case 'a':
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						annotationMode = !annotationMode;
					}
					break;
			}
		}

		globalThis.document.addEventListener('keydown', handleKeydown);
		return () => globalThis.document.removeEventListener('keydown', handleKeydown);
	}

	function updateReadingProgress() {
		if (!enableProgressTracking) return;
		
		const scrollTop = articleContainer?.scrollTop || 0;
		const scrollHeight = articleContainer?.scrollHeight || 1;
		const clientHeight = articleContainer?.clientHeight || 1;
		
		readingProgress = Math.min(100, (scrollTop / (scrollHeight - clientHeight)) * 100);
	}

	function navigateToSection(sectionIndex: number) {
		if (sectionIndex < 0 || sectionIndex >= totalSections) return;
		
		const targetSection = sections[sectionIndex];
		if (targetSection) {
			targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
			currentSection = sectionIndex;
		}
	}

	function navigateToTocEntry(entry: TocEntry) {
		const sectionIndex = document.structure.sections.findIndex(s => s.id === entry.id);
		if (sectionIndex >= 0) {
			navigateToSection(sectionIndex);
			tocVisible = false;
		}
	}

	function toggleSection(sectionId: string) {
		if (expandedSections.has(sectionId)) {
			expandedSections.delete(sectionId);
		} else {
			expandedSections.add(sectionId);
		}
		expandedSections = new Set(expandedSections);
	}

	function toggleBookmark(sectionId: string) {
		if (!enableBookmarks) return;
		
		const index = bookmarks.indexOf(sectionId);
		if (index >= 0) {
			bookmarks.splice(index, 1);
		} else {
			bookmarks.push(sectionId);
		}
		bookmarks = [...bookmarks];
	}

	function addAnnotation(sectionId: string, text: string) {
		if (!enableAnnotations || !text.trim()) return;
		
		annotations.set(sectionId, text);
		annotations = new Map(annotations);
		annotationMode = false;
		annotationTarget = null;
	}

	function removeAnnotation(sectionId: string) {
		annotations.delete(sectionId);
		annotations = new Map(annotations);
	}

	function handleTextSelection() {
		if (!annotationMode) return;
		
		const selection = window.getSelection();
		if (selection && selection.toString().trim()) {
			selectedText = selection.toString().trim();
			// Find the closest section
			const range = selection.getRangeAt(0);
			const sectionElement = range.startContainer.parentElement?.closest('[data-section-id]');
			if (sectionElement) {
				annotationTarget = sectionElement.getAttribute('data-section-id');
			}
		}
	}

	function initializeQuiz(blockId: string, questions: Question[]) {
		quizStates.set(blockId, {
			questions,
			currentQuestion: 0,
			answers: new Map(),
			score: 0,
			completed: false
		});
		quizStates = new Map(quizStates);
	}

	function answerQuestion(blockId: string, questionId: string, answer: any) {
		const quizState = quizStates.get(blockId);
		if (!quizState) return;

		quizState.answers.set(questionId, answer);
		
		// Check if quiz is complete
		if (quizState.answers.size === quizState.questions.length) {
			// Calculate score
			let correct = 0;
			quizState.questions.forEach(q => {
				if (quizState.answers.get(q.id) === q.correctAnswer) {
					correct++;
				}
			});
			quizState.score = (correct / quizState.questions.length) * 100;
			quizState.completed = true;
		}

		quizStates.set(blockId, quizState);
		quizStates = new Map(quizStates);
	}

	function loadUserData() {
		try {
			const saved = localStorage.getItem(`article-${document.id}`);
			if (saved) {
				const data = JSON.parse(saved);
				bookmarks = data.bookmarks || [];
				annotations = new Map(data.annotations || []);
				expandedSections = new Set(data.expandedSections || []);
				currentSection = data.currentSection || 0;
			}
		} catch (error) {
			console.warn('Failed to load user data:', error);
		}
	}

	function saveUserData() {
		try {
			const data = {
				bookmarks,
				annotations: Array.from(annotations.entries()),
				expandedSections: Array.from(expandedSections),
				currentSection,
				lastRead: new Date().toISOString()
			};
			localStorage.setItem(`article-${document.id}`, JSON.stringify(data));
		} catch (error) {
			console.warn('Failed to save user data:', error);
		}
	}

	function renderContentBlock(block: ContentBlock, sectionId: string) {
		switch (block.type) {
			case 'text':
				return block.content;
			case 'code':
				return `<pre><code class="language-${block.content.language || 'text'}">${block.content.code}</code></pre>`;
			case 'image':
				return `<img src="${block.content.url}" alt="${block.content.alt || ''}" loading="lazy" />`;
			case 'video':
				return `<video controls><source src="${block.content.url}" type="${block.content.type}" /></video>`;
			case 'quiz':
				// Quiz will be handled by the component
				return '';
			default:
				return `<div class="unsupported-block">Unsupported block type: ${block.type}</div>`;
		}
	}
</script>

<div class="interactive-article-viewer {className}">
	<!-- Header with controls -->
	<header class="article-header">
		<div class="header-content">
			<h1 class="article-title">{document.title}</h1>
			<div class="article-meta">
				<span class="meta-item">
					{document.metadata.pageCount ? `${document.metadata.pageCount} pages` : ''}
				</span>
				<span class="meta-item">
					{Math.ceil(document.metadata.extractedText / 200)} min read
				</span>
			</div>
		</div>
		
		<div class="header-controls">
			<Button
				variant="ghost"
				size="sm"
				onclick={() => tocVisible = !tocVisible}
				aria-label="Toggle table of contents"
				aria-expanded={tocVisible}
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
				TOC
			</Button>
			
			{#if enableBookmarks}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => toggleBookmark(currentSectionData?.id || '')}
					aria-label={bookmarks.includes(currentSectionData?.id || '') ? 'Remove bookmark' : 'Add bookmark'}
					class={bookmarks.includes(currentSectionData?.id || '') ? 'text-yellow-600' : ''}
				>
					<svg class="w-4 h-4" fill={bookmarks.includes(currentSectionData?.id || '') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
					</svg>
				</Button>
			{/if}
			
			{#if enableAnnotations}
				<Button
					variant="ghost"
					size="sm"
					onclick={() => annotationMode = !annotationMode}
					aria-label="Toggle annotation mode"
					aria-pressed={annotationMode}
					class={annotationMode ? 'bg-blue-100 text-blue-700' : ''}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
				</Button>
			{/if}
		</div>
	</header>

	<!-- Progress bar -->
	{#if enableProgressTracking}
		<div class="progress-container">
			<ProgressBar
				value={readingProgress}
				size="sm"
				variant="default"
				showLabel={false}
				animated={true}
			/>
			<span class="progress-text">
				Section {currentSection + 1} of {totalSections}
			</span>
		</div>
	{/if}

	<div class="article-layout">
		<!-- Table of Contents -->
		{#if showToc && tocVisible}
			<aside class="toc-sidebar" bind:this={tocContainer}>
				<Card class="toc-card">
					<h2 class="toc-title">Table of Contents</h2>
					<nav class="toc-nav" aria-label="Article navigation">
						<ul class="toc-list">
							{#each document.structure.toc.entries as entry}
								<li class="toc-item level-{entry.level}">
									<button
										class="toc-link"
										class:active={currentSectionData?.id === entry.id}
										onclick={() => navigateToTocEntry(entry)}
									>
										{entry.title}
										{#if bookmarks.includes(entry.id)}
											<svg class="bookmark-icon" fill="currentColor" viewBox="0 0 20 20">
												<path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
											</svg>
										{/if}
									</button>
									{#if entry.children.length > 0}
										<ul class="toc-sublist">
											{#each entry.children as child}
												<li class="toc-item level-{child.level}">
													<button
														class="toc-link"
														class:active={currentSectionData?.id === child.id}
														onclick={() => navigateToTocEntry(child)}
													>
														{child.title}
													</button>
												</li>
											{/each}
										</ul>
									{/if}
								</li>
							{/each}
						</ul>
					</nav>
				</Card>
			</aside>
		{/if}

		<!-- Main article content -->
		<main class="article-main" bind:this={articleContainer} onscroll={updateReadingProgress}>
			<article class="article-content" role="main" onmouseup={handleTextSelection}>
				{#each document.structure.sections as section, index}
					<section
						class="content-section"
						data-section-index={index}
						data-section-id={section.id}
						bind:this={sections[index]}
					>
						<header class="section-header">
							<h2 class="section-title level-{section.level}">
								{section.title}
								{#if section.subsections.length > 0}
									<Button
										variant="ghost"
										size="xs"
										onclick={() => toggleSection(section.id)}
										aria-label={expandedSections.has(section.id) ? 'Collapse section' : 'Expand section'}
										aria-expanded={expandedSections.has(section.id)}
									>
										<svg class="w-3 h-3 transition-transform" class:rotate-90={expandedSections.has(section.id)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
										</svg>
									</Button>
								{/if}
							</h2>
							
							{#if annotations.has(section.id)}
								<div class="annotation">
									<div class="annotation-content">
										{annotations.get(section.id)}
									</div>
									<Button
										variant="ghost"
										size="xs"
										onclick={() => removeAnnotation(section.id)}
										aria-label="Remove annotation"
									>
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</Button>
								</div>
							{/if}
						</header>

						<div class="section-content" class:collapsed={!expandedSections.has(section.id) && section.subsections.length > 0}>
							{#each section.content as block}
								<div class="content-block" data-block-id={block.id}>
									{#if block.type === 'quiz'}
										<Card class="quiz-card">
											<h3 class="quiz-title">Quiz: {block.content.title || 'Knowledge Check'}</h3>
											{#if !quizStates.has(block.id)}
												<Button onclick={() => initializeQuiz(block.id, block.content.questions)}>
													Start Quiz
												</Button>
											{:else}
												{@const quizState = quizStates.get(block.id)}
												{#if quizState && !quizState.completed}
													{@const currentQ = quizState.questions[quizState.currentQuestion]}
													<div class="quiz-question">
														<h4>{currentQ.question}</h4>
														{#if currentQ.type === 'multiple-choice'}
															<div class="quiz-options">
																{#each currentQ.options || [] as option, optionIndex}
																	<label class="quiz-option">
																		<input
																			type="radio"
																			name="quiz-{block.id}-{currentQ.id}"
																			value={optionIndex}
																			onchange={() => answerQuestion(block.id, currentQ.id, optionIndex)}
																		/>
																		{option}
																	</label>
																{/each}
															</div>
														{/if}
													</div>
												{:else if quizState?.completed}
													<div class="quiz-results">
														<h4>Quiz Complete!</h4>
														<p>Score: {Math.round(quizState.score)}%</p>
														<ProgressBar value={quizState.score} variant={quizState.score >= 70 ? 'success' : 'warning'} />
													</div>
												{/if}
											{/if}
										</Card>
									{:else}
										<div class="prose">
											{@html renderContentBlock(block, section.id)}
										</div>
									{/if}
								</div>
							{/each}

							<!-- Subsections -->
							{#if section.subsections.length > 0 && expandedSections.has(section.id)}
								{#each section.subsections as subsection}
									<section class="subsection" data-section-id={subsection.id}>
										<h3 class="subsection-title level-{subsection.level}">{subsection.title}</h3>
										<div class="subsection-content">
											{#each subsection.content as block}
												<div class="content-block">
													<div class="prose">
														{@html renderContentBlock(block, subsection.id)}
													</div>
												</div>
											{/each}
										</div>
									</section>
								{/each}
							{/if}
						</div>
					</section>
				{/each}
			</article>
		</main>
	</div>

	<!-- Annotation modal -->
	{#if annotationMode && selectedText && annotationTarget}
		<div class="annotation-modal">
			<Card class="annotation-form">
				<h3>Add Annotation</h3>
				<p class="selected-text">"{selectedText}"</p>
				<textarea
					placeholder="Add your note..."
					rows="3"
					onkeydown={(e) => {
						if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
							addAnnotation(annotationTarget || '', e.currentTarget.value);
						}
					}}
				></textarea>
				<div class="annotation-actions">
					<Button
						size="sm"
						onclick={(e) => {
							const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
							addAnnotation(annotationTarget || '', textarea?.value || '');
						}}
					>
						Save
					</Button>
					<Button
						variant="ghost"
						size="sm"
						onclick={() => {
							annotationTarget = null;
							selectedText = '';
						}}
					>
						Cancel
					</Button>
				</div>
			</Card>
		</div>
	{/if}
</div>

<style>
	.interactive-article-viewer {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: var(--color-surface);
		color: var(--color-text);
	}

	/* Header */
	.article-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--color-border);
		background: var(--color-surface);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.header-content {
		flex: 1;
		min-width: 0;
	}

	.article-title {
		font-size: 1.5rem;
		font-weight: 600;
		margin: 0 0 0.25rem 0;
		color: var(--color-text);
		line-height: 1.3;
	}

	.article-meta {
		display: flex;
		gap: 1rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.header-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		flex-shrink: 0;
	}

	/* Progress */
	.progress-container {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 1.5rem;
		background: var(--color-surface-secondary);
		border-bottom: 1px solid var(--color-border);
	}

	.progress-text {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
	}

	/* Layout */
	.article-layout {
		display: flex;
		flex: 1;
		overflow: hidden;
	}

	/* Table of Contents */
	.toc-sidebar {
		width: 280px;
		flex-shrink: 0;
		border-right: 1px solid var(--color-border);
		background: var(--color-surface-secondary);
		overflow-y: auto;
	}

	.toc-card {
		height: 100%;
		border: none;
		border-radius: 0;
	}

	.toc-title {
		font-size: 1rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}

	.toc-nav {
		height: calc(100% - 2rem);
		overflow-y: auto;
	}

	.toc-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.toc-sublist {
		list-style: none;
		margin: 0;
		padding-left: 1rem;
	}

	.toc-item {
		margin-bottom: 0.25rem;
	}

	.toc-link {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.5rem 0.75rem;
		text-align: left;
		background: none;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.toc-link:hover {
		background: var(--color-surface);
		color: var(--color-text);
	}

	.toc-link.active {
		background: var(--color-primary-100);
		color: var(--color-primary-700);
		font-weight: 500;
	}

	.bookmark-icon {
		width: 0.875rem;
		height: 0.875rem;
		color: var(--color-warning-500);
	}

	.level-1 .toc-link {
		font-weight: 500;
	}

	.level-2 .toc-link {
		font-size: 0.8125rem;
		padding-left: 1rem;
	}

	.level-3 .toc-link {
		font-size: 0.75rem;
		padding-left: 1.5rem;
	}

	/* Main content */
	.article-main {
		flex: 1;
		overflow-y: auto;
		scroll-behavior: smooth;
	}

	.article-content {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	/* Sections */
	.content-section {
		margin-bottom: 3rem;
		scroll-margin-top: 2rem;
	}

	.section-header {
		margin-bottom: 1.5rem;
	}

	.section-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		margin: 0 0 0.5rem 0;
		color: var(--color-text);
	}

	.section-title.level-1 {
		font-size: 1.875rem;
		border-bottom: 2px solid var(--color-border);
		padding-bottom: 0.5rem;
	}

	.section-title.level-2 {
		font-size: 1.5rem;
	}

	.section-title.level-3 {
		font-size: 1.25rem;
	}

	.section-content.collapsed {
		display: none;
	}

	.subsection {
		margin: 2rem 0;
		padding-left: 1rem;
		border-left: 3px solid var(--color-border);
	}

	.subsection-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}

	.subsection-title.level-3 {
		font-size: 1rem;
	}

	.subsection-title.level-4 {
		font-size: 0.9375rem;
	}

	/* Content blocks */
	.content-block {
		margin-bottom: 1.5rem;
	}

	.prose {
		line-height: 1.7;
		color: var(--color-text);
	}

	.prose :global(p) {
		margin-bottom: 1rem;
	}

	.prose :global(h1),
	.prose :global(h2),
	.prose :global(h3),
	.prose :global(h4),
	.prose :global(h5),
	.prose :global(h6) {
		font-weight: 600;
		margin: 1.5rem 0 0.75rem 0;
		color: var(--color-text);
	}

	.prose :global(ul),
	.prose :global(ol) {
		margin-bottom: 1rem;
		padding-left: 1.5rem;
	}

	.prose :global(li) {
		margin-bottom: 0.25rem;
	}

	.prose :global(pre) {
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border);
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
		margin: 1rem 0;
		font-size: 0.875rem;
	}

	.prose :global(code) {
		font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
		font-size: 0.875em;
	}

	.prose :global(p code) {
		background: var(--color-surface-secondary);
		padding: 0.125rem 0.25rem;
		border-radius: 0.25rem;
		border: 1px solid var(--color-border);
	}

	.prose :global(img) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin: 1rem 0;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.prose :global(video) {
		max-width: 100%;
		height: auto;
		border-radius: 0.5rem;
		margin: 1rem 0;
	}

	.prose :global(blockquote) {
		border-left: 4px solid var(--color-primary-300);
		padding-left: 1rem;
		margin: 1rem 0;
		font-style: italic;
		color: var(--color-text-secondary);
	}

	.prose :global(table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	.prose :global(th),
	.prose :global(td) {
		border: 1px solid var(--color-border);
		padding: 0.5rem;
		text-align: left;
	}

	.prose :global(th) {
		background: var(--color-surface-secondary);
		font-weight: 600;
	}

	.unsupported-block {
		background: var(--color-warning-50);
		border: 1px solid var(--color-warning-200);
		border-radius: 0.5rem;
		padding: 1rem;
		color: var(--color-warning-700);
		font-style: italic;
		text-align: center;
	}

	/* Annotations */
	.annotation {
		background: var(--color-info-50);
		border: 1px solid var(--color-info-200);
		border-radius: 0.5rem;
		padding: 0.75rem;
		margin: 0.5rem 0;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.5rem;
	}

	.annotation-content {
		flex: 1;
		font-size: 0.875rem;
		color: var(--color-info-700);
	}

	.annotation-modal {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		padding: 1rem;
	}

	.annotation-form {
		width: 100%;
		max-width: 500px;
		background: var(--color-surface);
	}

	.annotation-form h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.selected-text {
		background: var(--color-primary-50);
		border: 1px solid var(--color-primary-200);
		border-radius: 0.25rem;
		padding: 0.5rem;
		margin-bottom: 1rem;
		font-style: italic;
		color: var(--color-primary-700);
	}

	.annotation-form textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		resize: vertical;
		font-family: inherit;
		font-size: 0.875rem;
		margin-bottom: 1rem;
	}

	.annotation-form textarea:focus {
		outline: none;
		border-color: var(--color-primary-500);
		box-shadow: 0 0 0 3px var(--color-primary-100);
	}

	.annotation-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	/* Quiz */
	.quiz-card {
		background: var(--color-surface-secondary);
		border: 1px solid var(--color-border);
		margin: 1rem 0;
	}

	.quiz-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}

	.quiz-question h4 {
		margin: 0 0 1rem 0;
		font-weight: 500;
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
		border: 1px solid var(--color-border);
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 0.2s ease;
	}

	.quiz-option:hover {
		background: var(--color-surface);
	}

	.quiz-option input[type="radio"] {
		margin: 0;
	}

	.quiz-results {
		text-align: center;
		padding: 1rem;
	}

	.quiz-results h4 {
		margin: 0 0 0.5rem 0;
		color: var(--color-success-600);
	}

	.quiz-results p {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	/* Responsive design */
	@media (max-width: 1024px) {
		.toc-sidebar {
			position: fixed;
			top: 0;
			left: 0;
			height: 100vh;
			z-index: 20;
			transform: translateX(-100%);
			transition: transform 0.3s ease;
		}

		.toc-sidebar.visible {
			transform: translateX(0);
		}

		.article-content {
			padding: 1.5rem;
		}
	}

	@media (max-width: 768px) {
		.article-header {
			padding: 0.75rem 1rem;
		}

		.article-title {
			font-size: 1.25rem;
		}

		.article-meta {
			font-size: 0.8125rem;
			gap: 0.75rem;
		}

		.progress-container {
			padding: 0.375rem 1rem;
		}

		.article-content {
			padding: 1rem;
		}

		.content-section {
			margin-bottom: 2rem;
		}

		.section-title.level-1 {
			font-size: 1.5rem;
		}

		.section-title.level-2 {
			font-size: 1.25rem;
		}

		.section-title.level-3 {
			font-size: 1.125rem;
		}

		.subsection {
			padding-left: 0.75rem;
		}

		.annotation-modal {
			padding: 0.5rem;
		}

		/* Touch-friendly interactions */
		.toc-link,
		.quiz-option {
			min-height: 44px;
		}

		.header-controls :global(button) {
			min-width: 44px;
			min-height: 44px;
		}
	}

	@media (max-width: 480px) {
		.article-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.header-controls {
			align-self: flex-end;
		}

		.article-title {
			font-size: 1.125rem;
		}

		.progress-container {
			flex-direction: column;
			align-items: stretch;
			gap: 0.5rem;
		}

		.progress-text {
			text-align: center;
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: high) {
		.article-header,
		.progress-container,
		.toc-sidebar {
			border-color: var(--color-text);
		}

		.toc-link.active {
			background: var(--color-text);
			color: var(--color-surface);
		}

		.annotation {
			border-width: 2px;
		}

		.quiz-option {
			border-width: 2px;
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.article-main {
			scroll-behavior: auto;
		}

		.toc-sidebar {
			transition: none;
		}

		* {
			transition: none !important;
			animation: none !important;
		}
	}

	/* Print styles */
	@media print {
		.article-header,
		.progress-container,
		.toc-sidebar,
		.header-controls,
		.annotation-modal {
			display: none;
		}

		.article-layout {
			display: block;
		}

		.article-content {
			max-width: none;
			padding: 0;
		}

		.content-section {
			break-inside: avoid;
		}

		.annotation {
			background: transparent;
			border: 1px solid #000;
		}
	}

	/* Utility classes */
	:global(.w-3) { width: 0.75rem; }
	:global(.h-3) { height: 0.75rem; }
	:global(.w-4) { width: 1rem; }
	:global(.h-4) { height: 1rem; }
	:global(.rotate-90) { transform: rotate(90deg); }
	:global(.transition-transform) { transition: transform 0.2s ease; }
	:global(.text-yellow-600) { color: var(--color-warning-600); }
	:global(.bg-blue-100) { background-color: var(--color-info-100); }
	:global(.text-blue-700) { color: var(--color-info-700); }
	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>