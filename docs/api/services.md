# Services API Documentation

## Core Services

### Storage Service

Manages data persistence using IndexedDB with fallback to localStorage.

```typescript
interface StorageService {
  save<T>(key: string, data: T): Promise<void>;
  get<T>(key: string, defaultValue?: T): Promise<T | undefined>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}
```

**Usage:**

```javascript
import { contentStorage, userStorage } from '$lib/services';

// Save content
await contentStorage.save('module-123', moduleData);

// Retrieve content
const module = await contentStorage.get('module-123');

// Delete content
await contentStorage.delete('module-123');
```

### Search Service

Provides full-text search capabilities with indexing and filtering.

```typescript
interface SearchService {
  index(id: string, content: string, metadata?: any): Promise<void>;
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  sortBy?: string;
  fuzzy?: boolean;
}
```

**Usage:**

```javascript
import { searchService } from '$lib/services';

// Index content
await searchService.index('content-1', 'Machine learning basics', {
  type: 'lesson',
  tags: ['ai', 'ml'],
  difficulty: 2
});

// Search content
const results = await searchService.search('machine learning', {
  limit: 10,
  filters: { type: 'lesson' },
  fuzzy: true
});
```

### Sync Service

Handles data synchronization between local and remote storage.

```typescript
interface SyncService {
  sync(): Promise<SyncResult>;
  configure(config: SyncConfig): void;
  getStatus(): SyncStatus;
  onConflict(handler: ConflictHandler): void;
}

interface SyncConfig {
  endpoint: string;
  interval: number;
  retryAttempts: number;
  conflictResolution: 'local' | 'remote' | 'merge' | 'manual';
}
```

**Usage:**

```javascript
import { syncService } from '$lib/services';

// Configure sync
syncService.configure({
  endpoint: 'https://api.example.com/sync',
  interval: 300000, // 5 minutes
  retryAttempts: 3,
  conflictResolution: 'merge'
});

// Manual sync
const result = await syncService.sync();

// Handle conflicts
syncService.onConflict(async conflict => {
  return await resolveConflict(conflict);
});
```

### Progress Service

Tracks and manages user learning progress.

```typescript
interface ProgressService {
  updateProgress(userId: string, contentId: string, progress: Progress): Promise<void>;
  getProgress(userId: string, contentId?: string): Promise<Progress[]>;
  calculateCompletion(userId: string, moduleId: string): Promise<number>;
  getStreak(userId: string): Promise<number>;
}

interface Progress {
  contentId: string;
  completed: boolean;
  score?: number;
  timeSpent: number;
  lastAccessed: Date;
  attempts: number;
}
```

**Usage:**

```javascript
import { progressService } from '$lib/services';

// Update progress
await progressService.updateProgress('user-123', 'lesson-456', {
  contentId: 'lesson-456',
  completed: true,
  score: 85,
  timeSpent: 1800,
  lastAccessed: new Date(),
  attempts: 2
});

// Get user progress
const progress = await progressService.getProgress('user-123');

// Calculate module completion
const completion = await progressService.calculateCompletion('user-123', 'module-789');
```

## Data Management Services

### Content Management Service

Handles CRUD operations for content with versioning and metadata.

```typescript
interface ContentManagementService {
  create(content: ContentData): Promise<Content>;
  read(id: string): Promise<Content | null>;
  update(id: string, updates: Partial<ContentData>): Promise<Content>;
  delete(id: string): Promise<void>;
  list(filters?: ContentFilters): Promise<Content[]>;
  createVersion(id: string, versionData: VersionData): Promise<Version>;
  getVersions(id: string): Promise<Version[]>;
}
```

**Usage:**

```javascript
import { contentManagementService } from '$lib/services';

// Create new content
const content = await contentManagementService.create({
  title: 'Introduction to AI',
  type: 'lesson',
  blocks: contentBlocks,
  metadata: {
    difficulty: 2,
    estimatedTime: 30,
    tags: ['ai', 'introduction']
  }
});

// Update content
await contentManagementService.update(content.id, {
  title: 'Updated Title',
  blocks: updatedBlocks
});

// Create version
await contentManagementService.createVersion(content.id, {
  type: 'major',
  description: 'Added interactive elements'
});
```

### Media Management Service

Handles media file storage, optimization, and delivery.

```typescript
interface MediaManagementService {
  upload(file: File, options?: UploadOptions): Promise<MediaFile>;
  get(id: string): Promise<MediaFile | null>;
  delete(id: string): Promise<void>;
  optimize(id: string, options: OptimizationOptions): Promise<MediaFile>;
  generateThumbnail(id: string, size: ThumbnailSize): Promise<string>;
}

interface UploadOptions {
  compress?: boolean;
  generateThumbnails?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
}
```

**Usage:**

