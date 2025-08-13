/**
 * Cloud synchronization service
 */

import type {
	SyncOperation,
	SyncResult,
	SyncConflict,
	SyncError,
	CloudSyncConfig
} from '../types/sync.js';
import { networkService } from './networkService.js';
import { offlineQueue } from './offlineQueue.js';
import { conflictResolver } from './conflictResolver.js';
import { optimisticUpdateManager } from './optimisticUpdates.js';
import { appState, actions } from '../stores/appState.svelte.js';

export class CloudSyncService {
	private static instance: CloudSyncService;
	private config: CloudSyncConfig | null = null;
	private syncInterval: number | null = null;
	private isSyncing = false;
	private lastSyncAttempt: Date | null = null;

	private constructor() {
		this.setupNetworkListener();
	}

	static getInstance(): CloudSyncService {
		if (!CloudSyncService.instance) {
			CloudSyncService.instance = new CloudSyncService();
		}
		return CloudSyncService.instance;
	}

	/**
	 * Initialize cloud sync with configuration
	 */
	initialize(config: CloudSyncConfig): void {
		this.config = config;
		this.startPeriodicSync();
	}

	/**
	 * Start periodic synchronization
	 */
	private startPeriodicSync(): void {
		if (!this.config || this.syncInterval || typeof window === 'undefined') {return;}

		this.syncInterval = window.setInterval(() => {
			if (networkService.isOnline() && !this.isSyncing) {
				this.sync();
			}
		}, this.config.syncInterval);
	}

	/**
	 * Stop periodic synchronization
	 */
	stopPeriodicSync(): void {
		if (this.syncInterval) {
			clearInterval(this.syncInterval);
			this.syncInterval = null;
		}
	}

	/**
	 * Perform full synchronization
	 */
	async sync(): Promise<SyncResult> {
		if (!this.config || this.isSyncing || !networkService.isOnline()) {
			return {
				success: false,
				operationsProcessed: 0,
				conflicts: [],
				errors: [
					{
						operationId: '',
						error: 'Sync not available',
						retryable: false,
						timestamp: new Date()
					}
				]
			};
		}

		this.isSyncing = true;
		actions.setSyncStatus(true);
		this.lastSyncAttempt = new Date();

		try {
			// Get operations to sync
			const operations = offlineQueue.getNextOperations(this.config.batchSize);

			if (operations.length === 0) {
				// No operations to sync, but check for remote changes
				await this.pullRemoteChanges();
				return {
					success: true,
					operationsProcessed: 0,
					conflicts: [],
					errors: []
				};
			}

			// Process operations in batches
			const result = await this.processSyncBatch(operations);

			// Remove successfully synced operations from queue
			for (const operation of operations) {
				const has_errors = result.errors.some((e) => e.operationId === operation.id);
				if (!has_errors) {
					await offlineQueue.dequeue(operation.id);
					optimisticUpdateManager.confirmUpdate(operation.id);
				}
			}

			return result;
		} catch (error) {
			console.error('Sync failed:', error);
			return {
				success: false,
				operationsProcessed: 0,
				conflicts: [],
				errors: [
					{
						operationId: '',
						error: error instanceof Error ? error.message : 'Unknown sync error',
						retryable: true,
						timestamp: new Date()
					}
				]
			};
		} finally {
			this.isSyncing = false;
			actions.setSyncStatus(false);
		}
	}

