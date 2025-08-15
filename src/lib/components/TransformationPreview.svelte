<script lang="ts">
  import { onMount } from 'svelte';
  import { InteractiveDocumentGenerator } from '$lib/services/InteractiveDocumentGenerator'; // Assuming this path

  type Props = {
    originalContent?: string;
  }

  let { originalContent = '' }: Props = $props();
  let transformedContent = $state('');
  let transformationParams = $state<any>({}); // Placeholder for parameters
  let isLoading = $state(false);
  let message = $state('');

  async function generatePreview() {
    isLoading = true;
    message = 'Generating preview...';
    try {
      // Simulate a more complex transformation with parameters
      const generator = new InteractiveDocumentGenerator();
      transformedContent = generator.generatePreviewHtml(originalContent);
      message = 'Preview generated!';
    } catch (error: any) {
      message = `Error: ${error.message}`;
      console.error('Error generating preview:', error);
    } finally {
      isLoading = false;
    }
  }

  // Automatically generate preview when originalContent or transformationParams change
  $effect(() => {
    if (originalContent) {
      generatePreview();
    }
  });

  // Responsive design considerations (basic example)
  let isMobile = $state(false);
  function checkMobile() {
    isMobile = window.innerWidth < 768; // Example breakpoint
  }

  onMount(() => {
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  });
</script>

<div class="transformation-preview" class:mobile={isMobile}>
  <h2>Transformation Preview</h2>

  <div class="content-areas">
    <div class="original-content">
      <h3>Original Content</h3>
      <textarea bind:value={originalContent} placeholder="Enter content here..."></textarea>
    </div>

    <div class="transformed-content">
      <h3>Transformed Content</h3>
      {#if isLoading}
        <p>{message}</p>
      {:else}
        <div class="preview-display">
          <!-- Render transformed content here. For a real interactive system, this might be a rich text editor or a rendered HTML view. -->
          <pre>{transformedContent}</pre>
        </div>
      {/if}
    </div>
  </div>

  <div class="controls">
    <!-- Add controls for transformationParams here -->
    <button onclick={generatePreview} disabled={isLoading}>Regenerate Preview</button>
  </div>
</div>

<style>
  .transformation-preview {
    padding: 20px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: sans-serif;
  }

  h2, h3 {
    color: #333;
    margin-bottom: 15px;
  }

  .content-areas {
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
  }

  .original-content, .transformed-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  textarea {
    flex-grow: 1;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 16px;
    min-height: 200px;
  }

  .preview-display {
    flex-grow: 1;
    background-color: #f9f9f9;
    border: 1px solid #eee;
    padding: 15px;
    border-radius: 4px;
    min-height: 200px;
    overflow-y: auto;
  }

  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .controls {
    text-align: center;
  }

  button {
    padding: 10px 20px;
    background-color: #28a745;
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

  /* Responsive styles */
  @media (max-width: 767px) {
    .transformation-preview.mobile {
      padding: 10px;
    }

    .content-areas {
      flex-direction: column;
    }
  }
</style>