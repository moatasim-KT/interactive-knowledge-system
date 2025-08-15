# Interactive Content Transformer

The Interactive Content Transformer is a service that converts static documents (PDFs, markdown files, web content) into interactive articles with enhanced features like expandable sections, embedded quizzes, code execution capabilities, and AI-powered enhancements.

## Features

### Core Transformation Capabilities

- **Expandable Sections**: Automatically converts long text blocks into expandable sections with preview text
- **Embedded Quizzes**: Generates interactive quizzes based on content analysis
- **Code Block Enhancement**: Adds syntax highlighting and execution capabilities to code blocks
- **Related Content Suggestions**: Finds and suggests related content from the knowledge base
- **AI-Powered Enhancements**: Uses AI to generate summaries, alt text, and other improvements

### Interactive Features

- **Progress Tracking**: Tracks reading progress and user interactions
- **Bookmarking**: Allows users to bookmark sections and add annotations
- **Navigation Aids**: Provides table of contents, breadcrumbs, and keyboard navigation
- **Mobile Optimization**: Responsive design with touch-friendly interactions

## Usage

### Basic Usage

```typescript
import { InteractiveTransformer } from '$lib/services/interactiveTransformer.js';
import { EnhancedDocumentProcessor } from '$lib/services/enhancedDocumentProcessor.js';

// Initialize services
const transformer = new InteractiveTransformer();
const processor = new EnhancedDocumentProcessor();

// Process and transform a document
const processedDoc = await processor.processMarkdown(markdownContent);
const interactiveArticle = await transformer.transformToInteractive(processedDoc);
```

### Configuration Options

```typescript
const transformer = new InteractiveTransformer({
    enableExpandableSections: true,
    generateQuizzes: true,
    enhanceCodeBlocks: true,
    findRelatedContent: true,
    aiEnhancement: true,
    maxQuizzesPerSection: 3,
    minSectionLengthForExpansion: 200,
    codeExecutionTimeout: 5000,
    relatedContentThreshold: 0.7
});
```

### Configuration Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `enableExpandableSections` | boolean | true | Enable expandable sections for long content |
| `generateQuizzes` | boolean | true | Generate quizzes from text content |
| `enhanceCodeBlocks` | boolean | true | Add syntax highlighting and execution to code blocks |
| `findRelatedContent` | boolean | true | Find and suggest related content |
| `aiEnhancement` | boolean | true | Enable AI-powered content enhancements |
| `maxQuizzesPerSection` | number | 3 | Maximum number of quizzes per section |
| `minSectionLengthForExpansion` | number | 200 | Minimum text length to make expandable |
| `codeExecutionTimeout` | number | 5000 | Timeout for code execution (ms) |
| `relatedContentThreshold` | number | 0.7 | Similarity threshold for related content |

## API Reference

### InteractiveTransformer Class

#### Methods

##### `transformToInteractive(document: ProcessedDocument): Promise<InteractiveArticle>`

Transforms a processed document into an interactive article.

**Parameters:**
- `document`: A processed document from EnhancedDocumentProcessor

**Returns:**
- Promise resolving to an InteractiveArticle with enhanced features

##### `transformContentBlocks(blocks: ContentBlock[]): Promise<InteractiveContentBlock[]>`

Transforms content blocks to interactive content blocks.

##### `generateQuizzesFromText(text: string): Promise<Question[]>`

Generates quiz questions from text content.

##### `createExpandableSections(content: InteractiveContentBlock[]): Promise<InteractiveSection[]>`

Creates expandable sections from content blocks.

##### `generateRelatedContentSuggestions(content: InteractiveContentBlock[]): Promise<ContentRelationship[]>`

Generates related content suggestions.

##### `enhanceWithAI(content: InteractiveContentBlock[]): Promise<InteractiveContentBlock[]>`

Applies AI-powered enhancements to content blocks.

### Utility Functions

#### `transformationUtils`

A collection of utility functions for common transformation tasks:

```typescript
import { transformationUtils } from '$lib/services/interactiveTransformer.js';

// Create expandable section
const expandable = transformationUtils.createExpandableSection(content, 150);

// Generate quiz from text
const quizzes = await transformationUtils.generateQuizFromText(text);

// Enhance code block
const enhanced = transformationUtils.enhanceCodeBlock(code, 'javascript');
```

## Data Types

### InteractiveArticle

The main output type containing the transformed interactive content:

```typescript
interface InteractiveArticle {
    id: string;
    title: string;
    content: InteractiveContentBlock[];
    metadata: InteractiveMetadata;
    structure: InteractiveStructure;
    assets: InteractiveAsset[];
    relationships: ContentRelationship[];
}
```

