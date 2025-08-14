# Utilities API Documentation

## Overview

The Interactive Knowledge System includes a comprehensive set of utility functions and helpers that provide common functionality across the application. These utilities handle everything from data processing and validation to performance optimization and debugging.

## Core Utilities

### Logger

Structured logging utility with multiple levels and output formats.

```typescript
import { createLogger } from '$lib/utils/logger';

interface LoggerConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  outputs: ('console' | 'file' | 'remote')[];
  metadata?: Record<string, any>;
}

interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, data?: any): void;
  child(metadata: Record<string, any>): Logger;
}
```

**Usage:**

```javascript
const logger = createLogger('content-service', {
  level: 'info',
  format: 'json',
  outputs: ['console', 'file']
});

logger.info('Content created', {
  contentId: 'abc123',
  userId: 'user456',
  type: 'lesson'
});

logger.error('Failed to save content', {
  contentId: 'abc123',
  error: error.message
});

// Create child logger with additional context
const childLogger = logger.child({ module: 'content-validation' });
childLogger.debug('Validating content structure');
```

### Validation Utilities

Type-safe validation functions for data integrity.

```typescript
interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Content validation
export function validateContentModule(data: any): ValidationResult<ContentModule> {
  const errors: ValidationError[] = [];

  if (!data.title || typeof data.title !== 'string') {
    errors.push({
      field: 'title',
      message: 'Title is required and must be a string',
      code: 'INVALID_TITLE'
    });
  }

  if (!data.blocks || !Array.isArray(data.blocks)) {
    errors.push({
      field: 'blocks',
      message: 'Blocks must be an array',
      code: 'INVALID_BLOCKS'
    });
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? (data as ContentModule) : undefined,
    errors
  };
}

// User input validation
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): ValidationResult<string> {
  const errors: ValidationError[] = [];

  if (password.length < 8) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters',
      code: 'PASSWORD_TOO_SHORT'
    });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
      code: 'PASSWORD_NO_UPPERCASE'
    });
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? password : undefined,
    errors
  };
}

// URL validation
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

### Data Processing Utilities

Functions for common data manipulation tasks.

```typescript
// Array utilities
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function unique<T>(array: T[], keyFn?: (item: T) => any): T[] {
  if (!keyFn) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<string, T[]>
  );
}

// Object utilities
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as any;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

export function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// String utilities
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - suffix.length) + suffix;
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
```

### Performance Utilities

Tools for measuring and optimizing performance.

```typescript
// Performance measurement
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  start(): void {
    this.startTime = performance.now();
  }

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  measure(name: string): number {
    const markTime = this.marks.get(name);
    if (!markTime) {
      throw new Error(`Mark '${name}' not found`);
    }
    return markTime - this.startTime;
  }

  end(): number {
    return performance.now() - this.startTime;
  }

  getReport(): Record<string, number> {
    const report: Record<string, number> = {};

    for (const [name, time] of this.marks) {
      report[name] = time - this.startTime;
    }

    report.total = this.end();
    return report;
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// Memoization utility
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
```

### Async Utilities

Helpers for managing asynchronous operations.

```typescript
// Retry utility with exponential backoff
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    backoffMultiplier?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoffMultiplier = 2,
    maxDelay = 30000,
    shouldRetry = () => true
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      const currentDelay = Math.min(delay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
      await sleep(currentDelay);
    }
  }

  throw lastError!;
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Timeout utility
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    })
  ]);
}

// Batch processing utility
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { batchSize = 10, concurrency = 3, onProgress } = options;
  const results: R[] = [];

  const batches = chunk(items, batchSize);
  let completed = 0;

  for (const batch of batches) {
    const batchPromises = batch.map(async item => {
      const result = await processor(item);
      completed++;
      onProgress?.(completed, items.length);
      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}
```

### Date and Time Utilities

Functions for working with dates and times.

```typescript
// Date formatting
export function formatDate(
  date: Date,
  format: 'short' | 'medium' | 'long' | 'iso' = 'medium'
): string {
  switch (format) {
    case 'short':
      return date.toLocaleDateString();
    case 'medium':
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    case 'long':
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'iso':
      return date.toISOString();
    default:
      return date.toString();
  }
}

// Relative time formatting
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return formatDate(date, 'short');
  }
}

// Duration formatting
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

