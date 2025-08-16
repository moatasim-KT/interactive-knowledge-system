/**
 * Backup and restore utilities
 */

import type {
	ContentModule,
	UserProgress,
	LearningPath,
	KnowledgeNode,
	UserSettings
} from '$lib/types/unified';
import { createBackup, type ExportData } from './exportUtils.js';
import { importFromJSON, type ImportResult } from './importUtils.js';
import { storage } from '../storage/index.js';

/**
 * Backup metadata
 */
export interface BackupMetadata {
	id: string;
	name: string;
	description: string;
	created: Date;
	size: number;
	version: string;
	type: 'manual' | 'automatic' | 'scheduled';
	checksum: string;
}

/**
 * Backup configuration
 */
export interface BackupConfig {
	autoBackup: boolean;
	backupInterval: number; // in hours
	maxBackups: number;
	compressionEnabled: boolean;
	includeProgress: boolean;
	includeSettings: boolean;
	includeMedia: boolean;
}

/**
 * Restore options
 */
export interface RestoreOptions {
	overwriteExisting: boolean;
	mergeWithExisting: boolean;
	restoreProgress: boolean;
	restoreSettings: boolean;
	createBackupBeforeRestore: boolean;
}

/**
 * Backup result
 */
export interface BackupResult {
	success: boolean;
	backupId: string;
	size: number;
	duration: number;
	errors: string[];
	warnings: string[];
}

/**
 * Restore result
 */
export interface RestoreResult {
	success: boolean;
	restoredItems: {
		modules: number;
		progress: number;
		paths: number;
		nodes: number;
	};
	duration: number;
	errors: string[];
	warnings: string[];
	backupCreated: boolean;
}

/**
 * Backup manager class
 */
export class BackupManager {
	private config: BackupConfig;
	private backupTimer: number | null = null;

	constructor(config: BackupConfig) {
		this.config = config;
		this.initializeAutoBackup();
	}