```javascript
import { mediaManagementService } from '$lib/services';

// Upload media file
const mediaFile = await mediaManagementService.upload(file, {
  compress: true,
  generateThumbnails: true,
  maxSize: 5 * 1024 * 1024 // 5MB
});

// Optimize existing media
await mediaManagementService.optimize(mediaFile.id, {
  quality: 0.8,
  format: 'webp'
});

// Generate thumbnail
const thumbnailUrl = await mediaManagementService.generateThumbnail(mediaFile.id, {
  width: 200,
  height: 150
});
```

### Relationship Management Service

Manages relationships between content items and learning paths.

```typescript
interface RelationshipManagementService {
  createRelationship(from: string, to: string, type: RelationType): Promise<void>;
  getRelationships(id: string, type?: RelationType): Promise<Relationship[]>;
  removeRelationship(from: string, to: string, type: RelationType): Promise<void>;
  findPath(from: string, to: string): Promise<string[]>;
  getPrerequisites(id: string): Promise<string[]>;
  getDependents(id: string): Promise<string[]>;
}

type RelationType = 'prerequisite' | 'related' | 'followup' | 'reference';
```

**Usage:**

```javascript
import { relationshipManagementService } from '$lib/services';

// Create prerequisite relationship
await relationshipManagementService.createRelationship(
  'advanced-lesson',
  'basic-lesson',
  'prerequisite'
);

// Get related content
const related = await relationshipManagementService.getRelationships('lesson-123', 'related');

// Find learning path
const path = await relationshipManagementService.findPath('beginner-lesson', 'advanced-project');
```

## Analytics Services

### Analytics Service

Collects and analyzes user interaction data.

```typescript
interface AnalyticsService {
  track(event: AnalyticsEvent): Promise<void>;
  getMetrics(query: MetricsQuery): Promise<Metrics>;
  generateReport(type: ReportType, options: ReportOptions): Promise<Report>;
  setUser(userId: string, properties?: UserProperties): void;
}

interface AnalyticsEvent {
  type: string;
  userId?: string;
  contentId?: string;
  properties?: Record<string, any>;
  timestamp?: Date;
}
```

**Usage:**

```javascript
import { analyticsService } from '$lib/services';

// Track user interaction
await analyticsService.track({
  type: 'content_viewed',
  userId: 'user-123',
  contentId: 'lesson-456',
  properties: {
    duration: 300,
    completed: false,
    source: 'search'
  }
});

// Get content metrics
const metrics = await analyticsService.getMetrics({
  contentId: 'lesson-456',
  timeRange: { start: startDate, end: endDate },
  metrics: ['views', 'completions', 'average_time']
});

// Generate usage report
const report = await analyticsService.generateReport('usage', {
  timeRange: 'last_30_days',
  groupBy: 'content_type'
});
```

### Performance Monitoring Service

Monitors application performance and user experience metrics.

```typescript
interface PerformanceMonitoringService {
  measurePageLoad(page: string): Promise<void>;
  measureInteraction(interaction: string, duration: number): Promise<void>;
  reportError(error: Error, context?: any): Promise<void>;
  getVitals(): Promise<WebVitals>;
  setPerformanceBudget(budget: PerformanceBudget): void;
}

interface WebVitals {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}
```

**Usage:**

```javascript
import { performanceMonitoringService } from '$lib/services';

// Measure page performance
await performanceMonitoringService.measurePageLoad('/knowledge/lesson-123');

// Track interaction performance
await performanceMonitoringService.measureInteraction('quiz_completion', 45000);

// Report errors
await performanceMonitoringService.reportError(error, {
  userId: 'user-123',
  contentId: 'lesson-456',
  userAgent: navigator.userAgent
});

// Get current vitals
const vitals = await performanceMonitoringService.getVitals();
```

## Integration Services

### Web Content Integration Service

Integrates external web content into the knowledge system.

```typescript
interface WebContentIntegrationService {
  fetchContent(url: string, options?: FetchOptions): Promise<WebContent>;
  processContent(content: WebContent): Promise<ProcessedContent>;
  integrateContent(content: ProcessedContent): Promise<Content>;
  scheduleUpdate(sourceId: string, schedule: string): Promise<void>;
  getSourceStatus(sourceId: string): Promise<SourceStatus>;
}

interface FetchOptions {
  useHeadlessBrowser?: boolean;
  timeout?: number;
  retryAttempts?: number;
  extractMainContent?: boolean;
}
```

**Usage:**

```javascript
import { webContentIntegrationService } from '$lib/services';

// Fetch and integrate web content
const webContent = await webContentIntegrationService.fetchContent('https://example.com/article', {
  extractMainContent: true
});

const processed = await webContentIntegrationService.processContent(webContent);
const integrated = await webContentIntegrationService.integrateContent(processed);

// Schedule regular updates
await webContentIntegrationService.scheduleUpdate('source-123', '0 9 * * *');
```

### Export Service

Handles content export to various formats.

