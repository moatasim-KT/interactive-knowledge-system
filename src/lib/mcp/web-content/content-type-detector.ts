/**
 * Detects the content type of a file or content based on its extension, magic numbers, and content analysis
 */

export interface ContentTypeInfo {
	/** The MIME type of the content */
	mime_type: string;
	/** The file extension (without dot) */
	extension: string;
	/** Whether the content is binary */
	is_binary: boolean;
	/** Whether the content is text */
	is_text: boolean;
	/** Whether the content is an archive */
	is_archive: boolean;
	/** Whether the content is a document */
	is_document: boolean;
	/** Whether the content is an image */
	is_image: boolean;
	/** Whether the content is audio */
	is_audio: boolean;
	/** Whether the content is video */
	is_video: boolean;
	/** Whether the content is a font */
	is_font: boolean;
	/** Description of the content type */
	description: string;
}

// Common MIME types and their extensions
const MIME_TYPES: Record<string, ContentTypeInfo> = {
	// Documents
	'application/pdf': {
		mime_type: 'application/pdf',
		extension: 'pdf',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Adobe Portable Document Format (PDF)'
	},
	'application/msword': {
		mime_type: 'application/msword',
		extension: 'doc',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Microsoft Word Document (legacy)'
	},
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
		mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		extension: 'docx',
		is_binary: true,
		is_text: false,
		is_archive: true,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Microsoft Word (OpenXML)'
	},
	'application/vnd.ms-excel': {
		mime_type: 'application/vnd.ms-excel',
		extension: 'xls',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Microsoft Excel (legacy)'
	},
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
		mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		extension: 'xlsx',
		is_binary: true,
		is_text: false,
		is_archive: true,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Microsoft Excel (OpenXML)'
	},
	'application/vnd.ms-powerpoint': {
		mime_type: 'application/vnd.ms-powerpoint',
		extension: 'ppt',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Microsoft PowerPoint (legacy)'
	},
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
		mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		extension: 'pptx',
		is_binary: true,
		is_text: false,
		is_archive: true,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Microsoft PowerPoint (OpenXML)'
	},
	'text/plain': {
		mime_type: 'text/plain',
		extension: 'txt',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Plain Text'
	},
	'text/markdown': {
		mime_type: 'text/markdown',
		extension: 'md',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Markdown'
	},
	'text/html': {
		mime_type: 'text/html',
		extension: 'html',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'HTML Document'
	},

	// Images
	'image/jpeg': {
		mime_type: 'image/jpeg',
		extension: 'jpg',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: true,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'JPEG Image'
	},
	'image/png': {
		mime_type: 'image/png',
		extension: 'png',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: true,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'PNG Image'
	},
	'image/gif': {
		mime_type: 'image/gif',
		extension: 'gif',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: true,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'GIF Image'
	},
	'image/webp': {
		mime_type: 'image/webp',
		extension: 'webp',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: true,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'WebP Image'
	},
	'image/svg+xml': {
		mime_type: 'image/svg+xml',
		extension: 'svg',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: false,
		is_image: true,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Scalable Vector Graphics (SVG)'
	},

	// Archives
	'application/zip': {
		mime_type: 'application/zip',
		extension: 'zip',
		is_binary: true,
		is_text: false,
		is_archive: true,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'ZIP Archive'
	},
	'application/x-rar-compressed': {
		mime_type: 'application/x-rar-compressed',
		extension: 'rar',
		is_binary: true,
		is_text: false,
		is_archive: true,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'RAR Archive'
	},
	'application/x-tar': {
		mime_type: 'application/x-tar',
		extension: 'tar',
		is_binary: true,
		is_text: false,
		is_archive: true,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Tape Archive (TAR)'
	},
	'application/gzip': {
		mime_type: 'application/gzip',
		extension: 'gz',
		is_binary: true,
		is_text: false,
		is_archive: true,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'GZIP Compressed File'
	},
	'application/x-7z-compressed': {
		mime_type: 'application/x-7z-compressed',
		extension: '7z',
		is_binary: true,
		is_text: false,
		is_archive: true,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: '7-Zip Archive'
	},

	// Code
	'application/javascript': {
		mime_type: 'application/javascript',
		extension: 'js',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'JavaScript'
	},
	'application/typescript': {
		mime_type: 'application/typescript',
		extension: 'ts',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'TypeScript'
	},
	'text/css': {
		mime_type: 'text/css',
		extension: 'css',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Cascading Style Sheets (CSS)'
	},
	'text/x-python': {
		mime_type: 'text/x-python',
		extension: 'py',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Python Script'
	},
	'text/x-java-source': {
		mime_type: 'text/x-java-source',
		extension: 'java',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Java Source'
	},
	'text/x-c++src': {
		mime_type: 'text/x-c++src',
		extension: 'cpp',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'C++ Source'
	},
	'text/x-csrc': {
		mime_type: 'text/x-csrc',
		extension: 'c',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'C Source'
	},
	'text/x-csharp': {
		mime_type: 'text/x-csharp',
		extension: 'cs',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'C# Source'
	},
	'application/json': {
		mime_type: 'application/json',
		extension: 'json',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'JSON Data'
	},
	'application/xml': {
		mime_type: 'application/xml',
		extension: 'xml',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'XML Data'
	},
	'text/yaml': {
		mime_type: 'text/yaml',
		extension: 'yaml',
		is_binary: false,
		is_text: true,
		is_archive: false,
		is_document: true,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'YAML Data'
	},

	// Audio/Video
	'audio/mpeg': {
		mime_type: 'audio/mpeg',
		extension: 'mp3',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: false,
		is_audio: true,
		is_video: false,
		is_font: false,
		description: 'MP3 Audio'
	},
	'audio/wav': {
		mime_type: 'audio/wav',
		extension: 'wav',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: false,
		is_audio: true,
		is_video: false,
		is_font: false,
		description: 'WAV Audio'
	},
	'video/mp4': {
		mime_type: 'video/mp4',
		extension: 'mp4',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: true,
		is_font: false,
		description: 'MP4 Video'
	},
	'video/webm': {
		mime_type: 'video/webm',
		extension: 'webm',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: true,
		is_font: false,
		description: 'WebM Video'
	},

	// Fonts
	'font/ttf': {
		mime_type: 'font/ttf',
		extension: 'ttf',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: true,
		description: 'TrueType Font'
	},
	'font/woff': {
		mime_type: 'font/woff',
		extension: 'woff',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: true,
		description: 'Web Open Font Format (WOFF)'
	},
	'font/woff2': {
		mime_type: 'font/woff2',
		extension: 'woff2',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: true,
		description: 'Web Open Font Format (WOFF2)'
	},

	// Default fallback
	'application/octet-stream': {
		mime_type: 'application/octet-stream',
		extension: 'bin',
		is_binary: true,
		is_text: false,
		is_archive: false,
		is_document: false,
		is_image: false,
		is_audio: false,
		is_video: false,
		is_font: false,
		description: 'Binary File'
	}
};

