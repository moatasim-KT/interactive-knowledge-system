/**
 * Integration tests for Interactive Content Transformer with Enhanced Document Processor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { InteractiveTransformer } from '../interactiveTransformer.js';
import { EnhancedDocumentProcessor } from '../enhancedDocumentProcessor.js';

describe('InteractiveTransformer Integration', () => {
    let transformer: InteractiveTransformer;
    let documentProcessor: EnhancedDocumentProcessor;

    beforeEach(() => {
        transformer = new InteractiveTransformer({
            enableExpandableSections: true,
            generateQuizzes: true,
            enhanceCodeBlocks: true,
            findRelatedContent: true,
            aiEnhancement: true
        });

        documentProcessor = new EnhancedDocumentProcessor({
            detectCodeBlocks: true,
            generateToc: true,
            minSectionLength: 100
        });
    });

    describe('Markdown to Interactive Article Pipeline', () => {
        it('should process markdown and transform to interactive article', async () => {
            const markdownContent = `# Introduction to JavaScript

JavaScript is a versatile programming language that runs in web browsers and on servers. It's essential for modern web development.

## Variables and Data Types

In JavaScript, you can declare variables using different keywords:

\`\`\`javascript
let name = "John";
const age = 30;
var isActive = true;
\`\`\`

Variables can hold different types of data including strings, numbers, and booleans.

## Functions

Functions are reusable blocks of code that perform specific tasks:

\`\`\`javascript
function greetUser(name) {
    return "Hello, " + name + "!";
}

console.log(greetUser("Alice"));
\`\`\`

Functions help organize code and make it more maintainable.

## Conclusion

JavaScript is a powerful language that continues to evolve. Learning its fundamentals is crucial for web development success.`;

            // Process the markdown document
            const processedDoc = await documentProcessor.processMarkdown(markdownContent, 'javascript-intro.md');

            // Transform to interactive article
            const interactiveArticle = await transformer.transformToInteractive(processedDoc);

            // Verify the transformation
            expect(interactiveArticle).toBeDefined();
            expect(interactiveArticle.title).toBe('javascript-intro');
            expect(interactiveArticle.content.length).toBeGreaterThan(0);

            // Check for interactive features
            const textBlocks = interactiveArticle.content.filter(block => block.type === 'text');
            const codeBlocks = interactiveArticle.content.filter(block => block.type === 'code');

            expect(textBlocks.length).toBeGreaterThan(0);
            expect(codeBlocks.length).toBeGreaterThan(0);

            // Verify text blocks have expandable features for long content
            const longTextBlocks = textBlocks.filter(block => {
                const textLength = block.content?.text?.length || 0;
                return textLength > 200;
            });

            longTextBlocks.forEach(block => {
                expect(block.interactivity.features).toContainEqual(
                    expect.objectContaining({ type: 'expandable', enabled: true })
                );
            });

            // Verify code blocks have execution features
            codeBlocks.forEach(block => {
                if (block.content?.language === 'javascript') {
                    expect(block.interactivity.features).toContainEqual(
                        expect.objectContaining({ type: 'code-execution', enabled: true })
                    );
                }
            });

            // Check for generated enhancements
            const blocksWithQuizzes = interactiveArticle.content.filter(block =>
                block.enhancements.some(e => e.type === 'quiz')
            );
            expect(blocksWithQuizzes.length).toBeGreaterThan(0);
        });

        it('should create proper interactive structure', async () => {
            const markdownContent = `# Main Title

This is the introduction section with enough content to be expandable.

## Section 1

Content for section 1 with detailed information.

### Subsection 1.1

More detailed content in a subsection.

## Section 2

Another section with different content.`;

            const processedDoc = await documentProcessor.processMarkdown(markdownContent);
            const interactiveArticle = await transformer.transformToInteractive(processedDoc);

            // Verify interactive structure
            expect(interactiveArticle.structure).toBeDefined();
            expect(interactiveArticle.structure.sections.length).toBeGreaterThan(0);
            expect(interactiveArticle.structure.navigation.showTableOfContents).toBe(true);
            expect(interactiveArticle.structure.progressTracking.trackReadingProgress).toBe(true);

            // Verify sections have proper hierarchy
            const sections = interactiveArticle.structure.sections;
            sections.forEach(section => {
                expect(section.id).toBeDefined();
                expect(section.title).toBeDefined();
                expect(section.estimatedTime).toBeGreaterThan(0);
                expect(typeof section.expandable).toBe('boolean');
            });
        });
    });

    describe('HTML to Interactive Article Pipeline', () => {
        it('should process HTML content and transform to interactive', async () => {
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Web Development Guide</title>
</head>
<body>
    <h1>Web Development Fundamentals</h1>
    <p>Web development involves creating websites and web applications using various technologies.</p>
    
    <h2>HTML Basics</h2>
    <p>HTML (HyperText Markup Language) is the foundation of web pages. It provides structure and content.</p>
    
    <pre><code>&lt;div class="container"&gt;
    &lt;h1&gt;Welcome&lt;/h1&gt;
    &lt;p&gt;This is a paragraph.&lt;/p&gt;
&lt;/div&gt;</code></pre>
    
    <h2>CSS Styling</h2>
    <p>CSS (Cascading Style Sheets) is used to style and layout web pages.</p>
    
    <img src="example.jpg" alt="Example image" />
</body>
</html>`;

            const processedDoc = await documentProcessor.processWebContent(htmlContent);
            const interactiveArticle = await transformer.transformToInteractive(processedDoc);

            expect(interactiveArticle).toBeDefined();
            expect(interactiveArticle.title).toBe('Web Development Guide');
            expect(interactiveArticle.content.length).toBeGreaterThan(0);

            // Check for code blocks extracted from HTML
            const codeBlocks = interactiveArticle.content.filter(block => block.type === 'code');
            expect(codeBlocks.length).toBeGreaterThan(0);

            // Verify interactive assets
            expect(interactiveArticle.assets.length).toBeGreaterThan(0);
            const imageAssets = interactiveArticle.assets.filter(asset => asset.type === 'image');
            imageAssets.forEach(asset => {
                expect(asset.interactivity.zoomable).toBe(true);
                expect(asset.interactivity.annotatable).toBe(true);
            });
        });
    });

    describe('Configuration Integration', () => {
        it('should respect combined configuration from both services', async () => {
            const customTransformer = new InteractiveTransformer({
                enableExpandableSections: false,
                generateQuizzes: false,
                enhanceCodeBlocks: true
            });

            const customProcessor = new EnhancedDocumentProcessor({
                detectCodeBlocks: true,
                minSectionLength: 50
            });

            const markdownContent = `# Test

This is a test document with code:

\`\`\`python
print("Hello, World!")
\`\`\`

And some regular text content.`;

            const processedDoc = await customProcessor.processMarkdown(markdownContent);
            const interactiveArticle = await customTransformer.transformToInteractive(processedDoc);

            // Verify configuration is respected
            const textBlocks = interactiveArticle.content.filter(block => block.type === 'text');
            const codeBlocks = interactiveArticle.content.filter(block => block.type === 'code');

            // No expandable features due to configuration
            textBlocks.forEach(block => {
                const hasExpandable = block.interactivity.features.some(f => f.type === 'expandable');
                expect(hasExpandable).toBe(false);
            });

            // No quiz enhancements due to configuration
            textBlocks.forEach(block => {
                const hasQuiz = block.enhancements.some(e => e.type === 'quiz');
                expect(hasQuiz).toBe(false);
            });

            // Code blocks should still be enhanced
            codeBlocks.forEach(block => {
                const hasCodeExecution = block.interactivity.features.some(f => f.type === 'code-execution');
                expect(hasCodeExecution).toBe(true);
            });
        });
    });

    describe('Error Handling Integration', () => {
        it('should handle processing errors gracefully', async () => {
            const invalidMarkdown = null as any;

            await expect(documentProcessor.processMarkdown(invalidMarkdown))
                .rejects.toThrow();
        });

        it('should handle transformation errors gracefully', async () => {
            const validDoc = await documentProcessor.processMarkdown('# Simple test');

            // Simulate transformation error by passing invalid data
            const corruptedDoc = { ...validDoc, content: null as any };

            await expect(transformer.transformToInteractive(corruptedDoc))
                .rejects.toThrow('Interactive transformation failed');
        });
    });

    describe('Performance Integration', () => {
        it('should handle large documents efficiently', async () => {
            // Create a large markdown document
            const sections = Array.from({ length: 10 }, (_, i) => `
## Section ${i + 1}

This is section ${i + 1} with substantial content that should be processed efficiently. 
It contains multiple paragraphs and various elements that need to be transformed into 
interactive components. The content is long enough to trigger expandable sections and 
other interactive features.

\`\`\`javascript
// Code block ${i + 1}
function section${i + 1}() {
    console.log("This is section ${i + 1}");
    return "Section ${i + 1} result";
}
\`\`\`

Additional content to make this section substantial and test the performance of the 
transformation pipeline when dealing with larger documents.
`).join('\n');

            const largeMarkdown = `# Large Document Test\n\n${sections}`;

            const startTime = Date.now();

            const processedDoc = await documentProcessor.processMarkdown(largeMarkdown);
            const interactiveArticle = await transformer.transformToInteractive(processedDoc);

            const endTime = Date.now();
            const processingTime = endTime - startTime;

            // Verify the document was processed
            expect(interactiveArticle).toBeDefined();
            expect(interactiveArticle.content.length).toBeGreaterThan(10);

            // Verify reasonable processing time (should be under 5 seconds for this test)
            expect(processingTime).toBeLessThan(5000);

            // Verify all sections were processed
            expect(interactiveArticle.structure.sections.length).toBeGreaterThan(0);
        });
    });
});