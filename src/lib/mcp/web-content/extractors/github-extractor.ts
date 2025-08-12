import { BaseContentExtractor } from './base-extractor';
import type { WebContentMetadata, ExtractionOptions } from '../types';
import { createLogger } from '../../../utils/logger.js';

export class GitHubExtractor extends BaseContentExtractor {
	// GitHub domains this extractor handles
	readonly domains = ['github.com'];
	readonly content_types = ['text/html', 'application/json'];

	// GitHub API base URL
	private readonly API_BASE = 'https://api.github.com';

	// GitHub raw content base URL
	private readonly RAW_CONTENT_BASE = 'https://raw.githubusercontent.com';

	constructor() {
		super(createLogger('GitHubExtractor'));
	}

	/**
	 * Check if this extractor can handle the given URL and content type
	 */
	canHandle(url: string, contentType: string): boolean {
		try {
			const { hostname } = new URL(url);
			return this.domains.some((domain) => hostname.endsWith(domain));
		} catch (e) {
			return false;
		}
	}

	/**
	 * Extract content from a GitHub URL
	 */
	async extract(
		html: string,
		url: string,
		options: ExtractionOptions = {}
	): Promise<any> {
		const { pathname } = new URL(url);

		// Handle different GitHub URL patterns
		if (pathname.match(/blob/)) {
			// File content
			return this.extractFileContent(url, options);
		} else if (pathname.match(/pull\/\\d+/)) {
			// Pull request
			return this.extractPullRequest(url, options);
		} else if (pathname.match(/issues\/\\d+/)) {
			// Issue
			return this.extractIssue(url, options);
		} else if (pathname.match(/^\/[^\/]+\/[^\/]+(?:\/)?$/)) {
			// Repository root
			return this.extractRepository(url, options);
		} else {
			// Fall back to the default web extractor for other GitHub pages
			return this.extractGenericGitHubPage(html, url, options);
		}
	}

	/**
	 * Extract file content from a GitHub blob URL
	 */
	private async extractFileContent(url: string, options: ExtractionOptions): Promise<any> {
		try {
			// Convert GitHub blob URL to raw content URL
			const raw_url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');

			// Fetch the raw content
			const response = await fetch(raw_url);
			if (!response.ok) {
				throw new Error(`Failed to fetch raw content: ${response.statusText}`);
			}

			const content = await response.text();
			const content_type = response.headers.get('content-type') || 'text/plain';

			// Get file metadata from the URL
			const { pathname } = new URL(url);
			const parts = pathname.split('/');
			const file_name = parts[parts.length - 1];
			const repo_name = `${parts[1]}/${parts[2]}`;
			const file_path = parts.slice(5).join('/');

			// Create metadata
			const metadata: WebContentMetadata = {
				title: file_name,
				description: `File from ${repo_name}: ${file_path}`,
				source: url,
				author: parts[1],
				published_at: new Date().toISOString(),
				language: this.detectLanguage(file_name, content),
				...options.metadata
			};

			// Extract text and HTML
			const text = super.html_to_text(content);
			const html = super.sanitize(content);

			return {
				content: text,
				html,
				metadata,
				type: 'text',
				format: 'plain',
				source: url
			};
		} catch (error) {

			this.logger.error('Error extracting file content:', error);
			throw error;
		}
	}

