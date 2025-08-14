/**
 * Web Content Fetcher Service
 * Real implementation for fetching and extracting web content
 */

import { createLogger } from '../utils/logger.js';
import type { WebContent, WebContentMetadata } from '../types/web-content.js';

export interface FetchOptions {
    timeout?: number;
    userAgent?: string;
    followRedirects?: boolean;
    maxRedirects?: number;
    extractAssets?: boolean;
    cleanContent?: boolean;
    preserveInteractivity?: boolean;
}

export class WebContentFetcher {
    private logger = createLogger('web-content-fetcher');
    private readonly defaultOptions: FetchOptions = {
        timeout: 30000,
        userAgent: 'Mozilla/5.0 (compatible; WebContentFetcher/1.0)',
        followRedirects: true,
        maxRedirects: 5,
        extractAssets: true,
        cleanContent: true,
        preserveInteractivity: false
    };

    async fetch(url: string, options: FetchOptions = {}): Promise<WebContent> {
        const opts = { ...this.defaultOptions, ...options };
        const startTime = Date.now();

        try {
            this.logger.info(`Fetching content from: ${url}`);

            // Validate URL
            const parsedUrl = new URL(url);

            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), opts.timeout);

            try {
                // Fetch the content
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'User-Agent': opts.userAgent!,
                        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                        'Accept-Encoding': 'gzip, deflate',
                        'Cache-Control': 'no-cache'
                    },
                    redirect: opts.followRedirects ? 'follow' : 'manual'
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const html = await response.text();
                const finalUrl = response.url;

                // Parse and extract content
                const content = this.extractContent(html, url, finalUrl, opts);

                const processingTime = Date.now() - startTime;
                this.logger.info(`Content fetched successfully in ${processingTime}ms`);

