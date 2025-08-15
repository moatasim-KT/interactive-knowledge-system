import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import DocumentUploadManager from '../DocumentUploadManager.svelte';

// Mock the dependencies
vi.mock('$lib/utils/fileValidation.js', () => ({
    validateFile: vi.fn().mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        fileInfo: {
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf',
            lastModified: new Date()
        }
    }),
    generateFilePreview: vi.fn().mockResolvedValue({
        type: 'text',
        content: 'Preview content'
    }),
    formatFileSize: (bytes: number) => `${bytes} bytes`
}));

vi.mock('$lib/services/enhancedDocumentProcessor.js', () => ({
    processDocumentBatch: vi.fn().mockResolvedValue([])
}));

describe('DocumentUploadManager Integration', () => {
    it('renders without crashing', () => {
        const { container } = render(DocumentUploadManager);
        expect(container).toBeTruthy();
    });

    it('displays upload zone with correct text', () => {
        const { getByText } = render(DocumentUploadManager);
        expect(getByText('Drop files here or click to browse')).toBeInTheDocument();
    });

    it('shows supported formats information', () => {
        const { container } = render(DocumentUploadManager, {
            acceptedTypes: ['.pdf', '.md']
        });
        expect(container.textContent).toContain('Supported formats: .pdf, .md');
    });

    it('displays bulk upload information when enabled', () => {
        const { container } = render(DocumentUploadManager, {
            allowBulkUpload: true,
            maxFiles: 5
        });
        expect(container.textContent).toContain('Upload up to 5 files at once');
    });
});