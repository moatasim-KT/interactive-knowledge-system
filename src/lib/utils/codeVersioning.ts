/**
 * Code versioning and history management utilities
 */

import type { CodeVersion, CodeBlockContent } from '../types/code.js';

export class CodeVersioningService {
	private static instance: CodeVersioningService;

	private constructor() {}

	public static getInstance(): CodeVersioningService {
		if (!CodeVersioningService.instance) {
			CodeVersioningService.instance = new CodeVersioningService();
		}
		return CodeVersioningService.instance;
	}

	/**
	 * Create a new version of code
	 */
	public createVersion(
		currentContent: CodeBlockContent,
		newCode: string,
		description?: string,
		author?: string
	): CodeBlockContent {
		const new_version = {
			id: crypto.randomUUID(),
			code: currentContent.code,
			timestamp: new Date(),
			description: description || `Version ${currentContent.version}`,
			author: author || 'Anonymous'
		};

		return {
			...currentContent,
			code: newCode,
			version: currentContent.version + 1,
			history: [...currentContent.history, new_version]
		};
	}

	/**
	 * Restore code to a specific version
	 */
	public restoreToVersion(
		currentContent: CodeBlockContent,
		versionId: string
	): CodeBlockContent | null {
		const version = currentContent.history.find((v) => v.id === versionId);
		if (!version) {
			return null;
		}

		// Create a new version with the current code before restoring
		const backup_version = {
			id: crypto.randomUUID(),
			code: currentContent.code,
			timestamp: new Date(),
			description: `Backup before restore to version ${version.description}`,
			author: 'System'
		};

		return {
			...currentContent,
			code: version.code,
			version: currentContent.version + 1,
			history: [...currentContent.history, backup_version]
		};
	}

	/**
	 * Get version history with diff information
	 */
	public getVersionHistory(
		content: CodeBlockContent
	): Array<CodeVersion & { diffStats?: DiffStats }> {
		const history = [...content.history];

		// Add current version to history for comparison
		const current_version = {
			id: 'current',
			code: content.code,
			timestamp: new Date(),
			description: `Current version (${content.version})`,
			author: 'Current'
		};

		const full_history = [...history, current_version];

		return full_history.map((version, index) => {
			if (index === 0) {
				return version;
			}

			const previous_version = full_history[index - 1];
			const diff_stats = this.calculateDiffStats(previous_version.code, version.code);

			return {
				...version,
				diffStats: diff_stats
			};
		});
	}

	/**
	 * Calculate diff statistics between two code versions
	 */
	private calculateDiffStats(oldCode: string, newCode: string): DiffStats {
		const old_lines = oldCode.split('\n');
		const new_lines = newCode.split('\n');

		let added = 0;
		let removed = 0;
		let modified = 0;

		const max_lines = Math.max(old_lines.length, new_lines.length);

		for (let i = 0; i < max_lines; i++) {
			const old_line = old_lines[i];
			const new_line = new_lines[i];

			if (old_line === undefined) {
				added++;
			} else if (new_line === undefined) {
				removed++;
			} else if (old_line !== new_line) {
				modified++;
			}
		}

		return { added, removed, modified };
	}

	/**
	 * Generate a simple diff view between two code versions
	 */
	public generateDiff(oldCode: string, newCode: string): DiffLine[] {
		const old_lines = oldCode.split('\n');
		const new_lines = newCode.split('\n');
		const diff: DiffLine[] = [];

		// Simple line-by-line diff (not optimal, but functional)
		const max_lines = Math.max(old_lines.length, new_lines.length);

		for (let i = 0; i < max_lines; i++) {
			const old_line = old_lines[i];
			const new_line = new_lines[i];

			if (old_line === undefined) {
				diff.push({
					type: 'added',
					content: new_line,
					lineNumber: i + 1
				});
			} else if (new_line === undefined) {
				diff.push({
					type: 'removed',
					content: old_line,
					lineNumber: i + 1
				});
			} else if (old_line !== new_line) {
				diff.push({
					type: 'removed',
					content: old_line,
					lineNumber: i + 1
				});
				diff.push({
					type: 'added',
					content: new_line,
					lineNumber: i + 1
				});
			} else {
				diff.push({
					type: 'unchanged',
					content: old_line,
					lineNumber: i + 1
				});
			}
		}

		return diff;
	}

	/**
	 * Clean up old versions (keep only the most recent N versions)
	 */
	public cleanupVersions(content: CodeBlockContent, keep_count = 10): CodeBlockContent {
		if (content.history.length <= keep_count) {
			return content;
		}

		// Sort by timestamp and keep the most recent versions
		const sorted_history = [...content.history].sort(
			(a, b) => b.timestamp.getTime() - a.timestamp.getTime()
		);

		return {
			...content,
			history: sorted_history.slice(0, keep_count)
		};
	}

	/**
	 * Export version history as JSON
	 */
	public exportVersionHistory(content: CodeBlockContent): string {
		const export_data = {
			currentVersion: {
				code: content.code,
				version: content.version,
				language: content.language,
				title: content.title,
				description: content.description
			},
			history: content.history,
			exportedAt: new Date().toISOString()
		};

		return JSON.stringify(export_data, null, 2);
	}

	/**
	 * Import version history from JSON
	 */
	public importVersionHistory(jsonData: string): CodeBlockContent | null {
		try {
			const data = JSON.parse(jsonData);

			if (!data.currentVersion || !Array.isArray(data.history)) {
				throw new Error('Invalid version history format');
			}

			return {
				code: data.currentVersion.code,
				language: data.currentVersion.language,
				title: data.currentVersion.title,
				description: data.currentVersion.description,
				version: data.currentVersion.version,
				history: data.history.map((h: any) => ({
					...h,
					timestamp: new Date(h.timestamp)
				})),
				executable: true
			};
		} catch (error) {
			// Failed to import version history
			return null;
		}
	}
}

export interface DiffStats {
	added: number;
	removed: number;
	modified: number;
}

export interface DiffLine {
	type: 'added' | 'removed' | 'unchanged';
	content: string;
	lineNumber: number;
}

export const codeVersioningService = CodeVersioningService.getInstance();
