# Utilities API Documentation

## Storage Utilities

### IndexedDB Storage

```typescript
import { contentStorage, userStorage, mediaStorage } from '$lib/storage';

// Content operations
await contentStorage.save(content);
const content = await contentStorage.get(id);
await contentStorage.delete(id);
const allContent = await contentStorage.getAll();

// User data operations
await userStorage.saveProgress(userId, moduleId, progress);
const progress = await userStorage.getProgress(userId, moduleId);
await userStorage.savePreferences(userId, preferences);

// Media operations
await mediaStorage.store(file, metadata);
const mediaUrl = await mediaStorage.getUrl(mediaId);
await mediaStorage.delete(mediaId);
```

### Local Storage Wrapper

```typescript
import { localStorage } from '$lib/utils';

// Type-safe storage operations
localStorage.set('key', { data: 'value' });
const data = localStorage.get('key', defaultValue);
localStorage.remove('key');
localStorage.clear();
```

## Search Engine

### Full-Text Search

```typescript
import { searchEngine } from '$lib/utils/searchEngine';

// Index content
await searchEngine.indexContent(contentId, text, metadata);

// Search operations
const results = await searchEngine.search(query, {
  limit: 10,
  filters: { type: 'module' },
  sortBy: 'relevance'
});

// Advanced search
const results = await searchEngine.advancedSearch({
  query: 'machine learning',
  tags: ['ai', 'python'],
  difficulty: [1, 2, 3],
  contentType: 'lesson'
});
```

### Similarity Engine

```typescript
import { similarityEngine } from '$lib/utils/similarityEngine';

// Find similar content
const similar = await similarityEngine.findSimilar(contentId, {
  limit: 5,
  threshold: 0.7
});

// Content recommendations
const recommendations = await similarityEngine.getRecommendations(userId, {
  basedOn: 'progress',
  limit: 10
});
```

## Performance Utilities

### Lazy Loading

```typescript
import { lazyLoader } from '$lib/utils/lazyLoader';

// Lazy load components
const LazyComponent = lazyLoader(() => import('./HeavyComponent.svelte'));

// Lazy load data
const data = await lazyLoader.loadData(async () => {
  return await fetch('/api/heavy-data').then(r => r.json());
});

// Image lazy loading
lazyLoader.observeImages('.lazy-image');
```

### Bundle Optimizer

```typescript
import { bundleOptimizer } from '$lib/utils/bundleOptimizer';

// Code splitting
const { loadChunk } = bundleOptimizer;
const module = await loadChunk('advanced-features');

// Resource preloading
bundleOptimizer.preload(['/api/user-data', '/components/heavy-component.js']);
```

### Performance Monitor

```typescript
import { performance } from '$lib/utils/performance';

// Measure performance
performance.mark('operation-start');
// ... operation
performance.mark('operation-end');
const duration = performance.measure('operation', 'operation-start', 'operation-end');

// Monitor vitals
performance.observeWebVitals(metric => {
  console.log(metric.name, metric.value);
});
```

## Accessibility Utilities

### Screen Reader Support

```typescript
import { screenReader } from '$lib/utils/screenReader';

// Announce to screen readers
screenReader.announce('Content loaded successfully');

// Live region updates
screenReader.setLiveRegion('status', 'polite');
screenReader.updateLiveRegion('status', 'Progress: 75% complete');

// Focus management
screenReader.focusElement('#main-content');
screenReader.trapFocus('.modal-content');
```

### Accessibility Checker

```typescript
import { accessibility } from '$lib/utils/accessibility';

// Check color contrast
const isAccessible = accessibility.checkContrast('#ffffff', '#000000');

// Validate ARIA attributes
const ariaIssues = accessibility.validateAria(element);

// Keyboard navigation test
const keyboardAccessible = accessibility.testKeyboardNavigation(container);
```

## Error Handling Utilities

### Error Logger

```typescript
import { logger } from '$lib/utils/logger';

// Log different levels
logger.info('User logged in', { userId: '123' });
logger.warn('Slow API response', { duration: 5000 });
logger.error('Failed to save content', error);

// Structured logging
logger.log({
  level: 'info',
  message: 'Content created',
  metadata: {
    contentId: 'abc123',
    userId: 'user456',
    timestamp: new Date()
  }
});
```

### Error Recovery

```typescript
import { errorUtils } from '$lib/utils/errorUtils';

// Retry with exponential backoff
const result = await errorUtils.retry(() => fetch('/api/data'), {
  maxAttempts: 3,
  backoff: 'exponential'
});

// Circuit breaker pattern
const circuitBreaker = errorUtils.createCircuitBreaker(apiCall, {
  threshold: 5,
  timeout: 60000
});

// Error boundary helpers
const { ErrorBoundary, withErrorBoundary } = errorUtils;
```

