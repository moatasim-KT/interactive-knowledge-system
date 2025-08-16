/**
 * Data management service that coordinates export, import, migration, and backup operations
 */

import type {
	ContentModule,
	UserProgress,
	LearningPath,
	KnowledgeNode,
	UserSettings
} from '$lib/types/unified';
import {
	exportToJSON,
	exportToMarkdown,
	exportToSCORM,
	createBackup,
	type ExportData,
	type SCORMPackage
} from '../utils/exportUtils.js';
import {
	importFromJSON,
	importFromMarkdown,
	importFromFormat,
	type ImportResult,
	type MarkdownImportConfig
} from '../utils/importUtils.js';
import {
	migrateData,
	convertFormat,
	mergeExportData,
	validateDataIntegrity,
	cleanupOrphanedData,
	type MigrationResult
} from '../utils/migrationUtils.js';
import {
	BackupManager,
	createBackupManager,
	type BackupConfig,
	type BackupResult,
	type RestoreResult,
	type RestoreOptions,
	type BackupMetadata,
	DEFAULT_BACKUP_CONFIG
} from '../utils/backupUtils.js';
import { contentStorage, progressStorage, pathStorage, settingsStorage } from '../storage/index.js';
import { storage } from '../storage/indexeddb.js';

/**
 * Export options
 */
export interface ExportOptions {
	format: 'json' | 'markdown' | 'scorm' | 'csv';
	includeProgress: boolean;
	includeSettings: boolean;
	includeMedia: boolean;
	filename?: string;
	compression?: boolean;
}

/**
 * Import options
 */
export interface ImportOptions {
	format: 'json' | 'markdown' | 'opml' | 'csv' | 'xml';
	mergeWithExisting: boolean;
	overwriteExisting: boolean;
	createBackup: boolean;
	markdownConfig?: MarkdownImportConfig;
}

/**
 * Data management service class
 */
export class DataManagementService {
	private backupManager: BackupManager;

	constructor(backup_config = DEFAULT_BACKUP_CONFIG) {
		this.backupManager = createBackupManager(backup_config);
	}

