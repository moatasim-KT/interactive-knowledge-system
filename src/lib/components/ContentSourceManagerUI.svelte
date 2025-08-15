<script lang="ts">
  import WebContentAnalyzer from './WebContentAnalyzer.svelte';
  import { EnhancedUrlFetcher } from '$lib/services/EnhancedUrlFetcher';
  import ProgressIndicator from './ProgressIndicator.svelte';

  // Define a simple UserProgress type for this component's use
  interface SimpleUserProgress {
    status: 'not-started' | 'in-progress' | 'completed';
    score?: number; // Using score to represent percentage for linear progress
    timeSpent?: number;
    attempts?: number;
    lastAccessed?: Date;
  }

  let urlInput = $state('');
  let analysisResults = $state<any>(null);
  let isLoading = $state(false);
  let currentMessage = $state('');
  let progressState = $state<SimpleUserProgress>({ status: 'not-started', score: 0 });
  let isDragging = $state(false); // New state for drag-and-drop visual feedback

  async function analyzeUrl() {
    if (!urlInput) return;
    isLoading = true;
    currentMessage = 'Fetching and analyzing content...';
    progressState = { status: 'in-progress', score: 0 };

    try {
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress = Math.min(currentProgress + 10, 90);
        progressState = { ...progressState, score: currentProgress };
      }, 200);

      const fetcher = new EnhancedUrlFetcher();
      const fetchedContent = await fetcher.fetchAndProcess(urlInput);
      clearInterval(interval);

      currentMessage = 'Analysis complete!';
      progressState = { status: 'completed', score: 100 };

      analysisResults = { url: urlInput, content: fetchedContent };
      // In a real scenario, WebContentAnalyzer would process fetchedContent
    } catch (error: any) {
      currentMessage = `Error: ${error.message}`;
      progressState = { status: 'not-started', score: 0 }; // Reset on error
      console.error('Error analyzing URL:', error);
    } finally {
      isLoading = false;
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    isDragging = true; // Set dragging state to true
  }

  function handleDragLeave() {
    isDragging = false; // Set dragging state to false
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false; // Reset dragging state
    const url = event.dataTransfer?.getData('text/uri-list');
    if (url) {
      urlInput = url;
      analyzeUrl();
    }
  }

  // Responsive design considerations (basic example)
  let isMobile = $state(false);
  function checkMobile() {
    isMobile = window.innerWidth < 768; // Example breakpoint
  }

  $effect(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });
</script>

<div class="content-source-manager" class:mobile="{isMobile}">
  <h2>Content Source Management</h2>

  <div class="input-section">
    <input
      type="text"
      bind:value={urlInput}
      placeholder="Enter URL or drag-and-drop here"
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      class:drag-over={isDragging}
    />
    <button onclick={analyzeUrl} disabled={isLoading}>Analyze</button>
  </div>

  {#if isLoading}
    <p>{currentMessage}</p>
    <ProgressIndicator progress={progressState} variant="linear" showDetails={false} />
  {/if}

  {#if analysisResults}
    <h3>Analysis Results for: {analysisResults.url}</h3>
    <div class="analysis-display">
      <!-- WebContentAnalyzer would go here to display detailed analysis -->
      <WebContentAnalyzer content={analysisResults.content} />
    </div>
  {/if}
</div>

<style>
  .content-source-manager {
    padding: 20px;
    max-width: 900px;
    margin: 0 auto;
    font-family: sans-serif;
  }

  h2 {
    color: #333;
    margin-bottom: 20px;
  }

  .input-section {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }

  input[type="text"] {
    flex-grow: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    transition: border-color 0.3s ease; /* Smooth transition for border */
  }

  input[type="text"].drag-over {
    border-color: #007bff; /* Highlight border when dragging over */
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5); /* Add a subtle shadow */
  }

  button {
    padding: 10px 15px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
  }

  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .analysis-display {
    background-color: #f9f9f9;
    border: 1px solid #eee;
    padding: 15px;
    border-radius: 4px;
    min-height: 150px; /* Give some space */
  }

  /* Responsive styles */
  @media (max-width: 767px) {
    .content-source-manager.mobile {
      padding: 10px;
    }

    .input-section {
      flex-direction: column;
    }

    button {
      width: 100%;
    }
  }
</style>
