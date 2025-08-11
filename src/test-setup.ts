/**
 * Test setup file for Vitest
 */

import { vi } from 'vitest';

// Mock IndexedDB for testing
const mock_idbrequest = {
	result: null,
	error: null,
	onsuccess: null,
	onerror: null,
	readyState: 'done'
};

const mock_idbtransaction = {
	objectStore: vi.fn(() => ({
		add: vi.fn(() => mock_idbrequest),
		get: vi.fn(() => mock_idbrequest),
		put: vi.fn(() => mock_idbrequest),
		delete: vi.fn(() => mock_idbrequest),
		getAll: vi.fn(() => mock_idbrequest),
		index: vi.fn(() => ({
			get: vi.fn(() => mock_idbrequest),
			getAll: vi.fn(() => mock_idbrequest)
		}))
	})),
	oncomplete: null,
	onerror: null,
	onabort: null
};

const mock_idbdatabase = {
	transaction: vi.fn(() => mock_idbtransaction),
	createObjectStore: vi.fn(),
	deleteObjectStore: vi.fn(),
	close: vi.fn()
};

global.indexedDB = {
	open: vi.fn(() => ({
		...mock_idbrequest,
		result: mock_idbdatabase,
		onupgradeneeded: null
	})),
	deleteDatabase: vi.fn(() => mock_idbrequest),
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
