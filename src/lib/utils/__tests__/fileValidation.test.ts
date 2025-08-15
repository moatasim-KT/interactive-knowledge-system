import { describe, it, expect } from 'vitest';
import { formatFileSize, getFileExtension, isValidFileType } from '../fileValidation.js';

describe('fileValidation', () => {
    describe('formatFileSize', () => {
        it('formats bytes correctly', () => {
            expect(formatFileSize(0)).toBe('0 Bytes');
            expect(formatFileSize(512)).toBe('512 Bytes');
            expect(formatFileSize(1024)).toBe('1 KB');
            expect(formatFileSize(1536)).toBe('1.5 KB');
            expect(formatFileSize(1024 * 1024)).toBe('1 MB');
            expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        });

        it('handles decimal places correctly', () => {
            expect(formatFileSize(1536)).toBe('1.5 KB');
            expect(formatFileSize(1024 * 1.25)).toBe('1.25 KB');
        });
    });

    describe('getFileExtension', () => {
        it('extracts file extensions correctly', () => {
            expect(getFileExtension('test.pdf')).toBe('.pdf');
            expect(getFileExtension('document.md')).toBe('.md');
            expect(getFileExtension('file.name.with.dots.txt')).toBe('.txt');
            expect(getFileExtension('noextension')).toBe('');
            expect(getFileExtension('.hidden')).toBe('.hidden');
        });
    });

    describe('isValidFileType', () => {
        it('validates file types correctly', () => {
            const allowedTypes = ['.pdf', '.md', '.markdown'];

            expect(isValidFileType('test.pdf', allowedTypes)).toBe(true);
            expect(isValidFileType('test.md', allowedTypes)).toBe(true);
            expect(isValidFileType('test.markdown', allowedTypes)).toBe(true);
            expect(isValidFileType('test.txt', allowedTypes)).toBe(false);
            expect(isValidFileType('test.PDF', allowedTypes)).toBe(true); // Case insensitive
        });

        it('handles files without extensions', () => {
            const allowedTypes = ['.pdf'];
            expect(isValidFileType('noextension', allowedTypes)).toBe(false);
        });
    });
});