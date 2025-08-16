/**
 * Import utilities for different formats
 */

import type {
    ContentModule,
    UserProgress,
    LearningPath,
    KnowledgeNode,
    UserSettings,
    ContentBlock,
    DifficultyLevel
} from '$lib/types/unified';
import type { ExportData } from './exportUtils.js';

/**
 * Import result with validation information
 */
export interface ImportResult {
	success: boolean;
	data?: ExportData;
	errors: string[];
	warnings: string[];
	stats: {
		modulesImported: number;
		progressImported: number;
		pathsImported: number;
		nodesImported: number;
	};
}

/**
 * Markdown import configuration
 */
export interface MarkdownImportConfig {
	treatH1AsModule: boolean;
	treatH2AsSection: boolean;
	extractCodeBlocks: boolean;
	preserveFormatting: boolean;
	defaultDifficulty: number;
	defaultEstimatedTime: number;
}

/**
 * Import data from JSON format
 */
export function importFromJSON(jsonString: string): ImportResult {
	const result: ImportResult = {
		success: false,
		errors: [],
		warnings: [],
		stats: {
			modulesImported: 0,
			progressImported: 0,
			pathsImported: 0,
			nodesImported: 0
		}
	};

	try {
		const data = JSON.parse(jsonString) as ExportData;

		// Validate required fields
		if (!data.version) {
			result.errors.push('Missing version field');
		}

		if (!data.modules || !Array.isArray(data.modules)) {
			result.errors.push('Invalid or missing modules array');
		}

		if (!data.progress || !Array.isArray(data.progress)) {
			result.warnings.push('Missing progress data, will be initialized empty');
			data.progress = [];
		}

		if (!data.paths || !Array.isArray(data.paths)) {
			result.warnings.push('Missing learning paths, will be initialized empty');
			data.paths = [];
		}

		if (!data.nodes || !Array.isArray(data.nodes)) {
			result.warnings.push('Missing knowledge nodes, will be initialized empty');
			data.nodes = [];
		}

		// Validate and sanitize modules
		const valid_modules: ContentModule[] = [];
		data.modules.forEach((module, index) => {
			try {
				const validatedModule = validateModule(module);
				valid_modules.push(validatedModule);
			} catch (error) {
				result.errors.push(
					`Module ${index}: ${error instanceof Error ? error.message : 'Invalid module'}`
				);
			}
		});

		// Validate progress entries
		const valid_progress: UserProgress[] = [];
		data.progress.forEach((progress, index) => {
			try {
				const validatedProgress = validateProgress(progress);
				valid_progress.push(validatedProgress);
			} catch (error) {
				result.warnings.push(
					`Progress ${index}: ${error instanceof Error ? error.message : 'Invalid progress'}`
				);
			}
		});

		if (result.errors.length === 0) {
			result.success = true;
			result.data = {
				...data,
				modules: valid_modules,
				progress: valid_progress,
				exportDate: new Date(data.exportDate)
			};
			result.stats = {
				modulesImported: valid_modules.length,
				progressImported: valid_progress.length,
				pathsImported: data.paths.length,
				nodesImported: data.nodes.length
			};
		}
	} catch (error) {
		result.errors.push(
			`JSON parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}

	return result;
}

/**
 * Import data from Markdown format
 */
export function importFromMarkdown(
	markdownString: string,
	config: MarkdownImportConfig
): ImportResult {
	const result: ImportResult = {
		success: false,
		errors: [],
		warnings: [],
		stats: {
			modulesImported: 0,
			progressImported: 0,
			pathsImported: 0,
			nodesImported: 0
		}
	};

	try {
		const modules: ContentModule[] = [];
		const lines: string[] = markdownString.split('\n');
		let current_module: Partial<ContentModule> | null = null;
		let current_blocks: ContentBlock[] = [];
		let block_id = 1;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Handle H1 headers as modules
			if (config.treatH1AsModule && line.startsWith('# ')) {
				// Save previous module if exists
				if (current_module) {
					current_module.blocks = current_blocks;
					modules.push(createModuleFromPartial(current_module, config));
					current_blocks = [];
				}

				// Start new module
				current_module = {
					id: generateId(),
					title: line.substring(2).trim(),
					description: '',
					blocks: []
				};
			}
			// Handle H2 headers as sections within modules
			else if (config.treatH2AsSection && line.startsWith('## ')) {
				if (current_module) {
					const section_block: ContentBlock = {
						id: `block-${block_id++}`,
						type: 'text',
						content: `<h2>${line.substring(3).trim()}</h2>`,
						metadata: {
							created: new Date(),
							modified: new Date(),
							version: 1
						}
					};
					current_blocks.push(section_block);
				}
			}
			// Handle code blocks
			else if (config.extractCodeBlocks && line.startsWith('```')) {
				const language = line.substring(3).trim();
				const code_lines: string[] = [];
				i++; // Move to next line

				// Collect code lines until closing ```
				while (i < lines.length && !lines[i].trim().startsWith('```')) {
					code_lines.push(lines[i]);
					i++;
				}

				if (current_module) {
					const code_block: ContentBlock = {
						id: `block-${block_id++}`,
						type: 'code',
						content: {
							code: code_lines.join('\n'),
							language: language || 'text'
						},
						metadata: {
							created: new Date(),
							modified: new Date(),
							version: 1
						}
					};
					current_blocks.push(code_block);
				}
			}
			// Handle regular text
			else if (line.length > 0 && current_module) {
				// Check if this is a description line (first non-empty line after title)
				if (!current_module.description && current_blocks.length === 0) {
					current_module.description = line;
				} else {
					const text_block: ContentBlock = {
						id: `block-${block_id++}`,
						type: 'text',
						content: config.preserveFormatting
							? line
							: line
								.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
								.replace(/\*(.*?)\*/g, '<em>$1</em>'),
						metadata: {
							created: new Date(),
							modified: new Date(),
							version: 1
						}
					};
					current_blocks.push(text_block);
				}
			}
		}

		// Save last module
		if (current_module) {
			current_module.blocks = current_blocks;
			modules.push(createModuleFromPartial(current_module, config));
		}

		if (modules.length === 0) {
			result.warnings.push('No modules found in markdown content');
		}

		result.success = true;
		result.data = {
			version: '1.0.0',
			exportDate: new Date(),
			modules,
			progress: [],
			paths: [],
			nodes: [],
			settings: createDefaultSettings(),
			metadata: {
				totalModules: modules.length,
				totalProgress: 0,
				exportFormat: 'markdown'
			}
		};
		result.stats.modulesImported = modules.length;
	} catch (error) {
		result.errors.push(
			`Markdown parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}

	return result;
}

/**
 * Import from common knowledge management formats
 */
export function importFromFormat(content: string, format: 'opml' | 'csv' | 'xml'): ImportResult {
	const result: ImportResult = {
		success: false,
		errors: [],
		warnings: [],
		stats: {
			modulesImported: 0,
			progressImported: 0,
			pathsImported: 0,
			nodesImported: 0
		}
	};

	try {
		switch (format) {
			case 'opml':
				return importFromOpml(content);
			case 'csv':
				return importFromCsv(content);
			case 'xml':
				return importFromXml(content);
			default:
				result.errors.push(`Unsupported format: ${format}`);
		}
	} catch (error) {
		result.errors.push(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}

	return result;
}

/**
 * Import from OPML format (outline format)
 */
function importFromOpml(opmlString: string): ImportResult {
	const result: ImportResult = {
		success: false,
		errors: [],
		warnings: [],
		stats: {
			modulesImported: 0,
			progressImported: 0,
			pathsImported: 0,
			nodesImported: 0
		}
	};

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(opmlString, 'text/xml');

		if (doc.querySelector('parsererror')) {
			result.errors.push('Invalid OPML XML format');
			return result;
		}

		const modules: ContentModule[] = [];
		const outlines = doc.querySelectorAll('outline');

		outlines.forEach((outline, index) => {
			const title =
				outline.getAttribute('text') || outline.getAttribute('title') || `Module ${index + 1}`;
			const description = outline.getAttribute('description') || '';

			const module: ContentModule = {
				id: generateId(),
				title,
				description,
				blocks: [
					{
						id: `block-1`,
						type: 'text',
						content: description || title,
						metadata: {
							created: new Date(),
							modified: new Date(),
							version: 1
						}
					}
				],
				metadata: {
					author: 'Imported',
					created: new Date(),
					modified: new Date(),
                    version: 1,
                    difficulty: 'intermediate',
					estimatedTime: 30,
					prerequisites: [],
					tags: [],
					language: 'en'
				},
				relationships: {
					prerequisites: [],
					dependents: [],
					related: []
				},
				analytics: {
					views: 0,
					completions: 0,
					averageScore: 0,
					averageTime: 0
				}
			};

			modules.push(module);
		});

		result.success = true;
		result.data = {
			version: '1.0.0',
			exportDate: new Date(),
			modules,
			progress: [],
			paths: [],
			nodes: [],
			settings: createDefaultSettings(),
			metadata: {
				totalModules: modules.length,
				totalProgress: 0,
				exportFormat: 'opml'
			}
		};
		result.stats.modulesImported = modules.length;
	} catch (error) {
		result.errors.push(
			`OPML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}

	return result;
}

