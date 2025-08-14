/**
 * Storage Service
 * Provides persistent storage using IndexedDB for web content sourcing
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
	WebContentSource,
	WebContent,
	BatchProcessingJob,

} from '../types/web-content.js';

interface WebContentDB extends DBSchema {
	sources: {
		key: string;
		value: WebContentSource;
		indexes: { 'by-domain': string; 'by-category': string; 'by-status': string };
	};
	content: {
		key: string;
		value: WebContent;
		indexes: { 'by-url': string; 'by-domain': string };
	};
	jobs: {
		key: string;
		value: BatchProcessingJob;
		indexes: { 'by-status': string; 'by-created': Date };
	};
	templates: {
		key: string;
		value: ContentTemplate;
		indexes: { 'by-type': string; 'by-category': string };
	};
	settings: {
		key: string;
		value: any;
	};
}

export class StorageService {
	private db: IDBPDatabase<WebContentDB> | null = null;
	private readonly dbName = 'web-content-sourcing';
	private readonly version = 1;

	async initialize(): Promise<void> {
		this.db = await openDB<WebContentDB>(this.dbName, this.version, {
			upgrade(db) {
				// Sources store
				const sources_store = db.createObjectStore('sources', { keyPath: 'id' });
				sources_store.createIndex('by-domain', 'domain');
				sources_store.createIndex('by-category', 'metadata.category');
				sources_store.createIndex('by-status', 'status');

				// Content store
				const content_store = db.createObjectStore('content', { keyPath: 'id' });
				content_store.createIndex('by-url', 'url');
				content_store.createIndex('by-domain', 'metadata.domain');

				// Jobs store
				const jobs_store = db.createObjectStore('jobs', { keyPath: 'id' });
				jobs_store.createIndex('by-status', 'status');
				jobs_store.createIndex('by-created', 'createdAt');

				// Templates store
				const templates_store = db.createObjectStore('templates', { keyPath: 'id' });
				templates_store.createIndex('by-type', 'type');
				templates_store.createIndex('by-category', 'category');

				// Settings store
				db.createObjectStore('settings', { keyPath: 'key' });
			}
		});
	}

	private ensureDB(): IDBPDatabase<WebContentDB> {
		if (!this.db) {
			throw new Error('Database not initialized. Call initialize() first.');
		}
		return this.db;
	}

	// Sources operations
	async addSource(source: WebContentSource): Promise<void> {
		const db = this.ensureDB();
		await db.add('sources', source);
	}

	async updateSource(source: WebContentSource): Promise<void> {
		const db = this.ensureDB();
		await db.put('sources', source);
	}

	async getSource(id: string): Promise<WebContentSource | undefined> {
		const db = this.ensureDB();
		return await db.get('sources', id);
	}

	async getAllSources(): Promise<WebContentSource[]> {
		const db = this.ensureDB();
		return await db.getAll('sources');
	}

	async getSourcesByDomain(domain: string): Promise<WebContentSource[]> {
		const db = this.ensureDB();
		return await db.getAllFromIndex('sources', 'by-domain', domain);
	}

	async getSourcesByCategory(category: string): Promise<WebContentSource[]> {
		const db = this.ensureDB();
		return await db.getAllFromIndex('sources', 'by-category', category);
	}

	async getSourcesByStatus(status: string): Promise<WebContentSource[]> {
		const db = this.ensureDB();
		return await db.getAllFromIndex('sources', 'by-status', status);
	}

	async deleteSource(id: string): Promise<void> {
		const db = this.ensureDB();
		await db.delete('sources', id);
	}

	// Content operations
	async addContent(content: WebContent): Promise<void> {
		const db = this.ensureDB();
		await db.add('content', content);
	}

	async updateContent(content: WebContent): Promise<void> {
		const db = this.ensureDB();
		await db.put('content', content);
	}

	async getContent(id: string): Promise<WebContent | undefined> {
		const db = this.ensureDB();
		return await db.get('content', id);
	}

	async getContentByUrl(url: string): Promise<WebContent | undefined> {
		const db = this.ensureDB();
		return await db.getFromIndex('content', 'by-url', url);
	}

	async getAllContent(): Promise<WebContent[]> {
		const db = this.ensureDB();
		return await db.getAll('content');
	}

	async deleteContent(id: string): Promise<void> {
		const db = this.ensureDB();
		await db.delete('content', id);
	}

	// Jobs operations
	async addJob(job: BatchProcessingJob): Promise<void> {
		const db = this.ensureDB();
		await db.add('jobs', job);
	}

	async updateJob(job: BatchProcessingJob): Promise<void> {
		const db = this.ensureDB();
		await db.put('jobs', job);
	}

	async getJob(id: string): Promise<BatchProcessingJob | undefined> {
		const db = this.ensureDB();
		return await db.get('jobs', id);
	}

	async getJobsByStatus(status: string): Promise<BatchProcessingJob[]> {
		const db = this.ensureDB();
		return await db.getAllFromIndex('jobs', 'by-status', status);
	}

	async getAllJobs(): Promise<BatchProcessingJob[]> {
		const db = this.ensureDB();
		return await db.getAll('jobs');
	}

	async deleteJob(id: string): Promise<void> {
		const db = this.ensureDB();
		await db.delete('jobs', id);
	}

	// Templates operations
	async addTemplate(template: ContentTemplate): Promise<void> {
		const db = this.ensureDB();
		await db.add('templates', template);
	}

	async updateTemplate(template: ContentTemplate): Promise<void> {
		const db = this.ensureDB();
		await db.put('templates', template);
	}

	async getTemplate(id: string): Promise<ContentTemplate | undefined> {
		const db = this.ensureDB();
		return await db.get('templates', id);
	}

	async getTemplatesByType(type: string): Promise<ContentTemplate[]> {
		const db = this.ensureDB();
		return await db.getAllFromIndex('templates', 'by-type', type);
	}

	async getAllTemplates(): Promise<ContentTemplate[]> {
		const db = this.ensureDB();
		return await db.getAll('templates');
	}

	async deleteTemplate(id: string): Promise<void> {
		const db = this.ensureDB();
		await db.delete('templates', id);
	}

	// Settings operations
	async setSetting(key: string, value: any): Promise<void> {
		const db = this.ensureDB();
		await db.put('settings', { key, value });
	}

	async getSetting(key: string): Promise<any> {
		const db = this.ensureDB();
		const result = await db.get('settings', key);
		return result?.value;
	}

	async deleteSetting(key: string): Promise<void> {
		const db = this.ensureDB();
		await db.delete('settings', key);
	}

	// Utility operations
	async clear(): Promise<void> {
		const db = this.ensureDB();
		const tx = db.transaction(['sources', 'content', 'jobs', 'templates', 'settings'], 'readwrite');
		await Promise.all([
			tx.objectStore('sources').clear(),
			tx.objectStore('content').clear(),
			tx.objectStore('jobs').clear(),
			tx.objectStore('templates').clear(),
			tx.objectStore('settings').clear()
		]);
		await tx.done;
	}

	async getStats(): Promise<{
		sources: number;
		content: number;
		jobs: number;
		templates: number;
	}> {
		const db = this.ensureDB();
		const [sources, content, jobs, templates] = await Promise.all([
			db.count('sources'),
			db.count('content'),
			db.count('jobs'),
			db.count('templates')
		]);

		return { sources, content, jobs, templates };
	}
}

// Singleton instance
export const storageService = new StorageService();

// Define ContentTemplate interface if not already defined
export interface ContentTemplate {
	id: string;
	name: string;
	description: string;
	type: 'content' | 'visualization' | 'simulation' | 'quiz';
	category: string;
	config: any;
	variables: Record<string, any>;
	createdAt: Date;
	updatedAt: Date;
	usageCount: number;
}
