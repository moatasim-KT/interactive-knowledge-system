/**
 * Sync conflict resolution service
 */

import type { SyncConflict, SyncOperation } from '../types/sync.js';
import type { ContentModule, UserProgress, UserSettings } from '../types/index.js';

export interface ConflictResolutionStrategy {
	resolve(conflict: SyncConflict): Promise<any>;
}

export class ConflictResolver {
	private strategies: Map<string, ConflictResolutionStrategy> = new Map();

	constructor() {
		this.registerDefaultStrategies();
	}

	/**
	 * Register a conflict resolution strategy
	 */
	registerStrategy(conflictType: string, strategy: ConflictResolutionStrategy): void {
		this.strategies.set(conflictType, strategy);
	}

	/**
	 * Resolve a conflict using the appropriate strategy
	 */
	async resolveConflict(conflict: SyncConflict): Promise<any> {
		const strategy = this.strategies.get(conflict.conflictType);
		if (!strategy) {
			throw new Error(`No resolution strategy found for conflict type: ${conflict.conflictType}`);
		}

		const resolution = await strategy.resolve(conflict);
		conflict.resolved = true;
		return resolution;
	}

	/**
	 * Detect conflicts between local and remote data
	 */
	detectConflicts(operation: SyncOperation, remoteData: any): SyncConflict[] {
		const conflicts: SyncConflict[] = [];

		if (!remoteData) {
			// Remote data doesn't exist
			if (operation.type === 'update' || operation.type === 'delete') {
				conflicts.push({
					id: crypto.randomUUID(),
					operationId: operation.id,
					localData: operation.data,
					remoteData: null,
					conflictType: 'deleted_remotely',
					timestamp: new Date(),
					resolved: false
				});
			}
			return conflicts;
		}

		// Check for version conflicts
		if (this.hasVersionConflict(operation.data, remoteData)) {
			conflicts.push({
				id: crypto.randomUUID(),
				operationId: operation.id,
				localData: operation.data,
				remoteData,
				conflictType: 'version',
				timestamp: new Date(),
				resolved: false
			});
		}

		// Check for concurrent edits
		if (this.hasConcurrentEdit(operation.data, remoteData)) {
			conflicts.push({
				id: crypto.randomUUID(),
				operationId: operation.id,
				localData: operation.data,
				remoteData,
				conflictType: 'concurrent_edit',
				timestamp: new Date(),
				resolved: false
			});
		}

		return conflicts;
	}

	private hasVersionConflict(localData: any, remoteData: any): boolean {
		// Check if both have version information and they differ
		return (
			localData.metadata?.version !== undefined &&
			remoteData.metadata?.version !== undefined &&
			localData.metadata.version !== remoteData.metadata.version
		);
	}

	private hasConcurrentEdit(localData: any, remoteData: any): boolean {
		// Check if both have been modified recently (within same time window)
		const local_modified = new Date(localData.metadata?.modified || 0);
		const remote_modified = new Date(remoteData.metadata?.modified || 0);
		const time_diff = Math.abs(local_modified.getTime() - remote_modified.getTime());

		// Consider concurrent if modified within 5 minutes of each other
		return time_diff < 5 * 60 * 1000;
	}

	private registerDefaultStrategies(): void {
		// Version conflict strategy - use latest version
		this.registerStrategy('version', new LatestVersionStrategy());

		// Concurrent edit strategy - attempt three-way merge
		this.registerStrategy('concurrent_edit', new ThreeWayMergeStrategy());

		// Deleted remotely strategy - prompt user
		this.registerStrategy('deleted_remotely', new UserPromptStrategy());

		// Deleted locally strategy - use remote version
		this.registerStrategy('deleted_locally', new UseRemoteStrategy());
	}
}

/**
 * Strategy: Use the latest version based on timestamp
 */
class LatestVersionStrategy implements ConflictResolutionStrategy {
	async resolve(conflict: SyncConflict): Promise<any> {
		const local_modified = new Date(conflict.localData.metadata?.modified || 0);
		const remote_modified = new Date(conflict.remoteData.metadata?.modified || 0);

		return local_modified > remote_modified ? conflict.localData : conflict.remoteData;
	}
}

/**
 * Strategy: Attempt three-way merge for concurrent edits
 */
