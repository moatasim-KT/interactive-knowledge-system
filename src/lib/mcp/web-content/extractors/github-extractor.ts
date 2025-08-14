import { BaseContentExtractor } from './base-extractor';
// --- FIX 1: Import all necessary types from the source file ---
// This resolves the type incompatibility errors by ensuring the child class
// correctly implements the signatures from the base class.
import type { WebContentMetadata } from '../types';
import type { ExtractionOptions, ExtractionResult } from './base-extractor';
import { createLogger } from '../../../utils/logger.js';

// A mock DOMParser for environments where it's not available (e.g., Node.js).
const DOMParser = global.DOMParser || class {
    parseFromString(str: string, type: string) {
        const mockElement = {
            textContent: 'Mocked text content from a generic GitHub page.',
            outerHTML: '<div>Mocked outer HTML</div>',
            querySelector: (selector: string) => mockElement,
            querySelectorAll: (selector: string) => [mockElement],
            getAttribute: (attr: string) => `mock-${attr}`,
            remove: () => {},
            cloneNode: () => mockElement,
        };

        return {
            querySelector: (selector: string) => mockElement,
            querySelectorAll: (selector: string) => [mockElement],
            documentElement: { lang: 'en' },
            body: mockElement
        };
    }
};


export class GitHubExtractor extends BaseContentExtractor {
    readonly name = 'GitHubExtractor';
    readonly domains = ['github.com'];
    readonly content_types = ['text/html', 'application/json'];

    private readonly API_BASE = 'https://api.github.com';
    private readonly RAW_CONTENT_BASE = 'https://raw.githubusercontent.com';

    constructor() {
        super(createLogger('GitHubExtractor'));
    }

    canHandle(url: string, contentType: string): boolean {
        try {
            const { hostname } = new URL(url);
            return this.domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
        } catch (e) {
            return false;
        }
    }

    // --- FIX 1 (cont.): Use the imported ExtractionResult type ---
    async extract(
        html: string,
        url: string,
        options: ExtractionOptions = {}
    ): Promise<ExtractionResult> {
        const { pathname } = new URL(url);

        const fileRegex = /\/blob\//;
        const prRegex = /\/pull\/\d+/;
        const issueRegex = /\/issues\/\d+/;
        const repoRegex = /^\/[^\/]+\/[^\/]+\/?$/;

        if (fileRegex.test(pathname)) {
            return this.extractFileContent(url, options);
        } else if (prRegex.test(pathname)) {
            return this.extractPullRequest(url, options);
        } else if (issueRegex.test(pathname)) {
            return this.extractIssue(url, options);
        } else if (repoRegex.test(pathname)) {
            return this.extractRepository(url, options);
        } else {
            this.logger.info(`URL did not match specific pattern, falling back to generic extraction for ${url}`);
            return this.extractGenericGitHubPage(html, url, options);
        }
    }

    async extract_metadata(html: string, url: string): Promise<WebContentMetadata> {
        this.logger.info(`Extracting metadata for ${url}`);
        const result = await this.extract(html, url);
        return result.metadata;
    }

    async extract_content(html: string, url: string): Promise<string> {
        this.logger.info(`Extracting content for ${url}`);
        const result = await this.extract(html, url);
        return result.content;
    }