// Date range utilities
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(start.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
}
```

### File and Media Utilities

Functions for handling files and media content.

```typescript
// File size formatting
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// File type detection
export function getFileType(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();

  const typeMap: Record<string, string> = {
    // Images
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    gif: 'image',
    webp: 'image',
    svg: 'image',
    // Videos
    mp4: 'video',
    avi: 'video',
    mov: 'video',
    wmv: 'video',
    webm: 'video',
    // Audio
    mp3: 'audio',
    wav: 'audio',
    ogg: 'audio',
    m4a: 'audio',
    // Documents
    pdf: 'document',
    doc: 'document',
    docx: 'document',
    txt: 'document',
    // Code
    js: 'code',
    ts: 'code',
    html: 'code',
    css: 'code',
    json: 'code',
    md: 'code'
  };

  return typeMap[extension || ''] || 'unknown';
}

// Image utilities
export function createImageThumbnail(
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200,
  quality: number = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      const { width, height } = calculateThumbnailSize(img.width, img.height, maxWidth, maxHeight);

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function calculateThumbnailSize(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = maxWidth;
  let height = maxHeight;

  if (aspectRatio > 1) {
    // Landscape
    height = width / aspectRatio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
  } else {
    // Portrait or square
    width = height * aspectRatio;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
  }

  return { width: Math.round(width), height: Math.round(height) };
}
```

### Error Handling Utilities

Comprehensive error handling and reporting utilities.

```typescript
// Custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public url?: string
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class StorageError extends Error {
  constructor(
    message: string,
    public operation: string,
    public key?: string
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// Error reporting utility
export class ErrorReporter {
  private static instance: ErrorReporter;
  private errorHandlers: Map<string, (error: Error) => void> = new Map();

  static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter();
    }
    return ErrorReporter.instance;
  }

  addHandler(errorType: string, handler: (error: Error) => void): void {
    this.errorHandlers.set(errorType, handler);
  }

  report(error: Error, context?: any): void {
    const errorType = error.constructor.name;
    const handler = this.errorHandlers.get(errorType);

    if (handler) {
      handler(error);
    } else {
      this.defaultHandler(error, context);
    }
  }

  private defaultHandler(error: Error, context?: any): void {
    console.error('Unhandled error:', error, context);

    // In production, send to error tracking service
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      this.sendToErrorService(error, context);
    }
  }

  private sendToErrorService(error: Error, context?: any): void {
    // Implementation would send to service like Sentry, LogRocket, etc.
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        name: error.name,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(err => {
      console.error('Failed to report error:', err);
    });
  }
}

// Global error boundary
export function setupGlobalErrorHandling(): void {
  const errorReporter = ErrorReporter.getInstance();

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    errorReporter.report(new Error(event.reason), {
      type: 'unhandledrejection',
      promise: event.promise
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', event => {
    errorReporter.report(event.error, {
      type: 'uncaught',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
}
```

### Testing Utilities

Helpers for testing and development.

```typescript
// Mock data generators
export function generateMockContent(): ContentModule {
  return {
    id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: `Mock Content ${Math.floor(Math.random() * 1000)}`,
    description: 'This is mock content for testing purposes',
    blocks: [
      {
        id: 'block1',
        type: 'text',
        content: { markdown: '# Mock Content\n\nThis is a test content block.' },
        metadata: { created: new Date(), modified: new Date(), version: 1 }
      }
    ],
    metadata: {
      author: 'test-user',
      created: new Date(),
      modified: new Date(),
      version: 1,
      difficulty: Math.floor(Math.random() * 5) + 1,
      estimatedTime: Math.floor(Math.random() * 60) + 15,
      prerequisites: [],
      tags: ['test', 'mock'],
      language: 'en'
    },
    relationships: {
      prerequisites: [],
      dependents: [],
      related: []
    },
    analytics: {
      views: Math.floor(Math.random() * 1000),
      completions: Math.floor(Math.random() * 500),
      averageScore: Math.random() * 100,
      averageTime: Math.floor(Math.random() * 3600)
    }
  };
}

export function generateMockUser(): User {
  return {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: `Test User ${Math.floor(Math.random() * 1000)}`,
    email: `test${Math.floor(Math.random() * 1000)}@example.com`,
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: true,
      autoSave: true
    },
    progress: new Map(),
    createdAt: new Date(),
    lastActive: new Date()
  };
}

// Test helpers
export function waitFor(condition: () => boolean, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 100);
      }
    };

    check();
  });
}

