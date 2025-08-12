/**
 * Export utilities for different formats
 */

import type {
	ContentModule,
	UserProgress,
	LearningPath,
	KnowledgeNode,
	UserSettings
} from '../types/index.js';

/**
 * Export data structure containing all user data
 */
export interface ExportData {
	version: string;
	exportDate: Date;
	modules: ContentModule[];
	progress: UserProgress[];
	paths: LearningPath[];
	nodes: KnowledgeNode[];
	settings: UserSettings;
	metadata: {
		totalModules: number;
		totalProgress: number;
		exportFormat: string;
	};
}

/**
 * SCORM package structure for e-learning compatibility
 */
export interface SCORMPackage {
	manifest: {
		identifier: string;
		version: string;
		title: string;
		description: string;
		organizations: SCORMOrganization[];
		resources: SCORMResource[];
	};
	content: {
		[resourceId: string]: string;
	};
}

export interface SCORMOrganization {
	identifier: string;
	title: string;
	items: SCORMItem[];
}

export interface SCORMItem {
	identifier: string;
	title: string;
	resourceRef?: string;
	children?: SCORMItem[];
}

export interface SCORMResource {
	identifier: string;
	type: string;
	href: string;
	files: string[];
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: ExportData): string {
	return JSON.stringify(data, null, 2);
}

/**
 * Export data to Markdown format
 */
export function exportToMarkdown(data: ExportData): string {
	let markdown = `# Knowledge Base Export\n\n`;
	markdown += `**Export Date:** ${data.exportDate.toISOString()}\n`;
	markdown += `**Version:** ${data.version}\n`;
	markdown += `**Total Modules:** ${data.metadata.totalModules}\n\n`;

	// Export modules
	markdown += `## Modules\n\n`;
	for (const module of data.modules) {
		markdown += `### ${module.title}\n\n`;
		markdown += `**Description:** ${module.description}\n`;
		markdown += `**Difficulty:** ${module.metadata.difficulty}/5\n`;
		markdown += `**Estimated Time:** ${module.metadata.estimatedTime} minutes\n`;
		markdown += `**Tags:** ${module.metadata.tags.join(', ')}\n\n`;

		// Export content blocks
		for (const block of module.blocks) {
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
				case 'quiz':
					markdown += `**Quiz:** ${block.content.question}\n`;
					if (block.content.options) {
						for (let i = 0; i < block.content.options.length; i++) {
							markdown += `${i + 1}. ${block.content.options[i]}\n`;
						}
					}
					markdown += `\n`;
					break;
				default:
					markdown += `*[${block.type} content]*\n\n`;
			}
		}
		markdown += `---\n\n`;
	}

	// Export learning paths
	if (data.paths.length > 0) {
		markdown += `## Learning Paths\n\n`;
		for (const path of data.paths) {
			markdown += `### ${path.name}\n\n`;
			markdown += `**Description:** ${path.description}\n`;
			markdown += `**Difficulty:** ${path.difficulty}/5\n`;
			markdown += `**Estimated Duration:** ${path.estimatedDuration} minutes\n`;
			markdown += `**Modules:** ${path.modules.length}\n\n`;
		}
	}

	return markdown;
}

/**
 * Export data to SCORM format
 */
export function exportToSCORM(data: ExportData): SCORMPackage {
	const organizations: SCORMOrganization[] = [];
	const resources: SCORMResource[] = [];
	const content: { [key: string]: string } = {};

	// Create main organization
	const main_org = {
		identifier: 'ORG-1',
		title: 'Knowledge Base',
		items: []
	};

	// Convert modules to SCORM items and resources
	data.modules.forEach((module, index) => {
		const resource_id = `RES-${index + 1}`;
		const item_id = `ITEM-${index + 1}`;

		// Create SCORM item
		const item: SCORMItem = {
			identifier: item_id,
			title: module.title,
			resourceRef: resource_id
		};
		main_org.items.push(item);

		// Create SCORM resource
		const resource: SCORMResource = {
			identifier: resource_id,
			type: 'webcontent',
			href: `content_${index + 1}.html`,
			files: [`content_${index + 1}.html`]
		};
		resources.push(resource);

		// Generate HTML content
		let html = `<!DOCTYPE html>
<html>
<head>
    <title>${module.title}</title>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .content-block { margin-bottom: 20px; }
        .quiz { background: #f5f5f5; padding: 15px; border-radius: 5px; }
        code { background: #f0f0f0; padding: 2px 4px; border-radius: 3px; }
        pre { background: #f0f0f0; padding: 10px; border-radius: 5px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>${module.title}</h1>
    <p><strong>Description:</strong> ${module.description}</p>
    <p><strong>Difficulty:</strong> ${module.metadata.difficulty}/5</p>
    <p><strong>Estimated Time:</strong> ${module.metadata.estimatedTime} minutes</p>
    <p><strong>Tags:</strong> ${module.metadata.tags.join(', ')}</p>
    <hr>
`;

		// Add content blocks
		module.blocks.forEach((block) => {
			html += `<div class="content-block">`;
			switch (block.type) {
				case 'text':
					html += `<div>${block.content}</div>`;
					break;
				case 'code':
					html += `<pre><code>${escapeHtml(block.content.code)}</code></pre>`;
					break;
				case 'image':
					html += `<img src="${block.content.src}" alt="${block.content.alt || 'Image'}" style="max-width: 100%;">`;
					break;
				case 'quiz':
					html += `<div class="quiz">
                        <h3>Quiz: ${block.content.question}</h3>`;
					if (block.content.options) {
						html += `<ul>`;
						block.content.options.forEach((option: string) => {
							html += `<li>${option}</li>`;
						});
						html += `</ul>`;
					}
					html += `</div>`;
					break;
				default:
					html += `<p><em>[${block.type} content]</em></p>`;
			}
			html += `</div>`;
		});

		html += `</body></html>`;
		content[resource.href] = html;
	});

	organizations.push(main_org);

	// Create manifest
	const manifest = {
		identifier: 'MANIFEST-1',
		version: '1.0',
		title: 'Knowledge Base Export',
		description: `Exported on ${data.exportDate.toISOString()}`,
		organizations,
		resources
	};

	return {
		manifest,
		content
	};
}

/**
 * Helper function to escape HTML
 */
function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

/**
 * Create backup data structure
 */
export function createBackup(
	modules: ContentModule[],
	progress: UserProgress[],
	paths: LearningPath[],
	nodes: KnowledgeNode[],
	settings: UserSettings
): ExportData {
	return {
		version: '1.0.0',
		exportDate: new Date(),
		modules,
		progress,
		paths,
		nodes,
		settings,
		metadata: {
			totalModules: modules.length,
			totalProgress: progress.length,
			exportFormat: 'backup'
		}
	};
}
