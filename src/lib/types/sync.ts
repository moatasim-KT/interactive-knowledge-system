/**
 * Types for offline functionality and synchronization
 */

export interface SyncOperation {
	id: string;
	type: 'create' | 'update' | 'delete';
	entity: 'content' | 'progress' | 'settings' | 'relationships';
	entityId: string;
	data: any;
	timestamp: Date;
	retryCount: number;
	maxRetries: number;
}

export interface SyncConflict {
	id: string;
	operationId: string;
	localData: any;
	remoteData: any;
	conflictType: 'version' | 'concurrent_edit' | 'deleted_remotely' | 'deleted_locally';
	timestamp: Date;
	resolved: boolean;
}

export interface SyncResult {
	success: boolean;
	operationsProcessed: number;
	conflicts: SyncConflict[];
	errors: SyncError[];
}

export interface SyncError {
	operationId: string;
	error: string;
	retryable: boolean;
	timestamp: Date;
}

export interface CloudSyncConfig {
	endpoint: string;
	apiKey?: string;
	userId: string;
	syncInterval: number; // milliseconds
	batchSize: number;
	retryDelay: number; // milliseconds
}

export interface OfflineQueueItem {
	operation: SyncOperation;
	priority: 'high' | 'medium' | 'low';
	dependencies: string[]; // operation IDs this depends on
}

export interface NetworkStatus {
	isOnline: boolean;
	connectionType?: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
	effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
	downlink?: number;
	rtt?: number;
}