### InteractiveContentBlock

Enhanced content blocks with interactivity features:

```typescript
interface InteractiveContentBlock extends ContentBlock {
    interactivity: InteractivityConfig;
    enhancements: ContentEnhancement[];
}
```

### InteractivityConfig

Configuration for interactive features:

```typescript
interface InteractivityConfig {
    level: 'static' | 'basic' | 'advanced';
    features: InteractiveFeature[];
    userProgress?: UserProgress;
    expandable?: ExpandableConfig;
    executable?: ExecutableConfig;
}
```

## Examples

### Example 1: Basic Markdown Transformation

```typescript
const markdownContent = `
# Introduction to JavaScript

JavaScript is a versatile programming language.

## Variables

\`\`\`javascript
let name = "John";
const age = 30;
\`\`\`

Variables can hold different types of data.
`;

const processor = new EnhancedDocumentProcessor();
const transformer = new InteractiveTransformer();

const processedDoc = await processor.processMarkdown(markdownContent);
const interactiveArticle = await transformer.transformToInteractive(processedDoc);

console.log(`Created interactive article with ${interactiveArticle.content.length} blocks`);
```

### Example 2: Custom Configuration

```typescript
const transformer = new InteractiveTransformer({
    enableExpandableSections: true,
    generateQuizzes: false, // Disable quiz generation
    enhanceCodeBlocks: true,
    maxQuizzesPerSection: 1,
    minSectionLengthForExpansion: 100
});

const interactiveArticle = await transformer.transformToInteractive(document);
```

### Example 3: Working with Interactive Features

```typescript
const interactiveArticle = await transformer.transformToInteractive(document);

// Check interactivity levels
interactiveArticle.content.forEach(block => {
    console.log(`Block ${block.id}: ${block.interactivity.level} interactivity`);
    
    // List features
    block.interactivity.features.forEach(feature => {
        if (feature.enabled) {
            console.log(`- ${feature.type} feature enabled`);
        }
    });
    
    // List enhancements
    block.enhancements.forEach(enhancement => {
        console.log(`- ${enhancement.type} enhancement at ${enhancement.position}`);
    });
});
```

## Integration with Other Services

The Interactive Content Transformer works seamlessly with other services in the system:

### With Enhanced Document Processor

```typescript
// Process various document types
const pdfDoc = await processor.processPdf(pdfFile);
const markdownDoc = await processor.processMarkdown(markdownContent);
const webDoc = await processor.processWebContent(htmlContent);

// Transform all to interactive
const interactivePdf = await transformer.transformToInteractive(pdfDoc);
const interactiveMarkdown = await transformer.transformToInteractive(markdownDoc);
const interactiveWeb = await transformer.transformToInteractive(webDoc);
```

### With Knowledge Base Integration

```typescript
// The transformer automatically finds relationships with existing content
const interactiveArticle = await transformer.transformToInteractive(document);

// Access relationships
interactiveArticle.relationships.forEach(rel => {
    console.log(`${rel.type} relationship to ${rel.targetId} (strength: ${rel.strength})`);
});
```

## Error Handling

The transformer includes comprehensive error handling:

```typescript
try {
    const interactiveArticle = await transformer.transformToInteractive(document);
} catch (error) {
    if (error.message.includes('Interactive transformation failed')) {
        console.error('Transformation error:', error.message);
        // Handle transformation-specific errors
    } else {
        console.error('Unexpected error:', error);
    }
}
```

## Performance Considerations

- **Large Documents**: The transformer handles large documents efficiently with streaming processing
- **Concurrent Processing**: Multiple documents can be processed concurrently
- **Memory Management**: Content is processed in chunks to manage memory usage
- **Caching**: Processed results are cached to improve performance

## Testing

The transformer includes comprehensive test coverage:

```bash
# Run unit tests
npm test -- src/lib/services/__tests__/interactiveTransformer.test.ts

# Run integration tests
npm test -- src/lib/services/__tests__/interactiveTransformer.integration.test.ts
```

## Demo Component

A demo component is available at `src/lib/components/InteractiveTransformerExample.svelte` that shows the transformer in action with a sample markdown document.

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **Requirement 1.3**: Interactive elements like expandable sections and embedded quizzes
- **Requirement 1.4**: AI-powered content enhancement integration
- **Requirement 2.3**: Code block enhancement with syntax highlighting and execution
- **Requirement 2.4**: Interactive transformation of markdown content
- **Requirement 2.5**: Related content suggestions and knowledge base integration