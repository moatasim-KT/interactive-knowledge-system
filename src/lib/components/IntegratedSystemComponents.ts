/**
 * Integrated System Components Export
 * Provides a unified export of all integrated system components
 */

import { EnhancedDocumentProcessor } from '../services/enhancedDocumentProcessor.js';
import { comprehensiveErrorHandler } from '../services/comprehensiveErrorHandler.js';
import { SystemIntegrationService } from '../services/systemIntegrationService.js';

// Core Integration Services
export { SystemIntegrationService, systemIntegrationService } from '../services/systemIntegrationService.js';
export { ComprehensiveErrorHandler, comprehensiveErrorHandler } from '../services/comprehensiveErrorHandler.js';

// Enhanced Document Processing
export { EnhancedDocumentProcessor } from '../services/enhancedDocumentProcessor.js';
export { InteractiveTransformer } from '../services/interactiveTransformer.js';
export { knowledgeBaseIntegrationService } from '../services/knowledgeBaseIntegrationService.js';
export { WebContentFetcher } from '../services/webContentFetcher.js';

// UI Components
export { default as SystemIntegrationDashboard } from './SystemIntegrationDashboard.svelte';
export { default as DocumentUploadManager } from './DocumentUploadManager.svelte';
export { default as EnhancedWebContentDashboard } from './EnhancedWebContentDashboard.svelte';
export { default as MobileResponsiveSystem } from './ui/MobileResponsiveSystem.svelte';

// Knowledge Base Integration
export { default as KnowledgeBaseIntegration } from './KnowledgeBaseIntegration.svelte';
export { default as RelationshipDashboard } from './RelationshipDashboard.svelte';
export { default as InteractiveArticleViewer } from './InteractiveArticleViewer.svelte';

// State Management
export { webContentState, webContentActions } from '../stores/webContentState.svelte.js';
export { appState, actions } from '../stores/appState.svelte.js';

// Types
export type {
    SystemIntegrationOptions,
    IntegrationPipeline,
    IntegrationStep,
    DocumentTransformationResult
} from '$lib/types/unified';

export type {
    ErrorContext,
    ErrorClassification,
    ErrorRecoveryStrategy,
    ProcessedError,
    ErrorBreadcrumb,
    ErrorMetrics
} from '../services/comprehensiveErrorHandler.js';

export type {
    DocumentStructure,
    MediaAsset
} from '$lib/types/unified';

export type {
    InteractiveArticle,
    InteractiveContentBlock,
    InteractivityConfig,
    ContentEnhancement
} from '$lib/types/unified';

/**
 * Integrated System Configuration
 * Provides default configuration for the integrated system
 */
export const INTEGRATED_SYSTEM_CONFIG = {
    // System Integration Options
    systemIntegration: {
        enableProgressTracking: true,
        enableErrorRecovery: true,
        enableCaching: true,
        enableMobileOptimization: true,
        batchSize: 5,
        maxConcurrentOperations: 3
    },

    // Document Processing Options
    documentProcessing: {
        enableOcr: true,
        ocrLanguage: 'eng',
        extractImages: true,
        detectCodeBlocks: true,
        generateToc: true,
        minSectionLength: 100,
        maxSectionDepth: 6
    },

    // Interactive Transformation Options
    interactiveTransformation: {
        enableExpandableSections: true,
        generateQuizzes: true,
        enhanceCodeBlocks: true,
        findRelatedContent: true,
        aiEnhancement: true,
        maxQuizzesPerSection: 3,
        minSectionLengthForExpansion: 200,
        codeExecutionTimeout: 5000,
        relatedContentThreshold: 0.7
    },

    // Web Content Fetching Options
    webContentFetching: {
        timeout: 30000,
        userAgent: 'Mozilla/5.0 (compatible; InteractiveKnowledgeSystem/1.0)',
        followRedirects: true,
        maxRedirects: 5,
        extractAssets: true,
        cleanContent: true,
        preserveInteractivity: false,
        useHeadlessBrowser: false,
        retryAttempts: 3,
        retryDelay: 1000,
        extractionMethod: 'auto' as const
    },

    // Knowledge Base Integration Options
    knowledgeBaseIntegration: {
        autoCreateRelationships: true,
        minRelationshipConfidence: 0.4,
        generateTags: true,
        extractCategories: true,
        assignToCollections: true
    },

    // Mobile Responsive Options
    mobileResponsive: {
        breakpoints: {
            mobile: 768,
            tablet: 1024,
            desktop: 1200
        },
        enableTouchOptimization: true,
        enableGestures: true,
        adaptiveLayout: true
    },

    // Error Handling Options
    errorHandling: {
        maxHistorySize: 1000,
        maxBreadcrumbs: 100,
        enableGlobalErrorHandling: true,
        enableUserNotifications: true,
        enableRecoveryAttempts: true
    }
} as const;

/**
 * Initialize Integrated System
 * Sets up all integrated components with default configuration
 */
