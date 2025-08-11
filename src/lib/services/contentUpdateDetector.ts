/**
 * Content Update Detection and Refresh System
 * Detects changes in web content sources and manages refresh operations
 */

import type {
	WebContentSource,
	WebContent,
	SourceHealthCheck,
	SourceUpdateResult
} from '../types/web-content.js';
import { sourceManager } from './sourceManager.js';

/**
 * Update detection configuration
 */
export interface UpdateDetectionConfig {
	checkInterval: number; // in milliseconds
	maxRetries: number;
	timeout: number;
	userAgent: string;
	respectRobotsTxt: boolean;
	rateLimitDelay: number;
}

/**
 * Content change detection result
 */
export interface ContentChangeDetection {
	sourceId: string;
	hasChanges: boolean;
	changes: {
		title?: boolean;
		content?: boolean;
		metadata?: boolean;
		structure?: boolean;
	};
	confidence: number;
	lastModified?: Date;
	etag?: string;
	contentHash: string;
	previousHash?: string;
}

/**
 * Refresh operation result
 */
export interface RefreshOperationResult {
	sourceId: string;
	success: boolean;
	updated: boolean;
	error?: string;
	changes?: ContentChangeDetection;
	refreshedAt: Date;
	nextCheckAt?: Date;
}

/**
 * Content Update Detector class
 */
export class ContentUpdateDetector {
	private static instance: ContentUpdateDetector;
	private config: UpdateDetectionConfig;
	private activeChecks = new Map<string, Promise<SourceHealthCheck>>();

	private constructor() {
		this.config = {
			checkInterval: 24 * 60 * 60 * 1000, // 24 hours
			maxRetries: 3,
			timeout: 30000, // 30 seconds
			userAgent: 'Interactive-Knowledge-System/1.0',
			respectRobotsTxt: true,
			rateLimitDelay: 1000 // 1 second between requests
		};
	}