                return content;
            } finally {
                clearTimeout(timeoutId);
            }
        } catch (error) {
            const processingTime = Date.now() - startTime;
            this.logger.error(`Failed to fetch content from ${url}:`, error);

            // Determine error type for better user messaging
            const errorObj = error instanceof Error ? error : new Error(String(error));
            let errorCategory = 'unknown';
            let userMessage = 'Failed to fetch content';

            if (errorObj.name === 'AbortError' || errorObj.message.includes('aborted')) {
                errorCategory = 'timeout';
                userMessage = 'Request timed out';
            } else if (errorObj.message.includes('fetch') || errorObj.message.includes('network')) {
                errorCategory = 'network';
                userMessage = 'Network connection failed';
            } else if (errorObj.message.includes('HTTP')) {
                errorCategory = 'http';
                userMessage = errorObj.message;
            } else if (errorObj.message.includes('CORS')) {
                errorCategory = 'cors';
                userMessage = 'Cross-origin request blocked';
            }

            // Return error content with enhanced error information
            return {
                id: `error_${Date.now()}`,
                url,
                title: 'Failed to fetch content',
                content: {
                    html: '',
                    text: '',
                    images: [],
                    codeBlocks: [],
                    tables: [],
                    charts: [],
                    blocks: []
                },
                metadata: {
                    domain: this.safeParseDomain(url),
                    contentType: 'error',
                    language: 'en',
                    readingTime: 0,
                    wordCount: 0,
                    keywords: [],
                    description: `${userMessage}: ${errorObj.message}`,
                    attribution: url,
                    tags: ['error', errorCategory],
                    category: 'error'
                },
                extraction: {
                    method: 'heuristic',
                    confidence: 0,
                    qualityScore: 0,
                    issues: [errorObj.message],
                    processingTime: processingTime
                },
                fetchedAt: new Date().toISOString(),
                success: false
            };
        }
    }

    private extractContent(
        html: string,
        originalUrl: string,
        finalUrl: string,
        options: FetchOptions
    ): WebContent {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Extract metadata
        const metadata = this.extractMetadata(doc, originalUrl, finalUrl);

        // Extract main content
        const mainContent = this.extractMainContent(doc, options);

        // Extract structured data
        const images = this.extractImages(doc, finalUrl);
        const codeBlocks = this.extractCodeBlocks(doc);
        const tables = this.extractTables(doc);
        const charts = this.detectCharts(doc);

        // Generate content ID
        const contentId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        return {
            id: contentId,
            url: originalUrl,
            finalUrl: finalUrl,
            title: metadata.description || 'Untitled',
            content: {
                html: mainContent.html,
                text: mainContent.text,
                images,
                codeBlocks,
                tables,
                charts,
                blocks: []
            },
            metadata,
            extraction: {
                method: 'heuristic',
                confidence: this.calculateExtractionConfidence(doc, mainContent),
                qualityScore: this.calculateQualityScore(mainContent, metadata),
                issues: [],
                processingTime: 0 // Will be set by caller
            },
            fetchedAt: new Date().toISOString(),
            success: true
        };
    }

    private extractMetadata(
        doc: Document,
        originalUrl: string,
        finalUrl: string
    ): WebContentMetadata {
        const domain = new URL(finalUrl).hostname;

        // Extract title
        const title =
            doc.querySelector('title')?.textContent?.trim() ||
            doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
            doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
            'Untitled';

        // Extract description
        const description =
            doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
            doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
            doc.querySelector('meta[name="twitter:description"]')?.getAttribute('content') ||
            '';

        // Extract author
        const author =
            doc.querySelector('meta[name="author"]')?.getAttribute('content') ||
            doc.querySelector('meta[property="article:author"]')?.getAttribute('content') ||
            doc.querySelector('[rel="author"]')?.textContent?.trim();

        // Extract dates
        const publish_date = this.extractDate(doc, [
            'meta[property="article:published_time"]',
            'meta[name="date"]',
            'meta[name="publish-date"]',
            'time[datetime]'
        ]);

        const last_modified = this.extractDate(doc, [
            'meta[property="article:modified_time"]',
            'meta[name="last-modified"]',
            'meta[http-equiv="last-modified"]'
        ]);

        // Extract language
        const language =
            doc.documentElement.lang ||
            doc.querySelector('meta[http-equiv="content-language"]')?.getAttribute('content') ||
            'en';

        // Extract keywords
        const keywords_content =
            doc.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
        const keywords = keywords_content
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0);

        // Extract content type
        const content_type = this.determineContentType(doc, title, description);

        // Calculate reading time and word count
        const text_content = doc.body?.textContent || '';
        const word_count = text_content.split(/\s+/).filter((word) => word.length > 0).length;
        const reading_time = Math.ceil(word_count / 200); // Assume 200 words per minute

        return {
            description,
            author,
            publishDate: publish_date,
            lastModified: last_modified,
            domain,
            contentType: content_type,
            language,
            readingTime: reading_time,
            wordCount: word_count,
            keywords,
            attribution: originalUrl,
            tags: [], // Will be populated by content analysis
            // category is determined by contentType, domain, title, then description
            category: this.categorizeContent(content_type, domain, title, description)
        };
    }

    private extractMainContent(doc: Document, options: FetchOptions): { html: string; text: string } {
        // Try to find main content using semantic HTML
        let main_element =
            doc.querySelector('main') ||
            doc.querySelector('article') ||
            doc.querySelector('[role="main"]') ||
            doc.querySelector('.content') ||
            doc.querySelector('#content') ||
            doc.querySelector('.post-content') ||
            doc.querySelector('.entry-content');

        if (!main_element) {
            // Fallback to body if no main content found
            main_element = doc.body;
        }

        if (!main_element) {
            return { html: '', text: '' };
        }

        // Clone the element to avoid modifying the original
        const content_element = main_element.cloneNode(true) as Element;

        if (options.cleanContent) {
            this.cleanContent(content_element);
        }

        const html = content_element.innerHTML;
        const text = content_element.textContent || '';

        return { html, text };
    }

    private cleanContent(element: Element): void {
        // Remove unwanted elements
        const unwanted_selectors = [
            'script',
            'style',
            'noscript',
            '.advertisement',
            '.ads',
            '.ad',
            '.social-share',
            '.share-buttons',
            '.comments',
            '.comment-section',
            '.sidebar',
            '.navigation',
            '.nav',
            '.header',
            '.footer',
            '.popup',
            '.modal',
            '.overlay'
        ];

        unwanted_selectors.forEach((selector) => {
            element.querySelectorAll(selector).forEach((el) => el.remove());
        });

        // Clean up attributes
        element.querySelectorAll('*').forEach((el) => {
            // Remove event handlers and tracking attributes
            const attributes_to_remove = ['onclick', 'onload', 'onerror', 'data-track', 'data-analytics'];
            attributes_to_remove.forEach((attr) => {
                if (el.hasAttribute(attr)) {
                    el.removeAttribute(attr);
                }
            });
        });
    }

    private extractImages(doc: Document, baseUrl: string): any[] {
        const images: any[] = [];
        const img_elements = doc.querySelectorAll('img');

        img_elements.forEach((img, index) => {
            const src = img.getAttribute('src');
            if (src) {
                try {
                    const absolute_url = new URL(src, baseUrl).href;
                    images.push({
                        id: `img_${index}`,
                        src: absolute_url,
                        alt: img.getAttribute('alt') || '',
                        caption: img.getAttribute('title') || '',
                        width: img.naturalWidth || undefined,
                        height: img.naturalHeight || undefined
                    });
                } catch (error) {
                    // Skip invalid URLs
                }
            }
        });

        return images;
    }

    private extractCodeBlocks(doc: Document): any[] {
        const codeBlocks: any[] = [];
        const code_elements = doc.querySelectorAll('pre code, code, .highlight, .code-block');

        code_elements.forEach((element, index) => {
            const code = element.textContent || '';
            if (code.trim().length > 10) {
                // Only include substantial code blocks
                const language = this.detectCodeLanguage(element, code);
                codeBlocks.push({
                    id: `code_${index}`,
                    code: code.trim(),
                    language,
                    filename: element.getAttribute('data-filename') || undefined,
                    interactive: false,
                    executable: false
                });
            }
        });

        return codeBlocks;
    }

    private extractTables(doc: Document): any[] {
        const tables: any[] = [];
        const table_elements = doc.querySelectorAll('table');

        table_elements.forEach((table, index) => {
            const headers: string[] = [];
            const rows: string[][] = [];

            // Extract headers
            const header_cells = table.querySelectorAll('thead th, tr:first-child th');
            header_cells.forEach((cell) => {
                headers.push(cell.textContent?.trim() || '');
            });

            // Extract rows
            const body_rows = table.querySelectorAll('tbody tr, tr');
            body_rows.forEach((row) => {
                const cells = row.querySelectorAll('td, th');
                if (cells.length > 0) {
                    const rowData: string[] = [];
                    cells.forEach((cell) => {
                        rowData.push(cell.textContent?.trim() || '');
                    });
                    rows.push(rowData);
                }
            });

            if (rows.length > 0) {
                tables.push({
                    id: `table_${index}`,
                    headers: headers.length > 0 ? headers : undefined,
                    rows
                });
            }
        });

        return tables;
    }

    private detectCharts(doc: Document): any[] {
        const charts: any[] = [];

        // Look for common chart libraries and elements
        const chart_selectors = [
            'canvas[id*="chart"]',
            '.chart',
            '.graph',
            '.visualization',
            '[data-chart]',
            '[data-graph]',
            'svg.chart',
            'svg.graph'
        ];

        chart_selectors.forEach((selector) => {
            doc.querySelectorAll(selector).forEach((element, index) => {
                charts.push({
                    id: `chart_${charts.length}`,
                    type: this.detectChartType(element),
                    selector,
                    detected: true,
                    data: null // Would need JavaScript execution to extract data
                });
            });
        });

        return charts;
    }

    private detectChartType(element: Element): string {
        const class_list = element.className.toLowerCase();
        const id = element.id.toLowerCase();

        if (class_list.includes('line') || id.includes('line')) { return 'line'; }
        if (class_list.includes('bar') || id.includes('bar')) { return 'bar'; }
        if (class_list.includes('pie') || id.includes('pie')) { return 'pie'; }
        if (class_list.includes('scatter') || id.includes('scatter')) { return 'scatter'; }
        if (class_list.includes('area') || id.includes('area')) { return 'area'; }

        return 'unknown';
    }

    private detectCodeLanguage(element: Element, code: string): string {
        // Check class names for language hints
        const className = element.className.toLowerCase();
        const languagePatterns = {
            javascript: /\b(javascript|js)\b/,
            typescript: /\b(typescript|ts)\b/,
            python: /\b(python|py)\b/,
            java: /\bjava\b/,
            cpp: /\b(cpp|c\+\+)\b/,
            csharp: /\b(csharp|c#)\b/,
            html: /\bhtml\b/,
            css: /\bcss\b/,
            sql: /\bsql\b/,
            json: /\bjson\b/,
            xml: /\bxml\b/,
            bash: /\b(bash|shell|sh)\b/
        };

        for (const [lang, pattern] of Object.entries(languagePatterns)) {
            if (pattern.test(className)) {
                return lang;
            }
        }

        // Try to detect language from code content
        if (code.includes('function') && code.includes('{')) { return 'javascript'; }
        if (code.includes('def ') && code.includes(':')) { return 'python'; }
        if (code.includes('public class') || code.includes('import java')) { return 'java'; }
        if (code.includes('<html') || code.includes('<!DOCTYPE')) { return 'html'; }
        if (code.includes('SELECT') && code.includes('FROM')) { return 'sql'; }
        if (code.startsWith('{') && code.endsWith('}')) { return 'json'; }

        return 'text';
    }

    private extractDate(doc: Document, selectors: string[]): Date | undefined {
        for (const selector of selectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const date_str =
                    element.getAttribute('content') ||
                    element.getAttribute('datetime') ||
                    element.textContent;
                if (date_str) {
                    const date = new Date(date_str);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }
        }
        return undefined;
    }

    private determineContentType(doc: Document, title: string, description: string): string {
        const content = (title + ' ' + description).toLowerCase();

        if (content.includes('tutorial') || content.includes('how to') || content.includes('guide')) {
            return 'tutorial';
        }
        if (content.includes('news') || content.includes('breaking')) {
            return 'news';
        }
        if (content.includes('blog') || content.includes('post')) {
            return 'blog';
        }
        if (content.includes('research') || content.includes('paper') || content.includes('study')) {
            return 'research';
        }
        if (content.includes('documentation') || content.includes('docs') || content.includes('api')) {
            return 'documentation';
        }

        // Check for article indicators
        if (doc.querySelector('article') || doc.querySelector('[itemtype*="Article"]')) {
            return 'article';
        }

        return 'webpage';
    }

    private categorizeContent(
        contentType: string,
        domain: string,
        title: string,
        description: string
    ): string {
        const content = (title + ' ' + description + ' ' + domain).toLowerCase();

        if (content.includes('tech') || content.includes('programming') || content.includes('code')) {
            return 'technology';
        }
        if (content.includes('science') || content.includes('research')) {
            return 'science';
        }
        if (content.includes('business') || content.includes('finance') || content.includes('market')) {
            return 'business';
        }
        if (content.includes('health') || content.includes('medical')) {
            return 'health';
        }
        if (content.includes('education') || content.includes('learning')) {
            return 'education';
        }

        return 'general';
    }

    private calculateExtractionConfidence(
        doc: Document,
        mainContent: { html: string; text: string }
    ): number {
        let confidence = 0.5; // Base confidence

        // Boost confidence for semantic HTML
        if (doc.querySelector('main, article, [role="main"]')) { confidence += 0.2; }

        // Boost confidence for substantial content
        if (mainContent.text.length > 500) { confidence += 0.1; }
        if (mainContent.text.length > 2000) { confidence += 0.1; }

        // Boost confidence for structured content
        if (doc.querySelector('h1, h2, h3')) { confidence += 0.1; }

        return Math.min(confidence, 1.0);
    }

    private calculateQualityScore(
        mainContent: { html: string; text: string },
        metadata: WebContentMetadata
    ): number {
        let score = 0.5; // Base score

        // Content length
        if (mainContent.text.length > 1000) { score += 0.1; }
        if (mainContent.text.length > 3000) { score += 0.1; }

        // Metadata completeness
        if (metadata.description && metadata.description.length > 10) { score += 0.1; }
        if (metadata.description && metadata.description.length > 50) { score += 0.1; }
        if (metadata.author) { score += 0.05; }
        if (metadata.publishDate) { score += 0.05; }
        if (metadata.keywords.length > 0) { score += 0.05; }

        // Content structure
        const html_lower = mainContent.html.toLowerCase();
        if (html_lower.includes('<h1') || html_lower.includes('<h2')) { score += 0.05; }
        if (html_lower.includes('<p>')) { score += 0.05; }
        if (html_lower.includes('<ul>') || html_lower.includes('<ol>')) { score += 0.05; }

        return Math.min(score, 1.0);
    }

    private safeParseDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    private isRetryableError(error: Error): boolean {
        const message = error.message.toLowerCase();
        return (
            error.name === 'AbortError' ||
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('503') ||
            message.includes('502') ||
            message.includes('500')
        );
    }
}

export const webContentFetcher = new WebContentFetcher();
