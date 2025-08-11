/**
 * Media storage management using IndexedDB
 */

import type { MediaFile, MediaStorageQuota } from '$lib/types/media.js';

const DB_NAME = 'InteractiveKnowledgeMedia';
const DB_VERSION = 1;
const MEDIA_STORE = 'media';
const METADATA_STORE = 'metadata';

class MediaStorage {
	private db: IDBDatabase | null = null;

	/**
	 * Initialize the media storage database
	 */
	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// Create media store for actual file data
				if (!db.objectStoreNames.contains(MEDIA_STORE)) {
					const media_store = db.createObjectStore(MEDIA_STORE, { keyPath: 'id' });
					media_store.createIndex('type', 'type', { unique: false });
					media_store.createIndex('created', 'metadata.created', { unique: false });
				}

				// Create metadata store for file information
				if (!db.objectStoreNames.contains(METADATA_STORE)) {
					const metadata_store = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
					metadata_store.createIndex('name', 'name', { unique: false });
					metadata_store.createIndex('type', 'type', { unique: false });
					metadata_store.createIndex('size', 'size', { unique: false });
				}
			};
		});
	}

	/**
	 * Store a media file
	 */
	async storeMedia(mediaFile: MediaFile, data: ArrayBuffer | string): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([MEDIA_STORE, METADATA_STORE], 'readwrite');
			const media_store = transaction.objectStore(MEDIA_STORE);
			const metadata_store = transaction.objectStore(METADATA_STORE);

			// Store the actual file data
			const media_request = media_store.put({
				id: mediaFile.id,
				data: data
			});

			// Store the metadata
			const metadata_request = metadata_store.put(mediaFile);

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	}

	/**
	 * Retrieve a media file
	 */
	async getMedia(id: string): Promise<{ file: MediaFile; data: ArrayBuffer | string } | null> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([MEDIA_STORE, METADATA_STORE], 'readonly');
			const media_store = transaction.objectStore(MEDIA_STORE);
			const metadata_store = transaction.objectStore(METADATA_STORE);

			let media_data = null;
			let metadata: MediaFile | null = null;

			const media_request = media_store.get(id);
			const metadata_request = metadata_store.get(id);

			media_request.onsuccess = () => {
				media_data = media_request.result?.data || null;
				check_complete();
			};

			metadata_request.onsuccess = () => {
				metadata = metadata_request.result || null;
				check_complete();
			};

			function check_complete() {
				if (media_data !== null && metadata !== null) {
					if (media_data && metadata) {
						resolve({ file: metadata, data: media_data });
					} else {
						resolve(null);
					}
				}
			}

			transaction.onerror = () => reject(transaction.error);
		});
	}

	/**
	 * List all media files
	 */
	async listMedia(type?: string): Promise<MediaFile[]> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([METADATA_STORE], 'readonly');
			const store = transaction.objectStore(METADATA_STORE);

			let request: IDBRequest;
			if (type) {
				const index = store.index('type');
				request = index.getAll(type);
			} else {
				request = store.getAll();
			}

			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Delete a media file
	 */
	async deleteMedia(id: string): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([MEDIA_STORE, METADATA_STORE], 'readwrite');
			const media_store = transaction.objectStore(MEDIA_STORE);
			const metadata_store = transaction.objectStore(METADATA_STORE);

			media_store.delete(id);
			metadata_store.delete(id);

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	}

	/**
	 * Get storage quota information
	 */
	async getStorageQuota(): Promise<MediaStorageQuota> {
		if ('storage' in navigator && 'estimate' in navigator.storage) {
			const estimate = await navigator.storage.estimate();
			return {
				used: estimate.usage || 0,
				total: estimate.quota || 0,
				available: (estimate.quota || 0) - (estimate.usage || 0)
			};
		}

		// Fallback for browsers without storage API
		return {
			used: 0,
			total: 0,
			available: 0
		};
	}

	/**
	 * Clean up old or unused media files
	 */
	async cleanup(older_than_days = 30): Promise<number> {
		if (!this.db) throw new Error('Database not initialized');

		const cutoff_date = new Date();
		cutoff_date.setDate(cutoff_date.getDate() - older_than_days);

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([MEDIA_STORE, METADATA_STORE], 'readwrite');
			const metadata_store = transaction.objectStore(METADATA_STORE);
			const media_store = transaction.objectStore(MEDIA_STORE);

			const index = metadata_store.index('created');
			const range = IDBKeyRange.upperBound(cutoff_date);
			const request = index.openCursor(range);

			let deleted_count = 0;

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest).result;
				if (cursor) {
					const media_file = cursor.value as MediaFile;

					// Delete from both stores
					media_store.delete(media_file.id);
					metadata_store.delete(media_file.id);
					deleted_count++;

					cursor.continue();
				}
			};

			transaction.oncomplete = () => resolve(deleted_count);
			transaction.onerror = () => reject(transaction.error);
		});
	}

	/**
	 * Close the database connection
	 */
	close(): void {
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}
}

// Export singleton instance
export const mediaStorage = new MediaStorage();