// File signature (magic numbers) for various file types
const FILE_SIGNATURES: Array<{
	signature: Array<number | null>;
	mime_type: string;
	offset: number;
}> = [
	// PDF
	{ signature: [0x25, 0x50, 0x44, 0x46, 0x2d], mime_type: 'application/pdf', offset: 0 },

	// ZIP-based formats (Office documents, etc.)
	{ signature: [0x50, 0x4b, 0x03, 0x04], mime_type: 'application/zip', offset: 0 },
	{ signature: [0x50, 0x4b, 0x05, 0x06], mime_type: 'application/zip', offset: 0 },
	{ signature: [0x50, 0x4b, 0x07, 0x08], mime_type: 'application/zip', offset: 0 },

	// Office documents
	{
		signature: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1],
		mime_type: 'application/msword',
		offset: 0
	},

	// Images
	{ signature: [0xff, 0xd8, 0xff], mime_type: 'image/jpeg', offset: 0 },
	{
		signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
		mime_type: 'image/png',
		offset: 0
	},
	{ signature: [0x47, 0x49, 0x46, 0x38], mime_type: 'image/gif', offset: 0 },
	{
		signature: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
		mime_type: 'image/webp',
		offset: 0
	},

	// Audio/Video
	{ signature: [0x49, 0x44, 0x33], mime_type: 'audio/mpeg', offset: 0 }, // MP3 with ID3
	{ signature: [0xff, 0xfb], mime_type: 'audio/mpeg', offset: 0 }, // MP3 without ID3
	{
		signature: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x41, 0x56, 0x45],
		mime_type: 'audio/wav',
		offset: 0
	},
	{
		signature: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32],
		mime_type: 'video/mp4',
		offset: 4
	},
	{ signature: [0x1a, 0x45, 0xdf, 0xa3], mime_type: 'video/webm', offset: 0 }, // WebM

	// Fonts
	{ signature: [0x00, 0x01, 0x00, 0x00, 0x00], mime_type: 'font/ttf', offset: 0 },
	{ signature: [0x4f, 0x54, 0x54, 0x4f, 0x00], mime_type: 'font/otf', offset: 0 },
	{ signature: [0x77, 0x4f, 0x46, 0x46], mime_type: 'font/woff', offset: 0 },
	{ signature: [0x77, 0x4f, 0x46, 0x32], mime_type: 'font/woff2', offset: 0 },

	// Archives
	{
		signature: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07],
		mime_type: 'application/x-rar-compressed',
		offset: 0
	},
	{ signature: [0x1f, 0x8b, 0x08], mime_type: 'application/gzip', offset: 0 },
	{
		signature: [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c],
		mime_type: 'application/x-7z-compressed',
		offset: 0
	},

	// Executables
	{ signature: [0x4d, 0x5a], mime_type: 'application/x-msdownload', offset: 0 }, // Windows EXE
	{ signature: [0x7f, 0x45, 0x4c, 0x46], mime_type: 'application/x-executable', offset: 0 }, // Linux ELF
	{ signature: [0xca, 0xfe, 0xba, 0xbe], mime_type: 'application/x-java-applet', offset: 0 }, // Java class

	// Text files (detected by content analysis)
	{ signature: [0xef, 0xbb, 0xbf], mime_type: 'text/plain', offset: 0 }, // UTF-8 with BOM
	{ signature: [0xfe, 0xff], mime_type: 'text/plain', offset: 0 }, // UTF-16 BE with BOM
	{ signature: [0xff, 0xfe], mime_type: 'text/plain', offset: 0 } // UTF-16 LE with BOM
];

