/**
 * Integration tests for Enhanced Document Processor Service
 * Demonstrates real-world usage scenarios
 */

import { describe, it, expect } from 'vitest';
import { enhancedDocumentProcessor } from '../enhancedDocumentProcessor.js';

describe('EnhancedDocumentProcessor Integration', () => {
    it('should process a complete markdown document with all features', async () => {
        const complexMarkdown = `---
title: Machine Learning Guide
author: Data Scientist
tags: [ml, ai, tutorial]
date: 2024-01-15
---

# Machine Learning Fundamentals

This comprehensive guide covers the essential concepts of machine learning.

![ML Overview](https://example.com/ml-overview.png)

## Introduction to ML

Machine learning is a subset of artificial intelligence that enables computers to learn and improve from experience.

### Types of Machine Learning

There are three main types:

1. **Supervised Learning**
2. **Unsupervised Learning** 
3. **Reinforcement Learning**

## Code Examples

Here's a simple Python example:

\`\`\`python
import numpy as np
from sklearn.linear_model import LinearRegression

# Create sample data
X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 6, 8, 10])

# Train model
model = LinearRegression()
model.fit(X, y)

# Make prediction
prediction = model.predict([[6]])
print(f"Prediction: {prediction[0]}")
\`\`\`

### JavaScript Implementation

\`\`\`javascript
class SimpleLinearRegression {
    constructor() {
        this.slope = 0;
        this.intercept = 0;
    }
    
    fit(X, y) {
        const n = X.length;
        const sumX = X.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = X.reduce((sum, x, i) => sum + x * y[i], 0);
        const sumXX = X.reduce((sum, x) => sum + x * x, 0);
        
        this.slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        this.intercept = (sumY - this.slope * sumX) / n;
    }
    
    predict(x) {
        return this.slope * x + this.intercept;
    }
}
\`\`\`

## Performance Metrics

| Metric | Description | Formula |
|--------|-------------|---------|
| Accuracy | Correct predictions / Total predictions | TP+TN / (TP+TN+FP+FN) |
| Precision | True positives / Predicted positives | TP / (TP+FP) |
| Recall | True positives / Actual positives | TP / (TP+FN) |

## Advanced Topics

### Deep Learning

Deep learning uses neural networks with multiple layers.

#### Neural Network Architecture

The basic components include:
- Input layer
- Hidden layers
- Output layer
- Activation functions

## Conclusion

Machine learning is a powerful tool for solving complex problems.`;

        const result = await enhancedDocumentProcessor.processMarkdown(complexMarkdown);

        // Verify document metadata
        expect(result.title).toBe('Machine Learning Guide');
        expect(result.metadata.author).toBe('Data Scientist');
        expect(result.metadata.keywords).toEqual(['ml', 'ai', 'tutorial']);
        expect(result.metadata.originalFormat).toBe('markdown');
        expect(result.metadata.wordCount).toBeGreaterThan(100);

        // Verify structure - should have main sections
        expect(result.structure.sections.length).toBeGreaterThan(0);
        const mainSection = result.structure.sections.find(s => s.title === 'Machine Learning Fundamentals');
        expect(mainSection).toBeDefined();
        if (mainSection) {
            expect(mainSection.subsections.length).toBeGreaterThan(0);
        }

        // Verify structure metadata
        expect(result.structure.metadata.maxDepth).toBeGreaterThanOrEqual(3); // At least h1, h2, h3
        expect(result.structure.metadata.sectionCount).toBeGreaterThan(5); // Multiple sections
        expect(result.structure.metadata.hasImages).toBe(true);
        expect(result.structure.metadata.hasCodeBlocks).toBe(true);
        expect(result.structure.metadata.hasTables).toBe(true);

        // Verify content blocks
        const codeBlocks = result.content.filter(block => block.type === 'code');
        expect(codeBlocks).toHaveLength(2); // Python and JavaScript
        expect(codeBlocks[0].content.language).toBe('python');
        expect(codeBlocks[0].content.executable).toBe(true);
        expect(codeBlocks[1].content.language).toBe('javascript');
        expect(codeBlocks[1].content.executable).toBe(true);

        // Verify assets
        expect(result.assets).toHaveLength(1); // One image
        expect(result.assets[0].type).toBe('image');
        expect(result.assets[0].url).toBe('https://example.com/ml-overview.png');
    });

    it('should process HTML content from a web page', async () => {
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <title>Web Development Best Practices</title>
    <meta name="keywords" content="web, development, html, css, javascript">
</head>
<body>
    <header>
        <h1>Web Development Best Practices</h1>
    </header>
    
    <main>
        <section>
            <h2>HTML Structure</h2>
            <p>Use semantic HTML elements for better accessibility and SEO.</p>
            
            <h3>Semantic Elements</h3>
            <ul>
                <li>header</li>
                <li>nav</li>
                <li>main</li>
                <li>section</li>
                <li>article</li>
                <li>footer</li>
            </ul>
            
            <pre><code>&lt;article&gt;
  &lt;header&gt;
    &lt;h1&gt;Article Title&lt;/h1&gt;
  &lt;/header&gt;
  &lt;p&gt;Article content...&lt;/p&gt;
&lt;/article&gt;</code></pre>
        </section>
        
        <section>
            <h2>CSS Best Practices</h2>
            <p>Write maintainable and scalable CSS.</p>
            
            <img src="https://example.com/css-architecture.png" alt="CSS Architecture">
        </section>
    </main>
</body>
</html>`;

        const result = await enhancedDocumentProcessor.processWebContent(htmlContent);

        // Verify document metadata
        expect(result.title).toBe('Web Development Best Practices');
        expect(result.metadata.tags).toEqual(['web', 'development', 'html', 'css', 'javascript']);
        expect(result.metadata.originalFormat).toBe('html');

        // Verify structure
        expect(result.structure.sections).toHaveLength(1); // Main h1
        expect(result.structure.sections[0].title).toBe('Web Development Best Practices');
        expect(result.structure.sections[0].subsections).toHaveLength(2); // HTML Structure, CSS Best Practices

        // Verify nested structure
        const htmlSection = result.structure.sections[0].subsections[0];
        expect(htmlSection.title).toBe('HTML Structure');
        expect(htmlSection.subsections).toHaveLength(1); // Semantic Elements

        // Verify assets
        expect(result.assets).toHaveLength(1);
        expect(result.assets[0].type).toBe('image');
        expect(result.assets[0].url).toBe('https://example.com/css-architecture.png');

        // Verify code blocks
        const codeBlocks = result.content.filter(block => block.type === 'code');
        expect(codeBlocks).toHaveLength(1);
        expect(codeBlocks[0].content.code).toContain('<article>');
    });

    it('should handle unified processing with automatic type detection', async () => {
        const markdownContent = '# Simple Document\n\nThis is markdown content.';
        const htmlContent = '<html><body><h1>Simple HTML</h1><p>This is HTML content.</p></body></html>';

        const markdownResult = await enhancedDocumentProcessor.processDocument(markdownContent);
        const htmlResult = await enhancedDocumentProcessor.processDocument(htmlContent);

        expect(markdownResult.metadata.originalFormat).toBe('markdown');
        expect(htmlResult.metadata.originalFormat).toBe('html');

        expect(markdownResult.structure.sections[0].title).toBe('Simple Document');
        expect(htmlResult.structure.sections[0].title).toBe('Simple HTML');
    });

    it('should respect processing configuration', async () => {
        const { EnhancedDocumentProcessor } = await import('../enhancedDocumentProcessor.js');

        const customProcessor = new EnhancedDocumentProcessor({
            detectCodeBlocks: false,
            extractImages: false,
            generateToc: false,
            maxSectionDepth: 2
        });

        const markdown = `# Title

![Image](test.jpg)

\`\`\`javascript
console.log("test");
\`\`\`

## Section

### Subsection

#### Deep Section`;

        const result = await customProcessor.processMarkdown(markdown);

        // Should not extract code blocks
        const codeBlocks = result.content.filter(block => block.type === 'code');
        expect(codeBlocks).toHaveLength(0);

        // Should not extract images
        expect(result.assets).toHaveLength(0);

        // Should respect max depth (though this is more about processing limits)
        expect(result.structure.sections).toBeDefined();
    });
});