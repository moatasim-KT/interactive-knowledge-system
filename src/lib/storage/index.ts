/**
 * Storage layer exports
 */

// Core storage
export { IndexedDBStorage, storage } from './indexeddb.js';
import { storage } from './indexeddb.js';
export {
	DATABASE_NAME,
	DATABASE_VERSION,
	OBJECT_STORES,
	type DatabaseSchema,
	type VersionRecord
} from './database.js';

// Content storage
export { ContentStorage, PathStorage, contentStorage, pathStorage } from './contentStorage.js';

// User storage
export {
	ProgressStorage,
	SettingsStorage,
	progressStorage,
	settingsStorage
} from './userStorage.js';

// Relationship storage
export { RelationshipStorage, relationshipStorage } from './relationshipStorage.js';

// Media storage
export { mediaStorage } from './mediaStorage.js';


/**
 * Initialize all storage systems
 */
export async function initializeStorage(): Promise<void> {
	await storage.init();
}

/**
 * Close all storage connections
 */
export function closeStorage(): void {
	storage.close();
}
