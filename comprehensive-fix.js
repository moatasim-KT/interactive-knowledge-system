#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Comprehensive fixes for all remaining lint errors
const fixes = [
	// Remove unused imports
	{
		file: 'src/lib/types/component-types.d.ts',
		replacements: [
			{ from: "import type { SvelteComponentProps } from 'svelte';", to: '' },
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/types/domain.ts',
		replacements: [
			{
				from: "import type { ContentBlock, KnowledgeNode, UserSettings } from './index.js';",
				to: ''
			},
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/types/services.ts',
		replacements: [
			{
				from: "import type { ContentModule, KnowledgeNode, UserProgress, LearningPath, AsyncState } from './index.js';",
				to: "import type { ContentModule, UserProgress, LearningPath } from './index.js';"
			},
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/types/web-content.ts',
		replacements: [
			{ from: "import type { ContentModule } from './content.js';", to: '' },
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/utils/importUtils.ts',
		replacements: [
			{
				from: "import type { ContentModule, UserProgress, LearningPath, KnowledgeNode } from '../types/index.js';",
				to: "import type { ContentModule, UserProgress } from '../types/index.js';"
			},
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/utils/migrationUtils.ts',
		replacements: [
			{
				from: "import type { ContentModule, UserProgress, LearningPath, KnowledgeNode, UserSettings } from '../types/index.js';",
				to: "import type { UserProgress } from '../types/index.js';"
			},
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/utils/backupUtils.ts',
		replacements: [
			{ from: "import { storage } from '../storage/indexeddb.js';", to: '' },
			{ from: '} catch (error) {', to: '} catch {' },
			{ from: '(id: string) => {', to: '(_id: string) => {' },
			{ from: '(module: ContentModule) => {', to: '(_module: ContentModule) => {' },
			{ from: '(progress: UserProgress) => {', to: '(_progress: UserProgress) => {' },
			{ from: '(path: LearningPath) => {', to: '(_path: LearningPath) => {' },
			{ from: '(node: KnowledgeNode) => {', to: '(_node: KnowledgeNode) => {' },
			{ from: '(settings: UserSettings) => {', to: '(_settings: UserSettings) => {' }
		]
	},
	// Fix unused variables in catch blocks
	{
		file: 'src/lib/utils/performance.ts',
		replacements: [
			{ from: '} catch (error) {', to: '} catch {' },
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/utils/codeExecution.ts',
		replacements: [
			{ from: 'const original_console = console;', to: 'console;' },
			{ from: '(environment: string) => {', to: '(_environment: string) => {' },
			{ from: ': any', to: ': unknown' }
		]
	},
	{
		file: 'src/lib/utils/codeVersioning.ts',
		replacements: [
			{ from: '} catch (error) {', to: '} catch {' },
			{ from: ': any', to: ': unknown' }
		]
	},
	// Fix route files
	{
		file: 'src/routes/code-demo/+page.svelte',
		replacements: [
			{
				from: 'let handle_content_change = (content: string) => {',
				to: '// let handle_content_change = (content: string) => {'
			},
			{
				from: 'let handle_execute = (result: any) => {',
				to: '// let handle_execute = (result: unknown) => {'
			},
			{
				from: 'let handle_version_created = (version: CodeVersion) => {',
				to: '// let handle_version_created = (version: CodeVersion) => {'
			}
		]
	},
	{
		file: 'src/routes/demo-interactive-viz/+page.svelte',
		replacements: [
			{
				from: "import type { InteractiveVisualizationBlock as IVBType, InteractiveChartBlock as ICBType, SimulationBlock as SBType } from '$lib/types/web-content.js';",
				to: ''
			}
		]
	},
	{
		file: 'src/routes/mcp-demo/+page.svelte',
		replacements: [
			{ from: "import { webContentFetcher } from '$lib/services/webContentFetcher.js';", to: '' },
			{ from: "import { LoadingSpinner } from '$lib/components/index.js';", to: '' },
			{ from: "let testUrl = '';", to: "// let testUrl = '';" },
			{ from: 'let isProcessing = false;', to: '// let isProcessing = false;' }
		]
	}
];

// Apply fixes
let totalFixed = 0;
fixes.forEach(({ file, replacements }) => {
	const filePath = path.join(__dirname, file);
	if (fs.existsSync(filePath)) {
		let content = fs.readFileSync(filePath, 'utf8');
		let fileFixed = false;

		replacements.forEach(({ from, to }) => {
			const regex = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
			if (content.match(regex)) {
				content = content.replace(regex, to);
				fileFixed = true;
			}
		});

		if (fileFixed) {
			fs.writeFileSync(filePath, content);
			console.log(`Fixed ${file}`);
			totalFixed++;
		}
	}
});

console.log(`\nTotal files fixed: ${totalFixed}`);
console.log('Comprehensive lint fixes applied');
