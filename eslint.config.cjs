const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const globals = require('globals');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const svelte = require('eslint-plugin-svelte');
const svelteParser = require('svelte-eslint-parser');
const tsParser = require('@typescript-eslint/parser');

const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended
});

module.exports = [
	...compat.extends('eslint:recommended', 'plugin:@typescript-eslint/recommended'),
	...svelte.configs['flat/recommended'],
	{
		ignores: [
			'node_modules/**',
			'.svelte-kit/**',
			'build/**',
			'dist/**',
			'coverage/**',
			'*.config.js',
			'*.config.ts',
			'*.config.cjs',
			'**/*.d.ts'
		]
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser,
				extraFileExtensions: ['.svelte']
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
				// Svelte 5 runes
				$state: 'readonly',
				$derived: 'readonly',
				$effect: 'readonly',
				$props: 'readonly',
				$bindable: 'readonly',
				$inspect: 'readonly',
				// IndexedDB types
				IDBValidKey: 'readonly',
				IDBIndexParameters: 'readonly',
				// Node.js types
				NodeJS: 'readonly',
				RequestInit: 'readonly',
				EventListener: 'readonly'
			}
		},
		rules: {
			// TypeScript rules for Svelte files - relaxed for existing code
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',

			// Svelte-specific rules - relaxed for existing code
			'svelte/no-unused-svelte-ignore': 'off',
			'svelte/no-unused-class-name': 'off',
			'svelte/valid-compile': 'off', // Turn off to avoid accessibility warnings
			'svelte/no-at-html-tags': 'off', // Allow {@html} for rich content

			// Essential rules only
			'no-console': 'off', // Allow console for debugging
			'no-debugger': 'error',
			'no-alert': 'off', // Allow alerts for user interaction
			'no-undef': 'off', // Turn off for Svelte components with complex state
			'prefer-const': 'off', // Turn off for Svelte props
			'no-var': 'error',
			'no-useless-escape': 'off', // Allow escape characters in regex
			'no-case-declarations': 'off', // Allow declarations in case blocks
			'no-mixed-spaces-and-tabs': 'error',
			'no-empty': 'off' // Allow empty blocks
		}
	},
	{
		files: ['**/*.ts', '**/*.js'],
		plugins: {
			'@typescript-eslint': typescriptEslint
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module'
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.es2021,
				// Svelte 5 runes
				$state: 'readonly',
				$derived: 'readonly',
				$effect: 'readonly',
				$props: 'readonly',
				$bindable: 'readonly',
				$inspect: 'readonly',
				// IndexedDB types
				IDBValidKey: 'readonly',
				IDBIndexParameters: 'readonly',
				// Node.js types
				NodeJS: 'readonly',
				RequestInit: 'readonly',
				EventListener: 'readonly'
			}
		},
		rules: {
			// TypeScript-specific rules - relaxed for existing code
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-inferrable-types': 'off',
			'@typescript-eslint/no-non-null-assertion': 'off',

			// Essential rules only
			'no-console': 'off', // Allow console for debugging
			'no-debugger': 'error',
			'no-alert': 'off', // Allow alerts for user interaction
			'no-eval': 'off', // Allow eval in code execution contexts
			'no-new-func': 'off', // Allow Function constructor
			'no-undef': 'off', // Turn off for complex variable scoping
			'prefer-const': 'off', // Turn off for existing code patterns
			'no-var': 'error',
			eqeqeq: ['error', 'always'],
			curly: ['error', 'all'],
			'no-useless-escape': 'off', // Allow escape characters in regex
			'no-case-declarations': 'off', // Allow declarations in case blocks
			'no-mixed-spaces-and-tabs': 'error',
			'no-empty': 'off' // Allow empty blocks
		}
	},
	{
		files: ['**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'no-console': 'off'
		}
	}
];