	/**
	 * Create a manual backup
	 */
	async createBackup(name?: string, description?: string): Promise<BackupResult> {
		const start_time = Date.now();
		const result: BackupResult = {
			success: false,
			backupId: '',
			size: 0,
			duration: 0,
			errors: [],
			warnings: []
		};

		try {
			// Gather all data
			const modules = this.getAllModules();
			const progress = this.config.includeProgress ? this.getAllProgress() : [];
			const paths = this.getAllPaths();
			const nodes = this.getAllNodes();
			const settings = this.config.includeSettings ? this.getSettings() : this.getDefaultSettings();

			// Create backup data
			const backup_data = createBackup(modules, progress, paths, nodes, settings);

			// Generate backup metadata
			const backup_id = this.generateBackupId();
			const backup_json = JSON.stringify(backup_data);
			const checksum = await this.calculateChecksum(backup_json);

			const metadata: BackupMetadata = {
				id: backup_id,
				name: name || `Backup ${new Date().toLocaleDateString()}`,
				description: description || 'Manual backup',
				created: new Date(),
				size: backup_json.length,
				version: backup_data.version,
				type: 'manual',
				checksum
			};

			// Store backup
			this.storeBackup(backup_id, backup_data, metadata);

			// Clean up old backups if needed
			this.cleanupOldBackups();

			result.success = true;
			result.backupId = backup_id;
			result.size = metadata.size;
			result.duration = Date.now() - start_time;
		} catch (error) {
			result.errors.push(
				`Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}

		return result;
	}

	/**
	 * Restore from backup
	 */
	async restoreBackup(backupId: string, options: RestoreOptions): Promise<RestoreResult> {
		const start_time = Date.now();
		const result: RestoreResult = {
			success: false,
			restoredItems: {
				modules: 0,
				progress: 0,
				paths: 0,
				nodes: 0
			},
			duration: 0,
			errors: [],
			warnings: [],
			backupCreated: false
		};

		try {
			// Create backup before restore if requested
			if (options.createBackupBeforeRestore) {
				const pre_restore_backup = await this.createBackup(
					`Pre-restore backup ${new Date().toISOString()}`,
					`Automatic backup created before restoring ${backupId}`
				);
				result.backupCreated = pre_restore_backup.success;
				if (!pre_restore_backup.success) {
					result.warnings.push('Failed to create pre-restore backup');
				}
			}

			// Load backup data
			const backup_data = this.loadBackup(backupId);
			if (!backup_data) {
				result.errors.push(`Backup ${backupId} not found`);
				return result;
			}

			// Validate backup integrity
			const is_valid = await this.validateBackup(backupId);
			if (!is_valid) {
				result.errors.push('Backup integrity check failed');
				return result;
			}

			// Restore modules
			if (options.overwriteExisting) {
				this.clearAllModules();
			}

			for (const module of backup_data.modules) {
				try {
					if (options.mergeWithExisting) {
						const existing = this.getModule(module.id);
						if (existing && !options.overwriteExisting) {
							result.warnings.push(`Module ${module.id} already exists, skipping`);
							continue;
						}
					}
					this.storeModule(module);
					result.restoredItems.modules++;
				} catch (error) {
					result.warnings.push(
						`Failed to restore module ${module.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
					);
				}
			}

			// Restore progress if requested
			if (options.restoreProgress && backup_data.progress) {
				for (const progress of backup_data.progress) {
					try {
						this.storeProgress(progress);
						result.restoredItems.progress++;
					} catch (error) {
						result.warnings.push(
							`Failed to restore progress for ${progress.moduleId}: ${error instanceof Error ? error.message : 'Unknown error'}`
						);
					}
				}
			}

			// Restore paths
			for (const path of backup_data.paths) {
				try {
					this.storePath(path);
					result.restoredItems.paths++;
				} catch (error) {
					result.warnings.push(
						`Failed to restore path ${path.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
					);
				}
			}

			// Restore nodes
			for (const node of backup_data.nodes) {
				try {
					this.storeNode(node);
					result.restoredItems.nodes++;
				} catch (error) {
					result.warnings.push(
						`Failed to restore node ${node.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
					);
				}
			}

			// Restore settings if requested
			if (options.restoreSettings && backup_data.settings) {
				try {
					this.storeSettings(backup_data.settings);
				} catch (error) {
					result.warnings.push(
						`Failed to restore settings: ${error instanceof Error ? error.message : 'Unknown error'}`
					);
				}
			}

			result.success = true;
			result.duration = Date.now() - start_time;
		} catch (error) {
			result.errors.push(
				`Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
			);
		}

		return result;
	}

	/**
	 * List all available backups
	 */
	listBackups(): BackupMetadata[] {
		try {
			const backup_keys = this.getBackupKeys();
			const backups: BackupMetadata[] = [];

			for (const key of backup_keys) {
				const metadata = this.getBackupMetadata(key);
				if (metadata) {
					backups.push(metadata);
				}
			}

			// Sort by creation date (newest first)
			return backups.sort((a, b) => b.created.getTime() - a.created.getTime());
		} catch (error) {
			// Failed to list backups
			return [];
		}
	}

	/**
	 * Delete a backup
	 */
	deleteBackup(backupId: string): boolean {
		try {
			this.removeBackup(backupId);
			return true;
		} catch (error) {
			// Failed to delete backup
			return false;
		}
	}

	/**
	 * Validate backup integrity
	 */
	async validateBackup(backupId: string): Promise<boolean> {
		try {
			const metadata = this.getBackupMetadata(backupId);
			if (!metadata) {return false;}

			const backup_data = this.loadBackup(backupId);
			if (!backup_data) {return false;}

			const current_checksum = await this.calculateChecksum(JSON.stringify(backup_data));
			return current_checksum === metadata.checksum;
		} catch (error) {
			// Failed to validate backup
			return false;
		}
	}

	/**
	 * Export backup to file
	 */
	exportBackup(backupId: string): Blob | null {
		try {
			const backup_data = this.loadBackup(backupId);
			if (!backup_data) {return null;}

			const json = JSON.stringify(backup_data, null, 2);
			return new Blob([json], { type: 'application/json' });
		} catch (error) {
			// Failed to export backup
			return null;
		}
	}

	/**
	 * Import backup from file
	 */
	async importBackup(file: File, name?: string): Promise<ImportResult> {
		try {
			const content = await file.text();
			const import_result = importFromJSON(content);

			if (import_result.success && import_result.data) {
				// Store as new backup
				const backup_id = this.generateBackupId();
				const checksum = await this.calculateChecksum(content);

				const metadata: BackupMetadata = {
					id: backup_id,
					name: name || `Imported backup ${new Date().toLocaleDateString()}`,
					description: `Imported from ${file.name}`,
					created: new Date(),
					size: content.length,
					version: import_result.data.version,
					type: 'manual',
					checksum
				};

				this.storeBackup(backup_id, import_result.data, metadata);
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
	 * Update backup configuration
	 */
	updateConfig(newConfig: Partial<BackupConfig>): void {
		this.config = { ...this.config, ...newConfig };
		this.initializeAutoBackup();
	}

	/**
	 * Get current backup configuration
	 */
	getConfig(): BackupConfig {
		return { ...this.config };
	}

	// Private methods

	private initializeAutoBackup(): void {
		if (this.backupTimer) {
			clearInterval(this.backupTimer);
		}

		if (this.config.autoBackup && this.config.backupInterval > 0) {
			const interval_ms = this.config.backupInterval * 60 * 60 * 1000; // Convert hours to milliseconds
			this.backupTimer = window.setInterval(() => {
				this.createBackup(`Auto backup ${new Date().toISOString()}`, 'Automatic scheduled backup');
			}, interval_ms);
		}
	}

	private generateBackupId(): string {
		return `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private async calculateChecksum(data: string): Promise<string> {
		const encoder = new TextEncoder();
		const data_buffer = encoder.encode(data);
		const hash_buffer = await crypto.subtle.digest('SHA-256', data_buffer);
		const hash_array = Array.from(new Uint8Array(hash_buffer));
		return hash_array.map((b) => b.toString(16).padStart(2, '0')).join('');
	}

	private storeBackup(backupId: string, data: ExportData, metadata: BackupMetadata): void {
		localStorage.setItem(`backup_data_${backupId}`, JSON.stringify(data));
		localStorage.setItem(`backup_meta_${backupId}`, JSON.stringify(metadata));
	}

	private loadBackup(backupId: string): ExportData | null {
		const data = localStorage.getItem(`backup_data_${backupId}`);
		return data ? JSON.parse(data) : null;
	}

	private getBackupMetadata(backupId: string): BackupMetadata | null {
		const metadata = localStorage.getItem(`backup_meta_${backupId}`);
		if (!metadata) {return null;}

		const parsed = JSON.parse(metadata);
		// Convert date strings back to Date objects
		parsed.created = new Date(parsed.created);
		return parsed;
	}

	private removeBackup(backupId: string): void {
		localStorage.removeItem(`backup_data_${backupId}`);
		localStorage.removeItem(`backup_meta_${backupId}`);
	}

	private getBackupKeys(): string[] {
		const keys: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.startsWith('backup_meta_')) {
				keys.push(key.replace('backup_meta_', ''));
			}
		}
		return keys;
	}

	private cleanupOldBackups(): void {
		const backups = this.listBackups();
		if (backups.length > this.config.maxBackups) {
			const to_delete = backups.slice(this.config.maxBackups);
			for (const backup of to_delete) {
				this.deleteBackup(backup.id);
			}
		}
	}

	// Storage interface methods (these would typically use the actual storage layer)
	private getAllModules(): ContentModule[] {
		// This would use the actual storage implementation
		return [];
	}

	private getAllProgress(): UserProgress[] {
		return [];
	}

	private getAllPaths(): LearningPath[] {
		return [];
	}

	private getAllNodes(): KnowledgeNode[] {
		return [];
	}

	private getSettings(): UserSettings {
		return this.getDefaultSettings();
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

	private getModule(id: string): ContentModule | null {
		return null;
	}

	private storeModule(module: ContentModule): void {
		// Implementation would use actual storage
	}

	private storeProgress(progress: UserProgress): void {
		// Implementation would use actual storage
	}

	private storePath(path: LearningPath): void {
		// Implementation would use actual storage
	}

	private storeNode(node: KnowledgeNode): void {
		// Implementation would use actual storage
	}

	private storeSettings(settings: UserSettings): void {
		// Implementation would use actual storage
	}

	private clearAllModules(): void {
		// Implementation would use actual storage
	}
}

/**
 * Default backup configuration
 */
export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
	autoBackup: true,
	backupInterval: 24, // 24 hours
	maxBackups: 10,
	compressionEnabled: false,
	includeProgress: true,
	includeSettings: true,
	includeMedia: false
};

/**
 * Create a backup manager instance
 */
export function createBackupManager(config: BackupConfig = DEFAULT_BACKUP_CONFIG): BackupManager {
	return new BackupManager(config);
}
