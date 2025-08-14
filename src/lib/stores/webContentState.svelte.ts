/**
 * Web Content Sourcing State Store
 * Manages state for web content sourcing and transformation using Svelte 5 runes
 */

import type {
    WebContent,
    WebContentSource,
    BatchProcessingJob,
    ContentProcessingResult
} from '../types/web-content.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('web-content-state');

/**
 * Web content sourcing state using Svelte 5 runes
 */
export const webContentState = $state({
    // Content sources management
    sources: {
        items: {} as Record<string, WebContentSource>,
        currentSource: null as WebContentSource | null,
        isLoading: false,
        lastUpdated: null as string | null
    },

    // Fetched content
    content: {
        items: {} as Record<string, WebContent>,
        currentContent: null as WebContent | null,
        isProcessing: false,
        processingProgress: 0
    },

    // Batch processing
    batch: {
        jobs: {} as Record<string, BatchProcessingJob>,
        activeJob: null as BatchProcessingJob | null,
        queue: [] as string[],
        isProcessing: false
    },

    // Interactive transformation
    transformation: {
        opportunities: [] as any[],
        isAnalyzing: false,
        currentTransformation: null as any,
        transformationHistory: [] as any[]
    },

    // UI state
    ui: {
        activeView: 'sources' as 'sources' | 'content' | 'batch' | 'transformation',
        selectedItems: [] as string[],
        searchQuery: '',
        filters: {
            domain: '',
            category: '',
            status: 'all' as 'all' | 'active' | 'error' | 'updated'
        },
        notifications: [] as Array<{
            id: string;
            type: 'info' | 'success' | 'warning' | 'error';
            message: string;
            timestamp: string;
        }>
    }
});

/**
 * Derived state using Svelte 5 $derived rune
 * Note: Do not export $derived values directly; export accessors returning current value.
 */
const filteredSources = $derived(() => {
    const { items } = webContentState.sources;
    const { searchQuery: uiSearchQuery, filters: uiFilters } = webContentState.ui;

    let filtered: WebContentSource[] = Object.values(items) as WebContentSource[];

    // Apply search query
    const query = (uiSearchQuery || '').toLowerCase();
    if (query.trim()) {
        filtered = filtered.filter((source: WebContentSource) =>
            source.title.toLowerCase().includes(query) ||
            source.domain.toLowerCase().includes(query) ||
            source.metadata.tags.some((tag: string) => tag.toLowerCase().includes(query))
        );
    }

    // Apply filters
    if (uiFilters.domain) {
        filtered = filtered.filter((source: WebContentSource) => source.domain === uiFilters.domain);
    }
    if (uiFilters.category) {
        filtered = filtered.filter(
            (source: WebContentSource) => source.metadata.category === uiFilters.category
        );
    }
    if (uiFilters.status !== 'all') {
        filtered = filtered.filter((source: WebContentSource) => source.status === uiFilters.status);
    }

    return filtered;
});

export function getFilteredSources(): WebContentSource[] {
    return filteredSources();
}

const contentStats = $derived(() => {
    const sources = Object.keys(webContentState.sources.items).length;
    const content = Object.keys(webContentState.content.items).length;
    const activeJobs = (Object.values(webContentState.batch.jobs) as BatchProcessingJob[])
        .filter((job: BatchProcessingJob) => job.status === 'processing').length;

    return {
        totalSources: sources,
        totalContent: content,
        activeJobs,
        transformationOpportunities: webContentState.transformation.opportunities.length
    };
});

export function getContentStats(): {
    totalSources: number;
    totalContent: number;
    activeJobs: number;
    transformationOpportunities: number;
} {
    return contentStats();
}

const batchProgress = $derived(() => {
    const activeJob = webContentState.batch.activeJob;
    if (!activeJob) {return null;}

    const completed = (activeJob.results as ContentProcessingResult[])
        .filter((r: ContentProcessingResult) => r.success === true).length;
    const failed = (activeJob.results as ContentProcessingResult[])
        .filter((r: ContentProcessingResult) => r.success === false).length;
    const total = activeJob.urls.length;

    return {
        completed,
        failed,
        total,
        percentage: total > 0 ? Math.round((completed + failed) / total * 100) : 0
    };
});

export function getBatchProgress(): {
    completed: number;
    failed: number;
    total: number;
    percentage: number;
} | null {
    return batchProgress();
}

/** Legacy function exports removed to prevent duplicate declarations. */

/**
 * Actions for state mutations
 */