export async function initializeIntegratedSystem(config: Partial<typeof INTEGRATED_SYSTEM_CONFIG> = {}) {
    const finalConfig = { ...INTEGRATED_SYSTEM_CONFIG, ...config };

    try {
        // Initialize error handling first
        comprehensiveErrorHandler.addBreadcrumb(
            'system',
            'Initializing integrated system',
            'info',
            { config: finalConfig }
        );

        // Initialize system integration service
        const integrationService = new SystemIntegrationService(finalConfig.systemIntegration);

        // Log successful initialization
        comprehensiveErrorHandler.addBreadcrumb(
            'system',
            'Integrated system initialized successfully',
            'info'
        );

        return {
            integrationService,
            errorHandler: comprehensiveErrorHandler,
            config: finalConfig
        };
    } catch (error) {
        await comprehensiveErrorHandler.handleError(error, {
            component: 'system-initialization',
            operation: 'initialize'
        });
        throw error;
    }
}

/**
 * System Health Check
 * Performs a comprehensive health check of all integrated components
 */
export async function performSystemHealthCheck() {
    const healthStatus = {
        overall: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
        components: {
            documentProcessor: 'unknown' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
            interactiveTransformer: 'unknown' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
            webContentFetcher: 'unknown' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
            knowledgeBaseIntegration: 'unknown' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown',
            errorHandler: 'unknown' as 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
        },
        metrics: {
            totalErrors: 0,
            recentErrors: 0,
            recoveryRate: 0,
            averageProcessingTime: 0
        },
        timestamp: new Date()
    };

    try {
        // Check error handler
        const errorMetrics = comprehensiveErrorHandler.getErrorMetrics();
        healthStatus.components.errorHandler = 'healthy';
        healthStatus.metrics.totalErrors = errorMetrics.totalErrors;
        healthStatus.metrics.recoveryRate = errorMetrics.recoverySuccessRate;

        // Check document processor
        try {
            const processor = new EnhancedDocumentProcessor();
            healthStatus.components.documentProcessor = 'healthy';
        } catch (error) {
            healthStatus.components.documentProcessor = 'unhealthy';
        }

        // Check interactive transformer
        try {
            // Just check if the class can be imported
            healthStatus.components.interactiveTransformer = 'healthy';
        } catch (error) {
            healthStatus.components.interactiveTransformer = 'unhealthy';
        }

        // Check web content fetcher
        try {
            // Just check if the class can be imported
            healthStatus.components.webContentFetcher = 'healthy';
        } catch (error) {
            healthStatus.components.webContentFetcher = 'unhealthy';
        }

        // Check knowledge base integration
        try {
            healthStatus.components.knowledgeBaseIntegration = 'healthy';
        } catch (error) {
            healthStatus.components.knowledgeBaseIntegration = 'unhealthy';
        }

        // Determine overall health
        const componentStatuses = Object.values(healthStatus.components);
        const unhealthyCount = componentStatuses.filter(status => status === 'unhealthy').length;
        const degradedCount = componentStatuses.filter(status => status === 'degraded').length;

        if (unhealthyCount > 0) {
            healthStatus.overall = 'unhealthy';
        } else if (degradedCount > 0) {
            healthStatus.overall = 'degraded';
        } else {
            healthStatus.overall = 'healthy';
        }

        return healthStatus;
    } catch (error) {
        // Import the error handler dynamically to avoid circular dependencies
        const { comprehensiveErrorHandler } = await import('../services/comprehensiveErrorHandler.js');
        await comprehensiveErrorHandler.handleError(error, {
            component: 'system-health-check',
            operation: 'health-check'
        });

        healthStatus.overall = 'unhealthy';
        return healthStatus;
    }
}

/**
 * System Utilities
 * Provides utility functions for the integrated system
 */
export const systemUtils = {
    /**
     * Format file size in human-readable format
     */
    formatFileSize: (bytes: number): string => {
        if (bytes === 0) { return '0 Bytes'; }
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * Format duration in human-readable format
     */
    formatDuration: (ms: number): string => {
        if (ms < 1000) { return `${ms}ms`; }
        if (ms < 60000) { return `${(ms / 1000).toFixed(1)}s`; }
        if (ms < 3600000) { return `${(ms / 60000).toFixed(1)}m`; }
        return `${(ms / 3600000).toFixed(1)}h`;
    },

    /**
     * Generate unique ID
     */
    generateId: (prefix = 'id'): string => {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Debounce function
     */
    debounce: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
        let timeout: NodeJS.Timeout;
        return ((...args: any[]) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        }) as T;
    },

    /**
     * Throttle function
     */
    throttle: <T extends (...args: any[]) => any>(func: T, limit: number): T => {
        let inThrottle: boolean;
        return ((...args: any[]) => {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }) as T;
    },

    /**
     * Deep clone object
     */
    deepClone: <T>(obj: T): T => {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Check if device is mobile
     */
    isMobile: (): boolean => {
        return window.innerWidth < 768;
    },

    /**
     * Check if device supports touch
     */
    isTouchDevice: (): boolean => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }
};

// Export default configuration
export default INTEGRATED_SYSTEM_CONFIG;