	/**
	 * Process a batch of sync operations
	 */
	private async processSyncBatch(operations: SyncOperation[]): Promise<SyncResult> {
		const result: SyncResult = {
			success: true,
			operationsProcessed: 0,
			conflicts: [],
			errors: []
		};

		for (const operation of operations) {
			try {
				const operation_result = await this.processSyncOperation(operation);
				result.operationsProcessed++;
				result.conflicts.push(...operation_result.conflicts);

				if (operation_result.conflicts.length > 0) {
					// Attempt to resolve conflicts
					for (const conflict of operation_result.conflicts) {
						try {
							const resolution = await conflictResolver.resolveConflict(conflict);
							// Apply resolved data
							await this.applyResolvedData(operation, resolution);
						} catch (conflictError) {
							result.errors.push({
								operationId: operation.id,
								error: `Conflict resolution failed: ${conflictError}`,
								retryable: false,
								timestamp: new Date()
							});
						}
					}
				}
			} catch (error) {
				result.success = false;
				result.errors.push({
					operationId: operation.id,
					error: error instanceof Error ? error.message : 'Unknown operation error',
					retryable: this.isRetryableError(error),
					timestamp: new Date()
				});

				// Increment retry count or remove from queue
				const can_retry = await offlineQueue.incrementRetryCount(operation.id);
				if (!can_retry) {
					// Max retries exceeded, rollback optimistic update
					optimisticUpdateManager.rollbackOperation(operation.id);
				}
			}
		}

		return result;
	}

	/**
	 * Process a single sync operation
	 */
	private async processSyncOperation(
		operation: SyncOperation
	): Promise<{ conflicts: SyncConflict[] }> {
		const endpoint = this.getEndpointForOperation(operation);
		const method = this.getHttpMethodForOperation(operation);

		// Get current remote data for conflict detection
		let remote_data = null;
		if (operation.type === 'update' || operation.type === 'delete') {
			remote_data = await this.fetchRemoteData(operation.entity, operation.entityId);
		}

		// Detect conflicts
		const conflicts = conflictResolver.detectConflicts(operation, remote_data);
		if (conflicts.length > 0) {
			return { conflicts };
		}

		// Send operation to server
		const response = await this.makeRequest(endpoint, {
			method,
			headers: {
				'Content-Type': 'application/json',
				...(this.config?.apiKey && { Authorization: `Bearer ${this.config.apiKey}` })
			},
			body:
				method !== 'DELETE'
					? JSON.stringify(operation.data)
					: undefined
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return { conflicts: [] };
	}

	/**
	 * Pull remote changes
	 */
	private async pullRemoteChanges(): Promise<void> {
		if (!this.config) {return;}

		const last_sync = appState.sync.lastSync?.toISOString() || new Date(0).toISOString();
		const endpoint = `${this.config.endpoint}/changes?since=${last_sync}&userId=${this.config.userId}`;

		try {
			const response = await this.makeRequest(endpoint, {
				method: 'GET',
				headers: {
					...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` })
				}
			});

			if (response.ok) {
				const changes = await response.json();
				await this.applyRemoteChanges(changes);
			}
		} catch (error) {
			console.error('Failed to pull remote changes:', error);
		}
	}

	/**
	 * Apply remote changes to local state
	 */
	private async applyRemoteChanges(changes: any[]): Promise<void> {
		for (const change of changes) {
			try {
				// Apply change based on entity type
				switch (change.entity) {
					case 'content':
						if (change.type === 'delete') {
							actions.removeKnowledgeNode(change.entityId);
						} else {
							actions.updateKnowledgeNode(change.entityId, change.data);
						}
						break;
					case 'progress':
						if (change.type === 'delete') {
							appState.progress.userProgress.delete(change.entityId);
						} else {
							actions.updateUserProgress(change.entityId, change.data);
						}
						break;
					case 'settings':
						if (change.type !== 'delete') {
							appState.user.settings = { ...appState.user.settings, ...change.data };
						}
						break;
				}
			} catch (error) {
				console.error('Failed to apply remote change:', error);
			}
		}
	}

	/**
	 * Apply resolved conflict data
	 */
	private async applyResolvedData(operation: SyncOperation, resolvedData: any): Promise<void> {
		// Update local state with resolved data
		switch (operation.entity) {
			case 'content':
				actions.updateKnowledgeNode(operation.entityId, resolvedData);
				break;
			case 'progress':
				actions.updateUserProgress(operation.entityId, resolvedData);
				break;
			case 'settings':
				appState.user.settings = { ...appState.user.settings, ...resolvedData };
				break;
		}

		// Send resolved data to server
		const endpoint = this.getEndpointForOperation(operation);
		await this.makeRequest(endpoint, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				...(this.config?.apiKey && { Authorization: `Bearer ${this.config.apiKey}` })
			},
			body: JSON.stringify({
				...operation,
				data: resolvedData,
				resolved: true
			})
		});
	}

	/**
	 * Fetch remote data for conflict detection
	 */
	private async fetchRemoteData(entity: string, entityId: string): Promise<any> {
		if (!this.config) {return null;}

		const endpoint = `${this.config.endpoint}/${entity}/${entityId}?userId=${this.config.userId}`;

		try {
			const response = await this.makeRequest(endpoint, {
				method: 'GET',
				headers: {
					...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` })
				}
			});

			return response.ok ? await response.json() : null;
		} catch {
			return null;
		}
	}

