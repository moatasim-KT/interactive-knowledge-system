# Content Creation Guide

## Overview

The Interactive Knowledge System provides powerful tools for creating engaging, interactive learning content. This guide walks you through the process of creating various types of content blocks and organizing them into comprehensive learning modules.

## Getting Started

### Accessing the Content Editor

1. Navigate to the main application at `http://localhost:5173`
2. Click on "Create Content" or navigate to `/content/new`
3. The content editor will open with a blank canvas

### Understanding Content Blocks

Content in the system is organized into modular blocks that can be combined to create rich learning experiences:

- **Text Blocks**: Rich text with markdown support
- **Code Blocks**: Syntax-highlighted code with execution capabilities
- **Interactive Charts**: Data visualizations with user interaction
- **Quiz Blocks**: Various question types with immediate feedback
- **Media Blocks**: Images, videos, and audio content
- **Simulation Blocks**: Algorithm and process simulations

## Creating Your First Article

### Step 1: Set Up Article Metadata

```typescript
const articleMetadata = {
  title: 'Introduction to Machine Learning',
  description: 'A comprehensive introduction to ML concepts',
  difficulty: 2, // Scale of 1-5
  estimatedTime: 45, // Minutes
  tags: ['machine-learning', 'ai', 'beginner'],
  prerequisites: ['basic-statistics', 'python-basics']
};
```

### Step 2: Add Content Blocks

#### Text Block

```svelte
<script>
  import { ContentEditor } from '$lib/components';

  let textBlock = {
    type: 'text',
    content: {
      markdown: `
# Machine Learning Fundamentals

Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.

## Key Concepts

- **Supervised Learning**: Learning with labeled examples
- **Unsupervised Learning**: Finding patterns in unlabeled data
- **Reinforcement Learning**: Learning through trial and error
      `
    }
  };
</script>

<ContentEditor bind:blocks={[textBlock]} />
```

#### Interactive Code Block

```svelte
<script>
  import { CodeEditor } from '$lib/components';

  let codeBlock = {
    type: 'code',
    language: 'python',
    executable: true,
    content: `
# Simple linear regression example
import numpy as np
import matplotlib.pyplot as plt

# Generate sample data
X = np.random.randn(100, 1)
y = 2 * X + 1 + 0.1 * np.random.randn(100, 1)

# Plot the data
plt.scatter(X, y, alpha=0.7)
plt.xlabel('X')
plt.ylabel('y')
plt.title('Linear Relationship')
plt.show()
    `
  };
</script>

<CodeEditor
  bind:code={codeBlock.content}
  language={codeBlock.language}
  executable={codeBlock.executable}
/>
```

#### Interactive Chart Block

```svelte
<script>
  import { InteractiveChart } from '$lib/components';

  let chartData = [
    { algorithm: 'Linear Regression', accuracy: 0.85, complexity: 1 },
    { algorithm: 'Random Forest', accuracy: 0.92, complexity: 3 },
    { algorithm: 'Neural Network', accuracy: 0.94, complexity: 5 },
    { algorithm: 'SVM', accuracy: 0.88, complexity: 4 }
  ];

  let chartConfig = {
    type: 'scatter',
    xField: 'complexity',
    yField: 'accuracy',
    colorField: 'algorithm',
    title: 'Algorithm Complexity vs Accuracy',
    interactive: true,
    tooltip: true
  };
</script>

<InteractiveChart data={chartData} config={chartConfig} />
```

#### Quiz Block

```svelte
<script>
  import { Quiz } from '$lib/components';

  let quizQuestions = [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: 'What type of learning uses labeled training data?',
      options: [
        'Unsupervised Learning',
        'Supervised Learning',
        'Reinforcement Learning',
        'Deep Learning'
      ],
      correctAnswer: 1,
      explanation: 'Supervised learning uses labeled examples to train models.'
    },
    {
      id: 'q2',
      type: 'true-false',
      question: 'Neural networks can only be used for image recognition.',
      correctAnswer: false,
      explanation:
        'Neural networks are versatile and can be used for many tasks including text processing, time series analysis, and more.'
    }
  ];
</script>

<Quiz questions={quizQuestions} showResults={true} allowRetry={true} />
```

### Step 3: Add Interactive Simulations

