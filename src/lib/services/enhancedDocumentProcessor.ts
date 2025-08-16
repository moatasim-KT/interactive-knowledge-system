/**
 * Enhanced Document Processor Service
 * Handles PDF processing, markdown parsing, and unified document processing
 * with automatic section detection and hierarchy building
 */

import type { ContentBlock, DocumentSource, UploadProgress, DocumentMetadata, ProcessedDocument, DocumentStructure, DocumentSection, TableOfContents, TocEntry, StructureMetadata, MediaAsset } from '$lib/types/unified';



// Processing configuration
export interface ProcessingConfig {
    enableOcr: boolean;
    ocrLanguage: string;
    extractImages: boolean;
    detectCodeBlocks: boolean;
    generateToc: boolean;
    minSectionLength: number;
    maxSectionDepth: number;
}

// Default processing configuration
const DEFAULT_CONFIG: ProcessingConfig = {
    enableOcr: true,
    ocrLanguage: 'eng',
    extractImages: true,
    detectCodeBlocks: true,
    generateToc: true,
    minSectionLength: 100,
    maxSectionDepth: 6
};

/**
 * Enhanced Document Processor class
 */
export class EnhancedDocumentProcessor {
    private config: ProcessingConfig;

    constructor(config: Partial<ProcessingConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Process a PDF file with text extraction and OCR fallback
     */
    async processPdf(file: File): Promise<ProcessedDocument> {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            // First attempt: Direct text extraction
            let extractedText = '';
            let extractionMethod = 'direct';
            let confidence = 0.9;

            try {
                extractedText = await this.extractPdfText(uint8Array);
                if (extractedText.trim().length < 100 && this.config.enableOcr) {
                    // Fallback to OCR if direct extraction yields little text
                    extractedText = await this.performOcr(uint8Array);
                    extractionMethod = 'ocr';
                    confidence = 0.7;
                }
            } catch (error) {
                if (this.config.enableOcr) {
                    extractedText = await this.performOcr(uint8Array);
                    extractionMethod = 'ocr-fallback';
                    confidence = 0.6;
                } else {
                    throw new Error('PDF text extraction failed and OCR is disabled');
                }
            }

            // Extract images if enabled
            const assets: MediaAsset[] = [];
            if (this.config.extractImages) {
                const images = await this.extractPdfImages(uint8Array);
                assets.push(...images);
            }

            // Create document metadata
            const metadata: DocumentMetadata = {
                title: file.name.split('.').slice(0, -1).join('.'),
                author: undefined, // No author from PDF by default
                subject: undefined,
                keywords: [],
                language: 'en',
                created: new Date(),
                modified: new Date(),
                version: 1,
                pageCount: undefined,
                sourceUrl: '',
                wordCount: this.countWords(extractedText),
                readingTime: Math.ceil(this.countWords(extractedText) / 200), // Assuming 200 words per minute
                fileSize: file.size,
                mimeType: file.type,
                contentType: 'document/pdf',
                difficulty: 'intermediate',
                estimatedTime: 10,
                originalFormat: 'pdf',
                originalFileName: file.name,
                processedAt: new Date(),
                processingTime: 0, // Would be calculated in real implementation
                tags: [],
                prerequisites: [],
            };

            // Process content and structure
            const structure = await this.buildDocumentStructure(extractedText);
            const content = await this.createContentBlocks(extractedText, structure);

            return {
                id: this.generateId(),
                title: file.name.replace('.pdf', ''),
                content,
                metadata,
                structure,
                assets,
                source: {
                    id: this.generateId(),
                    type: 'file',
                    name: file.name,
                    originalUrl: file.name,
                    uploadedAt: new Date(),
                    metadata: {}
                },
                documentContent: {
                    html: extractedText,
                    text: extractedText,
                    codeBlocks: [],
                    tables: [],
                    images: []
                },
                extraction: {
                    method: 'pdf-extraction',
                    issues: [],
                    confidence: 0.9
                },
                success: true,
                relationships: {
                    prerequisites: [],
                    dependents: [],
                    related: []
                },
                analytics: {
                    complexity: 0.5,
                    readability: 0.7,
                    engagement: 0.6
                }
            };
        } catch (error) {
            throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process markdown content with enhanced structure detection
     */
    async processMarkdown(content: string, filename?: string): Promise<ProcessedDocument> {
        try {
            // Parse markdown structure
            const structure = await this.parseMarkdownStructure(content);

            // Extract metadata from frontmatter if present
            const { content: cleanContent, frontmatter } = this.extractFrontmatter(content);

            // Create content blocks
            const contentBlocks = await this.createMarkdownContentBlocks(cleanContent, structure);

            // Extract assets (images, links to media)
            const assets = await this.extractMarkdownAssets(cleanContent);

            const metadata: DocumentMetadata = {
                originalFormat: 'markdown',
                created: frontmatter?.date ? new Date(frontmatter.date) : new Date(),
                modified: new Date(),
                version: 1,
                originalFileName: filename,
                author: frontmatter?.author,
                language: frontmatter?.lang || 'en',
                wordCount: this.countWords(cleanContent),
                keywords: frontmatter?.keywords || [],
                title: frontmatter?.title || (filename ? filename.split('.').slice(0, -1).join('.') : 'Untitled Markdown Document'),
                subject: frontmatter?.subject,
                pageCount: undefined,
                sourceUrl: '', // Not applicable for markdown without explicit pages
                readingTime: Math.ceil(this.countWords(cleanContent) / 200),
                fileSize: content.length, // Approximation for markdown
                mimeType: 'text/markdown',
                contentType: 'document/markdown',
                difficulty: frontmatter?.difficulty || 'intermediate',
                estimatedTime: frontmatter?.estimatedTime || 10,
                processedAt: new Date(),
                processingTime: 0,
                tags: frontmatter?.tags || [],
                prerequisites: frontmatter?.prerequisites || [],
            };

            return {
                id: this.generateId(),
                title: frontmatter?.title || filename?.replace('.md', '') || 'Untitled',
                content: contentBlocks,
                metadata,
                structure,
                assets,
                source: {
                    id: this.generateId(),
                    type: 'file',
                    name: filename || 'markdown-content',
                    originalUrl: 'markdown-content',
                    uploadedAt: new Date(),
                    metadata: {}
                },
                documentContent: {
                    html: cleanContent,
                    text: cleanContent,
                    codeBlocks: [],
                    tables: [],
                    images: []
                },
                extraction: {
                    method: 'markdown-parsing',
                    issues: [],
                    confidence: 0.9
                },
                success: true,
                relationships: {
                    prerequisites: [],
                    dependents: [],
                    related: []
                },
                analytics: {
                    complexity: 0.5,
                    readability: 0.8,
                    engagement: 0.7
                }
            };
        } catch (error) {
            throw new Error(`Markdown processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Process web content (HTML) with structure detection
     */
    async processWebContent(html: string, url?: string): Promise<ProcessedDocument> {
        try {
            // Clean and extract main content
            const cleanContent = this.extractMainContent(html);

            // Build structure from HTML headings
            const structure = await this.buildHtmlStructure(cleanContent);

            // Create content blocks
            const content = await this.createHtmlContentBlocks(cleanContent, structure);

            // Extract assets
            const assets = await this.extractHtmlAssets(cleanContent, url);

            const metadata: DocumentMetadata = {
                title: this.extractHtmlTitle(cleanContent) || 'Untitled Web Content',
                author: this.extractHtmlAuthor(cleanContent),
                subject: undefined,
                keywords: this.extractHtmlTags(html),
                language: this.extractHtmlLanguage(cleanContent) || 'en',
                created: new Date(),
                modified: new Date(),
                version: 1,
                pageCount: undefined,
                wordCount: this.countWords(this.stripHtml(cleanContent)),
                readingTime: Math.ceil(this.countWords(this.stripHtml(cleanContent)) / 200),
                fileSize: cleanContent.length, // Approximation for HTML
                mimeType: 'text/html',
                contentType: 'web/html',
                difficulty: 'intermediate',
                estimatedTime: 10,
                originalFormat: 'html',
                originalFileName: undefined,
                processedAt: new Date(),
                processingTime: 0,
                sourceUrl: url,
                tags: this.extractHtmlTags(html),
                prerequisites: [],
            };

            return {
                id: this.generateId(),
                title: this.extractHtmlTitle(html) || 'Web Content',
                content,
                metadata,
                structure,
                assets,
                source: {
                    id: this.generateId(),
                    type: 'url',
                    name: 'web-content',
                    originalUrl: url || 'web-content',
                    uploadedAt: new Date(),
                    metadata: {}
                },
                documentContent: {
                    html: cleanContent,
                    text: this.stripHtml(cleanContent),
                    codeBlocks: [],
                    tables: [],
                    images: []
                },
                extraction: {
                    method: 'html-parsing',
                    issues: [],
                    confidence: 0.9
                },
                success: true,
                relationships: {
                    prerequisites: [],
                    dependents: [],
                    related: []
                },
                analytics: {
                    complexity: 0.6,
                    readability: 0.7,
                    engagement: 0.8
                }
            };
        } catch (error) {
            throw new Error(`Web content processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Unified document processing interface
     */
    async processDocument(input: File | string, type?: 'pdf' | 'markdown' | 'html'): Promise<ProcessedDocument> {
        if (input instanceof File) {
            const fileType = type || this.detectFileType(input);
            switch (fileType) {
                case 'pdf':
                    return this.processPdf(input);
                case 'markdown':
                    const content = await input.text();
                    return this.processMarkdown(content, input.name);
                default:
                    throw new Error(`Unsupported file type: ${fileType}`);
            }
        } else {
            const contentType = type || this.detectContentType(input);
            switch (contentType) {
                case 'markdown':
                    return this.processMarkdown(input);
                case 'html':
                    return this.processWebContent(input);
                default:
                    // Treat as plain text and try to detect structure
                    return this.processPlainText(input);
            }
        }
    }

    // Private helper methods
    private async extractPdfText(pdfData: Uint8Array): Promise<string> {
        // This would integrate with a PDF parsing library like pdf-parse or PDF.js
        // For now, return a placeholder implementation
        throw new Error('PDF text extraction not implemented - requires pdf-parse library');
    }

    private async performOcr(pdfData: Uint8Array): Promise<string> {
        // This would integrate with an OCR library like Tesseract.js
        // For now, return a placeholder implementation
        throw new Error('OCR not implemented - requires Tesseract.js library');
    }

    private async extractPdfImages(pdfData: Uint8Array): Promise<MediaAsset[]> {
        // Extract images from PDF
        return [];
    }

    private async buildDocumentStructure(text: string): Promise<DocumentStructure> {
        const sections = this.detectSections(text);
        const toc = this.generateTableOfContents(sections);

        const metadata: StructureMetadata = {
            sectionCount: this.countAllSections(sections),
            averageSectionLength: this.calculateAverageSectionLength(sections),
            hasTableOfContents: sections.some(s => s.level === 1 && s.subsections.length > 0), // Simple check
            hasIndex: false, // Not automatically detectable from markdown structure
            complexity: this.determineComplexity(sections),
            totalSections: this.countAllSections(sections),
            maxDepth: this.getMaxDepth(sections),
            hasImages: this.hasImages(sections),
            hasCode: this.hasCodeBlocks(sections), // Assuming hasCode is equivalent to hasCodeBlocks
            hasCodeBlocks: this.hasCodeBlocks(sections),
            hasTables: this.hasTables(sections),
        };

        return {
            sections,
            tableOfContents: toc,
            metadata,
            outline: this.generateOutline(sections),
        };
    }

    private detectSections(text: string): DocumentSection[] {
        const sections: DocumentSection[] = [];
        const lines = text.split('\n');
        let currentSection: DocumentSection | null = null;
        let sectionId = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Detect headings (markdown style)
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headingMatch) {
                const level = headingMatch[1].length;
                const title = headingMatch[2];

                // Close previous section
                if (currentSection) {
                    currentSection.endPosition = i;
                }

                // Create new section
                currentSection = {
                    id: `section-${++sectionId}`,
                    title,
                    level,
                    content: [],
                    subsections: [],
                    startPosition: i,
                    endPosition: i
                };

                sections.push(currentSection);
            }
        }

        // Close last section
        if (currentSection) {
            currentSection.endPosition = lines.length;
        }

        return this.buildSectionHierarchy(sections);
    }

    private buildSectionHierarchy(flatSections: DocumentSection[]): DocumentSection[] {
        const hierarchy: DocumentSection[] = [];
        const stack: DocumentSection[] = [];

        for (const section of flatSections) {
            // Find the correct parent level
            while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
                stack.pop();
            }

            if (stack.length === 0) {
                // Top-level section
                hierarchy.push(section);
            } else {
                // Add as subsection to the last item in stack
                stack[stack.length - 1].subsections.push(section);
            }

            stack.push(section);
        }

        return hierarchy;
    }

    private generateTableOfContents(sections: DocumentSection[]): TableOfContents {

        const processSection = (section: DocumentSection): TocEntry => {
            const entry: TocEntry = {
                id: section.id,
                title: section.title,
                level: section.level,
                position: section.startPosition,
                children: section.subsections.map(processSection)
            };
            return entry;
        };

        const entries = sections.map(processSection);
        return {
            title: 'Table of Contents', // Default title
            maxDepth: this.getMaxDepth(sections),
            includePageNumbers: false, // Assuming no page numbers from raw text
            entries,
            items: entries // Backward compatibility
        };
    }

    private async createContentBlocks(text: string, structure: DocumentStructure): Promise<ContentBlock[]> {
        const blocks: ContentBlock[] = [];
        const lines = text.split('\n');

        for (const section of structure.sections) {
            // Extract section content
            const sectionLines = lines.slice(section.startPosition, section.endPosition);
            const sectionText = sectionLines.join('\n');

            // Create text block for section
            if (sectionText.trim()) {
                blocks.push({
                    id: this.generateId(),
                    type: 'text',
                    content: {
                        text: sectionText,
                        format: 'markdown'
                    },
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        version: 1
                    }
                });
            }

            // Detect and create code blocks
            if (this.config.detectCodeBlocks) {
                const codeBlocks = this.extractCodeBlocks(sectionText);
                blocks.push(...codeBlocks);
            }
        }

        return blocks;
    }

    private extractCodeBlocks(text: string): ContentBlock[] {
        const codeBlocks: ContentBlock[] = [];
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;

        while ((match = codeBlockRegex.exec(text)) !== null) {
            const language = match[1] || 'text';
            const code = match[2];

            codeBlocks.push({
                id: this.generateId(),
                type: 'code',
                content: {
                    code,
                    language,
                    executable: this.isExecutableLanguage(language)
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            });
        }

        return codeBlocks;
    }

    private isExecutableLanguage(language: string): boolean {
        const executableLanguages = ['javascript', 'python', 'typescript', 'sql'];
        return executableLanguages.includes(language.toLowerCase());
    }

    private async parseMarkdownStructure(content: string): Promise<DocumentStructure> {
        // Enhanced markdown structure parsing
        const sections = this.detectMarkdownSections(content);
        const toc = this.generateTableOfContents(sections);

        const metadata: StructureMetadata = {
            sectionCount: this.countAllSections(sections),
            averageSectionLength: this.calculateAverageSectionLength(sections),
            hasTableOfContents: sections.some(s => s.level === 1 && s.subsections.length > 0), // Simple check
            hasIndex: false, // Not automatically detectable from markdown structure
            complexity: this.determineComplexity(sections),
            totalSections: this.countAllSections(sections),
            maxDepth: this.getMaxDepth(sections),
            hasImages: /!\[.*?\]\(.*?\)/.test(content),
            hasCode: /```[\s\S]*?```/.test(content), // Assuming hasCode is equivalent to hasCodeBlocks
            hasCodeBlocks: /```[\s\S]*?```/.test(content),
            hasTables: /\|.*\|/.test(content)
        };

        return {
            sections,
            tableOfContents: toc,
            metadata,
            outline: this.generateOutline(sections),
        };
    }

    private detectMarkdownSections(content: string): DocumentSection[] {
        const sections: DocumentSection[] = [];
        const lines = content.split('\n');
        let sectionId = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // ATX headings (# ## ###)
            const atxMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (atxMatch) {
                sections.push({
                    id: `section-${++sectionId}`,
                    title: atxMatch[2],
                    level: atxMatch[1].length,
                    content: [],
                    subsections: [],
                    startPosition: i,
                    endPosition: i
                });
                continue;
            }

            // Setext headings (underlined with = or -)
            if (i < lines.length - 1) {
                const nextLine = lines[i + 1];
                if (/^=+$/.test(nextLine) && line.trim()) {
                    sections.push({
                        id: `section-${++sectionId}`,
                        title: line.trim(),
                        level: 1,
                        content: [],
                        subsections: [],
                        startPosition: i,
                        endPosition: i
                    });
                    i++; // Skip the underline
                    continue;
                }
                if (/^-+$/.test(nextLine) && line.trim()) {
                    sections.push({
                        id: `section-${++sectionId}`,
                        title: line.trim(),
                        level: 2,
                        content: [],
                        subsections: [],
                        startPosition: i,
                        endPosition: i
                    });
                    i++; // Skip the underline
                    continue;
                }
            }
        }

        // Set end positions for sections
        for (let i = 0; i < sections.length; i++) {
            if (i < sections.length - 1) {
                sections[i].endPosition = sections[i + 1].startPosition;
            } else {
                sections[i].endPosition = lines.length;
            }
        }

        return this.buildSectionHierarchy(sections);
    }

    private extractFrontmatter(content: string): { content: string; frontmatter: Record<string, any> | null } {
        const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);

        if (!match) {
            return { content, frontmatter: null };
        }

        try {
            // Simple YAML-like parsing for common frontmatter fields
            const frontmatterText = match[1];
            const frontmatter: Record<string, any> = {};

            const lines = frontmatterText.split('\n');
            for (const line of lines) {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim();

                    // Handle arrays (simple format)
                    if (value.startsWith('[') && value.endsWith(']')) {
                        frontmatter[key] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
                    } else {
                        frontmatter[key] = value.replace(/['"]/g, '');
                    }
                }
            }

            return { content: match[2], frontmatter };
        } catch (error) {
            return { content, frontmatter: null };
        }
    }

    private async createMarkdownContentBlocks(content: string, structure: DocumentStructure): Promise<ContentBlock[]> {
        const blocks: ContentBlock[] = [];

        // Process each section
        for (const section of structure.sections) {
            const sectionContent = this.extractSectionContent(content, section);

            if (sectionContent.trim()) {
                blocks.push({
                    id: this.generateId(),
                    type: 'text',
                    content: {
                        text: sectionContent,
                        format: 'markdown',
                        section: section.title
                    },
                    metadata: {
                        created: new Date(),
                        modified: new Date(),
                        version: 1
                    }
                });
            }

            // Extract code blocks from this section if enabled
            if (this.config.detectCodeBlocks) {
                const codeBlocks = this.extractCodeBlocks(sectionContent);
                blocks.push(...codeBlocks);
            }
        }

        // Also extract code blocks from the entire content to catch any missed ones
        if (this.config.detectCodeBlocks) {
            const allCodeBlocks = this.extractCodeBlocks(content);
            // Only add code blocks that aren't already in the blocks array
            for (const codeBlock of allCodeBlocks) {
                const exists = blocks.some(block =>
                    block.type === 'code' &&
                    block.content.code === codeBlock.content.code
                );
                if (!exists) {
                    blocks.push(codeBlock);
                }
            }
        }

        return blocks;
    }

    private extractSectionContent(content: string, section: DocumentSection): string {
        const lines = content.split('\n');
        return lines.slice(section.startPosition, section.endPosition).join('\n');
    }

    private async extractMarkdownAssets(content: string): Promise<MediaAsset[]> {
        const assets: MediaAsset[] = [];

        // Extract images if enabled
        if (this.config.extractImages) {
            const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            let match;

            while ((match = imageRegex.exec(content)) !== null) {
                const alt = match[1];
                const url = match[2];

                assets.push({
                    id: this.generateId(),
                    type: 'image',
                    name: url.split('/').pop() || 'image',
                    path: url,
                    url,
                    filename: url.split('/').pop() || 'image',
                    size: 0, // Would need to fetch to get actual size
                    mimeType: this.getMimeTypeFromUrl(url),
                    extractedFrom: 'markdown',
                    metadata: { alt }
                });
            }
        }

        return assets;
    }

    private buildHtmlStructure(html: string): Promise<DocumentStructure> {
        // Parse HTML headings to build structure
        const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h[1-6]>/gi;
        const sections: DocumentSection[] = [];
        let match;
        let sectionId = 0;

        while ((match = headingRegex.exec(html)) !== null) {
            const level = parseInt(match[1]);
            const title = this.stripHtml(match[2]);

            sections.push({
                id: `section-${++sectionId}`,
                title,
                level,
                content: [],
                subsections: [],
                startPosition: match.index,
                endPosition: match.index + match[0].length
            });
        }

        const hierarchy = this.buildSectionHierarchy(sections);
        const toc = this.generateTableOfContents(hierarchy);

        const metadata: StructureMetadata = {
            sectionCount: this.countAllSections(hierarchy),
            averageSectionLength: this.calculateAverageSectionLength(hierarchy),
            hasTableOfContents: hierarchy.some(s => s.level === 1 && s.subsections.length > 0),
            hasIndex: false, // Not automatically detectable from HTML structure
            complexity: this.determineComplexity(hierarchy),
            totalSections: this.countAllSections(hierarchy),
            maxDepth: this.getMaxDepth(hierarchy),
            hasImages: /<img[^>]*>/i.test(html),
            hasCode: /<code[^>]*>|<pre[^>]*>/i.test(html),
            hasCodeBlocks: /<code[^>]*>|<pre[^>]*>/i.test(html),
            hasTables: /<table[^>]*>/i.test(html)
        };

        return Promise.resolve({
            sections: hierarchy,
            tableOfContents: toc,
            metadata,
            outline: this.generateOutline(hierarchy)
        });
    }

    private async createHtmlContentBlocks(html: string, structure: DocumentStructure): Promise<ContentBlock[]> {
        const blocks: ContentBlock[] = [];

        // Convert HTML to content blocks
        const textContent = this.stripHtml(html);

        if (textContent.trim()) {
            blocks.push({
                id: this.generateId(),
                type: 'text',
                content: {
                    text: textContent,
                    format: 'html',
                    originalHtml: html
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            });
        }

        // Extract code blocks from HTML
        const codeBlockRegex = /<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi;
        let match;

        while ((match = codeBlockRegex.exec(html)) !== null) {
            const code = this.decodeHtml(match[1]);

            blocks.push({
                id: this.generateId(),
                type: 'code',
                content: {
                    code,
                    language: 'text',
                    executable: false
                },
                metadata: {
                    created: new Date(),
                    modified: new Date(),
                    version: 1
                }
            });
        }

        return blocks;
    }

    private async extractHtmlAssets(html: string, baseUrl?: string): Promise<MediaAsset[]> {
        const assets: MediaAsset[] = [];

        // Extract images
        const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/gi;
        let match;

        while ((match = imgRegex.exec(html)) !== null) {
            let url = match[1];

            // Convert relative URLs to absolute if baseUrl provided
            if (baseUrl && !url.startsWith('http')) {
                url = new URL(url, baseUrl).href;
            }

            assets.push({
                id: this.generateId(),
                type: 'image',
                name: url.split('/').pop() || 'image',
                path: url,
                url,
                filename: url.split('/').pop() || 'image',
                size: 0,
                mimeType: this.getMimeTypeFromUrl(url),
                extractedFrom: 'html',
                metadata: {}
            });
        }

        return assets;
    }

    private extractMainContent(html: string): string {
        // Simple content extraction - in a real implementation,
        // this would use a library like Readability.js
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
        return bodyMatch ? bodyMatch[1] : html;
    }

    private extractHtmlTitle(html: string): string {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        return titleMatch ? this.stripHtml(titleMatch[1]) : '';
    }

    private extractHtmlAuthor(html: string): string | undefined {
        const authorMatch = html.match(/<meta[^>]+name="author"[^>]+content="([^"]+)"/i);
        return authorMatch ? authorMatch[1] : undefined;
    }

    private extractHtmlLanguage(html: string): string | undefined {
        const langMatch = html.match(/<html[^>]+lang="([^"]+)"/i);
        return langMatch ? langMatch[1] : undefined;
    }