export const webContentActions = {
    // Source management
    addSource: (source: WebContentSource) => {
        webContentState.sources.items[source.id] = source;
        webContentState.sources.lastUpdated = Date.now().toString();
        logger.info(`Added source: ${source.title}`);
    },

    updateSource: (id: string, updates: Partial<WebContentSource>) => {
        const existing = webContentState.sources.items[id];
        if (existing) {
            const updated = { ...existing, ...updates, lastChecked: new Date() };
            webContentState.sources.items[id] = updated;
            webContentState.sources.lastUpdated = Date.now().toString();
            logger.info(`Updated source: ${id}`);
        }
    },

    removeSource: (id: string) => {
        const source = webContentState.sources.items[id];
        if (source) {
            delete webContentState.sources.items[id];
            webContentState.sources.lastUpdated = Date.now().toString();
            logger.info(`Removed source: ${id}`);
        }
    },

    setCurrentSource: (source: WebContentSource | null) => {
        webContentState.sources.currentSource = source;
    },

    setSourcesLoading: (loading: boolean) => {
        webContentState.sources.isLoading = loading;
    },

    // Content management
    addContent: (content: WebContent) => {
        webContentState.content.items[content.id] = content;
        logger.info(`Added content: ${content.title}`);
    },

    updateContent: (id: string, updates: Partial<WebContent>) => {
        const existing = webContentState.content.items[id];
        if (existing) {
            webContentState.content.items[id] = { ...existing, ...updates };
            logger.info(`Updated content: ${id}`);
        }
    },

    setCurrentContent: (content: WebContent | null) => {
        webContentState.content.currentContent = content;
    },

    setContentProcessing: (processing: boolean, progress = 0) => {
        webContentState.content.isProcessing = processing;
        webContentState.content.processingProgress = progress;
    },

    // Batch processing
    addBatchJob: (job: BatchProcessingJob) => {
        webContentState.batch.jobs[job.id] = job;
        webContentState.batch.queue.push(job.id);
        logger.info(`Added batch job: ${job.id} with ${job.urls.length} URLs`);
    },

    updateBatchJob: (id: string, updates: Partial<BatchProcessingJob>) => {
        const existing = webContentState.batch.jobs[id];
        if (existing) {
            webContentState.batch.jobs[id] = { ...existing, ...updates };
            logger.info(`Updated batch job: ${id}`);
        }
    },

    setActiveBatchJob: (job: BatchProcessingJob | null) => {
        webContentState.batch.activeJob = job;
    },

    setBatchProcessing: (processing: boolean) => {
        webContentState.batch.isProcessing = processing;
    },

    // Transformation management
    setTransformationOpportunities: (opportunities: any[]) => {
        webContentState.transformation.opportunities = opportunities;
    },

    addTransformationOpportunity: (opportunity: any) => {
        webContentState.transformation.opportunities.push(opportunity);
    },

    setTransformationAnalyzing: (analyzing: boolean) => {
        webContentState.transformation.isAnalyzing = analyzing;
    },

    setCurrentTransformation: (transformation: any) => {
        webContentState.transformation.currentTransformation = transformation;
    },

    addTransformationToHistory: (transformation: any) => {
        webContentState.transformation.transformationHistory.push({
            ...transformation,
            timestamp: Date.now().toString()
        });
    },

    // UI actions
    setActiveView: (view: typeof webContentState.ui.activeView) => {
        webContentState.ui.activeView = view;
    },

    setSearchQuery: (query: string) => {
        webContentState.ui.searchQuery = query;
    },

    setFilters: (filters: Partial<typeof webContentState.ui.filters>) => {
        Object.assign(webContentState.ui.filters, filters);
    },

    toggleItemSelection: (id: string) => {
        const index = webContentState.ui.selectedItems.indexOf(id);
        if (index > -1) {
            webContentState.ui.selectedItems.splice(index, 1);
        } else {
            webContentState.ui.selectedItems.push(id);
        }
    },

    clearSelection: () => {
        webContentState.ui.selectedItems.length = 0;
    },

    addNotification: (notification: Omit<typeof webContentState.ui.notifications[0], 'id' | 'timestamp'>) => {
        const id = crypto.randomUUID();
        webContentState.ui.notifications.push({
            ...notification,
            id,
            timestamp: Date.now().toString()
        });

        // Auto-remove after 5 seconds for non-error notifications
        if (notification.type !== 'error') {
            setTimeout(() => {
                webContentActions.removeNotification(id);
            }, 5000);
        }
    },

    removeNotification: (id: string) => {
        const index = webContentState.ui.notifications.findIndex(
            (n: { id: string }) => n.id === id
        );
        if (index > -1) {
            webContentState.ui.notifications.splice(index, 1);
        }
    }
};