# Content Management Guide

## Overview

The Interactive Knowledge System provides comprehensive tools for organizing, maintaining, and optimizing your knowledge base. This guide covers content organization, version control, search and discovery, analytics, and maintenance workflows.

## Content Organization

### Knowledge Tree Structure

The system uses a hierarchical tree structure to organize content:

```typescript
interface KnowledgeNode {
  id: string;
  title: string;
  type: 'folder' | 'module' | 'lesson';
  children?: KnowledgeNode[];
  parent?: string;
  metadata: {
    difficulty: 1 | 2 | 3 | 4 | 5;
    estimatedTime: number;
    prerequisites: string[];
    tags: string[];
  };
  progress?: {
    completed: boolean;
    score?: number;
    lastAccessed: Date;
  };
}
```

### Creating the Knowledge Hierarchy

```svelte
<script>
  import { KnowledgeTree } from '$lib/components';
  import { contentManagementService } from '$lib/services';

  let knowledgeNodes = [];

  async function createCourseStructure() {
    // Create main course module
    const course = await contentManagementService.create({
      title: 'Data Science Fundamentals',
      type: 'module',
      metadata: {
        difficulty: 2,
        estimatedTime: 480, // 8 hours total
        tags: ['data-science', 'statistics', 'python']
      }
    });

    // Create sub-modules
    const statistics = await contentManagementService.create({
      title: 'Statistics Basics',
      type: 'module',
      parent: course.id,
      metadata: {
        difficulty: 2,
        estimatedTime: 120,
        tags: ['statistics', 'math']
      }
    });

    // Create individual lessons
    const descriptiveStats = await contentManagementService.create({
      title: 'Descriptive Statistics',
      type: 'lesson',
      parent: statistics.id,
      metadata: {
        difficulty: 1,
        estimatedTime: 30,
        prerequisites: [],
        tags: ['statistics', 'descriptive']
      }
    });

    return { course, statistics, descriptiveStats };
  }
</script>

<KnowledgeTree bind:nodes={knowledgeNodes} showActions={true} />
```

### Organizing by Learning Paths

```typescript
import { relationshipManagementService } from '$lib/services';

class LearningPathManager {
  async createLearningPath(pathName: string, lessons: string[]) {
    // Create sequential prerequisites
    for (let i = 1; i < lessons.length; i++) {
      await relationshipManagementService.createRelationship(
        lessons[i],
        lessons[i - 1],
        'prerequisite'
      );
    }

    // Tag all lessons with the path name
    for (const lessonId of lessons) {
      await contentManagementService.update(lessonId, {
        tags: [...(await this.getTags(lessonId)), pathName]
      });
    }
  }

  async getOptimalPath(from: string, to: string): Promise<string[]> {
    return await relationshipManagementService.findPath(from, to);
  }

  async getPrerequisites(lessonId: string): Promise<string[]> {
    return await relationshipManagementService.getPrerequisites(lessonId);
  }
}

// Usage
const pathManager = new LearningPathManager();
await pathManager.createLearningPath('beginner-python', [
  'python-basics',
  'variables-types',
  'control-structures',
  'functions',
  'data-structures'
]);
```

## Content Discovery and Search

### Full-Text Search

```svelte
<script>
  import { SearchEngine } from '$lib/components';
  import { searchService } from '$lib/services';

  let searchQuery = '';
  let searchResults = [];
  let filters = {
    difficulty: null,
    tags: [],
    contentType: null,
    estimatedTime: null
  };

  async function performSearch() {
    searchResults = await searchService.search(searchQuery, {
      filters,
      limit: 20,
      fuzzy: true,
      sortBy: 'relevance'
    });
  }

  async function indexContent(contentId: string, content: any) {
    await searchService.index(contentId, content.text, {
      title: content.title,
      type: content.type,
      tags: content.metadata.tags,
      difficulty: content.metadata.difficulty,
      estimatedTime: content.metadata.estimatedTime
    });
  }
</script>

<SearchEngine
  bind:query={searchQuery}
  bind:results={searchResults}
  bind:filters
  onSearch={performSearch}
/>
```