```typescript
interface ExportService {
  exportToPDF(contentId: string, options?: PDFOptions): Promise<Blob>;
  exportToMarkdown(contentId: string): Promise<string>;
  exportToJSON(contentId: string): Promise<object>;
  exportToSCORM(moduleId: string, options?: SCORMOptions): Promise<Blob>;
  bulkExport(contentIds: string[], format: ExportFormat): Promise<Blob>;
}

interface PDFOptions {
  includeImages?: boolean;
  pageSize?: 'A4' | 'Letter';
  margins?: { top: number; right: number; bottom: number; left: number };
  headerFooter?: boolean;
}
```

**Usage:**

```javascript
import { exportService } from '$lib/services';

// Export to PDF
const pdfBlob = await exportService.exportToPDF('lesson-123', {
  includeImages: true,
  pageSize: 'A4',
  headerFooter: true
});

// Export to Markdown
const markdown = await exportService.exportToMarkdown('lesson-123');

// Bulk export
const archive = await exportService.bulkExport(['lesson-1', 'lesson-2', 'lesson-3'], 'markdown');
```

## Utility Services

### Notification Service

Manages user notifications and alerts.

```typescript
interface NotificationService {
  send(notification: Notification): Promise<void>;
  schedule(notification: Notification, when: Date): Promise<string>;
  cancel(notificationId: string): Promise<void>;
  getHistory(userId: string): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  subscribe(userId: string, type: NotificationType): Promise<void>;
}

interface Notification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high';
}
```

**Usage:**

```javascript
import { notificationService } from '$lib/services';

// Send immediate notification
await notificationService.send({
  userId: 'user-123',
  type: 'achievement',
  title: 'Congratulations!',
  message: 'You completed the AI Fundamentals module!',
  priority: 'high'
});

// Schedule reminder
const notificationId = await notificationService.schedule(
  {
    userId: 'user-123',
    type: 'reminder',
    title: 'Continue Learning',
    message: 'You have unfinished lessons in Machine Learning'
  },
  new Date(Date.now() + 24 * 60 * 60 * 1000)
); // 24 hours from now
```

### Backup Service

Handles data backup and restoration.

```typescript
interface BackupService {
  createBackup(options?: BackupOptions): Promise<BackupResult>;
  restoreBackup(backupId: string): Promise<RestoreResult>;
  listBackups(): Promise<BackupInfo[]>;
  deleteBackup(backupId: string): Promise<void>;
  scheduleBackup(schedule: string, options?: BackupOptions): Promise<void>;
}

interface BackupOptions {
  includeMedia?: boolean;
  compress?: boolean;
  encrypt?: boolean;
  destination?: 'local' | 'cloud';
}
```

**Usage:**

```javascript
import { backupService } from '$lib/services';

// Create manual backup
const backup = await backupService.createBackup({
  includeMedia: true,
  compress: true,
  destination: 'cloud'
});

// Schedule automatic backups
await backupService.scheduleBackup('0 2 * * *', {
  includeMedia: false,
  compress: true
});

// Restore from backup
await backupService.restoreBackup('backup-123');
```

## Service Configuration

### Service Registry

```javascript
// Service registration and dependency injection
import { ServiceRegistry } from '$lib/services';

const registry = new ServiceRegistry();

// Register services
registry.register('storage', StorageService);
registry.register('search', SearchService, ['storage']);
registry.register('content', ContentManagementService, ['storage', 'search']);

// Get service instance
const contentService = registry.get('content');
```

### Service Lifecycle

```javascript
// Service initialization and cleanup
class ServiceManager {
  async initialize() {
    await this.storage.initialize();
    await this.search.initialize();
    await this.sync.initialize();
  }

  async shutdown() {
    await this.sync.shutdown();
    await this.search.shutdown();
    await this.storage.shutdown();
  }
}
```

### Error Handling

```javascript
// Global service error handling
class ServiceErrorHandler {
  handleError(service: string, error: Error, context?: any) {
    logger.error(`Service error in ${service}:`, error, context);

    // Retry logic for transient errors
    if (this.isRetryable(error)) {
      return this.scheduleRetry(service, context);
    }

    // Fallback for critical services
    if (this.isCritical(service)) {
      return this.activateFallback(service);
    }

    // Notify user for user-facing errors
    if (this.isUserFacing(error)) {
      this.notifyUser(error);
    }
  }
}
```

## Testing Services

### Mock Services

```javascript
// Service mocking for testing
export class MockStorageService implements StorageService {
  private data = new Map();

  async save(key: string, data: any): Promise<void> {
    this.data.set(key, data);
  }

  async get(key: string, defaultValue?: any): Promise<any> {
    return this.data.get(key) ?? defaultValue;
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }
}
```

### Service Testing Utilities

```javascript
// Testing utilities for services
export class ServiceTestUtils {
  static async setupTestServices() {
    const registry = new ServiceRegistry();
    registry.register('storage', MockStorageService);
    registry.register('search', MockSearchService);
    return registry;
  }

  static async cleanupTestServices(registry: ServiceRegistry) {
    await registry.shutdown();
  }

  static createMockData() {
    return {
      content: { id: 'test-1', title: 'Test Content' },
      user: { id: 'user-1', name: 'Test User' },
      progress: { contentId: 'test-1', completed: true }
    };
  }
}
```
