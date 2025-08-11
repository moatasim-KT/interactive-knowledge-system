/**
 * Detects and handles different domains for specialized content extraction
 */

import type { WebContent } from './types';
import type { ContentTypeInfo } from './content-type-detector';

export interface DomainInfo {
	/** The domain name (e.g., 'github.com') */
	domain: string;
	/** Subdomains to include (e.g., ['api', 'gist'] for GitHub) */
	subdomains?: string[];
	/** Display name */
	name: string;
	/** Description of the domain */
	description: string;
	/** Main website URL */
	url: string;
	/** Content categories this domain belongs to */
	categories: string[];
	/** Whether to use a specialized extractor for this domain */
	has_specialized_extractor: boolean;
	/** Default content type for this domain */
	default_content_type: string;
	/** Additional metadata specific to this domain */
	metadata?: Record<string, unknown>;
}

/**
 * Common domain patterns and their metadata
 */
export const KNOWN_DOMAINS: DomainInfo[] = [
	// Code Hosting
	{
		domain: 'github.com',
		subdomains: ['gist', 'api'],
		name: 'GitHub',
		description: 'GitHub is a development platform for version control and collaboration',
		url: 'https://github.com',
		categories: ['code', 'development', 'version-control'],
		has_specialized_extractor: true,
		default_content_type: 'text/markdown',
		metadata: {
			api_docs: 'https://docs.github.com/en/rest',
			rate_limited: true,
			authentication_required: false
		}
	},
	{
		domain: 'gitlab.com',
		name: 'GitLab',
		description: 'GitLab is a complete DevOps platform',
		url: 'https://gitlab.com',
		categories: ['code', 'development', 'devops'],
		has_specialized_extractor: true,
		default_content_type: 'text/markdown'
	},

	// Documentation
	{
		domain: 'docs.microsoft.com',
		subdomains: ['learn', 'azure'],
		name: 'Microsoft Docs',
		description: 'Documentation for Microsoft tools and services',
		url: 'https://docs.microsoft.com',
		categories: ['documentation', 'microsoft', 'cloud'],
		has_specialized_extractor: true,
		default_content_type: 'text/html'
	},
	{
		domain: 'developer.mozilla.org',
		name: 'MDN Web Docs',
		description: 'Web development resources by Mozilla',
		url: 'https://developer.mozilla.org',
		categories: ['documentation', 'web', 'standards'],
		has_specialized_extractor: true,
		default_content_type: 'text/html'
	},

	// Q&A and Forums
	{
		domain: 'stackoverflow.com',
		subdomains: ['stackexchange', 'superuser'],
		name: 'Stack Overflow',
		description: 'Q&A for professional and enthusiast programmers',
		url: 'https://stackoverflow.com',
		categories: ['q&a', 'programming'],
		has_specialized_extractor: true,
		default_content_type: 'text/html'
	},

	// Blogging and Publishing
	{
		domain: 'medium.com',
		name: 'Medium',
		description: 'Platform for writers and readers',
		url: 'https://medium.com',
		categories: ['blogging', 'articles'],
		has_specialized_extractor: true,
		default_content_type: 'text/html'
	},

	// Reference and Knowledge
	{
		domain: 'wikipedia.org',
		subdomains: ['en', 'es', 'fr'],
		name: 'Wikipedia',
		description: 'The Free Encyclopedia',
		url: 'https://www.wikipedia.org',
		categories: ['reference', 'encyclopedia'],
		has_specialized_extractor: true,
		default_content_type: 'text/html'
	}
];

/**
 * Extracts the domain and subdomain from a URL
 */
function extract_domain(url: string): { domain: string; subdomain: string | null } {
	try {
		// Handle protocol-relative URLs
		if (url.startsWith('//')) {
			url = 'https:' + url;
		} else if (!/^https?:\/\//i.test(url)) {
			url = 'https://' + url;
		}

		const parsed = new URL(url);
		const hostname = parsed.hostname;

		// Remove www. if present
		const clean_hostname = hostname.replace(/^www\./i, '');

		// Split into parts
		const parts = clean_hostname.split('.');

		// Handle TLDs with multiple parts (e.g., co.uk, com.br)
		const tlds = ['com', 'org', 'net', 'edu', 'gov', 'io', 'ai', 'co', 'uk', 'us'];

		// If we have at least 3 parts and the second part is a known TLD, it's a subdomain
		if (parts.length >= 3 && tlds.includes(parts[parts.length - 2])) {
			return {
				domain: parts.slice(-3).join('.'),
				subdomain: parts.slice(0, -3).join('.')
			};
		}

		// Otherwise, it's a standard domain
		return {
			domain: parts.slice(-2).join('.'),
			subdomain: parts.length > 2 ? parts.slice(0, -2).join('.') : null
		};
	} catch (e) {
		// If URL parsing fails, try a simple approach
		const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^/]+)/i);
		if (match) {
			return {
				domain: match[1],
				subdomain: null
			};
		}

		// Fallback
		return {
			domain: url,
			subdomain: null
		};
	}
}

/**
 * Detects domain information from a URL
 */
export function detectDomain(url: string): DomainInfo | null {
	const { domain, subdomain } = extract_domain(url);

	// Check for exact domain match
	for (const known of KNOWN_DOMAINS) {
		if (known.domain === domain) {
			// Check if subdomain is allowed
			if (!subdomain || !known.subdomains || known.subdomains.includes(subdomain.split('.')[0])) {
				return known;
			}
		}
	}

	// No match found
	return null;
}

/**
 * Gets the appropriate content type for a URL
 */
export function getContentTypeForUrl(url: string, contentType?: string): string {
	// If content type is provided, use it
	if (contentType) {
		return contentType.split(';')[0].trim().toLowerCase();
	}

	// Try to detect domain
	const domain_info = detectDomain(url);
	if (domain_info) {
		return domain_info.default_content_type;
	}

	// Default to HTML for web content
	return 'text/html';
}

/**
 * Checks if a URL should use a specialized extractor
 */
export function hasSpecializedExtractor(url: string): boolean {
	const domain_info = detectDomain(url);
	return domain_info?.has_specialized_extractor || false;
}

/**
 * Gets domain-specific metadata for a URL
 */
export function getDomainMetadata(url: string): Record<string, unknown> | null {
	const domain_info = detectDomain(url);
	return domain_info?.metadata || null;
}

// Export the KNOWN_DOMAINS for external use
export { KNOWN_DOMAINS };

export default {
	detectDomain,
	getContentTypeForUrl,
	hasSpecializedExtractor,
	getDomainMetadata,
	KNOWN_DOMAINS
};