	/**
	 * Make HTTP request with retry logic
	 */
	private async makeRequest(url: string, options: RequestInit, retries = 3): Promise<Response> {
		for (let i = 0; i < retries; i++) {
			try {
				const response = await fetch(url, {
					...options,
					signal: AbortSignal.timeout(10000) // 10 second timeout
				});
				return response;
			} catch (error) {
				if (i === retries - 1) {throw error;}

				// Exponential backoff
				const delay = Math.min(1000 * Math.pow(2, i), 10000);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
		throw new Error('Max retries exceeded');
	}

	private getEndpointForOperation(operation: SyncOperation): string {
		if (!this.config) {throw new Error('Sync not configured');}

		if (operation.type === 'create') {
			return `${this.config.endpoint}/${operation.entity}?userId=${this.config.userId}`;
		} else {
			return `${this.config.endpoint}/${operation.entity}/${operation.entityId}?userId=${this.config.userId}`;
		}
	}

	private getHttpMethodForOperation(operation: SyncOperation): string {
		switch (operation.type) {
			case 'create':
				return 'POST';
			case 'update':
				return 'PUT';
			case 'delete':
				return 'DELETE';
			default:
				return 'PUT';
		}
	}

	private isRetryableError(error: any): boolean {
		// Network errors, timeouts, and 5xx errors are retryable
		return (
			error instanceof TypeError || // Network error
			error.name === 'AbortError' || // Timeout
			(error && typeof error.status === 'number' && error.status >= 500 && error.status < 600)
		); // Server error
	}

	private setupNetworkListener(): void {
		networkService.addListener((status) => {
			if (status.isOnline && !this.isSyncing && typeof window !== 'undefined') {
				// Trigger sync when coming back online
				setTimeout(() => this.sync(), 1000);
			}
		});
	}

	/**
	 * Queue operation for sync
	 */
	async queueOperation(
		type: 'create' | 'update' | 'delete',
		entity: 'content' | 'progress' | 'settings' | 'relationships',
		entityId: string,
		data: any,
		priority: 'high' | 'medium' | 'low' = 'medium'
	): Promise<string> {
		const operation: SyncOperation = {
			id: crypto.randomUUID(),
			type,
			entity,
			entityId: entity === 'settings' ? appState.user?.id || 'default-user' : entityId,
			data,
			timestamp: new Date(),
			retryCount: 0,
			maxRetries: 3
		};

		// Apply optimistic update
		const update_id = optimisticUpdateManager.applyOptimisticUpdate(operation);

		// Queue for sync
		await offlineQueue.enqueue(operation, priority);

		// Add to pending changes
		actions.addPendingChange(operation.id);

		// Trigger immediate sync if online
		if (networkService.isOnline() && !this.isSyncing && typeof window !== 'undefined') {
			setTimeout(() => this.sync(), 100);
		}

		return operation.id;
	}

	/**
	 * Get sync status
	 */
	getSyncStatus() {
		return {
			isOnline: networkService.isOnline(),
			isSyncing: this.isSyncing,
			lastSync: appState.sync.lastSync,
			pendingOperations: offlineQueue.size(),
			lastSyncAttempt: this.lastSyncAttempt
		};
	}
}

// Export singleton instance
export const cloudSyncService = CloudSyncService.getInstance();
