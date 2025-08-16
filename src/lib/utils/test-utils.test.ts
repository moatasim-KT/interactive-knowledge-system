import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
    it('should run basic tests', () => {
        expect(1 + 1).toBe(2);
    });

    it('should have access to DOM globals', () => {
        expect(global.ResizeObserver).toBeDefined();
        expect(global.IntersectionObserver).toBeDefined();
        expect(window.matchMedia).toBeDefined();
    });
});