```svelte
<script>
  import { SimulationBlock } from '$lib/components';

  let simulationConfig = {
    type: 'neural-network',
    parameters: {
      layers: [3, 4, 2],
      activationFunction: 'relu',
      learningRate: 0.01
    },
    interactive: true,
    controls: ['learningRate', 'layers', 'activationFunction']
  };
</script>

<SimulationBlock config={simulationConfig} />
```

## Advanced Content Creation

### Using Web Content Integration

The system can automatically import and transform web content into interactive learning materials:

```javascript
// Using the MCP server to fetch and transform content
import { webContentMcpServer } from '$lib/mcp/web-content';

async function importWebContent(url) {
  // Fetch content
  const result = await webContentMcpServer.executeTool('fetchWebContent', {
    url,
    options: {
      mainContentOnly: true,
      includeImages: true,
      includeMetadata: true
    }
  });

  if (result.success) {
    // Transform to interactive content
    const processed = await webContentMcpServer.executeTool('processContent', {
      content: result.data.html,
      contentType: 'html',
      options: {
        extractSummary: true,
        generateTags: true,
        createBlocks: true
      }
    });

    return processed.data.blocks;
  }
}

// Usage
const blocks = await importWebContent('https://example.com/ml-tutorial');
```

### Creating Custom Interactive Elements

```svelte
<!-- CustomVisualization.svelte -->
<script>
  import { onMount } from 'svelte';
  import * as d3 from 'd3';

  export let data = [];
  export let width = 600;
  export let height = 400;

  let svgElement;

  onMount(() => {
    createVisualization();
  });

  function createVisualization() {
    const svg = d3.select(svgElement);

    // Create your custom D3 visualization here
    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, d => d.x))
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain(d3.extent(data, d => d.y))
      .range([height, 0]);

    svg
      .selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 5)
      .attr('fill', 'steelblue')
      .on('click', (event, d) => {
        // Handle interaction
        console.log('Clicked:', d);
      });
  }
</script>

<svg bind:this={svgElement} {width} {height}></svg>
```

### Content Templates

Create reusable templates for common content types:

```typescript
// templates/lessonTemplate.ts
export const lessonTemplate = {
  metadata: {
    type: 'lesson',
    difficulty: 2,
    estimatedTime: 30
  },
  blocks: [
    {
      type: 'text',
      content: {
        markdown: '# Lesson Title\n\n## Learning Objectives\n\n- Objective 1\n- Objective 2'
      }
    },
    {
      type: 'text',
      content: { markdown: '## Introduction\n\n[Add introduction content here]' }
    },
    {
      type: 'code',
      language: 'javascript',
      content: '// Add example code here'
    },
    {
      type: 'quiz',
      questions: []
    },
    {
      type: 'text',
      content: { markdown: '## Summary\n\n[Add summary content here]' }
    }
  ]
};

// Usage
import { lessonTemplate } from './templates/lessonTemplate';

function createNewLesson(title, objectives) {
  const lesson = { ...lessonTemplate };
  lesson.blocks[0].content.markdown = lesson.blocks[0].content.markdown
    .replace('Lesson Title', title)
    .replace('- Objective 1\n- Objective 2', objectives.map(obj => `- ${obj}`).join('\n'));

  return lesson;
}
```

## Content Organization

### Hierarchical Structure

Organize content using the knowledge tree structure:

```typescript
const knowledgeStructure = {
  id: 'ml-course',
  title: 'Machine Learning Course',
  type: 'module',
  children: [
    {
      id: 'ml-intro',
      title: 'Introduction to ML',
      type: 'lesson',
      metadata: {
        difficulty: 1,
        estimatedTime: 30,
        prerequisites: []
      }
    },
    {
      id: 'supervised-learning',
      title: 'Supervised Learning',
      type: 'module',
      children: [
        {
          id: 'linear-regression',
          title: 'Linear Regression',
          type: 'lesson',
          metadata: {
            difficulty: 2,
            estimatedTime: 45,
            prerequisites: ['ml-intro']
          }
        },
        {
          id: 'classification',
          title: 'Classification',
          type: 'lesson',
          metadata: {
            difficulty: 2,
            estimatedTime: 50,
            prerequisites: ['linear-regression']
          }
        }
      ]
    }
  ]
};
```

### Relationships and Prerequisites

Define learning paths and dependencies:

```typescript
import { relationshipManagementService } from '$lib/services';

// Create prerequisite relationships
await relationshipManagementService.createRelationship(
  'classification',
  'linear-regression',
  'prerequisite'
);

// Create related content relationships
await relationshipManagementService.createRelationship(
  'neural-networks',
  'linear-regression',
  'related'
);

// Create follow-up relationships
await relationshipManagementService.createRelationship(
  'deep-learning',
  'neural-networks',
  'followup'
);
```

## Best Practices

### Content Design Principles

1. **Progressive Disclosure**: Start with simple concepts and gradually introduce complexity
2. **Interactive Elements**: Include hands-on activities every 5-10 minutes
3. **Multiple Learning Styles**: Combine text, visuals, audio, and interactive elements
4. **Immediate Feedback**: Provide instant feedback through quizzes and simulations
5. **Real-world Examples**: Use practical examples and case studies

### Accessibility Guidelines

```svelte
<!-- Ensure proper heading hierarchy -->
<h1>Main Topic</h1>
<h2>Subtopic</h2>
<h3>Sub-subtopic</h3>

<!-- Add alt text to images -->
<img src="chart.png" alt="Bar chart showing algorithm performance comparison" />

<!-- Use semantic HTML -->
<article>
  <section>
    <h2>Section Title</h2>
    <p>Content...</p>
  </section>
</article>

<!-- Ensure keyboard navigation -->
<button on:click={handleClick} on:keydown={handleKeydown}> Interactive Element </button>
```

### Performance Optimization

```typescript
// Lazy load heavy content
import { LazyMedia } from '$lib/components';

// Use code splitting for large simulations
const HeavySimulation = lazy(() => import('./HeavySimulation.svelte'));

// Optimize images
const optimizedImage = {
  src: 'image.webp',
  fallback: 'image.jpg',
  sizes: '(max-width: 768px) 100vw, 50vw',
  loading: 'lazy'
};
```

## Testing Your Content

### Preview Mode

```svelte
<script>
  import { ContentEditor } from '$lib/components';

  let previewMode = false;
  let content = [];

  function togglePreview() {
    previewMode = !previewMode;
  }
</script>

<button on:click={togglePreview}>
  {previewMode ? 'Edit' : 'Preview'}
</button>

{#if previewMode}
  <ContentViewer {content} />
{:else}
  <ContentEditor bind:content />
{/if}
```

### User Testing

1. **Cognitive Load Testing**: Ensure content isn't overwhelming
2. **Navigation Testing**: Verify users can find and access content easily
3. **Interaction Testing**: Test all interactive elements work correctly
4. **Accessibility Testing**: Use screen readers and keyboard-only navigation
5. **Performance Testing**: Check loading times and responsiveness

## Publishing and Sharing

### Export Options

```typescript
import { exportService } from '$lib/services';

// Export to PDF
const pdfBlob = await exportService.exportToPDF('lesson-id', {
  includeImages: true,
  pageSize: 'A4'
});

// Export to SCORM package
const scormPackage = await exportService.exportToSCORM('module-id', {
  version: '1.2',
  includeTracking: true
});

// Export to Markdown
const markdown = await exportService.exportToMarkdown('lesson-id');
```

### Collaboration Features

```typescript
// Share content with specific users
await contentManagementService.shareContent('lesson-id', {
  users: ['user1', 'user2'],
  permissions: ['read', 'comment']
});

// Create public link
const publicLink = await contentManagementService.createPublicLink('lesson-id', {
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  allowComments: true
});
```

## Troubleshooting

### Common Issues

**Content Not Saving**

- Check browser console for errors
- Verify IndexedDB is available
- Check network connectivity for sync

**Interactive Elements Not Working**

- Ensure proper component imports
- Check for JavaScript errors in console
- Verify component props are correctly passed

**Performance Issues**

- Use lazy loading for heavy content
- Optimize images and media files
- Consider code splitting for large components

### Getting Help

- Check the [API documentation](../api/components.md) for component usage
- Review [GitHub Issues](https://github.com/your-repo/issues) for known problems
- Join the community discussions for tips and best practices

## Next Steps

- Explore [Content Management](content-management.md) for organizing and maintaining content
- Learn about [MCP Server Integration](../mcp-server.md) for automated content sourcing
- Check out the [Components API](../api/components.md) for advanced customization
