/**
 * Code execution utilities for supported languages
 */

import type { CodeExecutionResult, CodeExecutionEnvironment } from '$lib/types/code.js';

export class CodeExecutionService {
	private static instance: CodeExecutionService;
	private executionEnvironments: Map<string, CodeExecutionEnvironment> = new Map();

	private constructor() {
		this.initializeEnvironments();
	}

	public static getInstance(): CodeExecutionService {
		if (!CodeExecutionService.instance) {
			CodeExecutionService.instance = new CodeExecutionService();
		}
		return CodeExecutionService.instance;
	}

	private initializeEnvironments() {
		// JavaScript environment
		this.executionEnvironments.set('javascript', {
			language: 'javascript',
			timeout: 5000,
			memoryLimit: 50 * 1024 * 1024, // 50MB
			allowNetworkAccess: false,
			allowFileSystem: false
		});

		// Python environment (simulated)
		this.executionEnvironments.set('python', {
			language: 'python',
			timeout: 10000,
			memoryLimit: 100 * 1024 * 1024, // 100MB
			allowNetworkAccess: false,
			allowFileSystem: false
		});

		// HTML environment
		this.executionEnvironments.set('html', {
			language: 'html',
			timeout: 3000,
			memoryLimit: 25 * 1024 * 1024, // 25MB
			allowNetworkAccess: false,
			allowFileSystem: false
		});
	}

	public async executeCode(
		code: string,
		language: string,
		customEnvironment?: Partial<CodeExecutionEnvironment>
	): Promise<CodeExecutionResult> {
		const start_time = performance.now();
		const environment = this.executionEnvironments.get(language);

		if (!environment) {
			return {
				success: false,
				error: `Execution not supported for language: ${language}`,
				executionTime: 0,
				timestamp: new Date()
			};
		}

		try {
			let result: CodeExecutionResult;

			switch (language) {
				case 'javascript':
					result = await this.executeJavaScript(code, environment);
					break;
				case 'python':
					result = await this.executePython(code, environment);
					break;
				case 'html':
					result = await this.executeHTML(code, environment);
					break;
				default:
					result = {
						success: false,
						error: `Execution not implemented for language: ${language}`,
						executionTime: 0,
						timestamp: new Date()
					};
			}

			result.executionTime = performance.now() - start_time;
			return result;
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown execution error',
				executionTime: performance.now() - start_time,
				timestamp: new Date()
			};
		}
	}

	private async executeJavaScript(
		code: string,
		environment: CodeExecutionEnvironment
	): Promise<CodeExecutionResult> {
		return new Promise((resolve) => {
			const timeout = setTimeout(() => {
				resolve({
					success: false,
					error: 'Execution timeout exceeded',
					executionTime: environment.timeout,
					timestamp: new Date()
				});
			}, environment.timeout);

			try {
				// Create a sandboxed execution context
				const original_console = console;
				const logs: string[] = [];

				// Override console methods to capture output
				const sandbox_console = {
					log: (...args: any[]) => logs.push(args.map((arg) => String(arg)).join(' ')),
					error: (...args: any[]) =>
						logs.push('ERROR: ' + args.map((arg) => String(arg)).join(' ')),
					warn: (...args: any[]) => logs.push('WARN: ' + args.map((arg) => String(arg)).join(' ')),
					info: (...args: any[]) => logs.push('INFO: ' + args.map((arg) => String(arg)).join(' '))
				};

				// Create a restricted global context
				const sandbox_globals = {
					console: sandbox_console,
					Math,
					Date,
					JSON,
					Array,
					Object,
					String,
					Number,
					Boolean,
					RegExp,
					setTimeout: (fn: () => void, delay: number) => {
						if (delay > 1000) delay = 1000; // Limit timeout duration
						return setTimeout(fn, delay);
					},
					clearTimeout
				};

				// Execute code in sandbox
				const func = new Function(
					...Object.keys(sandbox_globals),
					`
					"use strict";
					try {
						${code}
					} catch (error) {
						console.error(error.message);
						throw error;
					}
					`
				);

				const result = func(...Object.values(sandbox_globals));

				clearTimeout(timeout);
				resolve({
					success: true,
					output: logs.length > 0 ? logs.join('\n') : result !== undefined ? String(result) : '',
					executionTime: 0,
					timestamp: new Date()
				});
			} catch (error) {
				clearTimeout(timeout);
				resolve({
					success: false,
					error: error instanceof Error ? error.message : 'JavaScript execution error',
					executionTime: 0,
					timestamp: new Date()
				});
			}
		});
	}

	private async executePython(
		code: string,
		environment: CodeExecutionEnvironment
	): Promise<CodeExecutionResult> {
		// For now, we'll simulate Python execution
		// In a real implementation, you might use Pyodide or a server-side Python interpreter
		return new Promise((resolve) => {
			setTimeout(() => {
				if (code.includes('print(')) {
					const print_matches = code.match(/print\((.*?)\)/g);
					const output =
						print_matches
							?.map((match) => {
								const content = match.replace(/print\((.*?)\)/, '$1');
								// Simple evaluation for basic cases
								try {
									return eval(content.replace(/'/g, '"'));
								} catch {
									return content.replace(/['"]/g, '');
								}
							})
							.join('\n') || '';

					resolve({
						success: true,
						output,
						executionTime: 0,
						timestamp: new Date()
					});
				} else {
					resolve({
						success: true,
						output: 'Python code executed (simulation)',
						executionTime: 0,
						timestamp: new Date()
					});
				}
			}, 100);
		});
	}

	private async executeHTML(
		code: string,
		environment: CodeExecutionEnvironment
	): Promise<CodeExecutionResult> {
		try {
			// Create a sandboxed iframe for HTML execution
			const iframe = document.createElement('iframe');
			iframe.style.display = 'none';
			iframe.sandbox = 'allow-scripts';
			document.body.appendChild(iframe);

			return new Promise((resolve) => {
				const timeout = setTimeout(() => {
					document.body.removeChild(iframe);
					resolve({
						success: false,
						error: 'HTML execution timeout',
						executionTime: environment.timeout,
						timestamp: new Date()
					});
				}, environment.timeout);

				iframe.onload = () => {
					try {
						if (iframe.contentDocument) {
							iframe.contentDocument.open();
							iframe.contentDocument.write(code);
							iframe.contentDocument.close();
						}

						clearTimeout(timeout);
						setTimeout(() => {
							document.body.removeChild(iframe);
							resolve({
								success: true,
								output: 'HTML rendered successfully',
								executionTime: 0,
								timestamp: new Date()
							});
						}, 500);
					} catch (error) {
						clearTimeout(timeout);
						document.body.removeChild(iframe);
						resolve({
							success: false,
							error: error instanceof Error ? error.message : 'HTML execution error',
							executionTime: 0,
							timestamp: new Date()
						});
					}
				};

				iframe.src = 'about:blank';
			});
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : 'HTML execution setup error',
				executionTime: 0,
				timestamp: new Date()
			};
		}
	}

	public isLanguageExecutable(language: string): boolean {
		const environment = this.executionEnvironments.get(language);
		return environment !== undefined;
	}

	public getSupportedLanguages(): string[] {
		return Array.from(this.executionEnvironments.keys());
	}
}

export const codeExecutionService = CodeExecutionService.getInstance();
