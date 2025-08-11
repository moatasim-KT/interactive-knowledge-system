<script lang="ts">
	import type { CodeBlockContent } from '$lib/types/code.js';

	let code_content = $state<CodeBlockContent>({
		code: `// Welcome to the Interactive Code Editor!
console.log("Hello, World!");

// Try editing this code and click execute
function fibonacci(n) {
	if (n <= 1) return n;
	return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
	console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,
		language: 'javascript',
		title: 'Fibonacci Example',
		description: 'A simple recursive Fibonacci implementation',
		executable: true,
		version: 1,
		history: []
	});

	function handle_content_change(new_content) {
		code_content = new_content;
	}

	function handle_execute(result: any) {
		console.log('Code executed:', result);
	}

	function handle_version_created(new_content) {
		console.log('Version created:', new_content);
	}
</script>

<svelte:head>
	<title>Code Editor Demo - Interactive Knowledge System</title>
	<meta
		name="description"
		content="Demo of the interactive code editor with syntax highlighting and execution capabilities"
	/>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-6xl mx-auto">
		<header class="mb-8">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">Interactive Code Editor Demo</h1>
			<p class="text-lg text-gray-600 mb-6">
				Experience our advanced code editor with syntax highlighting, live execution, and version
				control.
			</p>
		</header>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Code Editor -->
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow-lg p-6">
					<h2 class="text-2xl font-semibold text-gray-800 mb-4">🚀 Live Code Editor</h2>
					<p class="text-gray-600 mb-4">
						Edit the code below and click execute to see it run in real-time.
					</p>

					<div class="code-demo-placeholder">
						<div class="demo-header">
							<span class="language-badge">{code_content.language}</span>
							<span class="version-info">v{code_content.version}</span>
						</div>
						<textarea
							bind:value={code_content.code}
							class="code-textarea"
							rows="20"
							placeholder="Enter your code here..."
						></textarea>
						<div class="demo-actions">
							<button class="demo-btn">▶️ Execute</button>
							<button class="demo-btn">💾 Save Version</button>
							<button class="demo-btn">📚 History</button>
						</div>
					</div>
				</div>

				<!-- Language Examples -->
				<div class="bg-white rounded-lg shadow-lg p-6">
					<h3 class="text-xl font-semibold text-gray-800 mb-4">📚 Try Different Languages</h3>
					<div class="grid grid-cols-2 gap-4">
						<button
							onclick={() => {
								code_content = {
									...code_content,
									code: `print("Hello from Python!")
for i in range(5):
    print(f"Count: {i}")`,
									language: 'python',
									title: 'Python Example'
								};
							}}
							class="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-800 font-medium transition-colors"
						>
							🐍 Python
						</button>

						<button
							onclick={() => {
								code_content = {
									...code_content,
									code: `<!DOCTYPE html>
<html>
<head>
    <title>Hello World</title>
</head>
<body>
    <h1>Hello, HTML!</h1>
    <p>This is a simple HTML example.</p>
</body>
</html>`,
									language: 'html',
									title: 'HTML Example'
								};
							}}
							class="p-3 bg-orange-100 hover:bg-orange-200 rounded-lg text-orange-800 font-medium transition-colors"
						>
							🌐 HTML
						</button>

						<button
							onclick={() => {
								code_content = {
									...code_content,
									code: `const users = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
  { name: "Charlie", age: 35 }
];

const adults = users.filter(user => user.age >= 18);
console.log("Adult users:", adults);`,
									language: 'javascript',
									title: 'JavaScript Example'
								};
							}}
							class="p-3 bg-yellow-100 hover:bg-yellow-200 rounded-lg text-yellow-800 font-medium transition-colors"
						>
							⚡ JavaScript
						</button>

						<button
							onclick={() => {
								code_content = {
									...code_content,
									code: `{
  "name": "Interactive Knowledge System",
  "version": "1.0.0",
  "features": [
    "Code Editor",
    "Syntax Highlighting",
    "Live Execution",
    "Version Control"
  ],
  "supported_languages": ["JavaScript", "Python", "HTML", "CSS"]
}`,
									language: 'json',
									title: 'JSON Example'
								};
							}}
							class="p-3 bg-green-100 hover:bg-green-200 rounded-lg text-green-800 font-medium transition-colors"
						>
							📄 JSON
						</button>
					</div>
				</div>
			</div>

			<!-- Features Overview -->
			<div class="space-y-6">
				<div class="bg-white rounded-lg shadow-lg p-6">
					<h2 class="text-2xl font-semibold text-gray-800 mb-4">✨ Key Features</h2>
					<div class="space-y-4">
						<div class="flex items-start space-x-3">
							<div
								class="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center"
							>
								<span class="text-blue-600 text-sm">🎨</span>
							</div>
							<div>
								<h4 class="font-semibold text-gray-800">Syntax Highlighting</h4>
								<p class="text-gray-600 text-sm">
									Beautiful syntax highlighting for multiple programming languages using CodeMirror.
								</p>
							</div>
						</div>

						<div class="flex items-start space-x-3">
							<div
								class="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center"
							>
								<span class="text-green-600 text-sm">▶️</span>
							</div>
							<div>
								<h4 class="font-semibold text-gray-800">Live Execution</h4>
								<p class="text-gray-600 text-sm">
									Execute JavaScript and Python code directly in the browser with real-time output.
								</p>
							</div>
						</div>

						<div class="flex items-start space-x-3">
							<div
								class="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center"
							>
								<span class="text-purple-600 text-sm">📚</span>
							</div>
							<div>
								<h4 class="font-semibold text-gray-800">Version Control</h4>
								<p class="text-gray-600 text-sm">
									Track changes with built-in version history and restore previous versions.
								</p>
							</div>
						</div>

						<div class="flex items-start space-x-3">
							<div
								class="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center"
							>
								<span class="text-red-600 text-sm">🔧</span>
							</div>
							<div>
								<h4 class="font-semibold text-gray-800">Error Highlighting</h4>
								<p class="text-gray-600 text-sm">
									Real-time error detection and highlighting for supported languages.
								</p>
							</div>
						</div>

						<div class="flex items-start space-x-3">
							<div
								class="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center"
							>
								<span class="text-yellow-600 text-sm">🚀</span>
							</div>
							<div>
								<h4 class="font-semibold text-gray-800">Code Sharing</h4>
								<p class="text-gray-600 text-sm">
									Share code snippets with others and collaborate on projects.
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Current Code Info -->
				<div class="bg-white rounded-lg shadow-lg p-6">
					<h3 class="text-xl font-semibold text-gray-800 mb-4">📊 Current Code Info</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-600">Language:</span>
							<span class="font-medium text-gray-800">{code_content.language}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Version:</span>
							<span class="font-medium text-gray-800">v{code_content.version}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Lines:</span>
							<span class="font-medium text-gray-800">{code_content.code.split('\n').length}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Characters:</span>
							<span class="font-medium text-gray-800">{code_content.code.length}</span>
						</div>
						{#if code_content.lastExecuted}
							<div class="flex justify-between">
								<span class="text-gray-600">Last Executed:</span>
								<span class="font-medium text-gray-800"
									>{code_content.lastExecuted.toLocaleTimeString()}</span
								>
							</div>
						{/if}
					</div>
				</div>

				<!-- Tips -->
				<div class="bg-blue-50 rounded-lg p-6">
					<h3 class="text-lg font-semibold text-blue-800 mb-3">💡 Pro Tips</h3>
					<ul class="space-y-2 text-sm text-blue-700">
						<li>
							• Use <kbd class="px-2 py-1 bg-blue-200 rounded text-xs">Ctrl+S</kbd> to save your code
						</li>
						<li>
							• Use <kbd class="px-2 py-1 bg-blue-200 rounded text-xs">Ctrl+Z</kbd> to undo changes
						</li>
						<li>• Click the version history button to see all changes</li>
						<li>• Try the format button to clean up your code</li>
						<li>• JavaScript code runs in a secure sandbox environment</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	kbd {
		font-family: ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo,
			monospace;
	}

	.code-demo-placeholder {
		border: 1px solid #e0e0e0;
		border-radius: 8px;
		background: #fff;
		overflow: hidden;
	}

	.demo-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border-bottom: 1px solid #e0e0e0;
	}

	.language-badge {
		background: #007bff;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 500;
	}

	.version-info {
		font-size: 0.8rem;
		color: #666;
		background: #e9ecef;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
	}

	.code-textarea {
		width: 100%;
		padding: 1rem;
		border: none;
		background: #f8f9fa;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.9rem;
		line-height: 1.4;
		resize: vertical;
		outline: none;
	}

	.demo-actions {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: #f8f9fa;
		border-top: 1px solid #e0e0e0;
	}

	.demo-btn {
		padding: 0.5rem 1rem;
		border: 1px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s;
	}

	.demo-btn:hover {
		background: #f0f0f0;
		border-color: #ccc;
	}
</style>