## Data Processing Utilities

### Content Processors

```typescript
import { contentProcessor } from '$lib/utils';

// Markdown processing
const html = contentProcessor.markdownToHtml(markdown);
const blocks = contentProcessor.parseMarkdownBlocks(markdown);

// Content sanitization
const safeHtml = contentProcessor.sanitizeHtml(userInput);
const safeText = contentProcessor.sanitizeText(userInput);

// Content analysis
const stats = contentProcessor.analyzeContent(text);
// Returns: { wordCount, readingTime, difficulty, keywords }
```

### Import/Export Utilities

```typescript
import { importUtils, exportUtils } from '$lib/utils';

// Import content
const content = await importUtils.fromMarkdown(file);
const content = await importUtils.fromJSON(data);
const content = await importUtils.fromHTML(html);

// Export content
const markdown = exportUtils.toMarkdown(content);
const json = exportUtils.toJSON(content);
const pdf = await exportUtils.toPDF(content);
```

## Synchronization Utilities

### Sync Service

```typescript
import { syncService } from '$lib/services/syncService';

// Manual sync
await syncService.sync();

// Auto-sync configuration
syncService.configure({
  interval: 300000, // 5 minutes
  onConflict: 'merge',
  retryAttempts: 3
});

// Sync status
const status = syncService.getStatus();
// Returns: { isOnline, lastSync, pendingChanges, conflicts }
```

### Conflict Resolution

```typescript
import { conflictResolver } from '$lib/services/conflictResolver';

// Resolve conflicts
const resolved = await conflictResolver.resolve(localContent, remoteContent, {
  strategy: 'merge', // 'local', 'remote', 'merge', 'manual'
  mergeFields: ['title', 'content', 'metadata']
});

// Manual conflict resolution
const conflicts = conflictResolver.detectConflicts(local, remote);
const resolution = await conflictResolver.requestUserResolution(conflicts);
```

## Validation Utilities

### Content Validation

```typescript
import { validator } from '$lib/utils';

// Validate content structure
const isValid = validator.validateContent(content);
const errors = validator.getValidationErrors(content);

// Schema validation
const schema = {
  title: { type: 'string', required: true, minLength: 1 },
  content: { type: 'array', required: true }
};
const result = validator.validate(data, schema);
```

### Form Validation

```typescript
import { formValidator } from '$lib/utils';

// Field validation
const emailValid = formValidator.email(email);
const passwordValid = formValidator.password(password, {
  minLength: 8,
  requireSpecialChar: true
});

// Form validation
const { isValid, errors } = formValidator.validateForm(formData, rules);
```

## Animation Utilities

### Transition Helpers

```typescript
import { transitions } from '$lib/utils';

// Custom transitions
const slideIn = transitions.slide({ duration: 300, easing: 'ease-out' });
const fadeScale = transitions.fadeScale({ duration: 200 });

// Animation sequences
const sequence = transitions.sequence([
  { target: '.element1', animation: 'fadeIn', duration: 200 },
  { target: '.element2', animation: 'slideUp', duration: 300, delay: 100 }
]);
```

### Intersection Observer

```typescript
import { intersectionObserver } from '$lib/utils';

// Observe element visibility
intersectionObserver.observe('.lazy-load', entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadContent(entry.target);
    }
  });
});

// Scroll-triggered animations
intersectionObserver.animateOnScroll('.animate-on-scroll', {
  animation: 'fadeInUp',
  threshold: 0.1
});
```

## Testing Utilities

### Test Helpers

```typescript
import { testUtils } from '$lib/utils';

// Component testing
const { render, fireEvent, waitFor } = testUtils;

// Mock data generators
const mockUser = testUtils.createMockUser();
const mockContent = testUtils.createMockContent();

// Async testing
await testUtils.waitForElement('.loading-complete');
await testUtils.waitForApiCall('/api/data');
```

### Performance Testing

```typescript
import { performanceTest } from '$lib/utils';

// Measure component render time
const renderTime = await performanceTest.measureRender(Component, props);

// Memory usage testing
const memoryUsage = performanceTest.measureMemory(() => {
  // Memory-intensive operation
});

// Bundle size analysis
const bundleStats = performanceTest.analyzeBundleSize();
```

## Usage Examples

```typescript
// Complete utility usage example
import { contentStorage, searchEngine, logger, syncService } from '$lib/utils';

async function createAndIndexContent(content) {
  try {
    // Save content
    const savedContent = await contentStorage.save(content);

    // Index for search
    await searchEngine.indexContent(savedContent.id, savedContent.text, savedContent.metadata);

    // Sync to cloud
    await syncService.sync();

    logger.info('Content created successfully', {
      contentId: savedContent.id
    });

    return savedContent;
  } catch (error) {
    logger.error('Failed to create content', error);
    throw error;
  }
}
```
