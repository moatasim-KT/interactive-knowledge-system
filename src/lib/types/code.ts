/**
 * Code block types and interfaces for syntax highlighting and execution
 */

export interface CodeBlockContent {
	code: string;
	language: string;
	title?: string;
	description?: string;
	executable?: boolean;
	output?: string;
	error?: string;
	lastExecuted?: Date;
	version: number;
	history: CodeVersion[];
}

export interface CodeVersion {
	id: string;
	code: string;
	timestamp: Date;
	description?: string;
	author?: string;
}

export interface CodeExecutionResult {
	success: boolean;
	output?: string;
	error?: string;
	executionTime: number;
	timestamp: Date;
}

export interface SupportedLanguage {
	id: string;
	name: string;
	extension: string;
	executable: boolean;
	mimeType: string;
	codemirrorMode?: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
	{
		id: 'javascript',
		name: 'JavaScript',
		extension: 'js',
		executable: true,
		mimeType: 'text/javascript',
		codemirrorMode: 'javascript'
	},
	{
		id: 'typescript',
		name: 'TypeScript',
		extension: 'ts',
		executable: false,
		mimeType: 'text/typescript',
		codemirrorMode: 'javascript'
	},
	{
		id: 'python',
		name: 'Python',
		extension: 'py',
		executable: true,
		mimeType: 'text/x-python',
		codemirrorMode: 'python'
	},
	{
		id: 'html',
		name: 'HTML',
		extension: 'html',
		executable: true,
		mimeType: 'text/html',
		codemirrorMode: 'html'
	},
	{
		id: 'css',
		name: 'CSS',
		extension: 'css',
		executable: false,
		mimeType: 'text/css',
		codemirrorMode: 'css'
	},
	{
		id: 'json',
		name: 'JSON',
		extension: 'json',
		executable: false,
		mimeType: 'application/json',
		codemirrorMode: 'json'
	},
	{
		id: 'markdown',
		name: 'Markdown',
		extension: 'md',
		executable: false,
		mimeType: 'text/markdown',
		codemirrorMode: 'markdown'
	},
	{
		id: 'sql',
		name: 'SQL',
		extension: 'sql',
		executable: false,
		mimeType: 'text/x-sql',
		codemirrorMode: 'sql'
	},
	{
		id: 'bash',
		name: 'Bash',
		extension: 'sh',
		executable: false,
		mimeType: 'text/x-sh',
		codemirrorMode: 'shell'
	}
];

export interface CodeSnippetShare {
	id: string;
	codeBlockId: string;
	title: string;
	description?: string;
	language: string;
	code: string;
	author: string;
	createdAt: Date;
	updatedAt: Date;
	tags: string[];
	isPublic: boolean;
	likes: number;
	views: number;
	forks: number;
}

export interface CodeExecutionEnvironment {
	language: string;
	setup?: string;
	timeout: number;
	memoryLimit: number;
	allowNetworkAccess: boolean;
	allowFileSystem: boolean;
}
