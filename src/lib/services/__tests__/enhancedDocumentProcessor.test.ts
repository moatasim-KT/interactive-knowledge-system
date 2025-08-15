/**
 * Tests for Enhanced Document Processor Service
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedDocumentProcessor } from '../enhancedDocumentProcessor.js';

describe('EnhancedDocumentProcessor', () => {
    let processor: EnhancedDocumentProcessor;

    beforeEach(() => {
        processor = new EnhancedDocumentProcessor();
    });

    describe('Markdown Processing', () => {
        it('should process basic markdown content', async () => {
            const markdown = `# Main Title

This is the introduction paragraph.

## Section 1

Content for section 1.

### Subsection 1.1

More detailed content.

## Section 2

Content for section 2.`;

            const result = await processor.processMarkdown(markdown);

            expect(result.title).toBe('Untitled');
            expect(result.metadata.originalFormat).toBe('markdown');
            expect(result.metadata.wordCount).toBeGreaterThan(0);
            expect(result.structure.sections).toHaveLength(1); // One main section
            expect(result.structure.sections[0].title).toBe('Main Title');
            expect(result.structure.sections[0].subsections).toHaveLength(2);
        });

        it('should extract frontmatter from markdown', async () => {
            const markdownWithFrontmatter = `---
title: Test Document
author: John Doe
tags: [test, markdown]
date: 2024-01-01
---

# Content

This is the main content.`;

            const result = await processor.processMarkdown(markdownWithFrontmatter);

            expect(result.title).toBe('Test Document');
            expect(result.metadata.author).toBe('John Doe');
            expect(result.metadata.tags).toEqual(['test', 'markdown']);
        });

        it('should detect and extract code blocks', async () => {
            const markdownWithCode = `# Code Example

Here's some JavaScript:

\`\`\`javascript
function hello() {
    console.log("Hello, world!");
}
\`\`\`

And some Python:

\`\`\`python
def greet():
    print("Hello, world!")
\`\`\``;

            const result = await processor.processMarkdown(markdownWithCode);

            const codeBlocks = result.content.filter(block => block.type === 'code');
            expect(codeBlocks).toHaveLength(2);
            expect(codeBlocks[0].content.language).toBe('javascript');
            expect(codeBlocks[0].content.executable).toBe(true);
            expect(codeBlocks[1].content.language).toBe('python');
            expect(codeBlocks[1].content.executable).toBe(true);
        });

        it('should extract images from markdown', async () => {
            const markdownWithImages = `# Document with Images

![Alt text](https://example.com/image1.jpg)

Some content here.

![Another image](./local-image.png)`;

            const result = await processor.processMarkdown(markdownWithImages);

            expect(result.assets).toHaveLength(2);
            expect(result.assets[0].type).toBe('image');
            expect(result.assets[0].url).toBe('https://example.com/image1.jpg');
            expect(result.assets[0].metadata?.alt).toBe('Alt text');
        });

        it('should handle setext headings', async () => {
            const markdownWithSetext = `Main Title
==========

This is content under the main title.

Subtitle
--------

This is content under the subtitle.`;

            const result = await processor.processMarkdown(markdownWithSetext);

            expect(result.structure.sections).toHaveLength(1); // One top-level section
            expect(result.structure.sections[0].title).toBe('Main Title');
            expect(result.structure.sections[0].level).toBe(1);
            expect(result.structure.sections[0].subsections).toHaveLength(1);
            expect(result.structure.sections[0].subsections[0].title).toBe('Subtitle');
            expect(result.structure.sections[0].subsections[0].level).toBe(2);
        });
    });

    describe('HTML Processing', () => {
        it('should process basic HTML content', async () => {
            const html = `<!DOCTYPE html>
<html>
<head>
    <title>Test Document</title>
    <meta name="keywords" content="test, html, processing">
</head>
<body>
    <h1>Main Title</h1>
    <p>Introduction paragraph.</p>
    
    <h2>Section 1</h2>
    <p>Content for section 1.</p>
    
    <h3>Subsection 1.1</h3>
    <p>More detailed content.</p>
    
    <h2>Section 2</h2>
    <p>Content for section 2.</p>
</body>
</html>`;

            const result = await processor.processWebContent(html);

            expect(result.title).toBe('Test Document');
            expect(result.metadata.originalFormat).toBe('html');
            expect(result.metadata.tags).toEqual(['test', 'html', 'processing']);
            expect(result.structure.sections).toHaveLength(1); // One main section with h2 subsections
        });

        it('should extract images from HTML', async () => {
            const html = `<html>
<body>
    <h1>Document with Images</h1>
    <img src="https://example.com/image1.jpg" alt="First image">
    <p>Some content</p>
    <img src="/local/image2.png" alt="Second image">
</body>
</html>`;

            const baseUrl = 'https://example.com';
            const result = await processor.processWebContent(html, baseUrl);

            expect(result.assets).toHaveLength(2);
            expect(result.assets[0].url).toBe('https://example.com/image1.jpg');
            expect(result.assets[1].url).toBe('https://example.com/local/image2.png');
        });

        it('should extract code blocks from HTML', async () => {
            const html = `<html>
<body>
    <h1>Code Examples</h1>
    <pre><code>function test() {
    return "hello";
}</code></pre>
    <p>Some text</p>
    <pre><code>console.log("world");</code></pre>
</body>
</html>`;

            const result = await processor.processWebContent(html);

            const codeBlocks = result.content.filter(block => block.type === 'code');
            expect(codeBlocks).toHaveLength(2);
            expect(codeBlocks[0].content.code).toContain('function test()');
        });
    });

    describe('Structure Detection', () => {
        it('should build proper section hierarchy', async () => {
            const markdown = `# Level 1

Content 1

## Level 2A

Content 2A

### Level 3A

Content 3A

### Level 3B

Content 3B

## Level 2B

Content 2B

# Another Level 1

Content for another level 1`;

            const result = await processor.processMarkdown(markdown);

            expect(result.structure.sections).toHaveLength(2); // Two h1 sections

            const firstSection = result.structure.sections[0];
            expect(firstSection.title).toBe('Level 1');
            expect(firstSection.level).toBe(1);
            expect(firstSection.subsections).toHaveLength(2); // Two h2 subsections

            const firstSubsection = firstSection.subsections[0];
            expect(firstSubsection.title).toBe('Level 2A');
            expect(firstSubsection.level).toBe(2);
            expect(firstSubsection.subsections).toHaveLength(2); // Two h3 subsections
        });

        it('should generate table of contents', async () => {
            const markdown = `# Introduction

Welcome to the document.

## Getting Started

How to begin.

### Prerequisites

What you need.

### Installation

How to install.

## Advanced Topics

More complex subjects.`;

            const result = await processor.processMarkdown(markdown);

            expect(result.structure.toc.entries).toHaveLength(1); // One main entry

            const mainEntry = result.structure.toc.entries[0];
            expect(mainEntry.title).toBe('Introduction');
            expect(mainEntry.children).toHaveLength(2); // Two subsections

            const gettingStarted = mainEntry.children[0];
            expect(gettingStarted.title).toBe('Getting Started');
            expect(gettingStarted.children).toHaveLength(2); // Two sub-subsections
        });

        it('should calculate structure metadata', async () => {
            const markdown = `# Title

![Image](test.jpg)

\`\`\`javascript
console.log("code");
\`\`\`

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

## Section

More content.

### Subsection

Even more content.`;

            const result = await processor.processMarkdown(markdown);

            expect(result.structure.metadata.maxDepth).toBe(3);
            expect(result.structure.metadata.sectionCount).toBe(3);
            expect(result.structure.metadata.hasImages).toBe(true);
            expect(result.structure.metadata.hasCodeBlocks).toBe(true);
            expect(result.structure.metadata.hasTables).toBe(true);
        });
    });

    describe('Unified Processing Interface', () => {
        it('should detect content type automatically', async () => {
            const htmlContent = '<!DOCTYPE html><html><body><h1>Test</h1></body></html>';
            const markdownContent = '# Test\n\nThis is markdown.';
            const plainContent = 'This is just plain text.';

            const htmlResult = await processor.processDocument(htmlContent);
            const markdownResult = await processor.processDocument(markdownContent);
            const plainResult = await processor.processDocument(plainContent);

            expect(htmlResult.metadata.originalFormat).toBe('html');
            expect(markdownResult.metadata.originalFormat).toBe('markdown');
            expect(plainResult.metadata.originalFormat).toBe('text');
        });

        it('should handle empty or minimal content gracefully', async () => {
            const emptyContent = '';
            const minimalContent = 'Just a sentence.';

            const emptyResult = await processor.processDocument(emptyContent);
            const minimalResult = await processor.processDocument(minimalContent);

            expect(emptyResult.content).toBeDefined();
            expect(minimalResult.content).toBeDefined();
            expect(minimalResult.metadata.wordCount).toBe(3);
        });
    });

    describe('Error Handling', () => {
        it('should handle malformed markdown gracefully', async () => {
            const malformedMarkdown = `# Title

## Section with no content

### 

Content without heading

# Another title
## Nested without proper structure`;

            const result = await processor.processMarkdown(malformedMarkdown);

            expect(result).toBeDefined();
            expect(result.structure.sections).toBeDefined();
            expect(result.content).toBeDefined();
        });

        it('should handle malformed HTML gracefully', async () => {
            const malformedHtml = `<html>
<body>
<h1>Title
<p>Unclosed paragraph
<h2>Section</h2>
<img src="broken-image.jpg"
</body>`;

            const result = await processor.processWebContent(malformedHtml);

            expect(result).toBeDefined();
            expect(result.title).toBe('Web Content');
            expect(result.content).toBeDefined();
        });
    });

    describe('Configuration', () => {
        it('should respect processing configuration', async () => {
            const processorWithConfig = new EnhancedDocumentProcessor({
                detectCodeBlocks: false,
                extractImages: false,
                maxSectionDepth: 2
            });

            const markdown = `# Title

![Image](test.jpg)

\`\`\`javascript
console.log("test");
\`\`\`

## Section

### Subsection

#### Deep subsection`;

            const result = await processorWithConfig.processMarkdown(markdown);

            // Should not extract code blocks due to config
            const codeBlocks = result.content.filter(block => block.type === 'code');
            expect(codeBlocks).toHaveLength(0);

            // Should not extract images due to config
            expect(result.assets).toHaveLength(0);
        });
    });
});