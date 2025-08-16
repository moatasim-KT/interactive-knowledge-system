/**
 * Enhanced Web Content Fetcher Service
 * Comprehensive implementation for fetching and extracting web content
 * with retry logic, JavaScript support, and multiple content type handling
 */

import { createLogger } from '../utils/logger.js';
import { webContentErrorHandler } from './webContentErrorHandler.js';
import type { WebContent, WebContentMetadata } from '$lib/types/unified';

export interface FetchOptions {
    timeout?: number;
    userAgent?: string;
    followRedirects?: boolean;
    maxRedirects?: number;
    extractAssets?: boolean;
    cleanContent?: boolean;
    preserveInteractivity?: boolean;
    useHeadlessBrowser?: boolean;
    retryAttempts?: number;
    retryDelay?: number;
    acceptedContentTypes?: string[];
    extractionMethod?: 'auto' | 'readability' | 'semantic' | 'heuristic';
}

export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: string[];
}

export interface ContentTypeHandler {
    canHandle: (contentType: string) => boolean;
    extract: (content: string, url: string, options: FetchOptions) => Promise<WebContent>;
}

export class WebContentFetcher {
    private logger = createLogger('web-content-fetcher');
    private readonly defaultOptions: FetchOptions = {
        timeout: 30000,
        userAgent: 'Mozilla/5.0 (compatible; WebContentFetcher/2.0; +https://example.com/bot)',
        followRedirects: true,
        maxRedirects: 5,
        extractAssets: true,
        cleanContent: true,
        preserveInteractivity: false,
        useHeadlessBrowser: false,
        retryAttempts: 3,
        retryDelay: 1000,
        acceptedContentTypes: ['text/html', 'application/xhtml+xml', 'application/xml', 'text/xml', 'application/json', 'application/rss+xml', 'application/atom+xml'],
        extractionMethod: 'auto'
    };

