/**
 * Import a URL via the Web Content MCP server, transform to interactive, and save results.
 * Usage: npx vite-node scripts/importContent.ts -- <url>
 */

import { webContentMcpServer as entry } from '../src/lib/mcp/web-content/index.js';

// Minimal FS for output
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
	const args = process.argv.slice(2).filter(a => a !== '--');
	const url = args[0];
	if (!url) {
		console.error('Usage: npx vite-node scripts/importContent.ts -- <url>');
		process.exit(1);
	}

	// Initialize MCP (Svelte-native server instance is already constructed inside)
	const server = (await import('../src/lib/mcp/web-content/web-content-mcp-server.js'))
		.webContentMcpServer;
	server.initialize();

	// 1) Fetch content
	const fetchResult = await server.executeTool('fetchWebContent', {
		url,
		options: {
			useHeadlessBrowser: false,
			extractInteractive: true,
			generateQuizzes: false,
			timeout: 45000
		}
	});

	if (!fetchResult?.success) {
		console.error('Fetch failed:', fetchResult);
		process.exit(2);
	}

	const fetched = fetchResult.data;
	const contentId = fetched?.id || fetched?.content?.id || fetched?.data?.id;

	// 2) Transform to interactive (if we have an id)
	let transformResult: any = null;
	if (contentId) {
		transformResult = await server
			.executeTool('transformToInteractive', {
				contentId,
				transformationType: 'auto',
				domain: 'machine-learning'
			})
			.catch((e: any) => {
				console.warn('Transform failed:', e?.message || e);
				return null;
			});
	}

	// 3) Persist results to logs directory
	const outDir = path.join(process.cwd(), 'logs');
	await fs.mkdir(outDir, { recursive: true });
	const outFile = path.join(outDir, `imported_${Date.now()}.json`);
	await fs.writeFile(
		outFile,
		JSON.stringify(
			{
				url,
				fetched,
				transform: transformResult?.data ?? null,
				timestamp: new Date().toISOString()
			},
			null,
			2
		),
		'utf-8'
	);

	console.log('Saved results to:', outFile);
}

main().catch(err => {
	console.error('Import failed:', err);
	process.exit(1);
});