/**
 * Import from CSV format
 */
function importFromCsv(csvString: string): ImportResult {
	const result: ImportResult = {
		success: false,
		errors: [],
		warnings: [],
		stats: {
			modulesImported: 0,
			progressImported: 0,
			pathsImported: 0,
			nodesImported: 0
		}
	};

	try {
		const lines: string[] = csvString.split('\n');
		if (lines.length < 2) {
			result.errors.push('CSV must have at least a header row and one data row');
			return result;
		}

		const headers: string[] = lines[0]
			.split(',')
			.map((h: string) => h.trim().replace(/"/g, ''));
		const modules: ContentModule[] = [];

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i].trim();
			if (!line) {continue;}

			const values: string[] = line
				.split(',')
				.map((v: string) => v.trim().replace(/"/g, ''));
			const module_data: Record<string, string> = {};

			headers.forEach((header: string, index: number) => {
				module_data[header] = values[index] || '';
			});

			const module: ContentModule = {
				id: generateId(),
				title: module_data.title || module_data.name || `Module ${i}`,
				description: module_data.description || '',
				blocks: [
					{
						id: `block-1`,
						type: 'text',
						content: module_data.content || module_data.description || '',
						metadata: {
							created: new Date(),
							modified: new Date(),
							version: 1
						}
					}
				],
				metadata: {
					author: module_data.author || 'Imported',
					created: new Date(),
					modified: new Date(),
                    version: 1,
                    difficulty: ((): DifficultyLevel => {
                        const raw = module_data.difficulty;
                        if (raw === 'beginner' || raw === 'intermediate' || raw === 'advanced') {return raw;}
                        const n = parseInt(raw);
                        if (!isNaN(n)) {
                            if (n <= 2) {return 'beginner';}
                            if (n <= 3) {return 'intermediate';}
                            return 'advanced';
                        }
                        return 'intermediate';
                    })(),
					estimatedTime: parseInt(module_data.estimatedTime) || 30,
					prerequisites: module_data.prerequisites ? module_data.prerequisites.split(';') : [],
					tags: module_data.tags ? module_data.tags.split(';') : [],
					language: module_data.language || 'en'
				},
				relationships: {
					prerequisites: [],
					dependents: [],
					related: []
				},
				analytics: {
					views: 0,
					completions: 0,
					averageScore: 0,
					averageTime: 0
				}
			};

			modules.push(module);
		}

		result.success = true;
		result.data = {
			version: '1.0.0',
			exportDate: new Date(),
			modules,
			progress: [],
			paths: [],
			nodes: [],
			settings: createDefaultSettings(),
			metadata: {
				totalModules: modules.length,
				totalProgress: 0,
				exportFormat: 'csv'
			}
		};
		result.stats.modulesImported = modules.length;
	} catch (error) {
		result.errors.push(
			`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}

	return result;
}

/**
 * Import from generic XML format
 */
function importFromXml(xmlString: string): ImportResult {
	const result: ImportResult = {
		success: false,
		errors: [],
		warnings: [],
		stats: {
			modulesImported: 0,
			progressImported: 0,
			pathsImported: 0,
			nodesImported: 0
		}
	};

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(xmlString, 'text/xml');

		if (doc.querySelector('parsererror')) {
			result.errors.push('Invalid XML format');
			return result;
		}

		const modules: ContentModule[] = [];
		const module_elements = doc.querySelectorAll('module, item, lesson');

		module_elements.forEach((element, index) => {
			const title =
				element.querySelector('title')?.textContent ||
				element.getAttribute('title') ||
				`Module ${index + 1}`;
			const description =
				element.querySelector('description')?.textContent ||
				element.getAttribute('description') ||
				'';
			const content = element.querySelector('content')?.textContent || '';

			const module: ContentModule = {
				id: generateId(),
				title,
				description,
				blocks: [
					{
						id: `block-1`,
						type: 'text',
						content: content || description,
						metadata: {
							created: new Date(),
							modified: new Date(),
							version: 1
						}
					}
				],
				metadata: {
					author: element.querySelector('author')?.textContent || 'Imported',
					created: new Date(),
					modified: new Date(),
                    version: 1,
                    difficulty: ((): DifficultyLevel => {
                        const raw = element.getAttribute('difficulty') || '3';
                        if (raw === 'beginner' || raw === 'intermediate' || raw === 'advanced') {return raw as DifficultyLevel;}
                        const n = parseInt(raw);
                        if (!isNaN(n)) {
                            if (n <= 2) {return 'beginner';}
                            if (n <= 3) {return 'intermediate';}
                            return 'advanced';
                        }
                        return 'intermediate';
                    })(),
					estimatedTime: parseInt(element.getAttribute('estimatedTime') || '30'),
					prerequisites: [],
					tags: [],
					language: element.getAttribute('language') || 'en'
				},
				relationships: {
					prerequisites: [],
					dependents: [],
					related: []
				},
				analytics: {
					views: 0,
					completions: 0,
					averageScore: 0,
					averageTime: 0
				}
			};

			modules.push(module);
		});

		result.success = true;
		result.data = {
			version: '1.0.0',
			exportDate: new Date(),
			modules,
			progress: [],
			paths: [],
			nodes: [],
			settings: createDefaultSettings(),
			metadata: {
				totalModules: modules.length,
				totalProgress: 0,
				exportFormat: 'xml'
			}
		};
		result.stats.modulesImported = modules.length;
	} catch (error) {
		result.errors.push(
			`XML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}

	return result;
}

/**
 * Validate a module object
 */
function validateModule(module: any): ContentModule {
	if (!module.id || typeof module.id !== 'string') {
		throw new Error('Module must have a valid id');
	}
	if (!module.title || typeof module.title !== 'string') {
		throw new Error('Module must have a valid title');
	}
	if (!module.blocks || !Array.isArray(module.blocks)) {
		throw new Error('Module must have a blocks array');
	}

	// Ensure dates are Date objects
	if (module.metadata) {
		if (module.metadata.created && typeof module.metadata.created === 'string') {
			module.metadata.created = new Date(module.metadata.created);
		}
		if (module.metadata.modified && typeof module.metadata.modified === 'string') {
			module.metadata.modified = new Date(module.metadata.modified);
		}
	}

	return module as ContentModule;
}

/**
 * Validate a progress object
 */
function validateProgress(progress: any): UserProgress {
	if (!progress.userId || typeof progress.userId !== 'string') {
		throw new Error('Progress must have a valid userId');
	}
	if (!progress.moduleId || typeof progress.moduleId !== 'string') {
		throw new Error('Progress must have a valid moduleId');
	}

	// Ensure dates are Date objects
	if (progress.lastAccessed && typeof progress.lastAccessed === 'string') {
		progress.lastAccessed = new Date(progress.lastAccessed);
	}
	if (progress.startedAt && typeof progress.startedAt === 'string') {
		progress.startedAt = new Date(progress.startedAt);
	}
	if (progress.completedAt && typeof progress.completedAt === 'string') {
		progress.completedAt = new Date(progress.completedAt);
	}

	return progress as UserProgress;
}

/**
 * Create a complete module from partial data
 */
function createModuleFromPartial(
	partial: Partial<ContentModule>,
	config: MarkdownImportConfig
): ContentModule {
	return {
		id: partial.id || generateId(),
		title: partial.title || 'Untitled Module',
		description: partial.description || '',
		blocks: partial.blocks || [],
		metadata: {
			author: 'Imported',
			created: new Date(),
			modified: new Date(),
			version: 1,
			difficulty: config.defaultDifficulty,
			estimatedTime: config.defaultEstimatedTime,
			prerequisites: [],
			tags: [],
			language: 'en',
			...partial.metadata
		},
		relationships: {
			prerequisites: [],
			dependents: [],
			related: [],
			...partial.relationships
		},
		analytics: {
			views: 0,
			completions: 0,
			averageScore: 0,
			averageTime: 0,
			...partial.analytics
		}
	};
}

/**
 * Create default user settings
 */
function createDefaultSettings(): UserSettings {
	return {
		id: generateId(),
		preferences: {
			theme: 'light',
			learningStyle: 'visual',
            difficulty: 'intermediate',
			language: 'en',
			notifications: true,
			autoSave: true
		},
		profile: {
			name: 'Imported User',
			joinDate: new Date()
		}
	};
}

/**
 * Generate a unique ID
 */
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
