/**
 * IndexedDB database schema and configuration
 */
import type { ContentModule } from '../types/content.js';
import type { UserProgress, UserSettings, LearningStreak, Achievement } from '../types/user.js';
import type { LearningPath } from '../types/knowledge.js';
import type { ContentLink } from '../types/relationships.js';

export const DATABASE_NAME = 'InteractiveKnowledgeSystem';
export const DATABASE_VERSION = 3;

/**
 * Database schema definition
 */
export interface DatabaseSchema {
	modules: ContentModule;
	progress: UserProgress;
	paths: LearningPath;
	settings: UserSettings;
	streaks: LearningStreak;
	achievements: Achievement;
	links: ContentLink;
	versions: VersionRecord;
	web_sources: import('../types/web-content.js').WebContentSource;
	offline_queue: OfflineQueueRecord;
	sync_conflicts: SyncConflict;
	content_recommendations: ContentRecommendation;
	integration_metrics: IntegrationMetrics;
}

/**
 * Additional minimal record types for auxiliary stores
 */
export interface OfflineQueueRecord {
    id: string;
    items: any[];
    lastUpdated: Date;
}

export interface SyncConflict {
    id: string;
    operationId: string;
    conflictType: string;
    timestamp: Date;
    resolved: boolean;
}

export interface ContentRecommendation {
    contentId: string;
    relatedContent: string[];
    lastUpdated: Date;
}

export interface IntegrationMetrics {
    totalImportedContent: number;
    automaticRelationshipsCreated: number;
    manualRelationshipsCreated: number;
    searchIndexEntries: number;
    learningPathsGenerated: number;
    averageIntegrationTime: number;
}

/**
 * Version record for tracking content history
 */
export interface VersionRecord {
	id: string;
	entityType: 'module' | 'path' | 'settings';
	entityId: string;
	version: number;
	data: any;
	timestamp: Date;
	changeDescription?: string;
}

/**
 * Object store configurations
 */
export const OBJECT_STORES = {
	modules: {
		name: 'modules',
		keyPath: 'id',
		indexes: [
			{ name: 'title', keyPath: 'title', unique: false },
			{ name: 'author', keyPath: 'metadata.author', unique: false },
			{ name: 'tags', keyPath: 'metadata.tags', unique: false, multiEntry: true },
			{ name: 'difficulty', keyPath: 'metadata.difficulty', unique: false },
			{ name: 'created', keyPath: 'metadata.created', unique: false }
		]
	},
	progress: {
		name: 'progress',
		keyPath: ['userId', 'moduleId'],
		indexes: [
			{ name: 'userId', keyPath: 'userId', unique: false },
			{ name: 'moduleId', keyPath: 'moduleId', unique: false },
			{ name: 'status', keyPath: 'status', unique: false },
			{ name: 'lastAccessed', keyPath: 'lastAccessed', unique: false }
		]
	},
	paths: {
		name: 'paths',
		keyPath: 'id',
		indexes: [
			{ name: 'name', keyPath: 'name', unique: false },
			{ name: 'difficulty', keyPath: 'difficulty', unique: false }
		]
	},
	settings: {
		name: 'settings',
		keyPath: 'id',
		indexes: []
	},
	streaks: {
		name: 'streaks',
		keyPath: 'userId',
		indexes: [
			{ name: 'currentStreak', keyPath: 'currentStreak', unique: false },
			{ name: 'lastActivityDate', keyPath: 'lastActivityDate', unique: false }
		]
	},
	achievements: {
		name: 'achievements',
		keyPath: 'id',
		indexes: [
			{ name: 'userId', keyPath: 'userId', unique: false },
			{ name: 'type', keyPath: 'type', unique: false },
			{ name: 'earnedAt', keyPath: 'earnedAt', unique: false }
		]
	},
	links: {
		name: 'links',
		keyPath: 'id',
		indexes: [
			{ name: 'sourceId', keyPath: 'sourceId', unique: false },
			{ name: 'targetId', keyPath: 'targetId', unique: false },
			{ name: 'type', keyPath: 'type', unique: false },
			{ name: 'strength', keyPath: 'strength', unique: false },
			{ name: 'created', keyPath: 'metadata.created', unique: false },
			{ name: 'automatic', keyPath: 'metadata.automatic', unique: false }
		]
	},
	versions: {
		name: 'versions',
		keyPath: 'id',
		indexes: [
			{ name: 'entityType', keyPath: 'entityType', unique: false },
			{ name: 'entityId', keyPath: 'entityId', unique: false },
			{ name: 'timestamp', keyPath: 'timestamp', unique: false },
			{ name: 'entityVersion', keyPath: ['entityId', 'version'], unique: true }
		]
	},
	offline_queue: {
		name: 'offline_queue',
		keyPath: 'id',
		indexes: [
			{ name: 'timestamp', keyPath: 'timestamp', unique: false },
			{ name: 'entity', keyPath: 'entity', unique: false },
			{ name: 'type', keyPath: 'type', unique: false },
			{ name: 'priority', keyPath: 'priority', unique: false }
		]
	},
	sync_conflicts: {
		name: 'sync_conflicts',
		keyPath: 'id',
		indexes: [
			{ name: 'operationId', keyPath: 'operationId', unique: false },
			{ name: 'conflictType', keyPath: 'conflictType', unique: false },
			{ name: 'timestamp', keyPath: 'timestamp', unique: false },
			{ name: 'resolved', keyPath: 'resolved', unique: false }
		]
	},
	web_sources: {
		name: 'web_sources',
		keyPath: 'id',
		indexes: [
			{ name: 'url', keyPath: 'url', unique: false },
			{ name: 'domain', keyPath: 'domain', unique: false },
			{ name: 'status', keyPath: 'status', unique: false },
			{ name: 'importDate', keyPath: 'importDate', unique: false },
			{ name: 'lastChecked', keyPath: 'lastChecked', unique: false },
			{ name: 'category', keyPath: 'metadata.category', unique: false },
			{ name: 'tags', keyPath: 'metadata.tags', unique: false, multiEntry: true },
			{ name: 'author', keyPath: 'metadata.author', unique: false },
			{ name: 'timesReferenced', keyPath: 'usage.timesReferenced', unique: false }
		]
	}
} as const;
