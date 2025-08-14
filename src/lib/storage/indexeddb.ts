/**
 * IndexedDB wrapper utilities for the Interactive Knowledge System
 */
import {
	DATABASE_NAME,
	DATABASE_VERSION,
	OBJECT_STORES,
	type DatabaseSchema,
	type VersionRecord
} from './database.js';

interface IndexConfig {
	readonly name: string;
	readonly keyPath: string | string[];
	readonly unique: boolean;
	readonly multiEntry?: boolean;
}

/**
 * IndexedDB wrapper class providing CRUD operations and versioning
 */
export class IndexedDBStorage {
	private db: IDBDatabase | null = null;
	private initPromise: Promise<void> | null = null;
	private get available(): boolean {
		return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
	}

	/**
	 * Initialize the database connection
	 */
	async init(): Promise<void> {
		if (this.initPromise) {
			return this.initPromise;
		}

		// If running in SSR/Node where indexedDB is unavailable, resolve immediately (no-op)
		if (!this.available) {
			this.initPromise = Promise.resolve();
			return this.initPromise;
		}

		this.initPromise = new Promise((resolve, reject) => {
			// Add timeout to prevent hanging in test environments
			const timeout = setTimeout(() => {
				reject(new Error('Database initialization timeout'));
			}, 5000);

			const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

			request.onerror = () => {
				clearTimeout(timeout);
				reject(new Error(`Failed to open database: ${request.error?.message}`));
			};

			request.onsuccess = () => {
				clearTimeout(timeout);
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;
				this.createObjectStores(db);
			};
		});

		return this.initPromise;
	}

	/**
	 * Create object stores and indexes during database upgrade
	 */
	private createObjectStores(db: IDBDatabase): void {
		Object.values(OBJECT_STORES).forEach((store_config) => {
			if (!db.objectStoreNames.contains(store_config.name)) {
				const store = db.createObjectStore(store_config.name, {
					keyPath: store_config.keyPath as string | string[]
				});

				// Create indexes
				store_config.indexes.forEach((index_config: IndexConfig) => {
					const keyPath = Array.isArray(index_config.keyPath)
						? [...index_config.keyPath]
						: index_config.keyPath;
					const options: IDBIndexParameters = {
						unique: index_config.unique
					};
					if ('multiEntry' in index_config) {
						(options as any).multiEntry = (index_config as any).multiEntry || false;
					}
					store.createIndex(index_config.name, keyPath as any, options);
				});
			}
		});
	}

	/**
	 * Ensure database is initialized
	 */
	private async ensureInitialized(): Promise<IDBDatabase> {
		// If IndexedDB is not available (SSR), short-circuit
		if (!this.available) {
			throw new Error('IndexedDB is not available in this environment');
		}
		// If initialization hasn't started or DB not ready, start it now
		if (!this.db) {
			await this.init();
		}
		if (!this.db) {
			throw new Error('Database not initialized');
		}
		return this.db;
	}

