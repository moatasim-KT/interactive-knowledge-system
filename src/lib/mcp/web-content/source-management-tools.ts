/**
 * Source Management Tools
 * Implementation of source management capabilities for web content sourcing
 * Using existing OrganizationSearchTools as guide
 */

import { createLogger } from '$lib/utils/logger.js';
import type {
	WebContentSource,
	SourceHealthCheck,
	SourceUpdateResult,
	DuplicateDetectionResult,
	QualityMetrics
} from '$lib/types/web-content.js';

export class SourceManagementTools {
	private logger = createLogger('mcp:source-management-tools');
	private sources = new Map<string, WebContentSource>();
	private sourcesByDomain = new Map<string, Set<string>>();
	private sourcesByCategory = new Map<string, Set<string>>();

	/**
	 * Add a new content source
	 */
	async addSource(args: {
		url: string;
		title?: string;
		category?: string;
		tags?: string[];
		metadata?: any;
	}): Promise<{
		sourceId: string;
		source: WebContentSource;
		isDuplicate: boolean;
		duplicateOf?: string;
	}> {
		const { url, title, category = 'web-content', tags = [], metadata = {} } = args;

		this.logger.info('Adding new content source', { url, category, tags });

		try {
			const parsed_url = new URL(url);
			const domain = parsed_url.hostname;
			const source_id = `source_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

			// Check for duplicates
			const existing_source = this.findDuplicateSource(url);
			if (existing_source) {
				this.logger.warn('Duplicate source detected', {
					url,
					existingSourceId: existing_source.id
				});
				return {
					sourceId: existing_source.id,
					source: existing_source,
					isDuplicate: true,
					duplicateOf: existing_source.id
				};
			}

			const source: WebContentSource = {
				id: source_id,
				url,
				title: title || `Content from ${domain}`,
				domain,
				importDate: new Date(),
				lastChecked: new Date(),
				status: 'active',
				metadata: {
					author: metadata.author,
					publishDate: metadata.publishDate ? new Date(metadata.publishDate) : undefined,
					lastModified: metadata.lastModified ? new Date(metadata.lastModified) : undefined,
					domain,
					contentType: metadata.contentType || 'article',
					language: metadata.language || 'en',
					readingTime: metadata.readingTime || 0,
					wordCount: metadata.wordCount || 0,
					keywords: metadata.keywords || [],
					description: metadata.description || '',
					license: metadata.license,
					attribution: url,
					tags,
					category,
					contentHash: metadata.contentHash
				},
				usage: {
					timesReferenced: 0,
					lastAccessed: new Date(),
					generatedModules: []
				}
			};

			// Store source
			this.sources.set(source_id, source);

			// Update domain index
			if (!this.sourcesByDomain.has(domain)) {
				this.sourcesByDomain.set(domain, new Set());
			}
			this.sourcesByDomain.get(domain)!.add(source_id);

			// Update category index
			if (!this.sourcesByCategory.has(category)) {
				this.sourcesByCategory.set(category, new Set());
			}
			this.sourcesByCategory.get(category)!.add(source_id);

			this.logger.info('Content source added successfully', {
				sourceId: source_id,
				url,
				domain,
				category
			});

			return {
				sourceId: source_id,
				source,
				isDuplicate: false
			};
		} catch (error) {
			this.logger.error('Failed to add content source:', error);
			throw new Error(
				`Failed to add source: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * List content sources with filtering
	 */
	async listSources(filters?: {
		domain?: string;
		category?: string;
		status?: string;
		tags?: string[];
		limit?: number;
		offset?: number;
	}): Promise<{
		sources: WebContentSource[];
		total: number;
		filtered: number;
	}> {
		this.logger.info('Listing content sources', { filters });

		try {
			let filtered_sources = Array.from(this.sources.values());

			// Apply filters
			if (filters) {
				if (filters.domain) {
					filtered_sources = filtered_sources.filter((s) => s.domain === filters.domain);
				}
				if (filters.category) {
					filtered_sources = filtered_sources.filter(
						(s) => s.metadata.category === filters.category
					);
				}
				if (filters.status) {
					filtered_sources = filtered_sources.filter((s) => s.status === filters.status);
				}
				if (filters.tags && filters.tags.length > 0) {
					filtered_sources = filtered_sources.filter((s) =>
						filters.tags!.some((tag) => s.metadata.tags.includes(tag))
					);
				}
			}

			const total = this.sources.size;
			const filtered = filtered_sources.length;

			// Apply pagination
			if (filters?.offset || filters?.limit) {
				const offset = filters.offset || 0;
				const limit = filters.limit || 50;
				filtered_sources = filtered_sources.slice(offset, offset + limit);
			}

			// Sort by last checked date (most recent first)
			filtered_sources.sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime());

			this.logger.info('Sources listed successfully', {
				total,
				filtered,
				returned: filtered_sources.length
			});

			return {
				sources: filtered_sources,
				total,
				filtered
			};
		} catch (error) {
			this.logger.error('Failed to list sources:', error);
			throw new Error(
				`Failed to list sources: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Update a content source
	 */
	async updateSource(
		sourceId: string,
		updates?: {
			title?: string;
			category?: string;
			tags?: string[];
			status?: 'active' | 'updated' | 'error' | 'removed';
		}
	): Promise<SourceUpdateResult> {
		this.logger.info('Updating content source', { sourceId, updates });

		try {
			const source = this.sources.get(sourceId);
			if (!source) {
				throw new Error(`Source not found: ${sourceId}`);
			}

			const original_source = { ...source };
			let has_changes = false;

			// Apply updates
			if (updates) {
				if (updates.title && updates.title !== source.title) {
					source.title = updates.title;
					has_changes = true;
				}
				if (updates.category && updates.category !== source.metadata.category) {
					// Update category index
					this.sourcesByCategory.get(source.metadata.category)?.delete(source_id);
					if (!this.sourcesByCategory.has(updates.category)) {
						this.sourcesByCategory.set(updates.category, new Set());
					}
					this.sourcesByCategory.get(updates.category)!.add(source_id);

					source.metadata.category = updates.category;
					has_changes = true;
				}
				if (updates.tags && JSON.stringify(updates.tags) !== JSON.stringify(source.metadata.tags)) {
					source.metadata.tags = updates.tags;
					has_changes = true;
				}
				if (updates.status && updates.status !== source.status) {
					source.status = updates.status;
					has_changes = true;
				}
			}

			// Always update lastChecked
			source.lastChecked = new Date();

			// Mock content change detection (in real implementation, would fetch and compare)
			const content_changed = Math.random() > 0.7; // 30% chance of content change
			if (content_changed) {
				source.status = 'updated';
				has_changes = true;
			}

			const result: SourceUpdateResult = {
				sourceId: source_id,
				success: true,
				hasChanges: has_changes,
				changes: has_changes
					? {
							title: updates?.title !== original_source.title,
							content: content_changed,
							metadata:
								updates?.category !== original_source.metadata.category ||
								JSON.stringify(updates?.tags) !== JSON.stringify(original_source.metadata.tags)
						}
					: undefined,
				updatedAt: new Date()
			};

			this.logger.info('Source updated successfully', {
				sourceId: source_id,
				hasChanges: has_changes,
				contentChanged: content_changed
			});

			return result;
		} catch (error) {
			this.logger.error('Failed to update source:', error);
			return {
				sourceId: source_id,
				success: false,
				hasChanges: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				updatedAt: new Date()
			};
		}
	}

	/**
	 * Remove a content source
	 */
	async removeSource(sourceId: string): Promise<{
		sourceId: string;
		removed: boolean;
		source?: WebContentSource;
	}> {
		this.logger.info('Removing content source', { sourceId });

		try {
			const source = this.sources.get(sourceId);
			if (!source) {
				throw new Error(`Source not found: ${sourceId}`);
			}

			// Remove from main storage
			this.sources.delete(sourceId);

			// Remove from domain index
			this.sourcesByDomain.get(source.domain)?.delete(source_id);
			if (this.sourcesByDomain.get(source.domain)?.size === 0) {
				this.sourcesByDomain.delete(source.domain);
			}

			// Remove from category index
			this.sourcesByCategory.get(source.metadata.category)?.delete(source_id);
			if (this.sourcesByCategory.get(source.metadata.category)?.size === 0) {
				this.sourcesByCategory.delete(source.metadata.category);
			}

			this.logger.info('Source removed successfully', { sourceId: source_id });

			return {
				sourceId: source_id,
				removed: true,
				source
			};
		} catch (error) {
			this.logger.error('Failed to remove source:', error);
			return {
				sourceId: source_id,
				removed: false
			};
		}
	}

	/**
	 * Validate content sources
	 */
	async validateSources(sourceIds?: string[]): Promise<{
		validationResults: Array<{
			sourceId: string;
			valid: boolean;
			issues: string[];
			suggestions: string[];
		}>;
		summary: {
			total: number;
			valid: number;
			invalid: number;
		};
	}> {
		const sources_to_validate = sourceIds
			? (sourceIds.map((id) => this.sources.get(id)).filter(Boolean) as WebContentSource[])
			: Array.from(this.sources.values());

		this.logger.info('Validating content sources', {
			sourceCount: sources_to_validate.length,
			specific: !!sourceIds
		});

		try {
			const validation_results = [];

			for (const source of sources_to_validate) {
				const issues: string[] = [];
				const suggestions: string[] = [];

				// Validate URL
				try {
					new URL(source.url);
				} catch {
					issues.push('Invalid URL format');
					suggestions.push('Update URL to valid format');
				}

				// Check if source is too old
				const days_since_last_check =
					(Date.now() - source.lastChecked.getTime()) / (1000 * 60 * 60 * 24);
				if (days_since_last_check > 30) {
					issues.push('Source not checked in over 30 days');
					suggestions.push('Update source to refresh content');
				}

				// Check metadata completeness
				if (!source.metadata.description) {
					issues.push('Missing description');
					suggestions.push('Add description for better categorization');
				}

				if (source.metadata.keywords.length === 0) {
					issues.push('No keywords defined');
					suggestions.push('Add keywords for better searchability');
				}

				// Mock accessibility check
				if (Math.random() > 0.8) {
					issues.push('Potential accessibility issues detected');
					suggestions.push('Review content for accessibility compliance');
				}

				validation_results.push({
					sourceId: source.id,
					valid: issues.length === 0,
					issues,
					suggestions
				});
			}

			const summary = {
				total: validation_results.length,
				valid: validation_results.filter((r) => r.valid).length,
				invalid: validation_results.filter((r) => !r.valid).length
			};

			this.logger.info('Source validation completed', summary);

			return {
				validationResults: validation_results,
				summary
			};
		} catch (error) {
			this.logger.error('Source validation failed:', error);
			throw new Error(
				`Source validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Perform health check on sources
	 */
	async performHealthCheck(filters?: {
		domain?: string;
		category?: string;
		lastCheckedBefore?: string;
	}): Promise<{
		healthChecks: SourceHealthCheck[];
		summary: {
			total: number;
			healthy: number;
			warning: number;
			error: number;
		};
	}> {
		this.logger.info('Performing source health check', { filters });

		try {
			let sources_to_check = Array.from(this.sources.values());

			// Apply filters
			if (filters) {
				if (filters.domain) {
					sources_to_check = sources_to_check.filter((s) => s.domain === filters.domain);
				}
				if (filters.category) {
					sources_to_check = sources_to_check.filter(
						(s) => s.metadata.category === filters.category
					);
				}
				if (filters.lastCheckedBefore) {
					const cutoff_date = new Date(filters.lastCheckedBefore);
					sources_to_check = sources_to_check.filter((s) => s.lastChecked < cutoff_date);
				}
			}

			const health_checks = [];

			for (const source of sources_to_check) {
				// Mock health check (in real implementation, would make HTTP request)
				const response_time = Math.floor(Math.random() * 3000) + 100;
				const is_healthy = Math.random() > 0.2; // 80% healthy
				const has_warning = !is_healthy && Math.random() > 0.5; // 50% of unhealthy are warnings

				let status: 'healthy' | 'warning' | 'error';
				const issues: string[] = [];
				const suggestions: string[] = [];

				if (is_healthy) {
					status = 'healthy';
				} else if (has_warning) {
					status = 'warning';
					issues.push('Slow response time');
					suggestions.push('Monitor performance', 'Consider caching');
				} else {
					status = 'error';
					issues.push('Connection failed');
					suggestions.push('Check URL validity', 'Verify network connectivity');
				}

				health_checks.push({
					sourceId: source.id,
					url: source.url,
					status,
					lastChecked: new Date(),
					responseTime: response_time,
					issues,
					suggestions
				});

				// Update source status based on health check
				if (status === 'error') {
					source.status = 'error';
				} else if (status === 'warning' && source.status === 'active') {
					// Keep as active but note the warning
				}
				source.lastChecked = new Date();
			}

			const summary = {
				total: health_checks.length,
				healthy: health_checks.filter((h) => h.status === 'healthy').length,
				warning: health_checks.filter((h) => h.status === 'warning').length,
				error: health_checks.filter((h) => h.status === 'error').length
			};

			this.logger.info('Health check completed', summary);

			return {
				healthChecks: health_checks,
				summary
			};
		} catch (error) {
			this.logger.error('Health check failed:', error);
			throw new Error(
				`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Detect duplicate sources
	 */
	async detectDuplicates(): Promise<{
		duplicates: DuplicateDetectionResult[];
		summary: {
			totalSources: number;
			duplicateGroups: number;
			duplicateSources: number;
		};
	}> {
		this.logger.info('Detecting duplicate sources');

		try {
			const sources = Array.from(this.sources.values());
			const duplicates: DuplicateDetectionResult[] = [];
			const processed = new Set<string>();

			for (const source of sources) {
				if (processed.has(source.id)) continue;

				const similar_sources = sources.filter(
					(s) =>
						s.id !== source.id && !processed.has(s.id) && this.calculateSimilarity(source, s) > 0.8
				);

				if (similar_sources.length > 0) {
					const duplicate_result = {
						sourceId: source.id,
						duplicates: similar_sources.map((s) => ({
							id: s.id,
							similarity: this.calculateSimilarity(source, s),
							reason: this.getDuplicateReason(source, s)
						})),
						suggestions: [
							{
								action: 'merge',
								confidence: 0.8,
								reasoning: 'High similarity detected, consider merging sources'
							}
						]
					};

					duplicates.push(duplicate_result);
					processed.add(source.id);
					similar_sources.forEach((s) => processed.add(s.id));
				}
			}

			const summary = {
				totalSources: sources.length,
				duplicateGroups: duplicates.length,
				duplicateSources: duplicates.reduce((sum, d) => sum + d.duplicates.length + 1, 0)
			};

			this.logger.info('Duplicate detection completed', summary);

			return {
				duplicates,
				summary
			};
		} catch (error) {
			this.logger.error('Duplicate detection failed:', error);
			throw new Error(
				`Duplicate detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Get source statistics
	 */
	async getSourceStatistics(): Promise<{
		total: number;
		byDomain: Record<string, number>;
		byCategory: Record<string, number>;
		byStatus: Record<string, number>;
		recentlyAdded: number;
		recentlyUpdated: number;
	}> {
		const sources = Array.from(this.sources.values());
		const now = new Date();
		const one_day_ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
		const one_week_ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		const stats = {
			total: sources.length,
			byDomain: {} as Record<string, number>,
			byCategory: {} as Record<string, number>,
			byStatus: {} as Record<string, number>,
			recentlyAdded: sources.filter((s) => s.importDate > one_week_ago).length,
			recentlyUpdated: sources.filter((s) => s.lastChecked > one_day_ago).length
		};

		// Count by domain
		sources.forEach((source) => {
			stats.byDomain[source.domain] = (stats.byDomain[source.domain] || 0) + 1;
		});

		// Count by category
		sources.forEach((source) => {
			stats.byCategory[source.metadata.category] =
				(stats.byCategory[source.metadata.category] || 0) + 1;
		});

		// Count by status
		sources.forEach((source) => {
			stats.byStatus[source.status] = (stats.byStatus[source.status] || 0) + 1;
		});

		return stats;
	}

	// Private helper methods

	/**
	 * Find duplicate source by URL
	 */
	private findDuplicateSource(url: string): WebContentSource | null {
		for (const source of this.sources.values()) {
			if (source.url === url) {
				return source;
			}
		}
		return null;
	}

	/**
	 * Calculate similarity between two sources
	 */
	private calculateSimilarity(source1: WebContentSource, source2: WebContentSource): number {
		let similarity = 0;

		// URL similarity
		if (source1.url === source2.url) {
			similarity += 0.5;
		} else if (source1.domain === source2.domain) {
			similarity += 0.2;
		}

		// Title similarity
		if (source1.title === source2.title) {
			similarity += 0.3;
		} else if (
			source1.title.toLowerCase().includes(source2.title.toLowerCase()) ||
			source2.title.toLowerCase().includes(source1.title.toLowerCase())
		) {
			similarity += 0.15;
		}

		// Content hash similarity (if available)
		if (source1.metadata.contentHash && source2.metadata.contentHash) {
			if (source1.metadata.contentHash === source2.metadata.contentHash) {
				similarity += 0.2;
			}
		}

		return Math.min(similarity, 1.0);
	}

	/**
	 * Get reason for duplicate detection
	 */
	private getDuplicateReason(source1: WebContentSource, source2: WebContentSource): string {
		if (source1.url === source2.url) {
			return 'Identical URL';
		}
		if (source1.title === source2.title) {
			return 'Identical title';
		}
		if (source1.metadata.contentHash === source2.metadata.contentHash) {
			return 'Identical content';
		}
		if (source1.domain === source2.domain) {
			return 'Same domain with similar content';
		}
		return 'Similar content detected';
	}
}
