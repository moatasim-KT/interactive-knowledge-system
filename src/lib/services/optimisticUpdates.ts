/**
 * Optimistic UI updates with rollback capability
 */

import type { SyncOperation } from '../types/sync.js';
import { appState, actions } from '../stores/appState.svelte.js';

interface OptimisticUpdate {
	id: string;
	operationId: string;
	entity: string;
	entityId: string;
	previousState: any;
	newState: any;
	timestamp: Date;
	applied: boolean;
}

export class OptimisticUpdateManager {
	private static instance: OptimisticUpdateManager;
	private updates: Map<string, OptimisticUpdate> = new Map();
	private rollbackCallbacks: Map<string, () => void> = new Map();

	private constructor() {}

	static getInstance(): OptimisticUpdateManager {
		if (!OptimisticUpdateManager.instance) {
			OptimisticUpdateManager.instance = new OptimisticUpdateManager();
		}
		return OptimisticUpdateManager.instance;
	}

	/**
	 * Apply optimistic update to UI
	 */
	applyOptimisticUpdate(operation: SyncOperation): string {
		const update_id = crypto.randomUUID();
		const previous_state = this.captureCurrentState(operation.entity, operation.entityId);

		// Apply the update to the UI state
		this.applyUpdateToState(operation);

		// Store the update for potential rollback
		const update: OptimisticUpdate = {
			id: update_id,
			operationId: operation.id,
			entity: operation.entity,
			entityId: operation.entityId,
			previousState: previous_state,
			newState: operation.data,
			timestamp: new Date(),
			applied: true
		};

		this.updates.set(update_id, update);

		// Set up rollback callback
		this.rollbackCallbacks.set(update_id, () => {
			this.rollbackUpdate(update_id);
		});

		return update_id;
	}

	/**
	 * Confirm optimistic update (remove from rollback list)
	 */
	confirmUpdate(updateId: string): void {
		const update = this.updates.get(updateId);
		if (update) {
			this.updates.delete(updateId);
			this.rollbackCallbacks.delete(updateId);
		}
	}

	/**
	 * Rollback optimistic update
	 */
	rollbackUpdate(updateId: string): void {
		const update = this.updates.get(updateId);
		if (!update || !update.applied) {return;}

		// Restore previous state
		this.restoreState(update.entity, update.entityId, update.previousState);

		// Mark as rolled back
		update.applied = false;

		// Show user notification
		actions.addNotification({
			type: 'warning',
			message: `Update to ${update.entity} failed and was rolled back`
		});
	}

	/**
	 * Rollback all updates for a specific operation
	 */
	rollbackOperation(operationId: string): void {
		for (const [update_id, update] of this.updates) {
			if (update.operationId === operationId) {
				this.rollbackUpdate(update_id);
			}
		}
	}

	/**
	 * Get all pending optimistic updates
	 */
	getPendingUpdates(): OptimisticUpdate[] {
		return Array.from(this.updates.values()).filter((update) => update.applied);
	}

	/**
	 * Clear all updates
	 */
	clearAll(): void {
		this.updates.clear();
		this.rollbackCallbacks.clear();
	}

	private captureCurrentState(entity: string, entityId: string): any {
		switch (entity) {
			case 'content':
				return appState.content.nodes.get(entityId);
			case 'progress':
				return appState.progress.userProgress.get(entityId);
			case 'settings':
				return appState.user.settings;
			default:
				return null;
		}
	}

	private applyUpdateToState(operation: SyncOperation): void {
		switch (operation.entity) {
			case 'content':
				this.applyContentUpdate(operation);
				break;
			case 'progress':
				this.applyProgressUpdate(operation);
				break;
			case 'settings':
				this.applySettingsUpdate(operation);
				break;
			case 'relationships':
				this.applyRelationshipUpdate(operation);
				break;
		}
	}

	private applyContentUpdate(operation: SyncOperation): void {
		switch (operation.type) {
			case 'create':
				actions.addKnowledgeNode(operation.data);
				break;
			case 'update':
				actions.updateKnowledgeNode(operation.entityId, operation.data);
				break;
			case 'delete':
				actions.removeKnowledgeNode(operation.entityId);
				break;
		}
	}

	private applyProgressUpdate(operation: SyncOperation): void {
		switch (operation.type) {
			case 'create':
			case 'update':
				actions.updateUserProgress(operation.entityId, operation.data);
				break;
			case 'delete':
				appState.progress.userProgress.delete(operation.entityId);
				break;
		}
	}

	private applySettingsUpdate(operation: SyncOperation): void {
		if (operation.type === 'update') {
			appState.user.settings = { ...appState.user.settings, ...operation.data };
		}
	}

	private applyRelationshipUpdate(operation: SyncOperation): void {
		// Relationship updates would be handled here
		// This depends on how relationships are stored in the app state
		console.log('Relationship update applied optimistically:', operation);
	}

	private restoreState(entity: string, entityId: string, previousState: any): void {
		if (!previousState) {return;}

		switch (entity) {
			case 'content':
				if (previousState) {
					actions.updateKnowledgeNode(entityId, previousState);
				} else {
					actions.removeKnowledgeNode(entityId);
				}
				break;
			case 'progress':
				if (previousState) {
					actions.updateUserProgress(entityId, previousState);
				} else {
					appState.progress.userProgress.delete(entityId);
				}
				break;
			case 'settings':
				appState.user.settings = previousState;
				break;
		}
	}
}

// Export singleton instance
export const optimisticUpdateManager = OptimisticUpdateManager.getInstance();