export function mockFetch(responses: Record<string, any>): void {
  const originalFetch = global.fetch;

  global.fetch = jest.fn((url: string) => {
    const response = responses[url];
    if (response) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response))
      } as Response);
    }

    return Promise.reject(new Error(`No mock response for ${url}`));
  });

  // Restore original fetch after test
  afterEach(() => {
    global.fetch = originalFetch;
  });
}
```

## Browser Utilities

### Local Storage Helpers

```typescript
// Enhanced localStorage with type safety and error handling
export class SafeStorage {
  static get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get item from localStorage: ${key}`, error);
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to set item in localStorage: ${key}`, error);
      return false;
    }
  }

  static remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item from localStorage: ${key}`, error);
      return false;
    }
  }

  static clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage', error);
      return false;
    }
  }

  static getSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }
}
```

### DOM Utilities

```typescript
// DOM manipulation helpers
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);

  if (attributes) {
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }
  }

  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    }
  }

  return element;
}

export function getElementOffset(element: HTMLElement): { top: number; left: number } {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX
  };
}

export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
```

## Usage Examples

### Complete Utility Integration

```typescript
// Example service using multiple utilities
import { createLogger } from '$lib/utils/logger';
import { retry, withTimeout } from '$lib/utils/async';
import { validateContentModule } from '$lib/utils/validation';
import { PerformanceTimer } from '$lib/utils/performance';
import { ErrorReporter } from '$lib/utils/error-handling';

class ContentService {
  private logger = createLogger('content-service');
  private errorReporter = ErrorReporter.getInstance();

  async createContent(data: any): Promise<ContentModule> {
    const timer = new PerformanceTimer();
    timer.start();

    try {
      // Validate input
      const validation = validateContentModule(data);
      if (!validation.isValid) {
        throw new ValidationError(
          'Invalid content data',
          validation.errors[0].field,
          validation.errors[0].code
        );
      }

      // Process with retry and timeout
      const content = await retry(() => withTimeout(this.processContent(validation.data!), 30000), {
        maxAttempts: 3,
        delay: 1000,
        shouldRetry: error => error instanceof NetworkError
      });

      timer.mark('processing-complete');
      this.logger.info('Content created successfully', {
        contentId: content.id,
        processingTime: timer.measure('processing-complete')
      });

      return content;
    } catch (error) {
      this.errorReporter.report(error as Error, {
        operation: 'createContent',
        data: data,
        processingTime: timer.end()
      });
      throw error;
    }
  }

  private async processContent(data: ContentModule): Promise<ContentModule> {
    // Implementation details...
    return data;
  }
}
```

## Best Practices

### Performance Considerations

1. **Memoization**: Use memoization for expensive computations
2. **Debouncing**: Debounce user input handlers
3. **Lazy Loading**: Load utilities only when needed
4. **Memory Management**: Clean up event listeners and timers

### Error Handling

1. **Graceful Degradation**: Provide fallbacks for failed operations
2. **User-Friendly Messages**: Convert technical errors to user-friendly messages
3. **Logging**: Log errors with sufficient context for debugging
4. **Recovery**: Provide mechanisms for error recovery

### Testing

1. **Unit Tests**: Test utility functions in isolation
2. **Mock Data**: Use consistent mock data generators
3. **Edge Cases**: Test boundary conditions and error scenarios
4. **Performance**: Test performance-critical utilities under load

## Troubleshooting

### Common Issues

**Utility Not Working in SSR**

- Check for browser-specific APIs
- Use proper guards for server-side rendering

**Memory Leaks**

- Clean up event listeners
- Clear timers and intervals
- Remove references to DOM elements

**Performance Issues**

- Profile utility usage
- Consider memoization for expensive operations
- Use appropriate data structures

### Debugging Tips

```typescript
// Enable debug logging
const logger = createLogger('debug', { level: 'debug' });

// Use performance timers
const timer = new PerformanceTimer();
timer.start();
// ... operations
console.log('Operation took:', timer.end(), 'ms');

// Add error context
try {
  // risky operation
} catch (error) {
  ErrorReporter.getInstance().report(error, {
    context: 'additional debugging info'
  });
}
```

## Next Steps

- Explore [Services API](services.md) for business logic integration
- Check [Components API](components.md) for UI utility usage
- Review [Performance Guide](../technical/performance.md) for optimization
- See [Testing Guide](../development/testing.md) for testing utilities