	static getInstance(): ContentUpdateDetector {
		if (!ContentUpdateDetector.instance) {
			ContentUpdateDetector.instance = new ContentUpdateDetector();
		}
		return ContentUpdateDetector.instance;
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<UpdateDetectionConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Check if a source needs updating
	 */
	async checkSourceHealth(sourceId: string): Promise<SourceHealthCheck> {
		// Prevent duplicate checks
		if (this.activeChecks.has(sourceId)) {
			return await this.activeChecks.get(sourceId)!;
		}

		const check_promise = this.performHealthCheck(sourceId);
		this.activeChecks.set(sourceId, check_promise);

		try {
			const result = await check_promise;
			return result;
		} finally {
			this.activeChecks.delete(sourceId);
		}
	}

	/**
	 * Perform actual health check
	 */
	private async performHealthCheck(sourceId: string): Promise<SourceHealthCheck> {
		const source = await sourceManager.getSource(sourceId);
		if (!source) {
			throw new Error(`Source ${sourceId} not found`);
		}

		const start_time = Date.now();
		const issues: string[] = [];
		const suggestions: string[] = [];

		try {
			// Perform HEAD request to check if resource is accessible
			const response = await this.makeRequest(source.url, 'HEAD');
			const response_time = Date.now() - start_time;

			let status: 'healthy' | 'warning' | 'error' = 'healthy';

			// Check response status
			if (response.status >= 400) {
				status = 'error';
				issues.push(`HTTP ${response.status}: ${response.statusText}`);
			} else if (response.status >= 300) {
				status = 'warning';
				issues.push(`Redirect: ${response.status}`);
			}

			// Check response time
			if (response_time > 10000) {
				status = status === 'error' ? 'error' : 'warning';
				issues.push(`Slow response time: ${response_time}ms`);
				suggestions.push('Consider caching or finding alternative source');
			}

			// Check if content has been modified
			const last_modified = response.headers.get('last-modified');
			const etag = response.headers.get('etag');

			if (last_modified) {
				const modified_date = new Date(last_modified);
				if (modified_date > source.lastChecked) {
					status = status === 'error' ? 'error' : 'warning';
					issues.push('Content may have been updated');
					suggestions.push('Consider refreshing source content');
				}
			}

			return {
				sourceId: sourceId,
				url: source.url,
				status,
				lastChecked: new Date(),
				responseTime: response_time,
				issues,
				suggestions
			};
		} catch (error) {
			return {
				sourceId: sourceId,
				url: source.url,
				status: 'error',
				lastChecked: new Date(),
				responseTime: Date.now() - start_time,
				issues: [`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`],
				suggestions: ['Check network connectivity', 'Verify URL is still valid']
			};
		}
	}

	/**
	 * Detect content changes
	 */
	async detectContentChanges(sourceId: string): Promise<ContentChangeDetection> {
		const source = await sourceManager.getSource(sourceId);
		if (!source) {
			throw new Error(`Source ${sourceId} not found`);
		}

		try {
			// Fetch current content
			const response = await this.makeRequest(source.url, 'GET');
			const current_content = await response.text();

			// Calculate content hash
			const current_hash = await this.calculateContentHash(current_content);
			const previous_hash = source.metadata.contentHash;

			// Basic change detection
			const has_changes = current_hash !== previous_hash;

			if (!has_changes) {
				return {
					sourceId,
					hasChanges: false,
					changes: {},
					confidence: 1.0,
					contentHash: current_hash,
					previousHash: previous_hash
				};
			}

			// Detailed change analysis
			const changes = this.analyzeContentChanges(source, current_content);

			return {
				sourceId,
				hasChanges: true,
				changes,
				confidence: 0.8, // TODO: Implement more sophisticated confidence scoring
				contentHash: current_hash,
				previousHash: previous_hash,
				lastModified: new Date(response.headers.get('last-modified') || Date.now())
			};
		} catch (error) {
			throw new Error(
				`Failed to detect changes for source ${sourceId}: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}
	}

	/**
	 * Refresh source content
	 */
	async refreshSource(sourceId: string): Promise<RefreshOperationResult> {
		const refreshed_at = new Date();

		try {
			const change_detection = await this.detectContentChanges(sourceId);

			if (!change_detection.hasChanges) {
				// Update last checked time
				const source = await sourceManager.getSource(sourceId);
				if (source) {
					source.lastChecked = refreshed_at;
					await sourceManager.updateSource(sourceId, { status: 'active' });
				}

				return {
					sourceId,
					success: true,
					updated: false,
					refreshedAt: refreshed_at,
					nextCheckAt: new Date(refreshed_at.getTime() + this.config.checkInterval)
				};
			}

			// Content has changed - need to re-fetch and process
			// This would typically involve calling the web content fetcher
			// For now, we'll just update the source status
			const source = await sourceManager.getSource(sourceId);
			if (source) {
				source.status = 'updated';
				source.lastChecked = refreshed_at;
				await sourceManager.updateSource(sourceId, { status: 'updated' });
			}

			return {
				sourceId,
				success: true,
				updated: true,
				changes: change_detection,
				refreshedAt: refreshed_at,
				nextCheckAt: new Date(refreshed_at.getTime() + this.config.checkInterval)
			};
		} catch (error) {
			return {
				sourceId,
				success: false,
				updated: false,
				error: error instanceof Error ? error.message : 'Unknown error',
				refreshedAt: refreshed_at
			};
		}
	}

	/**
	 * Batch refresh multiple sources
	 */
	async batchRefreshSources(sourceIds: string[]): Promise<RefreshOperationResult[]> {
		const results: RefreshOperationResult[] = [];

		for (const sourceId of sourceIds) {
			try {
				// Add rate limiting delay
				if (results.length > 0) {
					await this.delay(this.config.rateLimitDelay);
				}

				const result = await this.refreshSource(sourceId);
				results.push(result);
			} catch (error) {
				results.push({
					sourceId,
					success: false,
					updated: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					refreshedAt: new Date()
				});
			}
		}

		return results;
	}

	/**
	 * Schedule automatic refresh for sources
	 */
	async scheduleAutoRefresh(): Promise<void> {
		const sources = await sourceManager.getAllSources();
		const now = new Date();

		const sources_to_refresh = sources.filter((source) => {
			const time_since_last_check = now.getTime() - source.lastChecked.getTime();
			return time_since_last_check >= this.config.checkInterval;
		});

		if (sources_to_refresh.length > 0) {
			const source_ids = sources_to_refresh.map((s) => s.id);
			await this.batchRefreshSources(source_ids);
		}
	}

	/**
	 * Make HTTP request with proper headers and error handling
	 */
	private async makeRequest(url: string, method: 'GET' | 'HEAD'): Promise<Response> {
		const controller = new AbortController();
		const timeout_id = setTimeout(() => controller.abort(), this.config.timeout);

		try {
			const response = await fetch(url, {
				method,
				headers: {
					'User-Agent': this.config.userAgent,
					Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.5',
					'Accept-Encoding': 'gzip, deflate',
					'Cache-Control': 'no-cache'
				},
				signal: controller.signal
			});

			clearTimeout(timeout_id);
			return response;
		} catch (error) {
			clearTimeout(timeout_id);
			throw error;
		}
	}

	/**
	 * Calculate content hash for change detection
	 */
	private async calculateContentHash(content: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(content);
		const hash_buffer = await crypto.subtle.digest('SHA-256', data);
		const hash_array = Array.from(new Uint8Array(hash_buffer));
		return hash_array.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Analyze specific types of content changes
	 */
	private analyzeContentChanges(
		source: WebContentSource,
		currentContent: string
	): {
		title?: boolean;
		content?: boolean;
		metadata?: boolean;
		structure?: boolean;
	} {
		// This is a simplified implementation
		// In a real system, you'd want more sophisticated content analysis

		const changes: any = {};

		// Check if title changed (basic heuristic)
		const title_match = current_content.match(/<title[^>]*>([^<]+)<\/title>/i);
		const current_title = title_match ? title_match[1].trim() : '';
		if (current_title && current_title !== source.title) {
			changes.title = true;
		}

		// For now, assume content changed if we got here
		changes.content = true;

		return changes;
	}

	/**
	 * Utility function for delays
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}

// Export singleton instance
export const contentUpdateDetector = ContentUpdateDetector.getInstance();