### Advanced Filtering

```typescript
interface SearchFilters {
  difficulty?: number[];
  tags?: string[];
  contentType?: string[];
  estimatedTime?: { min: number; max: number };
  lastModified?: { after: Date; before: Date };
  completionStatus?: 'completed' | 'in-progress' | 'not-started';
  author?: string[];
  language?: string[];
}

class AdvancedSearchManager {
  async searchWithFilters(query: string, filters: SearchFilters) {
    const results = await searchService.search(query, {
      filters: this.buildFilterQuery(filters),
      sortBy: 'relevance',
      limit: 50
    });

    return this.enrichResults(results);
  }

  private buildFilterQuery(filters: SearchFilters) {
    const query: any = {};

    if (filters.difficulty) {
      query.difficulty = { $in: filters.difficulty };
    }

    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters.estimatedTime) {
      query.estimatedTime = {
        $gte: filters.estimatedTime.min,
        $lte: filters.estimatedTime.max
      };
    }

    return query;
  }

  private async enrichResults(results: any[]) {
    return Promise.all(
      results.map(async result => ({
        ...result,
        progress: await this.getProgress(result.id),
        relationships: await this.getRelationships(result.id)
      }))
    );
  }
}
```

### Content Recommendations

```typescript
import { similarityEngine } from '$lib/utils';

class ContentRecommendationEngine {
  async getRecommendations(userId: string, currentContentId: string) {
    // Get user's learning history
    const userProgress = await progressService.getProgress(userId);
    const completedContent = userProgress.filter(p => p.completed).map(p => p.contentId);

    // Get similar content
    const similar = await similarityEngine.findSimilar(currentContentId, {
      limit: 10,
      excludeCompleted: true,
      userHistory: completedContent
    });

    // Get next in learning path
    const nextInPath = await this.getNextInPath(currentContentId, completedContent);

    // Combine and rank recommendations
    return this.rankRecommendations([...similar, ...nextInPath], userId);
  }

  private async getNextInPath(contentId: string, completed: string[]) {
    const dependents = await relationshipManagementService.getDependents(contentId);
    return dependents.filter(id => !completed.includes(id));
  }

  private async rankRecommendations(recommendations: any[], userId: string) {
    // Score based on user preferences, difficulty progression, etc.
    return recommendations.sort((a, b) => b.score - a.score);
  }
}
```

## Version Control and History

### Content Versioning

```typescript
interface ContentVersion {
  id: string;
  contentId: string;
  version: string;
  type: 'major' | 'minor' | 'patch';
  changes: string;
  author: string;
  createdAt: Date;
  data: any;
}

class ContentVersionManager {
  async createVersion(
    contentId: string,
    changes: string,
    type: 'major' | 'minor' | 'patch' = 'minor'
  ) {
    const currentContent = await contentManagementService.read(contentId);
    if (!currentContent) {
      throw new Error('Content not found');
    }

    const version = await contentManagementService.createVersion(contentId, {
      type,
      description: changes,
      data: currentContent
    });

    return version;
  }

  async getVersionHistory(contentId: string) {
    return await contentManagementService.getVersions(contentId);
  }

  async compareVersions(contentId: string, version1: string, version2: string) {
    const v1 = await this.getVersion(contentId, version1);
    const v2 = await this.getVersion(contentId, version2);

    return this.generateDiff(v1.data, v2.data);
  }

  async restoreVersion(contentId: string, versionId: string) {
    const version = await this.getVersion(contentId, versionId);

    // Create backup of current version
    await this.createVersion(contentId, `Backup before restore to ${versionId}`, 'patch');

    // Restore the version
    await contentManagementService.update(contentId, version.data);

    return true;
  }

  private generateDiff(oldData: any, newData: any) {
    // Implement diff algorithm
    return {
      added: [],
      removed: [],
      modified: []
    };
  }
}
```

### Change Tracking

