import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Optimize build performance
		target: 'esnext',
		minify: 'esbuild',
		sourcemap: false,
		// Code splitting and chunk optimization
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// Vendor chunks
					if (id.includes('node_modules')) {
						if (id.includes('@codemirror') || id.includes('codemirror')) {
							return 'vendor-codemirror';
						}
						if (id.includes('@modelcontextprotocol/sdk')) {
							return 'vendor-mcp';
						}
						if (id.includes('idb')) {
							return 'vendor-storage';
						}
						return 'vendor';
					}

					// Component chunks
					if (id.includes('src/lib/components/ui/')) {
						return 'components-ui';
					}
					if (id.includes('src/lib/components/') &&
						(id.includes('Interactive') || id.includes('Neural') || id.includes('Simulation'))) {
						return 'components-interactive';
					}
					if (id.includes('src/lib/components/') &&
						(id.includes('Knowledge') || id.includes('Progress'))) {
						return 'components-knowledge';
					}

					// Service chunks
					if (id.includes('src/lib/services/')) {
						return 'services';
					}

					// Utils chunks
					if (id.includes('src/lib/utils/')) {
						return 'utils';
					}
				}
			}
		},
		// Chunk size warning limit
		chunkSizeWarningLimit: 1000
	},
	// Performance optimizations
	optimizeDeps: {
		include: [
			'@codemirror/lang-css',
			'@codemirror/lang-html',
			'@codemirror/lang-javascript',
			'@codemirror/lang-json',
			'@codemirror/lang-markdown',
			'@codemirror/lang-python',
			'codemirror',
			'idb'
		],
		exclude: ['@modelcontextprotocol/sdk']
	},
	// Server configuration for development
	server: {
		fs: {
			strict: false
		}
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['src/test-setup.ts']
	}
});