    private readonly retryConfig: RetryConfig = {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2,
        retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'SERVER_ERROR', 'RATE_LIMITED']
    };

    private contentTypeHandlers: ContentTypeHandler[] = [];

    constructor() {
        this.initializeContentTypeHandlers();
    }

    private initializeContentTypeHandlers(): void {
        // HTML/XHTML handler
        this.contentTypeHandlers.push({
            canHandle: (contentType: string) =>
                contentType.includes('text/html') || contentType.includes('application/xhtml+xml'),
            extract: this.extractHtmlContent.bind(this)
        });

        // JSON handler
        this.contentTypeHandlers.push({
            canHandle: (contentType: string) => contentType.includes('application/json'),
            extract: this.extractJsonContent.bind(this)
        });

        // XML/RSS handler
        this.contentTypeHandlers.push({
            canHandle: (contentType: string) =>
                contentType.includes('application/xml') ||
                contentType.includes('text/xml') ||
                contentType.includes('application/rss+xml') ||
                contentType.includes('application/atom+xml'),
            extract: this.extractXmlContent.bind(this)
        });

        // Plain text handler (fallback)
        this.contentTypeHandlers.push({
            canHandle: (contentType: string) => contentType.includes('text/plain'),
            extract: this.extractPlainTextContent.bind(this)
        });
    }

    async fetch(url: string, options: FetchOptions = {}): Promise<WebContent> {
        const opts = { ...this.defaultOptions, ...options };
        const startTime = Date.now();

        try {
            this.logger.info(`Fetching content from: ${url}`);

            // Validate URL
            const parsedUrl = new URL(url);

            // Attempt fetch with retry logic
            return await this.fetchWithRetry(url, opts, startTime);
        } catch (error) {
            const processingTime = Date.now() - startTime;

            // Handle error through error handler
            const webContentError = webContentErrorHandler.handleError(
                error,
                'fetch',
                'URL content fetching'
            );

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
                    description: webContentError.userMessage,
                    attribution: url,
                    tags: ['error', webContentError.code.toLowerCase()],
                    category: 'error'
                },
                extraction: {
                    method: 'error',
                    confidence: 0,
                    qualityScore: 0,
                    issues: [webContentError.message],
                    processingTime: processingTime
                },
                fetchedAt: new Date().toISOString(),
                success: false
            };
        }
    }

    private async fetchWithRetry(url: string, options: FetchOptions, startTime: number): Promise<WebContent> {
        let lastError: Error | null = null;
        const maxAttempts = options.retryAttempts || this.retryConfig.maxAttempts;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                this.logger.info(`Fetch attempt ${attempt}/${maxAttempts} for: ${url}`);

                const result = await this.performSingleFetch(url, options);

                const processingTime = Date.now() - startTime;
                result.extraction.processingTime = processingTime;

                this.logger.info(`Content fetched successfully in ${processingTime}ms on attempt ${attempt}`);
                return result;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                // Check if error is retryable
                const shouldRetry = this.shouldRetryError(lastError) && attempt < maxAttempts;

                if (shouldRetry) {
                    const delay = this.calculateRetryDelay(attempt);
                    this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
                    await this.sleep(delay);
                } else {
                    this.logger.error(`All ${attempt} attempts failed for ${url}:`, lastError);
                    throw lastError;
                }
            }
        }

        throw lastError || new Error('All retry attempts failed');
    }

    private async performSingleFetch(url: string, options: FetchOptions): Promise<WebContent> {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout);

        try {
            // Determine if we should use headless browser
            const useHeadless = options.useHeadlessBrowser || await this.shouldUseHeadlessBrowser(url);

            if (useHeadless) {
                return await this.fetchWithHeadlessBrowser(url, options);
            }

            // Standard fetch
            const response = await fetch(url, {
                signal: controller.signal,
                headers: this.buildHeaders(options),
                redirect: options.followRedirects ? 'follow' : 'manual'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type') || 'text/html';
            const content = await response.text();
            const finalUrl = response.url;

            // Find appropriate content type handler
            const handler = this.contentTypeHandlers.find(h => h.canHandle(contentType));

            if (handler) {
                return await handler.extract(content, finalUrl, options);
            } else {
                // Fallback to HTML extraction
                return await this.extractHtmlContent(content, finalUrl, options);
            }
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private buildHeaders(options: FetchOptions): Record<string, string> {
        const acceptTypes = options.acceptedContentTypes?.join(',') ||
            'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7';

        return {
            'User-Agent': options.userAgent!,
            'Accept': acceptTypes,
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'DNT': '1',
            'Upgrade-Insecure-Requests': '1'
        };
    }

    private shouldRetryError(error: Error): boolean {
        const message = error.message.toLowerCase();
        const name = error.name.toLowerCase();

        return (
            name === 'aborterror' ||
            message.includes('timeout') ||
            message.includes('network') ||
            message.includes('fetch') ||
            message.includes('503') ||
            message.includes('502') ||
            message.includes('500') ||
            message.includes('429') ||
            message.includes('connection')
        );
    }

    private calculateRetryDelay(attempt: number): number {
        const baseDelay = this.retryConfig.baseDelay;
        const backoffMultiplier = this.retryConfig.backoffMultiplier;
        const maxDelay = this.retryConfig.maxDelay;

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.1 * baseDelay;
        const delay = Math.min(
            baseDelay * Math.pow(backoffMultiplier, attempt - 1) + jitter,
            maxDelay
        );

        return Math.floor(delay);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private async shouldUseHeadlessBrowser(url: string): Promise<boolean> {
        // Heuristics to determine if a site likely needs JavaScript
        const domain = this.safeParseDomain(url).toLowerCase();

        const jsHeavySites = [
            'twitter.com', 'x.com', 'facebook.com', 'instagram.com',
            'linkedin.com', 'reddit.com', 'youtube.com', 'tiktok.com',
            'discord.com', 'slack.com', 'notion.so', 'airtable.com'
        ];

        return jsHeavySites.some(site => domain.includes(site));
    }

    private async fetchWithHeadlessBrowser(url: string, options: FetchOptions): Promise<WebContent> {
        // This would integrate with a headless browser like Puppeteer or Playwright
        // For now, we'll simulate this functionality and fall back to regular fetch
        this.logger.info(`Headless browser requested for ${url}, falling back to regular fetch`);

        // In a real implementation, this would:
        // 1. Launch a headless browser
        // 2. Navigate to the URL
        // 3. Wait for JavaScript to execute
        // 4. Extract the rendered content
        // 5. Close the browser

        // For now, just use regular fetch with a longer timeout
        const extendedOptions = { ...options, timeout: (options.timeout || 30000) * 2 };
        return await this.performSingleFetch(url, extendedOptions);
    }

    private async extractHtmlContent(content: string, url: string, options: FetchOptions): Promise<WebContent> {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        // Extract metadata
        const metadata = this.extractMetadata(doc, url, url);

        // Extract main content using multiple methods
        const mainContent = await this.extractMainContentAdvanced(doc, options);

        // Extract structured data
        const images = this.extractImages(doc, url);
        const codeBlocks = this.extractCodeBlocks(doc);
        const tables = this.extractTables(doc);
        const charts = this.detectCharts(doc);

        // Generate content ID
        const contentId = `content_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        return {
            id: contentId,
            url: url,
            finalUrl: url,
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
                method: options.extractionMethod || 'auto',
                confidence: this.calculateExtractionConfidence(doc, mainContent),
                qualityScore: this.calculateQualityScore(mainContent, metadata),
                issues: [],
                processingTime: 0 // Will be set by caller
            },
            fetchedAt: new Date().toISOString(),
            success: true
        };
    }

    private async extractJsonContent(content: string, url: string, options: FetchOptions): Promise<WebContent> {
        try {
            const jsonData = JSON.parse(content);
            const contentId = `json_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

            // Extract meaningful text from JSON
            const text = this.extractTextFromJson(jsonData);
            const title = this.extractTitleFromJson(jsonData) || 'JSON Content';

            return {
                id: contentId,
                url: url,
                finalUrl: url,
                title: title,
                content: {
                    html: `<pre><code class="language-json">${JSON.stringify(jsonData, null, 2)}</code></pre>`,
                    text: text,
                    images: [],
                    codeBlocks: [{
                        id: 'json_data',
                        code: JSON.stringify(jsonData, null, 2),
                        language: 'json',
                        interactive: false,
                        executable: false
                    }],
                    tables: this.extractTablesFromJson(jsonData),
                    charts: [],
                    blocks: []
                },
                metadata: {
                    domain: this.safeParseDomain(url),
                    contentType: 'json',
                    language: 'en',
                    readingTime: Math.ceil(text.split(' ').length / 200),
                    wordCount: text.split(' ').length,
                    keywords: this.extractKeywordsFromJson(jsonData),
                    description: title,
                    attribution: url,
                    tags: ['json', 'data'],
                    category: 'data'
                },
                extraction: {
                    method: 'json',
                    confidence: 0.9,
                    qualityScore: 0.8,
                    issues: [],
                    processingTime: 0
                },
                fetchedAt: new Date().toISOString(),
                success: true
            };
        } catch (error) {
            throw new Error(`Failed to parse JSON content: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async extractXmlContent(content: string, url: string, options: FetchOptions): Promise<WebContent> {
        try {
            const parser = new DOMParser();
            let doc: Document;

            // Try parsing as XML first
            try {
                doc = parser.parseFromString(content, 'application/xml');

                // Check for parser errors - different browsers handle this differently
                const parserError = doc.querySelector('parsererror');
                if (parserError || doc.documentElement.nodeName === 'parsererror' || !doc.documentElement) {
                    throw new Error('XML parsing failed');
                }
            } catch (xmlError) {
                // Fallback: try parsing as HTML which is more lenient
                doc = parser.parseFromString(content, 'text/html');
                if (!doc.documentElement) {
                    throw new Error('Invalid XML content');
                }
            }

            const contentId = `xml_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

            // Check if it's RSS/Atom feed
            const isRss = doc.querySelector('rss, feed');
            if (isRss) {
                return await this.extractRssFeedContent(doc, url, options);
            }

            // Extract text content from XML
            const text = doc.documentElement.textContent || '';
            const title = this.extractTitleFromXml(doc) || 'XML Content';

            return {
                id: contentId,
                url: url,
                finalUrl: url,
                title: title,
                content: {
                    html: `<pre><code class="language-xml">${this.escapeHtml(content)}</code></pre>`,
                    text: text,
                    images: [],
                    codeBlocks: [{
                        id: 'xml_data',
                        code: content,
                        language: 'xml',
                        interactive: false,
                        executable: false
                    }],
                    tables: [],
                    charts: [],
                    blocks: []
                },
                metadata: {
                    domain: this.safeParseDomain(url),
                    contentType: 'xml',
                    language: 'en',
                    readingTime: Math.ceil(text.split(' ').length / 200),
                    wordCount: text.split(' ').length,
                    keywords: [],
                    description: title,
                    attribution: url,
                    tags: ['xml', 'data'],
                    category: 'data'
                },
                extraction: {
                    method: 'xml',
                    confidence: 0.8,
                    qualityScore: 0.7,
                    issues: [],
                    processingTime: 0
                },
                fetchedAt: new Date().toISOString(),
                success: true
            };
        } catch (error) {
            throw new Error(`Failed to parse XML content: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async extractRssFeedContent(doc: Document, url: string, options: FetchOptions): Promise<WebContent> {
        const contentId = `rss_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // Extract feed metadata
        const title = doc.querySelector('title')?.textContent || 'RSS Feed';
        const description = doc.querySelector('description')?.textContent || '';

        // Extract feed items
        const items = Array.from(doc.querySelectorAll('item, entry')).map((item, index) => {
            const itemTitle = item.querySelector('title')?.textContent || `Item ${index + 1}`;
            const itemDescription = item.querySelector('description, summary')?.textContent || '';
            const itemLink = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href') || '';
            const itemDate = item.querySelector('pubDate, published')?.textContent || '';

            return {
                title: itemTitle,
                description: itemDescription,
                link: itemLink,
                date: itemDate
            };
        });

        // Create HTML representation
        const html = `
            <h1>${this.escapeHtml(title)}</h1>
            <p>${this.escapeHtml(description)}</p>
            <div class="rss-items">
                ${items.map(item => `
                    <article class="rss-item">
                        <h2><a href="${this.escapeHtml(item.link)}">${this.escapeHtml(item.title)}</a></h2>
                        <p>${this.escapeHtml(item.description)}</p>
                        ${item.date ? `<time>${this.escapeHtml(item.date)}</time>` : ''}
                    </article>
                `).join('')}
            </div>
        `;

        const text = `${title}\n${description}\n\n${items.map(item =>
            `${item.title}\n${item.description}\n${item.link}`
        ).join('\n\n')}`;

        return {
            id: contentId,
            url: url,
            finalUrl: url,
            title: title,
            content: {
                html: html,
                text: text,
                images: [],
                codeBlocks: [],
                tables: [],
                charts: [],
                blocks: []
            },
            metadata: {
                domain: this.safeParseDomain(url),
                contentType: 'rss',
                language: 'en',
                readingTime: Math.ceil(text.split(' ').length / 200),
                wordCount: text.split(' ').length,
                keywords: [],
                description: description,
                attribution: url,
                tags: ['rss', 'feed', 'news'],
                category: 'news'
            },
            extraction: {
                method: 'rss',
                confidence: 0.9,
                qualityScore: 0.8,
                issues: [],
                processingTime: 0
            },
            fetchedAt: new Date().toISOString(),
            success: true
        };
    }

    private async extractPlainTextContent(content: string, url: string, options: FetchOptions): Promise<WebContent> {
        const contentId = `text_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const lines = content.split('\n');
        const title = lines[0]?.trim() || 'Plain Text Content';

        return {
            id: contentId,
            url: url,
            finalUrl: url,
            title: title,
            content: {
                html: `<pre>${this.escapeHtml(content)}</pre>`,
                text: content,
                images: [],
                codeBlocks: [],
                tables: [],
                charts: [],
                blocks: []
            },
            metadata: {
                domain: this.safeParseDomain(url),
                contentType: 'text',
                language: 'en',
                readingTime: Math.ceil(content.split(' ').length / 200),
                wordCount: content.split(' ').length,
                keywords: [],
                description: title,
                attribution: url,
                tags: ['text'],
                category: 'document'
            },
            extraction: {
                method: 'text',
                confidence: 0.7,
                qualityScore: 0.6,
                issues: [],
                processingTime: 0
            },
            fetchedAt: new Date().toISOString(),
            success: true
        };
    }

    private async extractMainContentAdvanced(doc: Document, options: FetchOptions): Promise<{ html: string; text: string }> {
        // Try multiple extraction methods based on options
        const method = options.extractionMethod || 'auto';

        switch (method) {
            case 'readability':
                return this.extractWithReadabilityAlgorithm(doc, options);
            case 'semantic':
                return this.extractWithSemanticAnalysis(doc, options);
            case 'heuristic':
                return this.extractMainContent(doc, options);
            case 'auto':
            default:
                // Try semantic first, fall back to readability, then heuristic
                try {
                    return this.extractWithSemanticAnalysis(doc, options);
                } catch {
                    try {
                        return this.extractWithReadabilityAlgorithm(doc, options);
                    } catch {
                        return this.extractMainContent(doc, options);
                    }
                }
        }
    }

    private extractWithReadabilityAlgorithm(doc: Document, options: FetchOptions): { html: string; text: string } {
        // Simplified Readability algorithm implementation
        const candidates: Array<{ element: Element; score: number }> = [];

        // Score all paragraph containers
        const containers = doc.querySelectorAll('div, article, section, main, p');

        containers.forEach(container => {
            let score = 0;
            const text = container.textContent || '';
            const textLength = text.length;

            // Length scoring
            if (textLength > 25) { score += 1; }
            if (textLength > 100) { score += 1; }
            if (textLength > 500) { score += 2; }

            // Paragraph count
            const paragraphs = container.querySelectorAll('p');
            score += paragraphs.length;

            // Link density penalty
            const links = container.querySelectorAll('a');
            const linkText = Array.from(links).reduce((acc, link) => acc + (link.textContent?.length || 0), 0);
            const linkDensity = textLength > 0 ? linkText / textLength : 0;
            if (linkDensity > 0.3) { score -= 2; }

            // Class and ID scoring
            const className = container.className.toLowerCase();
            const id = container.id.toLowerCase();

            if (className.includes('content') || className.includes('article') || className.includes('main')) { score += 2; }
            if (className.includes('sidebar') || className.includes('nav') || className.includes('ad')) { score -= 2; }
            if (id.includes('content') || id.includes('article') || id.includes('main')) { score += 2; }
            if (id.includes('sidebar') || id.includes('nav') || id.includes('ad')) { score -= 2; }

            candidates.push({ element: container, score });
        });

        // Find the best candidate
        candidates.sort((a, b) => b.score - a.score);
        const bestCandidate = candidates[0];

        if (bestCandidate && bestCandidate.score > 0) {
            const element = bestCandidate.element.cloneNode(true) as Element;
            if (options.cleanContent) {
                this.cleanContent(element);
            }
            return {
                html: element.innerHTML,
                text: element.textContent || ''
            };
        }

        // Fallback to body
        return this.extractMainContent(doc, options);
    }

    private extractWithSemanticAnalysis(doc: Document, options: FetchOptions): { html: string; text: string } {
        // Use semantic HTML5 elements and ARIA roles
        const semanticSelectors = [
            'main',
            '[role="main"]',
            'article',
            '[role="article"]',
            '.content',
            '#content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.main-content'
        ];

        for (const selector of semanticSelectors) {
            const element = doc.querySelector(selector);
            if (element) {
                const cloned = element.cloneNode(true) as Element;
                if (options.cleanContent) {
                    this.cleanContent(cloned);
                }

                const text = cloned.textContent || '';
                if (text.length > 100) { // Ensure we have substantial content
                    return {
                        html: cloned.innerHTML,
                        text: text
                    };
                }
            }
        }

        // Fallback to readability algorithm
        return this.extractWithReadabilityAlgorithm(doc, options);
    }

    private extractTextFromJson(jsonData: any): string {
        if (typeof jsonData === 'string') { return jsonData; }
        if (typeof jsonData === 'number' || typeof jsonData === 'boolean') { return String(jsonData); }
        if (Array.isArray(jsonData)) {
            return jsonData.map(item => this.extractTextFromJson(item)).join(' ');
        }
        if (typeof jsonData === 'object' && jsonData !== null) {
            return Object.values(jsonData).map(value => this.extractTextFromJson(value)).join(' ');
        }
        return '';
    }

    private extractTitleFromJson(jsonData: any): string | null {
        if (typeof jsonData === 'object' && jsonData !== null) {
            // Common title fields
            const titleFields = ['title', 'name', 'label', 'heading', 'subject'];
            for (const field of titleFields) {
                if (jsonData[field] && typeof jsonData[field] === 'string') {
                    return jsonData[field];
                }
            }
        }
        return null;
    }

    private extractKeywordsFromJson(jsonData: any): string[] {
        const keywords: string[] = [];

        if (typeof jsonData === 'object' && jsonData !== null) {
            // Look for common keyword fields
            const keywordFields = ['keywords', 'tags', 'categories', 'labels'];
            for (const field of keywordFields) {
                if (jsonData[field]) {
                    if (Array.isArray(jsonData[field])) {
                        keywords.push(...jsonData[field].filter(k => typeof k === 'string'));
                    } else if (typeof jsonData[field] === 'string') {
                        keywords.push(...jsonData[field].split(',').map(k => k.trim()));
                    }
                }
            }
        }

        return [...new Set(keywords)]; // Remove duplicates
    }

    private extractTablesFromJson(jsonData: any): any[] {
        const tables: any[] = [];

        // Check if the root object has an array property that can be converted to a table
        if (typeof jsonData === 'object' && jsonData !== null) {
            for (const [key, value] of Object.entries(jsonData)) {
                if (Array.isArray(value) && value.length > 0) {
                    const firstItem = value[0];
                    if (typeof firstItem === 'object' && firstItem !== null) {
                        const headers = Object.keys(firstItem);
                        const rows = value.map(item =>
                            headers.map(header => String(item[header] || ''))
                        );

                        tables.push({
                            id: `json_table_${tables.length}`,
                            headers,
                            rows
                        });
                    }
                }
            }
        }

        // Also check if the root is directly an array
        if (Array.isArray(jsonData) && jsonData.length > 0) {
            const firstItem = jsonData[0];
            if (typeof firstItem === 'object' && firstItem !== null) {
                const headers = Object.keys(firstItem);
                const rows = jsonData.map(item =>
                    headers.map(header => String(item[header] || ''))
                );

                tables.push({
                    id: `json_table_${tables.length}`,
                    headers,
                    rows
                });
            }
        }

        return tables;
    }

    private extractTitleFromXml(doc: Document): string | null {
        // Try common XML title elements
        const titleSelectors = ['title', 'name', 'label', 'heading'];
        for (const selector of titleSelectors) {
            const element = doc.querySelector(selector);
            if (element?.textContent) {
                return element.textContent.trim();
            }
        }
        return null;
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            doc.querySelector('h1')?.textContent?.trim() ||
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
            description: title, // Use title as description for compatibility
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
            category: this.categorizeContent(content_type, domain, title, description),
            url: originalUrl,
            fetched_at: new Date().toISOString()
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

    /**
     * Add a custom content type handler
     */
    addContentTypeHandler(handler: ContentTypeHandler): void {
        this.contentTypeHandlers.push(handler);
    }

    /**
     * Remove a content type handler
     */
    removeContentTypeHandler(handler: ContentTypeHandler): void {
        const index = this.contentTypeHandlers.indexOf(handler);
        if (index > -1) {
            this.contentTypeHandlers.splice(index, 1);
        }
    }

    /**
     * Get supported content types
     */
    getSupportedContentTypes(): string[] {
        return this.defaultOptions.acceptedContentTypes || [];
    }

    /**
     * Check if URL is likely to need JavaScript rendering
     */
    async checkIfNeedsJavaScript(url: string): Promise<boolean> {
        return this.shouldUseHeadlessBrowser(url);
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