```svelte
<script>
  import { onMount } from 'svelte';

  let contentHistory = [];
  let selectedVersion = null;

  onMount(async () => {
    contentHistory = await versionManager.getVersionHistory(contentId);
  });

  async function viewVersion(version) {
    selectedVersion = await versionManager.getVersion(contentId, version.id);
  }

  async function restoreVersion(version) {
    if (confirm(`Restore to version ${version.version}?`)) {
      await versionManager.restoreVersion(contentId, version.id);
      location.reload();
    }
  }
</script>

<div class="version-history">
  <h3>Version History</h3>

  {#each contentHistory as version}
    <div class="version-item">
      <div class="version-info">
        <strong>v{version.version}</strong>
        <span class="version-type">{version.type}</span>
        <time>{version.createdAt.toLocaleDateString()}</time>
        <span class="author">by {version.author}</span>
      </div>

      <p class="changes">{version.changes}</p>

      <div class="version-actions">
        <button on:click={() => viewVersion(version)}>View</button>
        <button on:click={() => restoreVersion(version)}>Restore</button>
      </div>
    </div>
  {/each}
</div>
```

## Content Analytics and Insights

### Usage Analytics

```typescript
import { analyticsService } from '$lib/services';

class ContentAnalytics {
  async getContentMetrics(contentId: string, timeRange: { start: Date; end: Date }) {
    return await analyticsService.getMetrics({
      contentId,
      timeRange,
      metrics: [
        'views',
        'completions',
        'average_time',
        'bounce_rate',
        'engagement_score',
        'quiz_scores'
      ]
    });
  }

  async getPopularContent(limit = 10) {
    return await analyticsService.getMetrics({
      metrics: ['views', 'completions'],
      groupBy: 'content_id',
      orderBy: 'views',
      limit
    });
  }

  async getLearningPathAnalytics(pathId: string) {
    const pathContent = await this.getPathContent(pathId);
    const analytics = await Promise.all(
      pathContent.map(async content => ({
        ...content,
        metrics: await this.getContentMetrics(content.id, {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        })
      }))
    );

    return {
      totalViews: analytics.reduce((sum, a) => sum + a.metrics.views, 0),
      averageCompletion:
        analytics.reduce((sum, a) => sum + a.metrics.completions, 0) / analytics.length,
      dropoffPoints: this.identifyDropoffPoints(analytics),
      recommendations: this.generateImprovementRecommendations(analytics)
    };
  }

  private identifyDropoffPoints(analytics: any[]) {
    return analytics
      .map((content, index) => ({
        ...content,
        dropoffRate:
          index > 0
            ? (analytics[index - 1].metrics.views - content.metrics.views) /
              analytics[index - 1].metrics.views
            : 0
      }))
      .filter(content => content.dropoffRate > 0.3) // 30% dropoff threshold
      .sort((a, b) => b.dropoffRate - a.dropoffRate);
  }
}
```

### Performance Monitoring

```svelte
<script>
  import { ProgressDashboard } from '$lib/components';
  import { performanceMonitoringService } from '$lib/services';

  let performanceMetrics = {};
  let contentPerformance = [];

  onMount(async () => {
    performanceMetrics = await performanceMonitoringService.getVitals();
    contentPerformance = await loadContentPerformance();
  });

  async function loadContentPerformance() {
    const content = await contentManagementService.list();
    return Promise.all(
      content.map(async item => ({
        ...item,
        loadTime: await measureContentLoadTime(item.id),
        interactionDelay: await measureInteractionDelay(item.id),
        userSatisfaction: await getUserSatisfactionScore(item.id)
      }))
    );
  }
</script>

<ProgressDashboard metrics={performanceMetrics} {contentPerformance} />
```

## Content Maintenance

### Automated Quality Checks