    private async extractFileContent(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
        this.logger.info(`Extracting file content from ${url}`);
        try {
            const rawUrl = url
                .replace('github.com', 'raw.githubusercontent.com')
                .replace('/blob/', '/');

            const response = await fetch(rawUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch raw content from ${rawUrl}: ${response.statusText}`);
            }

            const content = await response.text();
            
            const { pathname } = new URL(url);
            const parts = pathname.split('/').filter(p => p);
            const owner = parts[0];
            const repoName = parts[1];
            const fileName = parts[parts.length - 1];
            const filePath = parts.slice(3).join('/');

            // --- FIX 2: Add the required 'url' property ---
            const metadata: WebContentMetadata = {
                title: fileName,
                description: `File from ${owner}/${repoName}: ${filePath}`,
                source: url,
                url: url, // Added required property
                author: owner,
                language: this.detectLanguage(fileName, content),
                fetched_at: new Date().toISOString()
            };
            
            const html = `<pre><code>${super.sanitize(content)}</code></pre>`;

            return { content: content, html: html, metadata, success: true, url };
        } catch (error) {
            this.logger.error('Error extracting file content:', error);
            throw error;
        }
    }

    private async extractPullRequest(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
        this.logger.info(`Extracting pull request from ${url}`);
        try {
            const match = new URL(url).pathname.match(/\/([^\/]+)\/([^\/]+)\/pull\/(\d+)/);
            // --- FIX 3: Add curly braces for ESLint ---
            if (!match) {
                throw new Error('Could not parse PR information from URL');
            }
            const [_, owner, repo, prNumber] = match;

            const apiUrl = `${this.API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`;
            const response = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github.v3+json' } });
            if (!response.ok) {
                throw new Error(`GitHub API error for PR: ${response.statusText}`);
            }

            const prData = await response.json();
            const content = `# ${prData.title}\n\n${prData.body || ''}`;

            const metadata: WebContentMetadata = {
                title: prData.title,
                description: `PR #${prData.number} in ${owner}/${repo}: ${prData.state}`,
                source: url,
                url: url, // Added required property
                author: prData.user?.login,
                published_at: prData.created_at,
                updated_at: prData.updated_at,
                language: 'markdown',
                fetched_at: new Date().toISOString(),
                metadata: {
                    state: prData.state,
                    merged: prData.merged,
                    comments: prData.comments,
                    commits: prData.commits,
                    additions: prData.additions,
                    deletions: prData.deletions,
                    changed_files: prData.changed_files
                }
            };

            return { content, html: this.markdownToHtml(content), metadata, success: true, url };
        } catch (error) {
            this.logger.error('Error extracting pull request:', error);
            throw error;
        }
    }

    private async extractIssue(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
        this.logger.info(`Extracting issue from ${url}`);
        try {
            const match = new URL(url).pathname.match(/\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/);
            if (!match) {
                throw new Error('Could not parse issue information from URL');
            }
            const [_, owner, repo, issueNumber] = match;

            const apiUrl = `${this.API_BASE}/repos/${owner}/${repo}/issues/${issueNumber}`;
            const response = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github.v3+json' } });
            if (!response.ok) {
                throw new Error(`GitHub API error for issue: ${response.statusText}`);
            }

            const issueData = await response.json();
            const content = `# ${issueData.title}\n\n${issueData.body || ''}`;

            const metadata: WebContentMetadata = {
                title: issueData.title,
                description: `Issue #${issueData.number} in ${owner}/${repo}: ${issueData.state}`,
                source: url,
                url: url, // Added required property
                author: issueData.user?.login,
                published_at: issueData.created_at,
                updated_at: issueData.updated_at,
                language: 'markdown',
                fetched_at: new Date().toISOString(),
                metadata: {
                    state: issueData.state,
                    locked: issueData.locked,
                    comments: issueData.comments,
                    labels: issueData.labels?.map((label: any) => label.name) || []
                }
            };

            return { content, html: this.markdownToHtml(content), metadata, success: true, url };
        } catch (error) {
            this.logger.error('Error extracting issue:', error);
            throw error;
        }
    }

    private async extractRepository(url: string, options: ExtractionOptions): Promise<ExtractionResult> {
        this.logger.info(`Extracting repository info from ${url}`);
        try {
            const match = new URL(url).pathname.match(/^\/([^\/]+)\/([^\/]+)/);
            if (!match) {
                throw new Error('Could not parse repository information from URL');
            }
            const [_, owner, repo] = match;

            const apiUrl = `${this.API_BASE}/repos/${owner}/${repo}`;
            const response = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github.v3+json' } });
            if (!response.ok) {
                throw new Error(`GitHub API error for repository: ${response.statusText}`);
            }

            const repoData = await response.json();
            const content = `# ${repoData.full_name}\n\n${repoData.description || ''}`;

            const metadata: WebContentMetadata = {
                title: repoData.full_name,
                description: repoData.description || '',
                source: url,
                url: url, // Added required property
                author: repoData.owner?.login,
                published_at: repoData.created_at,
                updated_at: repoData.updated_at,
                language: repoData.language,
                fetched_at: new Date().toISOString(),
                metadata: {
                    stars: repoData.stargazers_count,
                    forks: repoData.forks_count,
                    watchers: repoData.watchers_count,
                    open_issues: repoData.open_issues_count,
                    license: repoData.license?.name,
                    homepage: repoData.homepage
                }
            };

            return { content, html: this.markdownToHtml(content), metadata, success: true, url };
        } catch (error) {
            this.logger.error('Error extracting repository:', error);
            throw error;
        }
    }

    private async extractGenericGitHubPage(html: string, url: string, options: ExtractionOptions): Promise<ExtractionResult> {
        this.logger.info(`Extracting generic GitHub page from ${url}`);
        try {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const mainContent = doc.querySelector('main') || doc.body;

            const text = this.cleanText(mainContent.textContent || '');
            const title = doc.querySelector('title')?.textContent || 'GitHub Page';
            const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

            const metadata: WebContentMetadata = {
                title,
                description,
                source: url,
                url: url, // Added required property
                language: 'en',
                fetched_at: new Date().toISOString()
            };

            return { content: text, html: mainContent.outerHTML, metadata, success: true, url };
        } catch (error) {
            this.logger.error('Error extracting generic GitHub page:', error);
            throw error;
        }
    }
    
    private markdownToHtml(markdown: string): string {
        let html = super.sanitize(markdown);
        html = html
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/`{3}([\s\S]*?)`{3}/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.split(/\n\n+/).map(p => {
            if (!p.startsWith('<h') && !p.startsWith('<pre>')) {
                return `<p>${p.replace(/\n/g, '<br>')}</p>`;
            }
            return p;
        }).join('');
        return html;
    }

    private cleanText(text: string): string {
        return text.replace(/\s+/g, ' ').trim();
    }

    private detectLanguage(fileName: string, content: string): string {
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        const languageMap: { [key: string]: string } = {
            js: 'javascript', ts: 'typescript', py: 'python', java: 'java',
            c: 'c', cpp: 'cpp', cs: 'csharp', go: 'go', rb: 'ruby', php: 'php',
            swift: 'swift', kt: 'kotlin', rs: 'rust', sh: 'shell', ps1: 'powershell',
            sql: 'sql', html: 'html', css: 'css', scss: 'scss', less: 'less',
            json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', md: 'markdown',
            txt: 'text', dockerfile: 'dockerfile',
        };
        return languageMap[extension] || 'plaintext';
    }
}

export const githubExtractor = new GitHubExtractor();
export default githubExtractor;