class ThreeWayMergeStrategy implements ConflictResolutionStrategy {
	async resolve(conflict: SyncConflict): Promise<any> {
		const { localData, remoteData } = conflict;

		// For content modules, merge non-conflicting fields
		if (this.isContentModule(localData)) {
			return this.mergeContentModule(localData, remoteData);
		}

		// For user progress, merge statistics
		if (this.isUserProgress(localData)) {
			return this.mergeUserProgress(localData, remoteData);
		}

		// For user settings, merge preferences
		if (this.isUserSettings(localData)) {
			return this.mergeUserSettings(localData, remoteData);
		}

		// Default: use latest version
		const local_modified = new Date(localData.metadata?.modified || 0);
		const remote_modified = new Date(remoteData.metadata?.modified || 0);
		return local_modified > remote_modified ? localData : remoteData;
	}

	private isContentModule(data: any): data is ContentModule {
		return data && typeof data.title === 'string' && Array.isArray(data.blocks);
	}

	private isUserProgress(data: any): data is UserProgress {
		return data && typeof data.moduleId === 'string' && typeof data.userId === 'string';
	}

	private isUserSettings(data: any): data is UserSettings {
		return data && typeof data.userId === 'string' && data.preferences;
	}

	private mergeContentModule(local: ContentModule, remote: ContentModule): ContentModule {
		// Use the version with more recent content changes
		const local_content_modified = Math.max(
			...local.blocks.map((b) => new Date(b.metadata?.modified || 0).getTime())
		);
		const remote_content_modified = Math.max(
			...remote.blocks.map((b) => new Date(b.metadata?.modified || 0).getTime())
		);

		const base_module = local_content_modified > remote_content_modified ? local : remote;

		// Merge analytics (sum up views, completions, etc.)
		const merged_analytics = {
			views: local.analytics.views + remote.analytics.views,
			completions: local.analytics.completions + remote.analytics.completions,
			averageScore: (local.analytics.averageScore + remote.analytics.averageScore) / 2,
			averageTime: (local.analytics.averageTime + remote.analytics.averageTime) / 2
		};

		// Merge tags (union of both sets)
		const merged_tags = Array.from(new Set([...local.metadata.tags, ...remote.metadata.tags]));

		return {
			...base_module,
			metadata: {
				...base_module.metadata,
				tags: merged_tags,
				modified: new Date(),
				version: Math.max(local.metadata.version, remote.metadata.version) + 1
			},
			analytics: merged_analytics
		};
	}

	private mergeUserProgress(local: UserProgress, remote: UserProgress): UserProgress {
		return {
			...local,
			// Use the best score
			score: Math.max(local.score || 0, remote.score || 0),
			// Sum time spent
			timeSpent: local.timeSpent + remote.timeSpent,
			// Use latest access time
			lastAccessed: new Date(Math.max(local.lastAccessed.getTime(), remote.lastAccessed.getTime())),
			// Sum attempts
			attempts: local.attempts + remote.attempts,
			// Merge notes
			notes:
				local.notes && remote.notes
					? `${local.notes}\n---\n${remote.notes}`
					: local.notes || remote.notes,
			// Use most advanced status
			status: this.getMostAdvancedStatus(local.status, remote.status)
		};
	}

	private mergeUserSettings(local: UserSettings, remote: UserSettings): UserSettings {
		return {
			...local,
			preferences: {
				...remote.preferences,
				...local.preferences // Local preferences take precedence
			},
			lastModified: new Date()
		};
	}

	private getMostAdvancedStatus(
		status1: string,
		status2: string
	): 'not-started' | 'in-progress' | 'completed' {
		const status_order = { 'not-started': 0, 'in-progress': 1, completed: 2 };
		const order1 = status_order[status1 as keyof typeof status_order] || 0;
		const order2 = status_order[status2 as keyof typeof status_order] || 0;

		const max_order = Math.max(order1, order2);
		return Object.keys(status_order)[max_order] as 'not-started' | 'in-progress' | 'completed';
	}
}

/**
 * Strategy: Prompt user for resolution
 */
class UserPromptStrategy implements ConflictResolutionStrategy {
	async resolve(conflict: SyncConflict): Promise<any> {
		// In a real implementation, this would show a UI dialog
		// For now, we'll use the local data as default
		console.warn('User prompt strategy not implemented, using local data');
		return conflict.localData;
	}
}

/**
 * Strategy: Use remote data
 */
class UseRemoteStrategy implements ConflictResolutionStrategy {
	async resolve(conflict: SyncConflict): Promise<any> {
		return conflict.remoteData;
	}
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();