```typescript
class ContentQualityManager {
  async runQualityChecks(contentId: string) {
    const content = await contentManagementService.read(contentId);
    const issues = [];

    // Check for broken links
    const brokenLinks = await this.checkLinks(content);
    if (brokenLinks.length > 0) {
      issues.push({
        type: 'broken-links',
        severity: 'medium',
        count: brokenLinks.length,
        details: brokenLinks
      });
    }

    // Check for outdated content
    const lastModified = new Date(content.metadata.modified);
    const daysSinceUpdate = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 180) {
      // 6 months
      issues.push({
        type: 'outdated-content',
        severity: 'low',
        daysSinceUpdate: Math.floor(daysSinceUpdate)
      });
    }

    // Check accessibility
    const accessibilityIssues = await this.checkAccessibility(content);
    if (accessibilityIssues.length > 0) {
      issues.push({
        type: 'accessibility',
        severity: 'high',
        issues: accessibilityIssues
      });
    }

    // Check content completeness
    const completenessScore = this.assessCompleteness(content);
    if (completenessScore < 0.8) {
      issues.push({
        type: 'incomplete-content',
        severity: 'medium',
        score: completenessScore
      });
    }

    return {
      contentId,
      overallScore: this.calculateOverallScore(issues),
      issues,
      recommendations: this.generateRecommendations(issues)
    };
  }

  async checkLinks(content: any) {
    const links = this.extractLinks(content);
    const brokenLinks = [];

    for (const link of links) {
      try {
        const response = await fetch(link, { method: 'HEAD' });
        if (!response.ok) {
          brokenLinks.push({ url: link, status: response.status });
        }
      } catch (error) {
        brokenLinks.push({ url: link, error: error.message });
      }
    }

    return brokenLinks;
  }

  async checkAccessibility(content: any) {
    const issues = [];

    // Check for alt text on images
    const images = this.extractImages(content);
    const imagesWithoutAlt = images.filter(img => !img.alt);
    if (imagesWithoutAlt.length > 0) {
      issues.push({
        type: 'missing-alt-text',
        count: imagesWithoutAlt.length
      });
    }

    // Check heading hierarchy
    const headings = this.extractHeadings(content);
    const hierarchyIssues = this.validateHeadingHierarchy(headings);
    if (hierarchyIssues.length > 0) {
      issues.push({
        type: 'heading-hierarchy',
        issues: hierarchyIssues
      });
    }

    return issues;
  }
}
```

### Bulk Operations

```typescript
class BulkContentManager {
  async bulkUpdate(contentIds: string[], updates: any) {
    const results = [];

    for (const id of contentIds) {
      try {
        const updated = await contentManagementService.update(id, updates);
        results.push({ id, success: true, content: updated });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    return results;
  }

  async bulkTag(contentIds: string[], tags: string[]) {
    return this.bulkUpdate(contentIds, {
      tags: (existingTags: string[]) => [...new Set([...existingTags, ...tags])]
    });
  }

  async bulkMove(contentIds: string[], newParent: string) {
    return this.bulkUpdate(contentIds, { parent: newParent });
  }

  async bulkDelete(contentIds: string[]) {
    const results = [];

    for (const id of contentIds) {
      try {
        await contentManagementService.delete(id);
        results.push({ id, success: true });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }

    return results;
  }

  async bulkExport(contentIds: string[], format: 'pdf' | 'markdown' | 'json') {
    return await exportService.bulkExport(contentIds, format);
  }
}
```

## Content Collaboration

### Multi-User Editing

```svelte
<script>
  import { onMount, onDestroy } from 'svelte';
  import { contentManagementService } from '$lib/services';

  let content = {};
  let collaborators = [];
  let changes = [];
  let conflictResolution = null;

  onMount(() => {
    setupCollaboration();
  });

  async function setupCollaboration() {
    // Subscribe to real-time changes
    const unsubscribe = contentManagementService.subscribeToChanges(contentId, change => {
      handleRemoteChange(change);
    });

    // Get current collaborators
    collaborators = await contentManagementService.getCollaborators(contentId);

    return unsubscribe;
  }

  function handleRemoteChange(change) {
    if (change.userId !== currentUserId) {
      // Check for conflicts
      const conflict = detectConflict(change, localChanges);
      if (conflict) {
        conflictResolution = {
          local: localChanges,
          remote: change,
          resolve: resolveConflict
        };
      } else {
        applyRemoteChange(change);
      }
    }
  }

  async function resolveConflict(resolution) {
    const merged = await contentManagementService.mergeChanges(
      contentId,
      conflictResolution.local,
      conflictResolution.remote,
      resolution
    );

    content = merged;
    conflictResolution = null;
  }
</script>

{#if conflictResolution}
  <ConflictResolutionDialog conflict={conflictResolution} onResolve={resolveConflict} />
{/if}

<div class="collaboration-header">
  <div class="collaborators">
    {#each collaborators as collaborator}
      <div class="collaborator" style="border-color: {collaborator.color}">
        {collaborator.name}
      </div>
    {/each}
  </div>
</div>
```