	/**
	 * Extract pull request information
	 */
	private async extractPullRequest(url: string, options: ExtractionOptions): Promise<any> {
		try {
			// Extract owner, repo, and PR number from URL
			const { pathname } = new URL(url);
			const [_, owner, repo, __, pr_number] = pathname.split('/');

			// Fetch PR data from GitHub API
			const api_url = `${this.API_BASE}/repos/${owner}/${repo}/pulls/${pr_number}`;
			const response = await fetch(api_url, {
				headers: {
					Accept: 'application/vnd.github.v3+json'
				}
			});

			if (!response.ok) {
				throw new Error(`GitHub API error: ${response.statusText}`);
			}

			const pr_data = await response.json();

			// Format PR content
			const title = `# ${pr_data.title}\n\n`;
			const body = pr_data.body || '';
			const content = title + body;

			// Create metadata
			const metadata: WebContentMetadata = {
				title: pr_data.title,
				description: `Pull request #${pr_data.number} in ${owner}/${repo}`,
				source: url,
				author: pr_data.user?.login,
				published_at: pr_data.created_at,
				updated_at: pr_data.updated_at,
				language: 'markdown',
				metadata: {
					state: pr_data.state,
					merged: pr_data.merged,
					mergeable: pr_data.mergeable,
					comments: pr_data.comments,
					review_comments: pr_data.review_comments,
					commits: pr_data.commits,
					additions: pr_data.additions,
					deletions: pr_data.deletions,
					changed_files: pr_data.changed_files
				},
				...options.metadata
			};

			return {
				content,
				html: this.markdownToHtml(content),
				metadata,
				type: 'text',
				format: 'markdown',
				source: url
			};
		} catch (error) {
			this.logger.error('Error extracting pull request:', error);
			throw error;
		}
	}

	/**
	 * Extract issue information
	 */
	private async extractIssue(url: string, options: ExtractionOptions): Promise<any> {
		try {
			// Extract owner, repo, and issue number from URL
			const { pathname } = new URL(url);
			const [_, owner, repo, __, issue_number] = pathname.split('/');

			// Fetch issue data from GitHub API
			const api_url = `${this.API_BASE}/repos/${owner}/${repo}/issues/${issue_number}`;
			const response = await fetch(api_url, {
				headers: {
					Accept: 'application/vnd.github.v3+json'
				}
			});

			if (!response.ok) {
				throw new Error(`GitHub API error: ${response.statusText}`);
			}

			const issue_data = await response.json();

			// Format issue content
			const title = `# ${issue_data.title}\n\n`;
			const body = issue_data.body || '';
			const content = title + body;

			// Create metadata
			const metadata: WebContentMetadata = {
				title: issue_data.title,
				description: `Issue #${issue_data.number} in ${owner}/${repo}`,
				source: url,
				author: issue_data.user?.login,
				published_at: issue_data.created_at,
				updated_at: issue_data.updated_at,
				language: 'markdown',
				metadata: {
					state: issue_data.state,
					locked: issue_data.locked,
					comments: issue_data.comments,
					labels: issue_data.labels?.map((label: any) => label.name) || [],
					assignee: issue_data.assignee?.login,
					assignees: issue_data.assignees?.map((a: any) => a.login) || []
				},
				...options.metadata
			};

			return {
				content,
				html: this.markdownToHtml(content),
				metadata,
				type: 'text',
				format: 'markdown',
				source: url
			};
		} catch (error) {
			this.logger.error('Error extracting issue:', error);
			throw error;
		}
	}

	/**
	 * Extract repository information
	 */
	private async extractRepository(url: string, options: ExtractionOptions): Promise<any> {
		try {
			// Extract owner and repo from URL
			const { pathname } = new URL(url);
			const [_, owner, repo] = pathname.split('/');

			// Fetch repo data from GitHub API
			const api_url = `${this.API_BASE}/repos/${owner}/${repo}`;
			const response = await fetch(api_url, {
				headers: {
					Accept: 'application/vnd.github.v3+json'
				}
			});

			if (!response.ok) {
				throw new Error(`GitHub API error: ${response.statusText}`);
			}

			const repo_data = await response.json();

			// Format repository content
			const title = `# ${repo_data.full_name}\n\n`;
			const description = `${repo_data.description || ''}\n\n`;
			const content = title + description;

			// Create metadata
			const metadata: WebContentMetadata = {
				title: repo_data.full_name,
				description: repo_data.description || '',
				source: url,
				author: repo_data.owner?.login,
				published_at: repo_data.created_at,
				updated_at: repo_data.updated_at,
				language: repo_data.language,
				metadata: {
					stars: repo_data.stargazers_count,
					forks: repo_data.forks_count,
					watchers: repo_data.watchers_count,
					open_issues: repo_data.open_issues_count,
					license: repo_data.license?.name,
					is_fork: repo_data.fork,
					size: repo_data.size,
					default_branch: repo_data.default_branch,
					homepage: repo_data.homepage
				},
				...options.metadata
			};

			return {
				content,
				html: this.markdownToHtml(content),
				metadata,
				type: 'text',
				format: 'markdown',
				source: url
			};
		} catch (error) {
			this.logger.error('Error extracting repository:', error);
			throw error;
		}
	}