	/**
	 * Export all data in specified format
	 */
	async exportData(
		options: ExportOptions
	): Promise<{ success: boolean; data?: string | Blob; error?: string }> {
		try {
			// Gather all data
			const modules = await contentStorage.getAllModules();
			// Get all progress for the current user (assuming userId is available in the context)
			// If userId is not available, you'll need to pass it to the exportData method
			const userId = 'current-user'; // TODO: Replace with actual user ID from auth context
			const progress = options.includeProgress ? await progressStorage.getUserProgress(userId) : [];
			const paths = await pathStorage.getAllPaths();
			const nodes: KnowledgeNode[] = []; // TODO: Implement knowledge node storage
			const settings = (await settingsStorage.getSettings(userId)) || this.getDefaultSettings();

			// Create export data structure
			const export_data = createBackup(modules, progress, paths, nodes, settings);

			// Convert to requested format
			let result: string | Blob;
			switch (options.format) {
				case 'json': {
					result = exportToJSON(export_data);
					break;
				}
				case 'markdown': {
					result = exportToMarkdown(export_data);
					break;
				}
				case 'scorm': {
					const scormPackage = exportToSCORM(export_data);
					result = this.createSCORMZip(scormPackage);
					break;
				}
				case 'csv': {
					result = convertFormat(export_data, 'csv');
					break;
				}
				default:
					throw new Error(`Unsupported export format: ${options.format}`);
			}

			return { success: true, data: result };
		} catch (error) {
			return {
				success: false,
				error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		}
	}

	/**
	 * Import data from file or string
	 */
	async importData(content: string | File, options: ImportOptions): Promise<ImportResult> {
		try {
			// Create backup if requested
			if (options.createBackup) {
				await this.backupManager.createBackup(
					`Pre-import backup ${new Date().toISOString()}`,
					'Automatic backup created before data import'
				);
			}

			// Parse content
			let content_string: string;
			if (content instanceof File) {
				content_string = await content.text();
			} else {
				content_string = content;
			}

			// Import based on format
			let import_result;
			switch (options.format) {
				case 'json': {
					import_result = importFromJSON(content_string);
					break;
				}
				case 'markdown': {
					const markdown_config = options.markdownConfig || {
						treatH1AsModule: true,
						treatH2AsSection: true,
						extractCodeBlocks: true,
						preserveFormatting: true,
						defaultDifficulty: 3,
						defaultEstimatedTime: 30
					};
					import_result = importFromMarkdown(content_string, markdown_config);
					break;
				}
				case 'opml':
				case 'csv':
				case 'xml': {
					import_result = importFromFormat(content_string, options.format);
					break;
				}
				default:
					throw new Error(`Unsupported import format: ${options.format}`);
			}

			// If import was successful, store the data
			if (import_result.success && import_result.data) {
				await this.storeImportedData(import_result.data, options);
			}

			return import_result;
		} catch (error) {
			return {
				success: false,
				errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
				warnings: [],
				stats: {
					modulesImported: 0,
					progressImported: 0,
					pathsImported: 0,
					nodesImported: 0
				}
			};
		}
	}

	/**
	 * Migrate data to current version
	 */
	async migrateToCurrentVersion(fromVersion: string): Promise<MigrationResult> {
		try {
			// Get all current data
			const modules = await storage.getAll('modules');
			const progress = await storage.getAll('progress');
			const paths = await storage.getAll('paths');
			const settings = (await storage.get('settings', 'user-settings')) || this.getDefaultSettings();

			const current_data = {
				version: fromVersion,
				modules,
				progress,
				paths,
				settings
			};

			// Perform migration
			const migration_result = migrateData(current_data, fromVersion);

			// If migration was successful, update stored data
			if (migration_result.success) {
				// Store migrated data back to storage
				// This would need to be implemented based on the actual storage layer
			}

			return migration_result;
		} catch (error) {
			return {
				success: false,
				fromVersion,
				toVersion: '1.2.0',
				migratedItems: 0,
				errors: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
				warnings: [],
				backupCreated: false
			};
		}
	}

	/**
	 * Create a backup
	 */
	async createBackup(name?: string, description?: string): Promise<BackupResult> {
		return this.backupManager.createBackup(name, description);
	}

	/**
	 * Restore from backup
	 */
	async restoreBackup(backupId: string, options: RestoreOptions): Promise<RestoreResult> {
		return this.backupManager.restoreBackup(backupId, options);
	}

	/**
	 * List all backups
	 */
	listBackups(): BackupMetadata[] {
		return this.backupManager.listBackups();
	}

	/**
	 * Delete a backup
	 */
	deleteBackup(backupId: string): boolean {
		return this.backupManager.deleteBackup(backupId);
	}

	/**
	 * Validate data integrity
	 */
	async validateDataIntegrity(): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
		try {
			const modules = await storage.getAll('modules');
			const progress = await storage.getAll('progress');
			const paths = await storage.getAll('paths');
			const settings = (await storage.get('settings', 'user-settings')) || this.getDefaultSettings();

			const export_data = {
				version: '1.2.0',
				exportDate: new Date(),
				modules,
				progress,
				paths,
				nodes: [],
				settings,
				metadata: {
					totalModules: modules.length,
					totalProgress: progress.length,
					exportFormat: 'validation'
				}
			};

			return validateDataIntegrity(export_data);
		} catch (error) {
			return {
				valid: false,
				errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
				warnings: []
			};
		}
	}

	/**
	 * Clean up orphaned data
	 */
	async cleanupOrphanedData(): Promise<{
		cleaned: boolean;
		removedItems: number;
		errors: string[];
	}> {
		try {
			const modules = await storage.getAll('modules');
			const progress = await storage.getAll('progress');
			const paths = await storage.getAll('paths');
			const settings = (await storage.get('settings', 'user-settings')) || this.getDefaultSettings();

			const export_data = {
				version: '1.2.0',
				exportDate: new Date(),
				modules,
				progress,
				paths,
				nodes: [],
				settings,
				metadata: {
					totalModules: modules.length,
					totalProgress: progress.length,
					exportFormat: 'cleanup'
				}
			};

			const cleaned_data = cleanupOrphanedData(export_data);
			const removed_items =
				progress.length - cleaned_data.progress.length + (paths.length - cleaned_data.paths.length);

			// Store cleaned data back
			if (removed_items > 0) {
				// This would need to be implemented to actually update the storage
			}

			return {
				cleaned: true,
				removedItems: removed_items,
				errors: []
			};
		} catch (error) {
			return {
				cleaned: false,
				removedItems: 0,
				errors: [`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
			};
		}
	}

	/**
	 * Merge multiple export files
	 */
	async mergeExports(
		exportFiles: File[]
	): Promise<{ success: boolean; data?: ExportData; errors: string[] }> {
		try {
			const datasets: ExportData[] = [];

			for (const file of exportFiles) {
				const content = await file.text();
				const import_result = importFromJSON(content);

				if (import_result.success && import_result.data) {
					datasets.push(import_result.data);
				} else {
					return {
						success: false,
						errors: [`Failed to parse ${file.name}: ${import_result.errors.join(', ')}`]
					};
				}
			}

			const merged_data = mergeExportData(datasets);

			return {
				success: true,
				data: merged_data,
				errors: []
			};
		} catch (error) {
			return {
				success: false,
				errors: [`Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
			};
		}
	}

	/**
	 * Get backup configuration
	 */
	getBackupConfig(): BackupConfig {
		return this.backupManager.getConfig();
	}

	/**
	 * Update backup configuration
	 */
	updateBackupConfig(config: Partial<BackupConfig>): void {
		this.backupManager.updateConfig(config);
	}

	/**
	 * Download data as file
	 */
	downloadData(data: string | Blob, filename: string, mime_type = 'application/json'): void {
		const blob = data instanceof Blob ? data : new Blob([data], { type: mime_type });
		const url = URL.createObjectURL(blob);

		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);

		URL.revokeObjectURL(url);
	}