### Review and Approval Workflow

```typescript
interface ReviewRequest {
  id: string;
  contentId: string;
  requestedBy: string;
  reviewers: string[];
  status: 'pending' | 'approved' | 'rejected' | 'changes-requested';
  comments: ReviewComment[];
  createdAt: Date;
  dueDate?: Date;
}

interface ReviewComment {
  id: string;
  reviewerId: string;
  blockId?: string;
  comment: string;
  type: 'suggestion' | 'issue' | 'approval';
  createdAt: Date;
}

class ReviewWorkflowManager {
  async requestReview(contentId: string, reviewers: string[], dueDate?: Date) {
    const request: ReviewRequest = {
      id: this.generateId(),
      contentId,
      requestedBy: getCurrentUserId(),
      reviewers,
      status: 'pending',
      comments: [],
      createdAt: new Date(),
      dueDate
    };

    // Notify reviewers
    for (const reviewerId of reviewers) {
      await notificationService.send({
        userId: reviewerId,
        type: 'review-request',
        title: 'Review Request',
        message: `You have been requested to review content: ${await this.getContentTitle(contentId)}`,
        data: { reviewRequestId: request.id }
      });
    }

    return await this.saveReviewRequest(request);
  }

  async submitReview(
    requestId: string,
    reviewerId: string,
    comments: Omit<ReviewComment, 'id' | 'reviewerId' | 'createdAt'>[]
  ) {
    const request = await this.getReviewRequest(requestId);

    const reviewComments = comments.map(comment => ({
      ...comment,
      id: this.generateId(),
      reviewerId,
      createdAt: new Date()
    }));

    request.comments.push(...reviewComments);

    // Check if all reviewers have submitted
    const reviewerIds = new Set(request.comments.map(c => c.reviewerId));
    if (reviewerIds.size === request.reviewers.length) {
      request.status = this.determineOverallStatus(request.comments);
    }

    await this.saveReviewRequest(request);

    // Notify content author
    await notificationService.send({
      userId: request.requestedBy,
      type: 'review-completed',
      title: 'Review Completed',
      message: `Review completed for your content with status: ${request.status}`,
      data: { reviewRequestId: requestId }
    });

    return request;
  }
}
```

## Data Management

### Backup and Restore

```typescript
import { backupService } from '$lib/services';

class ContentBackupManager {
  async createFullBackup() {
    return await backupService.createBackup({
      includeMedia: true,
      compress: true,
      encrypt: true,
      destination: 'cloud'
    });
  }

  async createIncrementalBackup(lastBackupId: string) {
    const changes = await this.getChangesSince(lastBackupId);
    return await backupService.createIncrementalBackup(changes);
  }

  async scheduleAutomaticBackups() {
    // Daily incremental backups
    await backupService.scheduleBackup('0 2 * * *', {
      type: 'incremental',
      includeMedia: false,
      compress: true
    });

    // Weekly full backups
    await backupService.scheduleBackup('0 3 * * 0', {
      type: 'full',
      includeMedia: true,
      compress: true,
      encrypt: true
    });
  }

  async restoreFromBackup(
    backupId: string,
    options: {
      restoreContent?: boolean;
      restoreMedia?: boolean;
      restoreSettings?: boolean;
      overwriteExisting?: boolean;
    } = {}
  ) {
    const backup = await backupService.getBackup(backupId);

    if (options.restoreContent !== false) {
      await this.restoreContent(backup.content, options.overwriteExisting);
    }

    if (options.restoreMedia !== false && backup.media) {
      await this.restoreMedia(backup.media, options.overwriteExisting);
    }

    if (options.restoreSettings !== false && backup.settings) {
      await this.restoreSettings(backup.settings, options.overwriteExisting);
    }

    return true;
  }
}
```

