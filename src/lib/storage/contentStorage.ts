/**
 * Content-specific storage operations
 */
import { storage } from './indexeddb.js';
import type { ContentModule } from '../types/content.js';
import type { LearningPath } from '../types/knowledge.js';

/**
 * Content module storage operations
 */
export class ContentStorage {
	/**
	 * Create a new content module
	 */
	async createModule(module: ContentModule): Promise<ContentModule> {
		const now = new Date();
		const fullModule = {
			...module,
			metadata: {
				author: 'current-user', // TODO: Get from user context
				created: now,
				modified: now,
				version: 1,
				difficulty: module.metadata?.difficulty || 1,
				estimatedTime: module.metadata?.estimatedTime || 0,
				prerequisites: module.metadata?.prerequisites || [],
				tags: module.metadata?.tags || [],
				language: module.metadata?.language || 'en'
			}
		};

		await storage.add('modules', fullModule, 'Initial creation');
		return fullModule;
	}

	/**
	 * Get a content module by ID
	 */
	async getModule(id: string): Promise<ContentModule | undefined> {
		return await storage.get('modules', id);
	}

	/**
	 * Get all content modules
	 */
	async getAllModules(): Promise<ContentModule[]> {
		return await storage.getAll('modules');
	}

	/**
	 * Update a content module
	 */
	async updateModule(module: ContentModule, changeDescription?: string): Promise<void> {
		const updatedModule = {
			...module,
			metadata: {
				...module.metadata,
				modified: new Date(),
				version: module.metadata.version + 1
			}
		};

		await storage.put('modules', updatedModule, changeDescription || 'Module updated');
	}

	/**
	 * Delete a content module
	 */
	async deleteModule(id: string): Promise<void> {
		await storage.delete('modules', id);
	}

	/**
	 * Search modules by title
	 */
	async searchModulesByTitle(title: string): Promise<ContentModule[]> {
		const allModules = await storage.getAll('modules');
		return allModules.filter((module) => module.title.toLowerCase().includes(title.toLowerCase()));
	}

	/**
	 * Search modules by tags
	 */
	async searchModulesByTag(tag: string): Promise<ContentModule[]> {
		return await storage.searchByIndex('modules', 'tags', tag);
	}

	/**
	 * Search modules by author
	 */
	async searchModulesByAuthor(author: string): Promise<ContentModule[]> {
		return await storage.searchByIndex('modules', 'author', author);
	}

	/**
	 * Search modules by difficulty
	 */
	async searchModulesByDifficulty(difficulty: number): Promise<ContentModule[]> {
		return await storage.searchByIndex('modules', 'difficulty', difficulty);
	}

	/**
	 * Get modules created within a date range
	 */
	async getModulesByDateRange(startDate: Date, endDate: Date): Promise<ContentModule[]> {
		const range = IDBKeyRange.bound(startDate, endDate);
		return await storage.searchByIndex('modules', 'created', range);
	}

	/**
	 * Get module version history
	 */
	async getModuleHistory(moduleId: string) {
		return await storage.getVersionHistory(moduleId, 'module');
	}

	/**
	 * Get a specific version of a module
	 */
	async getModuleVersion(moduleId: string, version: number) {
		return await storage.getVersion(moduleId, version);
	}

	/**
	 * Restore a module to a previous version
	 */
	async restoreModuleVersion(moduleId: string, version: number): Promise<void> {
		const versionRecord = await storage.getVersion(moduleId, version);
		if (!versionRecord) {
			throw new Error(`Version ${version} not found for module ${moduleId}`);
		}

		const restoredModule = {
			...versionRecord.data,
			metadata: {
				...versionRecord.data.metadata,
				modified: new Date(),
				version: versionRecord.data.metadata.version + 1
			}
		};

		await storage.put('modules', restoredModule, `Restored to version ${version}`);
	}
}

/**
 * Learning path storage operations
 */
export class PathStorage {
	/**
	 * Create a new learning path
	 */
	async createPath(path: LearningPath): Promise<void> {
		await storage.add('paths', path, 'Initial creation');
	}

	/**
	 * Get a learning path by ID
	 */
	async getPath(id: string): Promise<LearningPath | undefined> {
		return await storage.get('paths', id);
	}

	/**
	 * Get all learning paths
	 */
	async getAllPaths(): Promise<LearningPath[]> {
		return await storage.getAll('paths');
	}

	/**
	 * Update a learning path
	 */
	async updatePath(path: LearningPath, changeDescription?: string): Promise<void> {
		await storage.put('paths', path, changeDescription || 'Path updated');
	}

	/**
	 * Delete a learning path
	 */
	async deletePath(id: string): Promise<void> {
		await storage.delete('paths', id);
	}

	/**
	 * Search paths by name
	 */
	async searchPathsByName(name: string): Promise<LearningPath[]> {
		const allPaths = await storage.getAll('paths');
		return allPaths.filter((path) => path.name.toLowerCase().includes(name.toLowerCase()));
	}

	/**
	 * Search paths by difficulty
	 */
	async searchPathsByDifficulty(difficulty: number): Promise<LearningPath[]> {
		return await storage.searchByIndex('paths', 'difficulty', difficulty);
	}
}

// Export singleton instances
export const contentStorage = new ContentStorage();
export const pathStorage = new PathStorage();