	/**
	 * Generic method to get a record by key
	 */
	async get<T extends keyof DatabaseSchema>(
		storeName: T,
		key: IDBValidKey
	): Promise<DatabaseSchema[T] | undefined> {
		if (!this.available) {
			// SSR fallback: nothing in DB
			return undefined;
		}
		const db = await this.ensureInitialized();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction([storeName as string], 'readonly');
			const store = transaction.objectStore(storeName as string);
			const request = store.get(key);

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Generic method to get all records from a store
	 */
	async getAll<T extends keyof DatabaseSchema>(
		storeName: T,
		query?: IDBValidKey | IDBKeyRange,
		count?: number
	): Promise<Array<DatabaseSchema[T]>> {
		if (!this.available) {
			return [];
		}
		const db = await this.ensureInitialized();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction([storeName as string], 'readonly');
			const store = transaction.objectStore(storeName as string);
			const request = store.getAll(query, count);

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Generic method to add a record with automatic versioning
	 */
	async add<T extends keyof DatabaseSchema>(
		storeName: T,
		data: DatabaseSchema[T],
		changeDescription?: string
	): Promise<void> {
		if (!this.available) {
			// No-op in SSR
			return;
		}
		const db = await this.ensureInitialized();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction([storeName as string, 'versions'], 'readwrite');
			const store = transaction.objectStore(storeName as string);
			const versions_store = transaction.objectStore('versions');

			// Add the main record
			const add_request = store.add(data);

			add_request.onsuccess = () => {
				// Create version record
				if (this.shouldVersion(storeName)) {
					const version_record = this.createVersionRecord(storeName, data, changeDescription);
					versions_store.add(version_record);
				}
			};

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	}

	/**
	 * Generic method to update a record with automatic versioning
	 */
	async put<T extends keyof DatabaseSchema>(
		storeName: T,
		data: DatabaseSchema[T],
		changeDescription?: string
	): Promise<void> {
		if (!this.available) {
			// No-op in SSR
			return;
		}
		const db = await this.ensureInitialized();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction([storeName as string, 'versions'], 'readwrite');
			const store = transaction.objectStore(storeName as string);
			const versions_store = transaction.objectStore('versions');

			// Update the main record
			const put_request = store.put(data);

			put_request.onsuccess = () => {
				// Create version record
				if (this.shouldVersion(storeName)) {
					const version_record = this.createVersionRecord(storeName, data, changeDescription);
					versions_store.add(version_record);
				}
			};

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	}

	/**
	 * Generic method to delete a record
	 */
	async delete<T extends keyof DatabaseSchema>(storeName: T, key: IDBValidKey): Promise<void> {
		if (!this.available) {
			// No-op in SSR
			return;
		}
		const db = await this.ensureInitialized();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction([storeName as string], 'readwrite');
			const store = transaction.objectStore(storeName as string);
			const request = store.delete(key);

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	}

	/**
	 * Search records using an index
	 */
	async searchByIndex<T extends keyof DatabaseSchema>(
		storeName: T,
		indexName: string,
		query: IDBValidKey | IDBKeyRange,
		count?: number
	): Promise<Array<DatabaseSchema[T]>> {
		if (!this.available) {
			return [];
		}
		const db = await this.ensureInitialized();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction([storeName as string], 'readonly');
			const store = transaction.objectStore(storeName as string);
			const index = store.index(indexName);
			const request = index.getAll(query, count);

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get version history for an entity
	 */
	async getVersionHistory(entityId: string, entityType: string): Promise<VersionRecord[]> {
		if (!this.available) {
			return [];
		}
		const db = await this.ensureInitialized();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(['versions'], 'readonly');
			const store = transaction.objectStore('versions');
			const index = store.index('entityId');
			const request = index.getAll(entityId);

			request.onsuccess = () => {
				const versions = request.result.filter((v) => v.entityType === entityType);
				versions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
				resolve(versions);
			};
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Get a specific version of an entity
	 */
	async getVersion(entityId: string, version: number): Promise<VersionRecord | undefined> {
		if (!this.available) {
			return undefined;
		}
		const db = await this.ensureInitialized();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(['versions'], 'readonly');
			const store = transaction.objectStore('versions');
			const index = store.index('entityVersion');
			const request = index.get([entityId, version]);

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Check if a store should have versioning enabled
	 */
	private shouldVersion(storeName: string): boolean {
		return ['modules', 'paths', 'settings'].includes(storeName);
	}

	/**
	 * Create a version record for an entity
	 */
	private createVersionRecord<T extends keyof DatabaseSchema>(
		storeName: T,
		data: DatabaseSchema[T],
		changeDescription?: string
	): VersionRecord {
		const entity_id = this.getEntityId(data);
		const version = this.getEntityVersion(data);

		return {
			id: `${entity_id}_v${version}_${Date.now()}`,
			entityType: storeName === 'modules' ? 'module' : storeName === 'paths' ? 'path' : 'settings',
			entityId: entity_id,
			version,
			data: structuredClone(data),
			timestamp: new Date(),
			changeDescription
		};
	}

	/**
	 * Extract entity ID from data
	 */
	private getEntityId(data: any): string {
		return data.id || data.userId || 'unknown';
	}

	/**
	 * Extract version number from data
	 */	private getEntityVersion(data: any): number {
		return data.metadata?.version || data.version || 1;
	}

	/**
	 * Close the database connection
	 */
	close(): void {
		if (this.db) {
			this.db.close();
			this.db = null;
			this.initPromise = null;
		}
	}
}

// Export singleton instance
export const storage = new IndexedDBStorage();