export type FileValidationResult = {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    fileInfo?: { name: string; size: number; type: string; lastModified: Date };
    preview?: FilePreview;
};

export type FilePreview =
    | { type: 'image'; url: string }
    | { type: 'text'; content: string }
    | { type: 'none'; content: string };

export interface ValidationOptions {
    maxSize?: number;
    allowedTypes?: string[];
    allowedMimeTypes?: string[];
}

export async function validateFile(
    file: File,
    allowedTypes: string[] = ['.pdf', '.md', '.markdown'],
    maxSize: number = 50 * 1024 * 1024
): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (file.size > maxSize) {
        errors.push(`File size ${formatFileSize(file.size)} exceeds maximum ${formatFileSize(maxSize)}`);
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedTypes.some(type =>
        fileName.endsWith(type.toLowerCase())
    );

    if (!hasValidExtension) {
        errors.push(`File type not supported. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Check MIME type
    const validMimeTypes = getMimeTypesForExtensions(allowedTypes);
    if (file.type && !validMimeTypes.includes(file.type)) {
        warnings.push(`MIME type ${file.type} may not be supported`);
    }

    // Additional validation for specific file types
    if (fileName.endsWith('.pdf')) {
        await validatePdfFile(file, errors, warnings);
    } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        await validateMarkdownFile(file, errors, warnings);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: new Date(file.lastModified)
        }
    };
}

export async function generateFilePreview(file: File): Promise<FilePreview> {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf')) {
        return generatePdfPreview(file);
    } else if (fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        return generateMarkdownPreview(file);
    }

    return {
        type: 'none',
        content: 'Preview not available'
    };
}

async function validatePdfFile(file: File, errors: string[], warnings: string[]): Promise<void> {
    try {
        // Basic PDF validation - check for PDF header
        const buffer = await file.slice(0, 1024).arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const header = new TextDecoder().decode(bytes.slice(0, 5));

        if (!header.startsWith('%PDF-')) {
            errors.push('Invalid PDF file format');
        }

        // Check for encrypted PDFs (basic check)
        const content = new TextDecoder().decode(bytes);
        if (content.includes('/Encrypt')) {
            warnings.push('PDF appears to be encrypted - processing may be limited');
        }
    } catch (error) {
        warnings.push('Could not validate PDF file structure');
    }
}

async function validateMarkdownFile(file: File, errors: string[], warnings: string[]): Promise<void> {
    try {
        // Check if file is readable as text
        const text = await file.text();

        if (text.length === 0) {
            errors.push('Markdown file is empty');
            return;
        }

        // Basic markdown validation
        const lines = text.split('\n');
        let hasContent = false;

        for (const line of lines) {
            if (line.trim().length > 0) {
                hasContent = true;
                break;
            }
        }

        if (!hasContent) {
            warnings.push('Markdown file appears to contain only whitespace');
        }

        // Check for common markdown elements
        const hasHeaders = /^#{1,6}\s/.test(text);
        const hasLinks = /\[.*?\]\(.*?\)/.test(text);
        const hasLists = /^[\s]*[-*+]\s/.test(text);

        if (!hasHeaders && !hasLinks && !hasLists && text.length > 1000) {
            warnings.push('File may not be valid markdown - no markdown formatting detected');
        }
    } catch (error) {
        errors.push('Could not read markdown file content');
    }
}

async function generatePdfPreview(file: File): Promise<FilePreview> {
    try {
        // For PDF preview, we'll return basic file info
        // In a real implementation, you might use PDF.js to generate a thumbnail
        return {
            type: 'text',
            content: `PDF Document\nSize: ${formatFileSize(file.size)}\nPages: Analyzing...`
        };
    } catch (error) {
        return {
            type: 'text',
            content: 'PDF preview unavailable'
        };
    }
}

async function generateMarkdownPreview(file: File): Promise<FilePreview> {
    try {
        const text = await file.text();
        const preview = text.slice(0, 200);

        return {
            type: 'text',
            content: preview + (text.length > 200 ? '...' : '')
        };
    } catch (error) {
        return {
            type: 'text',
            content: 'Markdown preview unavailable'
        };
    }
}

function getMimeTypesForExtensions(extensions: string[]): string[] {
    const mimeTypeMap: Record<string, string[]> = {
        '.pdf': ['application/pdf'],
        '.md': ['text/markdown', 'text/plain'],
        '.markdown': ['text/markdown', 'text/plain']
    };

    const mimeTypes: string[] = [];
    for (const ext of extensions) {
        const types = mimeTypeMap[ext.toLowerCase()];
        if (types) {
            mimeTypes.push(...types);
        }
    }

    return [...new Set(mimeTypes)];
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    return lastDot !== -1 ? fileName.slice(lastDot) : '';
}

export function isValidFileType(fileName: string, allowedTypes: string[]): boolean {
    const extension = getFileExtension(fileName).toLowerCase();
    return allowedTypes.some(type => type.toLowerCase() === extension);
}