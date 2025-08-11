/**
 * Data migration and format conversion utilities
 */

import type {
	ContentModule,
	UserProgress,
	LearningPath,
	KnowledgeNode,
	UserSettings
} from '../types/index.js';
import type { ExportData } from './exportUtils.js';

/**
 * Migration result with detailed information
 */
export interface MigrationResult {
	success: boolean;
	fromVersion: string;
	toVersion: string;
	migratedItems: number;
	errors: string[];
	warnings: string[];
	backupCreated: boolean;
}

/**
 * Version compatibility matrix
 */
const VERSION_MIGRATIONS: { [key: string]: (data: any) => any } = {
	'0.9.0->1.0.0': migrate_from090_to100,
	'1.0.0->1.1.0': migrate_from100_to110,
	'1.1.0->1.2.0': migrate_from110_to120
};

/**
 * Current data version
 */
export const CURRENT_VERSION = '1.2.0';

/**
 * Migrate data between versions
 */
export function migrateData(
	data: any,
	fromVersion: string,
	to_version = CURRENT_VERSION
): MigrationResult {
	const result: MigrationResult = {
		success: false,
		fromVersion,
		toVersion: to_version,
		migratedItems: 0,
		errors: [],
		warnings: [],
		backupCreated: false
	};

	try {
		// Create backup before migration
		const backup = JSON.stringify(data);
		localStorage.setItem(`backup_${fromVersion}_${Date.now()}`, backup);
		result.backupCreated = true;

		let current_data = { ...data };
		let current_version = fromVersion;

		// Apply migrations in sequence
		while (current_version !== to_version) {
			const next_version = get_next_version(current_version, to_version);
			if (!next_version) {
				result.errors.push(`No migration path from ${current_version} to ${to_version}`);
				return result;
			}

			const migration_key = `${current_version}->${next_version}`;
			const migration_fn = VERSION_MIGRATIONS[migration_key];

			if (!migration_fn) {
				result.errors.push(`No migration function for ${migration_key}`);
				return result;
			}

			try {
				current_data = migration_fn(current_data);
				current_version = next_version;
				result.migratedItems++;
			} catch (error) {
				result.errors.push(
					`Migration ${migration_key} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
				);
				return result;
			}
		}

		result.success = true;
		return result;
	} catch (error) {
		result.errors.push(
			`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
		return result;
	}
}

/**
 * Convert between different export formats
 */
export function convertFormat(
	data: ExportData,
	targetFormat: 'json' | 'markdown' | 'scorm' | 'csv'
): string {
	switch (targetFormat) {
		case 'json':
			return JSON.stringify(data, null, 2);

		case 'markdown':
			return convert_to_markdown(data);

		case 'scorm':
			return JSON.stringify(convert_to_scorm(data), null, 2);

		case 'csv':
			return convert_to_csv(data);

		default:
			throw new Error(`Unsupported target format: ${targetFormat}`);
	}
}

/**
 * Merge multiple export data sets
 */
export function mergeExportData(datasets: ExportData[]): ExportData {
	if (datasets.length === 0) {
		throw new Error('No datasets to merge');
	}

	const merged: ExportData = {
		version: CURRENT_VERSION,
		exportDate: new Date(),
		modules: [],
		progress: [],
		paths: [],
		nodes: [],
		settings: datasets[0].settings, // Use first dataset's settings
		metadata: {
			totalModules: 0,
			totalProgress: 0,
			exportFormat: 'merged'
		}
	};

	const module_ids = new Set<string>();
	const progress_keys = new Set<string>();
	const path_ids = new Set<string>();
	const node_ids = new Set<string>();

	datasets.forEach((dataset) => {
		// Merge modules (avoid duplicates by ID)
		dataset.modules.forEach((module) => {
			if (!module_ids.has(module.id)) {
				merged.modules.push(module);
				module_ids.add(module.id);
			}
		});

		// Merge progress (avoid duplicates by userId+moduleId)
		dataset.progress.forEach((progress) => {
			const key = `${progress.userId}-${progress.moduleId}`;
			if (!progress_keys.has(key)) {
				merged.progress.push(progress);
				progress_keys.add(key);
			}
		});

		// Merge paths (avoid duplicates by ID)
		dataset.paths.forEach((path) => {
			if (!path_ids.has(path.id)) {
				merged.paths.push(path);
				path_ids.add(path.id);
			}
		});

		// Merge nodes (avoid duplicates by ID)
		dataset.nodes.forEach((node) => {
			if (!node_ids.has(node.id)) {
				merged.nodes.push(node);
				node_ids.add(node.id);
			}
		});
	});

	merged.metadata.totalModules = merged.modules.length;
	merged.metadata.totalProgress = merged.progress.length;

	return merged;
}

/**
 * Validate data integrity after migration
 */
export function validateDataIntegrity(data: ExportData): {
	valid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Validate modules
	data.modules.forEach((module, index) => {
		if (!module.id) {
			errors.push(`Module ${index}: Missing ID`);
		}
		if (!module.title) {
			errors.push(`Module ${index}: Missing title`);
		}
		if (!module.blocks || !Array.isArray(module.blocks)) {
			errors.push(`Module ${index}: Invalid blocks array`);
		}
		if (module.metadata.difficulty < 1 || module.metadata.difficulty > 5) {
			warnings.push(`Module ${index}: Difficulty out of range (1-5)`);
		}
	});

	// Validate progress entries
	data.progress.forEach((progress, index) => {
		if (!progress.userId) {
			errors.push(`Progress ${index}: Missing userId`);
		}
		if (!progress.moduleId) {
			errors.push(`Progress ${index}: Missing moduleId`);
		}
		if (!['not-started', 'in-progress', 'completed'].includes(progress.status)) {
			errors.push(`Progress ${index}: Invalid status`);
		}
	});

	// Check for orphaned progress (progress without corresponding module)
	const module_ids = new Set(data.modules.map((m) => m.id));
	data.progress.forEach((progress, index) => {
		if (!module_ids.has(progress.moduleId)) {
			warnings.push(`Progress ${index}: References non-existent module ${progress.moduleId}`);
		}
	});

	return {
		valid: errors.length === 0,
		errors,
		warnings
	};
}

/**
 * Clean up orphaned data
 */
export function cleanupOrphanedData(data: ExportData): ExportData {
	const module_ids = new Set(data.modules.map((m) => m.id));

	// Remove progress entries for non-existent modules
	const clean_progress = data.progress.filter((progress) => module_ids.has(progress.moduleId));

	// Remove learning paths that reference non-existent modules
	const clean_paths = data.paths
		.map((path) => ({
			...path,
			modules: path.modules.filter((module_id) => module_ids.has(module_id))
		}))
		.filter((path) => path.modules.length > 0);

	return {
		...data,
		progress: clean_progress,
		paths: clean_paths
	};
}

/**
 * Migration from version 0.9.0 to 1.0.0
 */
function migrate_from090_to100(data: any): any {
	// Add new fields introduced in 1.0.0
	if (data.modules) {
		data.modules = data.modules.map((module: any) => ({
			...module,
			relationships: module.relationships || {
				prerequisites: [],
				dependents: [],
				related: []
			},
			analytics: module.analytics || {
				views: 0,
				completions: 0,
				averageScore: 0,
				averageTime: 0
			}
		}));
	}

	// Add version field if missing
	data.version = '1.0.0';

	return data;
}

/**
 * Migration from version 1.0.0 to 1.1.0
 */
function migrate_from100_to110(data: any): any {
	// Add new progress fields
	if (data.progress) {
		data.progress = data.progress.map((progress: any) => ({
			...progress,
			startedAt: progress.startedAt || null,
			completedAt: progress.completedAt || null
		}));
	}

	// Add new settings structure
	if (data.settings && !data.settings.profile) {
		data.settings.profile = {
			name: 'User',
			joinDate: new Date()
		};
	}

	data.version = '1.1.0';
	return data;
}

/**
 * Migration from version 1.1.0 to 1.2.0
 */
function migrate_from110_to120(data: any): any {
	// Add new content block metadata
	if (data.modules) {
		data.modules = data.modules.map((module: any) => ({
			...module,
			blocks: module.blocks.map((block: any) => ({
				...block,
				metadata: {
					...block.metadata,
					version: block.metadata?.version || 1
				}
			}))
		}));
	}

	data.version = '1.2.0';
	return data;
}

/**
 * Get the next version in the migration path
 */
function get_next_version(current_version, target_version): string | null {
	const versions = ['0.9.0', '1.0.0', '1.1.0', '1.2.0'];
	const current_index = versions.indexOf(current_version);
	const target_index = versions.indexOf(target_version);

	if (current_index === -1 || target_index === -1 || current_index >= target_index) {
		return null;
	}

	return versions[current_index + 1];
}

/**
 * Convert export data to Markdown format
 */
function convert_to_markdown(data: ExportData): string {
	let markdown = `# Knowledge Base Export\n\n`;
	markdown += `**Export Date:** ${data.exportDate.toISOString()}\n`;
	markdown += `**Version:** ${data.version}\n\n`;

	data.modules.forEach((module) => {
		markdown += `## ${module.title}\n\n`;
		markdown += `${module.description}\n\n`;

		module.blocks.forEach((block) => {
			switch (block.type) {
				case 'text':
					markdown += `${block.content}\n\n`;
					break;
				case 'code':
					markdown += `\`\`\`${block.content.language || ''}\n${block.content.code}\n\`\`\`\n\n`;
					break;
				case 'image':
					markdown += `![${block.content.alt || 'Image'}](${block.content.src})\n\n`;
					break;
			}
		});

		markdown += `---\n\n`;
	});

	return markdown;
}

/**
 * Convert export data to SCORM format
 */
function convert_to_scorm(data: ExportData): any {
	return {
		manifest: {
			identifier: 'MANIFEST-1',
			version: data.version,
			title: 'Knowledge Base Export',
			description: `Exported on ${data.exportDate.toISOString()}`,
			organizations: [
				{
					identifier: 'ORG-1',
					title: 'Knowledge Base',
					items: data.modules.map((module, index) => ({
						identifier: `ITEM-${index + 1}`,
						title: module.title,
						resourceRef: `RES-${index + 1}`
					}))
				}
			],
			resources: data.modules.map((module, index) => ({
				identifier: `RES-${index + 1}`,
				type: 'webcontent',
				href: `content_${index + 1}.html`,
				files: [`content_${index + 1}.html`]
			}))
		}
	};
}

/**
 * Convert export data to CSV format
 */
function convert_to_csv(data: ExportData): string {
	const headers = ['id', 'title', 'description', 'difficulty', 'estimatedTime', 'tags', 'author'];
	let csv = headers.join(',') + '\n';

	data.modules.forEach((module) => {
		const row = [
			`"${module.id}"`,
			`"${module.title}"`,
			`"${module.description}"`,
			module.metadata.difficulty.toString(),
			module.metadata.estimatedTime.toString(),
			`"${module.metadata.tags.join(';')}"`,
			`"${module.metadata.author}"`
		];
		csv += row.join(',') + '\n';
	});

	return csv;
}