    private extractHtmlTags(html: string): string[] {
        const metaTagRegex = /<meta[^>]+name="keywords"[^>]+content="([^"]+)"/i;
        const match = html.match(metaTagRegex);
        return match ? match[1].split(',').map(tag => tag.trim()) : [];
    }

    private async processPlainText(text: string): Promise<ProcessedDocument> {
        // Process plain text by detecting structure
        const structure = await this.buildDocumentStructure(text);
        const content = await this.createContentBlocks(text, structure);

        const metadata: DocumentMetadata = {
            title: 'Plain Text Document',
            author: undefined,
            subject: undefined,
            keywords: [],
            language: 'en',
            created: new Date(),
            modified: new Date(),
            version: 1,
            pageCount: undefined,
            wordCount: this.countWords(text),
            readingTime: Math.ceil(this.countWords(text) / 200),
            fileSize: text.length, // Approximation for plain text
            mimeType: 'text/plain',
            contentType: 'document/text',
            difficulty: 'intermediate',
            estimatedTime: 10,
            originalFormat: 'text',
            originalFileName: undefined,
            processedAt: new Date(),
            processingTime: 0,
            sourceUrl: undefined,
            tags: [],
            prerequisites: [],
        };

        return {
            id: this.generateId(),
            title: 'Plain Text Document',
            content,
            metadata,
            structure,
            assets: [],
            source: {
                id: this.generateId(),
                type: 'text',
                name: 'plain-text-content',
                uploadedAt: new Date(),
                metadata: {}
            },
            documentContent: {
                html: `<pre>${text}</pre>`,
                text: text,
                codeBlocks: [],
                tables: [],
                images: []
            },
            extraction: {
                method: 'text-parsing',
                issues: [],
                confidence: 0.9
            },
            success: true,
            relationships: {
                prerequisites: [],
                dependents: [],
                related: []
            },
            analytics: {
                complexity: 0.3,
                readability: 0.9,
                engagement: 0.5
            }
        };
    }

    // Utility methods
    private detectFileType(file: File): 'pdf' | 'markdown' | 'html' | 'text' {
        const extension = file.name.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return 'pdf';
            case 'md':
            case 'markdown':
                return 'markdown';
            case 'html':
            case 'htm':
                return 'html';
            default:
                return 'text';
        }
    }

    private detectContentType(content: string): 'markdown' | 'html' | 'text' {
        if (content.includes('<!DOCTYPE') || content.includes('<html')) {
            return 'html';
        }
        if (content.includes('#') || content.includes('```') || content.includes('*')) {
            return 'markdown';
        }
        return 'text';
    }

    private countWords(text: string): number {
        return text.trim().split(/\s+/).length;
    }

    private stripHtml(html: string): string {
        return html.replace(/<[^>]*>/g, '').trim();
    }

    private decodeHtml(html: string): string {
        const entities: Record<string, string> = {
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'"
        };

        return html.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
    }

    private getMimeTypeFromUrl(url: string): string {
        const extension = url.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'webp': 'image/webp'
        };
        return mimeTypes[extension || ''] || 'application/octet-stream';
    }

    private generateOutline(sections: DocumentSection[]): string[] {
        const outline: string[] = [];
        const traverse = (secs: DocumentSection[], prefix: string = '') => {
            secs.forEach((section, index) => {
                const sectionNumber = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;
                outline.push(`${sectionNumber} ${section.title}`);
                traverse(section.subsections, sectionNumber);
            });
        };
        traverse(sections);
        return outline;
    }

    private generateId(): string {
        return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getMaxDepth(sections: DocumentSection[]): number {
        let maxDepth = 0;
        const traverse = (secs: DocumentSection[], depth: number) => {
            for (const section of secs) {
                maxDepth = Math.max(maxDepth, depth);
                traverse(section.subsections, depth + 1);
            }
        };
        traverse(sections, 1);
        return maxDepth;
    }

    private countAllSections(sections: DocumentSection[]): number {
        let count = sections.length;
        for (const section of sections) {
            count += this.countAllSections(section.subsections);
        }
        return count;
    }

    private calculateAverageSectionLength(sections: DocumentSection[]): number {
        let totalLength = 0;
        let totalSections = 0;
        const traverse = (secs: DocumentSection[]) => {
            for (const section of secs) {
                totalLength += section.content.length; // Assuming content is string or array of blocks
                totalSections++;
                traverse(section.subsections);
            }
        };
        traverse(sections);
        return totalSections > 0 ? totalLength / totalSections : 0;
    }

    private determineComplexity(sections: DocumentSection[]): 'simple' | 'moderate' | 'complex' {
        const maxDepth = this.getMaxDepth(sections);
        const sectionCount = this.countAllSections(sections);
        const hasCode = this.hasCodeBlocks(sections);
        const hasTables = this.hasTables(sections);

        if (maxDepth > 3 || sectionCount > 10 || hasCode || hasTables) {
            return 'complex';
        } else if (maxDepth > 1 || sectionCount > 3) {
            return 'moderate';
        } else {
            return 'simple';
        }
    }

    private hasImages(sections: DocumentSection[]): boolean {
        const traverse = (secs: DocumentSection[]): boolean => {
            for (const section of secs) {
                if (section.content.some((block: ContentBlock) => block.type === 'image')) {
                    return true;
                }
                if (traverse(section.subsections)) {
                    return true;
                }
            }
            return false;
        };
        return traverse(sections);
    }

    private hasCodeBlocks(sections: DocumentSection[]): boolean {
        const traverse = (secs: DocumentSection[]): boolean => {
            for (const section of secs) {
                if (section.content.some((block: ContentBlock) => block.type === 'code')) {
                    return true;
                }
                if (traverse(section.subsections)) {
                    return true;
                }
            }
            return false;
        };
        return traverse(sections);
    }

    private hasTables(sections: DocumentSection[]): boolean {
        const traverse = (secs: DocumentSection[]): boolean => {
            for (const section of secs) {
                if (section.content.some((block: ContentBlock) => block.type === 'table')) {
                    return true;
                }
                if (traverse(section.subsections)) {
                    return true;
                }
            }
            return false;
        };
        return traverse(sections);
    }
}

