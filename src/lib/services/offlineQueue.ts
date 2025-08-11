/**
 * Offline operation queue management
 */

import type { SyncOperation, OfflineQueueItem } from '../types/sync.js';
import { storage } from '../storage/indexeddb.js';

export class OfflineQueue {
	private static instance: OfflineQueue;
	private queue: Map<string, OfflineQueueItem> = new Map();
	private processing = false;
	private readonly QUEUE_STORE = 'offline_queue';

	private constructor() {
		this.loadQueue();
	}

	static getInstance(): OfflineQueue {
		if (!OfflineQueue.instance) {
			OfflineQueue.instance = new OfflineQueue();
		}
		return OfflineQueue.instance;
	}

	/**
	 * Add operation to offline queue
	 */
	async enqueue(
		operation: SyncOperation,
		priority: 'high' | 'medium' | 'low' = 'medium',
		dependencies: string[] = []
	): Promise<void> {
		const queue_item = {
			operation,
			priority,
			dependencies
		};

		this.queue.set(operation.id, queue_item);
		await this.persistQueue();
	}

	/**
	 * Remove operation from queue
	 */
	async dequeue(operationId: string): Promise<void> {
		this.queue.delete(operationId);
		await this.persistQueue();
	}

	/**
	 * Get next operations to process (respecting dependencies)
	 */
	getNextOperations(batch_size = 10): SyncOperation[] {
		const operations: SyncOperation[] = [];
		const processed = new Set<string>();

		// Sort by priority and timestamp
		const sorted_items = Array.from(this.queue.values()).sort((a, b) => {
			const priority_order = { high: 3, medium: 2, low: 1 };
			const priority_diff = priority_order[b.priority] - priority_order[a.priority];
			if (priority_diff !== 0) return priority_diff;

			return a.operation.timestamp.getTime() - b.operation.timestamp.getTime();
		});

		for (const item of sorted_items) {
			if (operations.length >= batch_size) break;

			// Check if all dependencies are satisfied
			const dependencies_satisfied = item.dependencies.every(
				(dep_id) => processed.has(dep_id) || !this.queue.has(dep_id)
			);

			if (dependencies_satisfied) {
				operations.push(item.operation);
				processed.add(item.operation.id);
			}
		}

		return operations;
	}

	/**
	 * Get all pending operations
	 */
	getAllOperations(): SyncOperation[] {
		return Array.from(this.queue.values()).map((item) => item.operation);
	}

	/**
	 * Get queue size
	 */
	size(): number {
		return this.queue.size;
	}

	/**
	 * Check if queue is empty
	 */
	isEmpty(): boolean {
		return this.queue.size === 0;
	}

	/**
	 * Clear all operations from queue
	 */
	async clear(): Promise<void> {
		this.queue.clear();
		await this.persistQueue();
	}

	/**
	 * Get operations by entity type
	 */
	getOperationsByEntity(entity: string): SyncOperation[] {
		return Array.from(this.queue.values())
			.filter((item) => item.operation.entity === entity)
			.map((item) => item.operation);
	}

	/**
	 * Get operations by entity ID
	 */
	getOperationsByEntityId(entityId: string): SyncOperation[] {
		return Array.from(this.queue.values())
			.filter((item) => item.operation.entityId === entityId)
			.map((item) => item.operation);
	}

	/**
	 * Update operation retry count
	 */
	async incrementRetryCount(operationId: string): Promise<boolean> {
		const item = this.queue.get(operationId);
		if (!item) return false;

		item.operation.retryCount++;

		// Remove if max retries exceeded
		if (item.operation.retryCount >= item.operation.maxRetries) {
			await this.dequeue(operationId);
			return false;
		}

		await this.persistQueue();
		return true;
	}

	/**
	 * Optimize queue by removing redundant operations
	 */
	async optimizeQueue(): Promise<void> {
		const entity_operations = new Map<string, OfflineQueueItem[]>();

		// Group operations by entity ID
		for (const item of this.queue.values()) {
			const key = `${item.operation.entity}:${item.operation.entityId}`;
			if (!entity_operations.has(key)) {
				entity_operations.set(key, []);
			}
			entity_operations.get(key)!.push(item);
		}

		// For each entity, keep only the latest operation of each type
		for (const [key, operations] of entity_operations) {
			if (operations.length <= 1) continue;

			// Sort by timestamp (newest first)
			operations.sort((a, b) => b.operation.timestamp.getTime() - a.operation.timestamp.getTime());

			// Keep track of operation types we've seen
			const seen_types = new Set<string>();
			const to_keep = new Set<string>();

			for (const item of operations) {
				const op_type = item.operation.type;

				// Special handling for create/update/delete sequences
				if (op_type === 'delete') {
					// Delete operation cancels all previous operations
					to_keep.clear();
					to_keep.add(item.operation.id);
					break;
				} else if (op_type === 'create' && seen_types.has('update')) {
					// If we have updates, we don't need the create
					continue;
				} else if (op_type === 'update' && !seen_types.has(op_type)) {
					// Keep the latest update
					to_keep.add(item.operation.id);
				} else if (op_type === 'create' && !seen_types.has('update')) {
					// Keep create if no updates
					to_keep.add(item.operation.id);
				}

				seen_types.add(op_type);
			}

			// Remove operations not in toKeep set
			for (const item of operations) {
				if (!to_keep.has(item.operation.id)) {
					this.queue.delete(item.operation.id);
				}
			}
		}

		await this.persistQueue();
	}

	/**
	 * Load queue from persistent storage
	 */
	private async loadQueue(): Promise<void> {
		try {
			const data = await storage.get(this.QUEUE_STORE, 'queue');
			if (data && data.items) {
				this.queue = new Map(
					data.items.map((item: OfflineQueueItem) => [
						item.operation.id,
						{
							...item,
							operation: {
								...item.operation,
								timestamp: new Date(item.operation.timestamp)
							}
						}
					])
				);
			}
		} catch (error) {
			console.error('Failed to load offline queue:', error);
		}
	}

	/**
	 * Persist queue to storage
	 */
	private async persistQueue(): Promise<void> {
		try {
			const items = Array.from(this.queue.values());
			await storage.put(this.QUEUE_STORE, {
				id: 'queue',
				items,
				lastUpdated: new Date()
			});
		} catch (error) {
			console.error('Failed to persist offline queue:', error);
		}
	}
}

// Export singleton instance
export const offlineQueue = OfflineQueue.getInstance();
