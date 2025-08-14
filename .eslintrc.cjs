/* eslint-env node */
/* eslint-disable no-undef */
module.exports = {
	root: true,
	env: { browser: true, node: true, es2021: true },
	parser: '@typescript-eslint/parser',
	parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
	plugins: ['@typescript-eslint'],
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	ignorePatterns: ['node_modules', '.vscode', '.kiro', '.windsurf', '**/generated/**'],
	rules: {
		'@typescript-eslint/no-unused-vars': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/ban-ts-comment': 'off',
		'no-case-declarations': 'off',
		'no-mixed-spaces-and-tabs': 'off',
		'no-empty': 'off',
		'no-useless-escape': 'off'
	}
};

/* eslint-enable no-undef */