// Batch processing functionality
export interface BatchProcessingOptions {
    onProgress?: (fileId: string, progress: UploadProgress) => void;
    signal?: AbortSignal;
    maxConcurrent?: number;
}

export async function processDocumentBatch(
    files: File[],
    options: BatchProcessingOptions = {}
): Promise<ProcessedDocument[]> {
    const { onProgress, signal, maxConcurrent = 3 } = options;
    const processor = new EnhancedDocumentProcessor();
    const results: ProcessedDocument[] = [];
    const errors: Array<{ file: File; error: Error }> = [];

    // Process files in batches to avoid overwhelming the system
    const batches = [];
    for (let i = 0; i < files.length; i += maxConcurrent) {
        batches.push(files.slice(i, i + maxConcurrent));
    }

    for (const batch of batches) {
        if (signal?.aborted) {
            throw new Error('Processing cancelled');
        }

        const batchPromises = batch.map(async (file) => {
            const fileId = `${file.name}_${Date.now()}`;

            try {
                // Report start
                onProgress?.(fileId, {
                    fileId,
                    fileName: file.name,
                    progress: 0,
                    status: 'processing',
                    message: 'Starting processing...'
                });

                // Process the document
                const result = await processor.processDocument(file);

                // Report completion
                onProgress?.(fileId, {
                    fileId,
                    fileName: file.name,
                    progress: 100,
                    status: 'completed',
                    message: 'Processing completed'
                });

                return result;
            } catch (error) {
                // Report error
                onProgress?.(fileId, {
                    fileId,
                    fileName: file.name,
                    progress: 0,
                    status: 'failed',
                    message: error instanceof Error ? error.message : 'Processing failed'
                });

                errors.push({ file, error: error instanceof Error ? error : new Error('Unknown error') });
                return null;
            }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter((result): result is ProcessedDocument => result !== null));
    }

    if (errors.length > 0 && results.length === 0) {
        throw new Error(`All files failed to process: ${errors.map(e => e.error.message).join(', ')}`);
    }

    return results;
}

// Export singleton instance
export const enhancedDocumentProcessor = new EnhancedDocumentProcessor();