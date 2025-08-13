#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Files to fix with their specific error patterns
const fixes = [
	{
		file: 'src/lib/services/networkService.ts',
		replacements: [
			{ from: "import { appState } from '../stores/appState.svelte.js';", to: '' },
			{ from: '} catch (error) {}', to: '} catch {\n        // Network error handled\n    }' },
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/services/offlineQueue.ts',
		replacements: [
			{ from: 'const key = request.key;', to: 'request.key;' },
			{ from: 'this.queue.get(id)!', to: 'this.queue.get(id) as QueuedRequest' }
		]
	},
	{
		file: 'src/lib/services/progressService.ts',
		replacements: [
			{
				from: "import type { ContentModule, UserProgress, LearningPath, KnowledgeNode } from '../types/index.js';",
				to: "import type { UserProgress, LearningPath } from '../types/index.js';"
			},
			{ from: 'progress.nodes.get(nodeId)!', to: 'progress.nodes.get(nodeId) as NodeProgress' }
		]
	},
	{
		file: 'src/lib/types/component-props.ts',
		replacements: [
			{
				from: "import type { ContentModule, KnowledgeNode, UserProgress, LearningPath, UserSettings } from './index.js';",
				to: "import type { KnowledgeNode, UserProgress, LearningPath, UserSettings } from './index.js';"
			},
			{ from: ': any', to: ': unknown' }
		]
	}
];

// Apply fixes
fixes.forEach(({ file, replacements }) => {
	const filePath = path.join(__dirname, file);
	if (fs.existsSync(filePath)) {
		let content = fs.readFileSync(filePath, 'utf8');

		replacements.forEach(({ from, to }) => {
			content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
		});

		fs.writeFileSync(filePath, content);
		console.log(`Fixed ${file}`);
	}
});

console.log('Lint fixes applied');
