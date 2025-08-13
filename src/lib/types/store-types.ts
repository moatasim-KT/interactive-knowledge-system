/**
 * Comprehensive store type definitions for Svelte 5 runes
 * Defines state shapes, actions, and derived state types
 */

import type {
	KnowledgeNode,
	UserSettings,
	UserProgress,
	SearchResult,
	ContentModule,
	ContentBlock
} from './index.js';
import type {
	WebContent,
	WebContentSource,
	BatchProcessingJob,
	ContentProcessingResult,
	InteractiveOpportunity
} from './web-content.js';

/**
 * Application state structure for main app store
 */
export interface AppStateStructure {
	user: {
		id: string;
		settings: UserSettings | null;
		isAuthenticated: boolean;
	};
	content: {
		nodes: Map<string, KnowledgeNode>;
		currentNode: KnowledgeNode | null;
		searchQuery: string;
		searchResults: SearchResult[];
		isLoading: boolean;
	};
	progress: {
		completedModules: Set<string>;
		currentStreak: number;
		totalTimeSpent: number;
		userProgress: Map<string, UserProgress>;
	};
	sync: {
		isOnline: boolean;
		lastSync: Date | null;
		pendingChanges: string[];
		isSyncing: boolean;
	};
	ui: {
		sidebarOpen: boolean;
		currentView: 'dashboard' | 'content' | 'progress' | 'settings';
		theme: 'light' | 'dark' | 'auto';
		notifications: AppNotification[];
	};
}

/**
 * Web content state structure for web content store
 */
export interface WebContentStateStructure {
	sources: {
		items: Record<string, WebContentSource>;
		currentSource: WebContentSource | null;
		isLoading: boolean;
		lastUpdated: string | null;
	};
	content: {
		items: Record<string, WebContent>;
		currentContent: WebContent | null;
		isProcessing: boolean;
		processingProgress: number;
	};
	batch: {
		jobs: Record<string, BatchProcessingJob>;
		activeJob: BatchProcessingJob | null;
		queue: string[];
		isProcessing: boolean;
	};
	transformation: {
		opportunities: InteractiveOpportunity[];
		isAnalyzing: boolean;
		currentTransformation: any;
		transformationHistory: any[];
	};
	ui: {
		activeView: 'sources' | 'content' | 'batch' | 'transformation';
		selectedItems: string[];
		searchQuery: string;
		filters: WebContentFilters;
		notifications: WebContentNotification[];
	};
}

/**
 * App notification type
 */
export interface AppNotification {
	id: string;
	type: 'info' | 'success' | 'warning' | 'error';
	message: string;
	timestamp: Date;
	persistent?: boolean;
	action?: {
		label: string;
		handler: () => void;
	};
}

/**
 * Web content notification type
 */
export interface WebContentNotification {
	id: string;
	type: 'info' | 'success' | 'warning' | 'error';
	message: string;
	timestamp: string;
	sourceId?: string;
	contentId?: string;
}

/**
 * Web content filters
 */
export interface WebContentFilters {
	domain: string;
	category: string;
	status: 'all' | 'active' | 'error' | 'updated';
	dateRange?: {
		start: Date;
		end: Date;
	};
	tags?: string[];
}

/**
 * Store action types for type-safe mutations
 */
export interface AppStateActions {
	// Content actions
	setCurrentNode: (node: KnowledgeNode | null) => void;
	addKnowledgeNode: (node: KnowledgeNode) => void;
	updateKnowledgeNode: (id: string, updates: Partial<KnowledgeNode>) => void;
	removeKnowledgeNode: (id: string) => void;

	// Search actions
	setSearchQuery: (query: string) => void;
	setSearchResults: (results: SearchResult[]) => void;

	// Progress actions
	markModuleCompleted: (moduleId: string, score?: number) => void;
	startModule: (moduleId: string) => void;
	updateTimeSpent: (moduleId: string, additionalTime: number) => void;
	loadUserProgress: (progressMap: Map<string, UserProgress>) => void;
	updateUserProgress: (moduleId: string, updates: Partial<UserProgress>) => void;

	// UI actions
	toggleSidebar: () => void;
	setCurrentView: (view: AppStateStructure['ui']['currentView']) => void;
	addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp'>) => void;
	removeNotification: (id: string) => void;

	// Sync actions
	setOnlineStatus: (isOnline: boolean) => void;
	addPendingChange: (changeId: string) => void;
	removePendingChange: (changeId: string) => void;
	setSyncStatus: (isSyncing: boolean) => void;
}