/**
 * Detects the content type of a file or data buffer
 */
export class ContentTypeDetector {
	/**
	 * Detect content type from a file path/URL
	 */
	static fromPath(path: string): ContentTypeInfo {
		// Extract file extension
		const extension = this.getExtension(path).toLowerCase();

		// First try to find by extension
		const by_extension = this.findByExtension(extension);
		if (by_extension) {
			return by_extension;
		}

		// Default to octet-stream if we can't determine the type
		return MIME_TYPES['application/octet-stream'];
	}

	/**
	 * Detect content type from a buffer
	 */
	static fromBuffer(buffer: ArrayBuffer): ContentTypeInfo {
		// Convert to Uint8Array for easier manipulation
		const bytes = new Uint8Array(buffer);

		// Try to match file signatures
		for (const { signature, mime_type, offset } of FILE_SIGNATURES) {
			if (this.matchesSignature(bytes, signature, offset)) {
				return MIME_TYPES[mime_type] || this.createFallbackType(mime_type);
			}
		}

		// Check if it's text
		if (this.isText(bytes)) {
			// Try to determine text type
			const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1024));

			// Check for XML/HTML
			if (/<\?xml[^>]+>/.test(text)) {
				return MIME_TYPES['application/xml'];
			}

			if (/<(!doctype|html|head|body)[\s>]/i.test(text)) {
				return MIME_TYPES['text/html'];
			}

			// Check for JSON
			try {
				JSON.parse(text);
				return MIME_TYPES['application/json'];
			} catch (e) {
				// Not JSON
			}