	/**
	 * Extract content from generic GitHub pages
	 */
	private async extractGenericGitHubPage(
		html: string,
		url: string,
		options: ExtractionOptions
	): Promise<any> {
		try {
			// Parse the HTML
			const doc = new DOMParser().parseFromString(content, 'text/html');

			// Extract the main content
			const main_content =
				doc.querySelector('.repository-content, .gist-content') ||
				doc.querySelector('main') ||
				doc.body;

			// Extract text and clean up
			let text = main_content.textContent || '';
			text = this.cleanText(text);

			// Extract metadata from the page
			const title = doc.querySelector('title')?.textContent || 'GitHub';
			const description =
				doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';

			// Create metadata
			const metadata: WebContentMetadata = {
				title,
				description,
				source: url,
				language: 'en',
				...options.metadata
			};

			return {
				content: text,
				html: main_content.outerHTML,
				metadata,
				type: 'text',
				format: 'html',
				source: url
			};
		} catch (error) {
			this.logger.error('Error extracting generic GitHub page:', error);
			throw error;
		}
	}

	/**
	 * Detect programming language from file name and content
	 */
	private detectLanguage(fileName: string, content: string): string {
		const extension = file_name.split('.').pop()?.toLowerCase() || '';

		// Map of file extensions to languages
		const language_map = {
			js: 'JavaScript',
			ts: 'TypeScript',
			py: 'Python',
			java: 'Java',
			c: 'C',
			cpp: 'C++',
			cs: 'C#',
			go: 'Go',
			rb: 'Ruby',
			php: 'PHP',
			swift: 'Swift',
			kt: 'Kotlin',
			rs: 'Rust',
			sh: 'Shell',
			ps1: 'PowerShell',
			sql: 'SQL',
			html: 'HTML',
			css: 'CSS',
			scss: 'SCSS',
			less: 'Less',
			json: 'JSON',
			xml: 'XML',
			yaml: 'YAML',
			yml: 'YAML',
			md: 'Markdown',
			txt: 'Text',
			dockerfile: 'Dockerfile'
		};

		return language_map[extension] || 'Unknown';
	}

	/**
	 * Clean up text content
	 */
	private cleanText(text: string): string {
		// Remove multiple whitespace characters
		return text.replace(/\s+/g, ' ').trim();
	}

	/**
	 * Convert Markdown to HTML
	 */
	private markdownToHtml(markdown: string): string {
		// Simple Markdown to HTML conversion
		// In a real implementation, you might want to use a library like marked or remark
		return markdown
			.replace(/^# (.*$)/gm, '<h1>$1</h1>')
			.replace(/^## (.*$)/gm, '<h2>$1</h2>')
			.replace(/^### (.*$)/gm, '<h3>$1</h3>')
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.*?)\*/g, '<em>$1</em>')
			.replace(/`(.*?)`/g, '<code>$1</code>')
			.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2">')
			.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
			.replace(/\n\n/g, '<br><br>')
			.replace(/\n/g, ' ');
	}
}

// Export a singleton instance
export const githubExtractor = new GitHubExtractor();
export default githubExtractor;
