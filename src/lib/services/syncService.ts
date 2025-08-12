/**
 * Main synchronization service that orchestrates offline functionality
 */

import type { CloudSyncConfig } from '../types/sync';
import { networkService } from './networkService';
import { offlineQueue } from './offlineQueue';
import { cloudSyncService } from './cloudSyncService';
import { optimisticUpdateManager } from './optimisticUpdates';
import { appState, actions } from '../stores/appState.svelte.js';

export class SyncService {
	private static instance: SyncService;
	private initialized = false;

	private constructor() { }

	static getInstance(): SyncService {
		if (!SyncService.instance) {
			SyncService.instance = new SyncService();
		}
		return SyncService.instance;
	}

	/**
	 * Initialize the sync service
	 */
	async initialize(config?: CloudSyncConfig): Promise<void> {
		if (this.initialized) return;

		// Initialize network monitoring
		networkService.getNetworkStatus();

		// Set up network status effects
		this.setupNetworkEffects();

		// Initialize cloud sync if config provided
		if (config) {
			cloudSyncService.initialize(config);
		}

		// Optimize offline queue on startup
		await offlineQueue.optimizeQueue();

		this.initialized = true;

		// Show sync status notification
		actions.addNotification({
			type: 'info',
			message: 'Sync service initialized'
		});
	}

	/**
	 * Create content with optimistic updates
	 */
	async createContent(contentData: any): Promise<string> {
		const operation_id = await cloudSyncService.queueOperation(
			'create',
			'content',
			contentData.id,
			contentData,
			'high'
		);

		return operation_id;
	}

	/**
	 * Update content with optimistic updates
	 */
	async updateContent(contentId: string, updates: any): Promise<string> {
		const operation_id = await cloudSyncService.queueOperation(
			'update',
			'content',
			contentId,
			updates,
			'medium'
		);

		return operation_id;
	}

	/**
	 * Delete content with optimistic updates
	 */
	async deleteContent(contentId: string): Promise<string> {
		const operation_id = await cloudSyncService.queueOperation(
			'delete',
			'content',
			contentId,
			null,
			'high'
		);

		return operation_id;
	}

	/**
	 * Update user progress with optimistic updates
	 */
	async updateProgress(moduleId: string, progressData: any): Promise<string> {
		const operation_id = await cloudSyncService.queueOperation(
			'update',
			'progress',
			moduleId,
			progressData,
			'medium'
		);

		return operation_id;
	}

	/**
	 * Update user settings with optimistic updates
	 */
	async updateSettings(settingsData: any): Promise<string> {
		const operation_id = await cloudSyncService.queueOperation(
			'update',
			'settings',
			appState.user.id,
			settingsData,
			'low'
		);

		return operation_id;
	}

	/**
	 * Force sync now
	 */
	async syncNow(): Promise<void> {
		if (!networkService.isOnline()) {
			actions.addNotification({
				type: 'warning',
				message: 'Cannot sync while offline'
			});
			return;
		}

		try {
			const result = await cloudSyncService.sync();

			if (result.success) {
				actions.addNotification({
					type: 'success',
					message: `Synced ${result.operationsProcessed} operations`
				});
			} else {
				actions.addNotification({
					type: 'error',
					message: `Sync failed: ${result.errors.length} errors`
				});
			}

			// Handle conflicts
			if (result.conflicts.length > 0) {
				actions.addNotification({
					type: 'warning',
					message: `${result.conflicts.length} conflicts resolved automatically`
				});
			}
		} catch (error) {
			actions.addNotification({
				type: 'error',
				message: 'Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error')
			});
		}
	}

	/**
	 * Get comprehensive sync status
	 */
	getSyncStatus() {
		const cloud_status = cloudSyncService.getSyncStatus();
		const network_status = networkService.getNetworkStatus();
		const pending_updates = optimisticUpdateManager.getPendingUpdates();

		return {
			...cloud_status,
			networkStatus: network_status,
			pendingOptimisticUpdates: pending_updates.length,
			queueSize: offlineQueue.size(),
			canSync: network_status.isOnline && !cloud_status.isSyncing
		};
	}

	/**
	 * Clear all offline data (for testing/reset)
	 */
	async clearOfflineData(): Promise<void> {
		await offlineQueue.clear();
		optimisticUpdateManager.clearAll();

		actions.addNotification({
			type: 'info',
			message: 'Offline data cleared'
		});
	}

	/**
	 * Get offline queue statistics
	 */
	getOfflineStats() {
		const all_operations = offlineQueue.getAllOperations();
		const stats = {
			total: all_operations.length,
			byType: {} as Record<string, number>,
			byEntity: {} as Record<string, number>,
			oldestOperation: null as Date | null,
			newestOperation: null as Date | null
		};

		for (const op of all_operations) {
			// Count by type
			stats.byType[op.type] = (stats.byType[op.type] || 0) + 1;

			// Count by entity
			stats.byEntity[op.entity] = (stats.byEntity[op.entity] || 0) + 1;

			// Track oldest/newest
			if (!stats.oldestOperation || op.timestamp < stats.oldestOperation) {
				stats.oldestOperation = op.timestamp;
			}
			if (!stats.newestOperation || op.timestamp > stats.newestOperation) {
				stats.newestOperation = op.timestamp;
			}
		}

		return stats;
	}

	/**
	 * Setup reactive effects for network status
	 */
	private setupNetworkEffects(): void {
		// Monitor network status changes
		networkService.addListener((status) => {
			// Update app state
			actions.setOnlineStatus(status.isOnline);

			// Show notifications for status changes
			if (status.isOnline) {
				const queue_size = offlineQueue.size();
				if (queue_size > 0) {
					actions.addNotification({
						type: 'info',
						message: `Back online! ${queue_size} operations queued for sync`
					});
				}
			} else {
				actions.addNotification({
					type: 'warning',
					message: 'You are now offline. Changes will be synced when connection is restored.'
				});
			}
		});

		// Set up periodic queue optimization
		setInterval(
			async () => {
				if (offlineQueue.size() > 10) {
					await offlineQueue.optimizeQueue();
				}
			},
			5 * 60 * 1000
		); // Every 5 minutes
	}

	/**
	 * Cleanup resources
	 */
	destroy(): void {
		cloudSyncService.stopPeriodicSync();
		networkService.destroy();
		optimisticUpdateManager.clearAll();
		this.initialized = false;
	}
}

// Export singleton instance
export const syncService = SyncService.getInstance();