			// Default to plain text
			return MIME_TYPES['text/plain'];
		}

		// Default to binary
		return MIME_TYPES['application/octet-stream'];
	}

	/**
	 * Detect content type from a URL and response headers
	 */
	static fromResponse(url: string, headers: Record<string, string>): ContentTypeInfo {
		// Check Content-Type header first
		const content_type = headers['content-type'] || '';
		if (content_type) {
			// Remove parameters (e.g., '; charset=utf-8')
			const mime_type = content_type.split(';')[0].trim().toLowerCase();
			if (MIME_TYPES[mime_type]) {
				return MIME_TYPES[mime_type];
			}
		}

		// Fall back to extension-based detection
		return this.fromPath(url);
	}

	/**
	 * Get file extension from path/URL
	 */
	private static getExtension(path: string): string {
		// Handle query strings and fragments
		const clean_path = path.split(/[?#]/)[0];

		// Get the last part after the last dot
		const last_dot = clean_path.lastIndexOf('.');
		if (last_dot === -1) return '';

		return clean_path.slice(last_dot + 1).toLowerCase();
	}

	/**
	 * Find MIME type by file extension
	 */
	private static findByExtension(extension: string): ContentTypeInfo | undefined {
		// Remove leading dot if present
		const ext = extension.startsWith('.') ? extension.slice(1) : extension;

		// Check for exact match first
		for (const type of Object.values(MIME_TYPES)) {
			if (type.extension === ext) {
				return type;
			}
		}

		// No match found
		return undefined;
	}

	/**
	 * Check if the buffer matches a file signature
	 */
	private static matchesSignature(
		bytes: Uint8Array,
		signature: Array<number | null>,
		offset: number = 0
	): boolean {
		if (bytes.length < offset + signature.length) {
			return false;
		}

		for (let i = 0; i < signature.length; i++) {
			const expected = signature[i];
			if (expected === null) continue; // Wildcard byte

			if (bytes[offset + i] !== expected) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Check if the buffer contains text data
	 */
	private static isText(bytes: Uint8Array, sample_size: number = 1024): boolean {
		// Check for UTF-8 BOM
		if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
			return true;
		}

		// Check for UTF-16 BOM
		if (bytes.length >= 2) {
			if (
				(bytes[0] === 0xfe && bytes[1] === 0xff) || // UTF-16 BE
				(bytes[0] === 0xff && bytes[1] === 0xfe)
			) {
				// UTF-16 LE
				return true;
			}
		}

		// Sample the first part of the file
		const sample = bytes.slice(0, Math.min(sample_size, bytes.length));

		// Count null bytes (binary files often have many)
		let null_count = 0;
		for (let i = 0; i < sample.length; i++) {
			if (sample[i] === 0) {
				null_count++;
				// If more than 5% of bytes are null, it's probably binary
				if (null_count > sample.length * 0.05) {
					return false;
				}
			}
		}

		// Try to decode as UTF-8
		try {
			const decoder = new TextDecoder('utf-8', { fatal: true });
			decoder.decode(sample);
			return true;
		} catch (e) {
			// Not valid UTF-8
		}

		return false;
	}

	/**
	 * Create a fallback content type when we only have a MIME type
	 */
	private static createFallbackType(mime_type: string): ContentTypeInfo {
		// Check if we already have this MIME type defined
		if (MIME_TYPES[mime_type]) {
			return MIME_TYPES[mime_type];
		}

		// Try to determine the extension from the MIME type
		let extension = 'bin';
		const match = mime_type.match(/\/([^+;\s]+)/);
		if (match) {
			extension = match[1];
		}

		// Create a basic type info
		return {
			mime_type,
			extension,
			is_binary: !mime_type.startsWith('text/'),
			is_text: mime_type.startsWith('text/'),
			is_archive:
				mime_type.includes('zip') ||
				mime_type.includes('archive') ||
				mime_type.includes('compressed'),
			is_document:
				mime_type.startsWith('text/') ||
				mime_type.includes('document') ||
				mime_type.includes('word') ||
				mime_type.includes('excel') ||
				mime_type.includes('powerpoint') ||
				mime_type.includes('pdf') ||
				mime_type.includes('rtf') ||
				mime_type.includes('opendocument'),
			is_image: mime_type.startsWith('image/'),
			is_audio: mime_type.startsWith('audio/'),
			is_video: mime_type.startsWith('video/'),
			is_font:
				mime_type.startsWith('font/') || mime_type.includes('font') || mime_type.endsWith('font'),
			description: `${mime_type
				.split('/')
				.map((s) => s.charAt(0).toUpperCase() + s.slice(1))
				.join(' ')} File`
		};
	}
}

// Export the MIME_TYPES object for external use
export { MIME_TYPES };

// Default export for easier importing
export default ContentTypeDetector;