/**
 * Web content store action types
 */
export interface WebContentStateActions {
	// Source management
	addSource: (source: WebContentSource) => void;
	updateSource: (id: string, updates: Partial<WebContentSource>) => void;
	removeSource: (id: string) => void;
	setCurrentSource: (source: WebContentSource | null) => void;
	setSourcesLoading: (loading: boolean) => void;

	// Content management
	addContent: (content: WebContent) => void;
	updateContent: (id: string, updates: Partial<WebContent>) => void;
	setCurrentContent: (content: WebContent | null) => void;
	setContentProcessing: (processing: boolean, progress?: number) => void;

	// Batch processing
	addBatchJob: (job: BatchProcessingJob) => void;
	updateBatchJob: (id: string, updates: Partial<BatchProcessingJob>) => void;
	setActiveBatchJob: (job: BatchProcessingJob | null) => void;
	setBatchProcessing: (processing: boolean) => void;

	// Transformation management
	setTransformationOpportunities: (opportunities: InteractiveOpportunity[]) => void;
	addTransformationOpportunity: (opportunity: InteractiveOpportunity) => void;
	setTransformationAnalyzing: (analyzing: boolean) => void;
	setCurrentTransformation: (transformation: any) => void;
	addTransformationToHistory: (transformation: any) => void;

	// UI actions
	setActiveView: (view: WebContentStateStructure['ui']['activeView']) => void;
	setSearchQuery: (query: string) => void;
	setFilters: (filters: Partial<WebContentFilters>) => void;
	toggleItemSelection: (id: string) => void;
	clearSelection: () => void;
	addNotification: (notification: Omit<WebContentNotification, 'id' | 'timestamp'>) => void;
	removeNotification: (id: string) => void;
}

/**
 * Derived state function types
 */
export interface AppStateDerived {
	filteredContent: () => KnowledgeNode[];
	progressStats: () => {
		totalModules: number;
		completedModules: number;
		completionRate: number;
		averageScore: number;
		currentStreak: number;
	};
	userPreferences: () => UserSettings['preferences'];
	unreadNotifications: () => AppNotification[];
	syncStatus: () => {
		isOnline: boolean;
		hasPendingChanges: boolean;
		lastSyncFormatted: string | null;
	};
}

/**
 * Web content derived state function types
 */
export interface WebContentStateDerived {
	filteredSources: () => WebContentSource[];
	contentStats: () => {
		totalSources: number;
		totalContent: number;
		activeJobs: number;
		transformationOpportunities: number;
	};
	batchProgress: () => {
		completed: number;
		failed: number;
		total: number;
		percentage: number;
	} | null;
	selectedSourcesData: () => WebContentSource[];
	recentActivity: () => Array<{
		type: 'source_added' | 'content_processed' | 'batch_completed';
		timestamp: string;
		description: string;
	}>;
}

/**
 * Store subscription types for reactive updates
 */
export interface StoreSubscription<T> {
	subscribe: (callback: (value: T) => void) => () => void;
	update: (updater: (value: T) => T) => void;
	set: (value: T) => void;
}

/**
 * Generic store interface for type safety
 */
export interface Store<TState, TActions, TDerived = Record<string, never>> {
	state: TState;
	actions: TActions;
	derived?: TDerived;
}

/**
 * Store factory types for creating typed stores
 */
export interface StoreFactory {
	createAppStore: () => Store<AppStateStructure, AppStateActions, AppStateDerived>;
	createWebContentStore: () => Store<
		WebContentStateStructure,
		WebContentStateActions,
		WebContentStateDerived
	>;
}

/**
 * Store persistence configuration
 */
export interface StorePersistenceConfig {
	key: string;
	storage: 'localStorage' | 'sessionStorage' | 'indexedDB';
	serialize?: (value: any) => string;
	deserialize?: (value: string) => any;
	exclude?: string[];
	include?: string[];
}

/**
 * Store middleware types
 */
export interface StoreMiddleware<T> {
	before?: (action: string, payload: any, state: T) => void;
	after?: (action: string, payload: any, state: T, result: any) => void;
	error?: (action: string, payload: any, state: T, error: Error) => void;
}

/**
 * Store configuration
 */
export interface StoreConfig<T> {
	initialState: T;
	persistence?: StorePersistenceConfig;
	middleware?: StoreMiddleware<T>[];
	devtools?: boolean;
}
