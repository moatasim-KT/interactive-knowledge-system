#!/usr/bin/env node

/**
 * Dependency analyzer script
 * Analyzes package.json dependencies and identifies unused packages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DependencyAnalyzer {
	constructor() {
		this.projectRoot = path.resolve(__dirname, '..');
		this.packageJson = this.loadPackageJson();
		this.usedDependencies = new Set();
		this.fileExtensions = ['.js', '.ts', '.svelte', '.json'];
	}

	loadPackageJson() {
		const packagePath = path.join(this.projectRoot, 'package.json');
		return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
	}

	async analyzeDependencies() {
		console.log('🔍 Analyzing dependencies...\n');

		// Scan all source files for imports
		await this.scanDirectory(path.join(this.projectRoot, 'src'));
		await this.scanDirectory(path.join(this.projectRoot, 'scripts'));

		// Check configuration files
		this.scanConfigFiles();

		// Generate report
		this.generateReport();
	}

	async scanDirectory(dirPath) {
		if (!fs.existsSync(dirPath)) {
			return;
		}

		const entries = fs.readdirSync(dirPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry.name);

			if (entry.isDirectory()) {
				// Skip node_modules and build directories
				if (!['node_modules', '.svelte-kit', 'dist', 'build'].includes(entry.name)) {
					await this.scanDirectory(fullPath);
				}
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name);
				if (this.fileExtensions.includes(ext)) {
					this.scanFile(fullPath);
				}
			}
		}
	}

	scanFile(filePath) {
		try {
			const content = fs.readFileSync(filePath, 'utf8');

			// Match import statements
			const importRegex = /(?:import|from)\s+['"`]([^'"`]+)['"`]/g;
			const requireRegex = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

			let match;

			// Scan ES6 imports
			while ((match = importRegex.exec(content)) !== null) {
				this.addDependency(match[1]);
			}

			// Scan CommonJS requires
			while ((match = requireRegex.exec(content)) !== null) {
				this.addDependency(match[1]);
			}
		} catch (error) {
			console.warn(`Warning: Could not read file ${filePath}:`, error.message);
		}
	}

	scanConfigFiles() {
		const configFiles = [
			'vite.config.ts',
			'svelte.config.js',
			'tsconfig.json',
			'eslint.config.cjs',
			'.eslintrc.cjs'
		];

		configFiles.forEach(configFile => {
			const configPath = path.join(this.projectRoot, configFile);
			if (fs.existsSync(configPath)) {
				this.scanFile(configPath);
			}
		});
	}

	addDependency(importPath) {
		// Extract package name from import path
		let packageName = importPath;

		// Handle scoped packages
		if (importPath.startsWith('@')) {
			const parts = importPath.split('/');
			packageName = parts.slice(0, 2).join('/');
		} else {
			// Handle regular packages
			packageName = importPath.split('/')[0];
		}

		// Skip relative imports and built-in modules
		if (
			!importPath.startsWith('.') &&
			!importPath.startsWith('/') &&
			!this.isBuiltinModule(packageName)
		) {
			this.usedDependencies.add(packageName);
		}
	}

	isBuiltinModule(moduleName) {
		const builtinModules = [
			'fs',
			'path',
			'url',
			'util',
			'os',
			'crypto',
			'events',
			'stream',
			'buffer',
			'process',
			'child_process',
			'cluster',
			'dgram',
			'dns',
			'domain',
			'http',
			'https',
			'net',
			'querystring',
			'readline',
			'repl',
			'string_decoder',
			'tls',
			'tty',
			'vm',
			'zlib'
		];
		return builtinModules.includes(moduleName);
	}

	generateReport() {
		const allDependencies = {
			...(this.packageJson.dependencies || {}),
			...(this.packageJson.devDependencies || {})
		};

		const unusedDependencies = [];
		const usedDependencies = [];

		Object.keys(allDependencies).forEach(dep => {
			if (this.usedDependencies.has(dep)) {
				usedDependencies.push(dep);
			} else {
				unusedDependencies.push(dep);
			}
		});

		// Calculate sizes
		const totalDependencies = Object.keys(allDependencies).length;
		const usedCount = usedDependencies.length;
		const unusedCount = unusedDependencies.length;

		console.log('📊 Dependency Analysis Report');
		console.log('='.repeat(50));
		console.log(`Total dependencies: ${totalDependencies}`);
		console.log(
			`Used dependencies: ${usedCount} (${Math.round((usedCount / totalDependencies) * 100)}%)`
		);
		console.log(
			`Unused dependencies: ${unusedCount} (${Math.round((unusedCount / totalDependencies) * 100)}%)`
		);
		console.log('');

		if (unusedDependencies.length > 0) {
			console.log('🚨 Potentially unused dependencies:');
			console.log('-'.repeat(40));
			unusedDependencies.sort().forEach(dep => {
				const version = allDependencies[dep];
				console.log(`  • ${dep}@${version}`);
			});
			console.log('');
			console.log('💡 Consider removing these dependencies to reduce bundle size:');
			console.log(`   npm uninstall ${unusedDependencies.join(' ')}`);
			console.log('');
		} else {
			console.log('✅ All dependencies appear to be in use!');
			console.log('');
		}

		// Show large dependencies that might benefit from optimization
		console.log('📦 Dependencies by category:');
		console.log('-'.repeat(40));

		const categories = this.categorizeDependencies(usedDependencies);
		Object.entries(categories).forEach(([category, deps]) => {
			if (deps.length > 0) {
				console.log(`${category}: ${deps.length} packages`);
				deps.forEach(dep => console.log(`  • ${dep}`));
				console.log('');
			}
		});

		// Recommendations
		this.generateRecommendations(unusedDependencies, categories);
	}

	categorizeDependencies(dependencies) {
		const categories = {
			'UI/Components': [],
			'Build Tools': [],
			Testing: [],
			'Code Quality': [],
			Utilities: [],
			Framework: [],
			Other: []
		};

		dependencies.forEach(dep => {
			if (dep.includes('svelte') || dep.includes('kit')) {
				categories['Framework'].push(dep);
			} else if (dep.includes('vite') || dep.includes('rollup') || dep.includes('esbuild')) {
				categories['Build Tools'].push(dep);
			} else if (
				dep.includes('test') ||
				dep.includes('vitest') ||
				dep.includes('jest') ||
				dep.includes('jsdom')
			) {
				categories['Testing'].push(dep);
			} else if (dep.includes('eslint') || dep.includes('prettier') || dep.includes('typescript')) {
				categories['Code Quality'].push(dep);
			} else if (dep.includes('codemirror') || dep.startsWith('@codemirror')) {
				categories['UI/Components'].push(dep);
			} else if (dep === 'idb' || dep.includes('util')) {
				categories['Utilities'].push(dep);
			} else {
				categories['Other'].push(dep);
			}
		});

		return categories;
	}

	generateRecommendations(unusedDependencies, categories) {
		console.log('💡 Optimization Recommendations:');
		console.log('-'.repeat(40));

		if (unusedDependencies.length > 0) {
			console.log(
				`1. Remove ${unusedDependencies.length} unused dependencies to reduce bundle size`
			);
		}

		if (categories['UI/Components'].length > 5) {
			console.log('2. Consider lazy loading UI components to improve initial load time');
		}

		if (categories['Utilities'].length > 3) {
			console.log(
				'3. Review utility dependencies - some might be replaceable with native functions'
			);
		}

		console.log('4. Use dynamic imports for large dependencies that are not always needed');
		console.log('5. Consider using a bundler analyzer to visualize actual bundle impact');
		console.log('');

		console.log('🔧 Next steps:');
		console.log('1. Review the unused dependencies list carefully');
		console.log('2. Test your application after removing dependencies');
		console.log('3. Run `npm run build` to see the impact on bundle size');
		console.log('4. Consider implementing lazy loading for large components');
	}
}

// Run the analyzer
const analyzer = new DependencyAnalyzer();
analyzer.analyzeDependencies().catch(console.error);