### Data Migration

```typescript
class DataMigrationManager {
  async migrateFromVersion(fromVersion: string, toVersion: string) {
    const migrations = this.getMigrationPath(fromVersion, toVersion);

    for (const migration of migrations) {
      await this.runMigration(migration);
    }
  }

  async importFromExternal(source: 'notion' | 'obsidian' | 'roam', data: any) {
    switch (source) {
      case 'notion':
        return await this.importFromNotion(data);
      case 'obsidian':
        return await this.importFromObsidian(data);
      case 'roam':
        return await this.importFromRoam(data);
    }
  }

  private async importFromNotion(notionData: any) {
    const imported = [];

    for (const page of notionData.pages) {
      const content = await this.convertNotionPage(page);
      const created = await contentManagementService.create(content);
      imported.push(created);
    }

    return imported;
  }

  private async convertNotionPage(page: any) {
    return {
      title: page.properties.title.title[0]?.plain_text || 'Untitled',
      type: 'lesson',
      blocks: await this.convertNotionBlocks(page.children),
      metadata: {
        difficulty: this.inferDifficulty(page),
        estimatedTime: this.estimateReadingTime(page.children),
        tags: this.extractTags(page),
        imported: true,
        originalSource: 'notion',
        originalId: page.id
      }
    };
  }
}
```

## Best Practices

### Content Organization

1. **Consistent Naming**: Use clear, descriptive titles
2. **Logical Hierarchy**: Organize content in a logical learning progression
3. **Proper Tagging**: Use consistent, meaningful tags
4. **Regular Reviews**: Schedule periodic content reviews
5. **Version Control**: Create versions for significant changes

### Performance Optimization

1. **Lazy Loading**: Load content on demand
2. **Image Optimization**: Use appropriate formats and sizes
3. **Caching**: Implement proper caching strategies
4. **Search Indexing**: Keep search indexes up to date
5. **Cleanup**: Regularly remove unused content and media

### Collaboration Guidelines

1. **Clear Ownership**: Assign clear content owners
2. **Review Process**: Establish review workflows
3. **Communication**: Use comments and notifications effectively
4. **Conflict Resolution**: Have clear conflict resolution procedures
5. **Access Control**: Implement appropriate permissions

## Troubleshooting

### Common Issues

**Search Not Working**

- Rebuild search index
- Check for corrupted data
- Verify search service configuration

**Slow Performance**

- Check content size and complexity
- Review media optimization
- Monitor database performance

**Sync Issues**

- Check network connectivity
- Verify sync service configuration
- Review conflict resolution logs

### Maintenance Tasks

```typescript
// Weekly maintenance script
async function weeklyMaintenance() {
  // Clean up old versions
  await contentVersionManager.cleanupOldVersions(30); // Keep 30 days

  // Rebuild search index
  await searchService.rebuildIndex();

  // Run quality checks
  const allContent = await contentManagementService.list();
  for (const content of allContent) {
    await qualityManager.runQualityChecks(content.id);
  }

  // Generate analytics reports
  await analyticsService.generateReport('weekly', {
    includeUsage: true,
    includePerformance: true,
    includeQuality: true
  });

  // Backup data
  await backupService.createBackup({
    type: 'incremental',
    includeMedia: false
  });
}
```

## Next Steps

- Explore [MCP Server Integration](../mcp-server.md) for automated content sourcing
- Learn about [API Integration](../api/services.md) for custom workflows
- Check out [Performance Optimization](../technical/performance.md) for scaling
- Review [Security Best Practices](../technical/security.md) for production deployment