	// Private methods

	private async storeImportedData(data: ExportData, options: ImportOptions): Promise<void> {
		// Store modules
		for (const module of data.modules) {
			if (options.overwriteExisting || !(await this.moduleExists(module.id))) {
				await storage.put('modules', module);
			}
		}

		// Store progress if not merging or if overwriting
		if (!options.mergeWithExisting || options.overwriteExisting) {
			for (const progress of data.progress) {
				await storage.put('progress', progress);
			}
		}

		// Store paths
		for (const path of data.paths) {
			if (options.overwriteExisting || !(await this.pathExists(path.id))) {
				await storage.put('paths', path);
			}
		}

		// Store settings if overwriting
		if (options.overwriteExisting) {
			await storage.put('settings', data.settings);
		}
	}

	private async moduleExists(id: string): Promise<boolean> {
		try {
			const module = await storage.get('modules', id);
			return module !== null;
		} catch {
			return false;
		}
	}

	private async pathExists(id: string): Promise<boolean> {
		try {
			const path = await storage.get('paths', id);
			return path !== null;
		} catch {
			return false;
		}
	}

	private createSCORMZip(scormPackage: SCORMPackage): Blob {
		// This is a simplified implementation
		// In a real implementation, you would use a library like JSZip
		const manifest_xml = this.generateSCORMManifest(scormPackage.manifest);
		const files: { [key: string]: string } = {
			'imsmanifest.xml': manifest_xml,
			...scormPackage.content
		};

		// For now, return as JSON (in real implementation, create actual ZIP)
		return new Blob([JSON.stringify(files, null, 2)], { type: 'application/json' });
	}

	private generateSCORMManifest(manifest: any): string {
		// Generate SCORM-compliant XML manifest
		return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifest.identifier}" version="${manifest.version}">
    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>2004 4th Edition</schemaversion>
    </metadata>
    <organizations default="ORG-1">
        ${manifest.organizations
					.map(
						(org: any) => `
        <organization identifier="${org.identifier}">
            <title>${org.title}</title>
            ${org.items
							.map(
								(item: any) => `
            <item identifier="${item.identifier}" identifierref="${item.resourceRef}">
                <title>${item.title}</title>
            </item>`
							)
							.join('')}
        </organization>`
					)
					.join('')}
    </organizations>
    <resources>
        ${manifest.resources
					.map(
						(resource: any) => `
        <resource identifier="${resource.identifier}" type="${resource.type}" href="${resource.href}">
            ${resource.files.map((file: string) => `<file href="${file}"/>`).join('')}
        </resource>`
					)
					.join('')}
    </resources>
</manifest>`;
	}

	private getDefaultSettings(): UserSettings {
		return {
			id: 'default',
			preferences: {
				theme: 'light',
                learningStyle: 'visual',
                difficulty: 'intermediate',
				language: 'en',
				notifications: true,
				autoSave: true
			},
			profile: {
				name: 'User',
				joinDate: new Date()
			}
		};
	}
}

/**
 * Create a data management service instance
 */
export function createDataManagementService(backupConfig?: BackupConfig): DataManagementService {
	return new DataManagementService(backupConfig);
}

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
	format: 'json',
	includeProgress: true,
	includeSettings: true,
	includeMedia: false,
	compression: false
};

/**
 * Default import options
 */
export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
	format: 'json',
	mergeWithExisting: true,
	overwriteExisting: false,
	createBackup: true
};
