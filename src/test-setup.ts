/**
 * Test setup file for Vitest
 */

import { vi } from 'vitest';

// Mock IndexedDB for testing
const mockIdbRequest = {
	result: null,
	error: null,
	onsuccess: null,
	onerror: null,
	readyState: 'done'
};

const mockIdbTransaction = {
	objectStore: vi.fn(() => ({
		add: vi.fn(() => mockIdbRequest),
		get: vi.fn(() => mockIdbRequest),
		put: vi.fn(() => mockIdbRequest),
		delete: vi.fn(() => mockIdbRequest),
		getAll: vi.fn(() => mockIdbRequest),
		index: vi.fn(() => ({
			get: vi.fn(() => mockIdbRequest),
			getAll: vi.fn(() => mockIdbRequest)
		}))
	})),
	oncomplete: null,
	onerror: null,
	onabort: null
};

const mockIdbDatabase = {
	transaction: vi.fn(() => mockIdbTransaction),
	createObjectStore: vi.fn(),
	deleteObjectStore: vi.fn(),
	close: vi.fn()
};

global.indexedDB = {
	open: vi.fn(() => ({
		...mockIdbRequest,
		result: mockIdbDatabase,
		onupgradeneeded: null
	})),
	deleteDatabase: vi.fn(() => mockIdbRequest),
	databases: vi.fn(() => Promise.resolve([])),
	cmp: vi.fn()
} as any;

// Mock crypto for hash calculations
Object.defineProperty(global, 'crypto', {
	value: {
		subtle: {
			digest: vi.fn(() => Promise.resolve(new ArrayBuffer(32)))
		}
	}
});

// Mock fetch for network requests
global.fetch = vi.fn(() =>
	Promise.resolve({
		ok: true,
		status: 200,
		statusText: 'OK',
		headers: new Map(),
		text: () => Promise.resolve('Mock response'),
		json: () => Promise.resolve({})
	})
) as any;
