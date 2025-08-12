/**
 * Source Manager Service
 * Real implementation for managing web content sources
 */

import { createLogger } from '../utils/logger.js';
import { storageService } from './storage.js';
import { webContentFetcher } from './webContentFetcher.js';
import { knowledgeSystemIntegration } from './knowledgeSystemIntegration.js';
import type {
	WebContentSource,
	SourceHealthCheck,
	SourceUpdateResult,
	DuplicateDetectionResult
} from '../types/web-content.js';
import type { ContentModule } from '../types/content.js';

export class SourceManager {
	private logger = createLogger('source-manager');
	private initialized = false;

	async initialize(): Promise<void> {
		if (this.initialized) return;

		await storageService.initialize();
		this.initialized = true;
		this.logger.info('Source Manager initialized');
	}

	private async ensureInitialized(): Promise<void> {
		if (!this.initialized) {
			await this.initialize();
		}
	}

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
		await this.ensureInitialized();

		const { url, title, category = 'web-content', tags = [], metadata = {} } = args;

		this.logger.info('Adding new content source', { url, category, tags });

		try {
			const parsed_url = new URL(url);
			const domain = parsed_url.hostname;

			// Check for duplicates
			const existing_source = await this.findDuplicateSource(url);
			if (existing_source) {
				this.logger.warn('Duplicate source detected', { url, existingSourceId: existing_source.id });
				return {
					sourceId: existing_source.id,
					source: existing_source,
					isDuplicate: true,
					duplicateOf: existing_source.id
				};
			}

			const sourceId = `source_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
			const now = new Date();

			const source: WebContentSource = {
				id: sourceId,
				url,
				title: title || `Content from ${domain}`,
				domain,
				importDate: now,
				lastChecked: now,
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
					lastAccessed: now,
					generatedModules: []
				}
			};

			await storageService.addSource(source);

			this.logger.info('Content source added successfully', {
				sourceId: sourceId,
				url,
				domain,
				category
			});

			return {
				sourceId: sourceId,
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
		await this.ensureInitialized();

		this.logger.info('Listing content sources', { filters });

		try {
			let sources: WebContentSource[];

			if (filters?.domain) {
				sources = await storageService.getSourcesByDomain(filters.domain);
			} else if (filters?.category) {
				sources = await storageService.getSourcesByCategory(filters.category);
			} else if (filters?.status) {
				sources = await storageService.getSourcesByStatus(filters.status);
			} else {
				sources = await storageService.getAllSources();
			}

			const total = (await storageService.getAllSources()).length;

			// Apply additional filters
			if (filters?.tags && filters.tags.length > 0) {
				sources = sources.filter((s) => filters.tags!.some((tag) => s.metadata.tags.includes(tag)));
			}

			const filtered = sources.length;

			// Apply pagination
			if (filters?.offset || filters?.limit) {
				const offset = filters.offset || 0;
				const limit = filters.limit || 50;
				sources = sources.slice(offset, offset + limit);
			}

			// Sort by last checked date (most recent first)
			sources.sort((a, b) => b.lastChecked.getTime() - a.lastChecked.getTime());

			this.logger.info('Sources listed successfully', {
				total,
				filtered,
				returned: sources.length
			});

			return {
				sources,
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

	async updateSource(
		sourceId: string,
		updates?: {
			title?: string;
			category?: string;
			tags?: string[];
			status?: 'active' | 'updated' | 'error' | 'removed';
		}
	): Promise<SourceUpdateResult> {
		await this.ensureInitialized();

		this.logger.info('Updating content source', { sourceId: sourceId, updates });

		try {
			const source = await storageService.getSource(sourceId);
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

			// Check for content changes by re-fetching
			try {
				const fresh_content = await webContentFetcher.fetch(source.url);
				if (fresh_content.success) {
					// Compare content hash if available
					const current_hash = this.generateContentHash(fresh_content.content.text);
					if (source.metadata.contentHash && source.metadata.contentHash !== current_hash) {
						source.status = 'updated';
						source.metadata.contentHash = current_hash;
						has_changes = true;
					} else if (!source.metadata.contentHash) {
						source.metadata.contentHash = current_hash;
						has_changes = true;
					}
				}
			} catch (error) {
				this.logger.warn('Failed to check for content updates:', error);
				source.status = 'error';
				has_changes = true;
			}

			if (has_changes) {
				await storageService.updateSource(source);
			}

			const result: SourceUpdateResult = {
				sourceId: sourceId,
				success: true,
				hasChanges: has_changes,
				changes: has_changes
					? {
						title: updates?.title !== original_source.title,
						content: source.metadata.contentHash !== original_source.metadata.contentHash,
						metadata:
							updates?.category !== original_source.metadata.category ||
							JSON.stringify(updates?.tags) !== JSON.stringify(original_source.metadata.tags)
					}
					: undefined,
				updatedAt: new Date()
			};

			this.logger.info('Source updated successfully', {
				sourceId: sourceId,
				hasChanges: has_changes
			});

			return result;
		} catch (error) {
			this.logger.error('Failed to update source:', error);
			return {
				sourceId: sourceId,
				success: false,
				hasChanges: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				updatedAt: new Date()
			};
		}
	}

	async removeSource(sourceId: string): Promise<{
		sourceId: string;
		removed: boolean;
		source?: WebContentSource;
	}> {
		await this.ensureInitialized();

		this.logger.info('Removing content source', { sourceId: sourceId });

		try {
			const source = await storageService.getSource(sourceId);
			if (!source) {
				return {
					sourceId: sourceId,
					removed: false
				};
			}

			await storageService.deleteSource(sourceId);

			// Also remove associated content
			const content = await storageService.getContentByUrl(source.url);
			if (content) {
				await storageService.deleteContent(content.id);
			}

			this.logger.info('Source removed successfully', { sourceId: sourceId });

			return {
				sourceId: sourceId,
				removed: true,
				source
			};
		} catch (error) {
			this.logger.error('Failed to remove source:', error);
			return {
				sourceId: sourceId,
				removed: false
			};
		}
	}

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
		await this.ensureInitialized();

		const sources_to_validate = sourceIds
			? (await Promise.all(sourceIds.map((id) => storageService.getSource(id)))).filter(Boolean)
			: await storageService.getAllSources();

		this.logger.info('Validating content sources', {
			sourceCount: sources_to_validate.length,
			specific: !!sourceIds
		});

		try {
			const validation_results = [];

			for (const source of sources_to_validate) {
				if (!source) continue;

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

				// Check accessibility
				try {
					const response = await fetch(source.url, { method: 'HEAD' });
					if (!response.ok) {
						issues.push(`URL returns ${response.status} status`);
						suggestions.push('Check if URL is still accessible');
					}
				} catch (error) {
					issues.push('URL is not accessible');
					suggestions.push('Verify URL is correct and accessible');
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
		await this.ensureInitialized();

		this.logger.info('Performing source health check', { filters });

		try {
			let sources_to_check = await storageService.getAllSources();

			// Apply filters
			if (filters) {
				if (filters.domain) {
					sources_to_check = sources_to_check.filter((s) => s.domain === filters.domain);
				}
				if (filters.category) {
					sources_to_check = sources_to_check.filter((s) => s.metadata.category === filters.category);
				}
				if (filters.lastCheckedBefore) {
					const cutoff_date = new Date(filters.lastCheckedBefore);
					sources_to_check = sources_to_check.filter((s) => s.lastChecked < cutoff_date);
				}
			}

			const health_checks = [];

			for (const source of sources_to_check) {
				const start_time = Date.now();
				let status: 'healthy' | 'warning' | 'error';
				const issues: string[] = [];
				const suggestions: string[] = [];

				try {
                                const controller = new AbortController();
                                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
					const response = await fetch(source.url, {
						method: 'HEAD',
                                                signal: controller.signal
					});
                                        clearTimeout(timeoutId);

					const response_time = Date.now() - start_time;

					if (response.ok) {
						if (response_time > 5000) {
							status = 'warning';
							issues.push('Slow response time');
							suggestions.push('Monitor performance', 'Consider caching');
						} else {
							status = 'healthy';
						}
					} else {
						status = 'error';
						issues.push(`HTTP ${response.status}: ${response.statusText}`);
						suggestions.push('Check URL validity', 'Verify content is still available');
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
				} catch (error) {
					const response_time = Date.now() - start_time;
					status = 'error';
					issues.push('Connection failed');
					suggestions.push('Check URL validity', 'Verify network connectivity');

					health_checks.push({
						sourceId: source.id,
						url: source.url,
						status,
						lastChecked: new Date(),
						responseTime: response_time,
						issues,
						suggestions
					});
				}

				// Update source status based on health check
				if (status === 'error') {
					source.status = 'error';
					await storageService.updateSource(source);
				}
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

	async detectDuplicates(): Promise<{
		duplicates: DuplicateDetectionResult[];
		summary: {
			totalSources: number;
			duplicateGroups: number;
			duplicateSources: number;
		};
	}> {
		await this.ensureInitialized();

		this.logger.info('Detecting duplicate sources');

		try {
		const sources = await storageService.getAllSources();
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
								action: 'merge' as const,
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

	async getSourceStatistics(): Promise<{
		total: number;
		byDomain: Record<string, number>;
		byCategory: Record<string, number>;
		byStatus: Record<string, number>;
		recentlyAdded: number;
		recentlyUpdated: number;
	}> {
		await this.ensureInitialized();

			const sources = await storageService.getAllSources();
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

	/**
	 * Integrate processed content with the knowledge system
	 */
	async integrateWithKnowledgeSystem(
		source: WebContentSource,
		processedModule: ContentModule
	): Promise<{
		success: boolean;
		relationshipsCreated: number;
		searchIndexed: boolean;
		learningPathSuggestions: number;
		error?: string;
	}> {
		await this.ensureInitialized();

		this.logger.info('Integrating content with knowledge system', {
			sourceId: source.id,
			moduleId: processedModule.id
		});

		try {
			const integration_result = await knowledgeSystemIntegration.integrateContent(
				source,
				processedModule
			);

			// Update source usage statistics
			source.usage.timesReferenced += 1;
			source.usage.lastAccessed = new Date();
			source.usage.generatedModules.push(processedModule.id);
			await storageService.updateSource(source);

			this.logger.info('Knowledge system integration completed', {
				sourceId: source.id,
				relationshipsDetected: integration_result.suggestedRelationships.length,
				confidence: integration_result.confidence
			});

			return {
				success: true,
				relationshipsCreated: integration_result.suggestedRelationships.length,
				searchIndexed: true,
				learningPathSuggestions: 0, // This would be populated by the integration service
				error: undefined
			};
		} catch (error) {
			this.logger.error('Knowledge system integration failed:', error);
			return {
				success: false,
				relationshipsCreated: 0,
				searchIndexed: false,
				learningPathSuggestions: 0,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Get content recommendations based on imported sources
	 */
	async getContentRecommendations(
		userId: string,
		completedContent: Set<string>,
		max_recommendations = 10
	): Promise<Array<{
		contentId: string;
		title: string;
		sourceUrl: string;
		score: number;
		reasons: string[];
	}>> {
		await this.ensureInitialized();

		try {
			const recommendations = await knowledgeSystemIntegration.getContentRecommendations(
				userId,
				completedContent,
				max_recommendations
			);

			// Enrich recommendations with source information
		const sources = await storageService.getAllSources();
			const enriched_recommendations = [];
			for (const rec of recommendations) {
				const source = sources.find(s => s.usage.generatedModules.includes(rec.contentId));

				if (source) {
					enriched_recommendations.push({
						contentId: rec.contentId,
						title: source.title,
						sourceUrl: source.url,
						score: rec.score,
						reasons: rec.reasons.map(r => r.description || 'Related content')
					});
				}
			}

			return enriched_recommendations;
		} catch (error) {
			this.logger.error('Failed to get content recommendations:', error);
			return [];
		}
	}

	// Private helper methods

	private async findDuplicateSource(url: string): Promise<WebContentSource | null> {
		const existing_content = await storageService.getContentByUrl(url);
		if (existing_content) {
			const sources = await storageService.getAllSources();
			return sources.find((s) => s.url === url) || null;
		}
		return null;
	}

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

	private generateContentHash(content: string): string {
		// Simple hash function for content comparison
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		return hash.toString(36);
	}
}

export const sourceManager = new SourceManager();
