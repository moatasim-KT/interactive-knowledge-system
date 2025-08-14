import type { KnowledgeNode, UserSettings, UserProgress, SearchResult } from '../types/index';

/**
 * Global application state using Svelte 5 runes
 */
export const appState = $state({
	// User-related state
	user: {
		id: '',
		settings: null as UserSettings | null,
		isAuthenticated: false
	},

	// Content and knowledge management
	content: {
		nodes: new Map<string, KnowledgeNode>(),
		currentNode: null as KnowledgeNode | null,
		searchQuery: '',
		searchResults: [] as SearchResult[],
		isLoading: false
	},

	// Progress tracking
	progress: {
		completedModules: new Set<string>(),
		currentStreak: 0,
		totalTimeSpent: 0,
		userProgress: new Map<string, UserProgress>()
	},

	// Synchronization and connectivity
	sync: {
		isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
		lastSync: null as Date | null,
		pendingChanges: [] as string[],
		isSyncing: false
	},

	// UI state
	ui: {
		sidebarOpen: true,
		currentView: 'dashboard' as 'dashboard' | 'content' | 'progress' | 'settings',
		theme: 'light' as 'light' | 'dark' | 'auto',
		notifications: [] as Array<{
			id: string;
			type: 'info' | 'success' | 'warning' | 'error';
			message: string;
			timestamp: Date;
		}>,
		hasErrors: false,
		errorCount: 0,
		lastError: null as string | null,
		lastErrorTime: null as Date | null
	}
});

/**
 * Derived state functions using Svelte 5 $derived rune
 */
// Filtered content based on search query
export function getFilteredContent() {
	const { nodes, searchQuery } = appState.content;
	if (!searchQuery.trim()) {return Array.from(nodes.values());}

	const query = searchQuery.toLowerCase();
	return Array.from(nodes.values()).filter(
		(node) =>
			node.title.toLowerCase().includes(query) ||
			node.metadata.tags.some((tag) => tag.toLowerCase().includes(query))
	);
}

// Progress statistics
export function getProgressStats() {
	const { completedModules, userProgress } = appState.progress;
	const totalModules = appState.content.nodes.size;
	const completionRate = totalModules > 0 ? (completedModules.size / totalModules) * 100 : 0;

	let averageScore = 0;
	const progressArray = Array.from(userProgress.values());
	if (progressArray.length > 0) {
		const totalScore = progressArray.reduce((sum, progress) => sum + (progress.score || 0), 0);
		averageScore = totalScore / progressArray.length;
	}

	return {
		totalModules,
		completedModules: completedModules.size,
		completionRate,
		averageScore,
		currentStreak: appState.progress.currentStreak
	};
}

// Current user preferences
export function getUserPreferences() {
	return (
		appState.user.settings?.preferences || {
			theme: 'light',
			learningStyle: 'visual',
			difficulty: 3,
			language: 'en',
			notifications: true,
			autoSave: true
		}
	);
}

// Export aliases for consistency
export const filteredContent = getFilteredContent;
export const progressStats = getProgressStats;
export const userPreferences = getUserPreferences;

/**
 * Actions for state mutations
 */
export const actions = {
	// Content actions
	setCurrentNode: (node: KnowledgeNode | null) => {
		appState.content.currentNode = node;
	},

	addKnowledgeNode: (node: KnowledgeNode) => {
		const new_nodes = new Map(appState.content.nodes);
		new_nodes.set(node.id, node);
		appState.content.nodes = new_nodes;
	},

	updateKnowledgeNode: (id: string, updates: Partial<KnowledgeNode>) => {
		const existing = appState.content.nodes.get(id);
		if (existing) {
			const new_nodes = new Map(appState.content.nodes);
			new_nodes.set(id, { ...existing, ...updates });
			appState.content.nodes = new_nodes;
		}
	},

	removeKnowledgeNode: (id: string) => {
		const new_nodes = new Map(appState.content.nodes);
		new_nodes.delete(id);
		appState.content.nodes = new_nodes;

		const new_completed = new Set(appState.progress.completedModules);
		new_completed.delete(id);
		appState.progress.completedModules = new_completed;

		const new_progress = new Map(appState.progress.userProgress);
		new_progress.delete(id);
		appState.progress.userProgress = new_progress;
	},

	// Search actions
	setSearchQuery: (query: string) => {
		appState.content.searchQuery = query;
	},

	setSearchResults: (results: SearchResult[]) => {
		appState.content.searchResults = results;
	},

	// Progress actions
	markModuleCompleted: (moduleId: string, score?: number) => {
		const new_completed = new Set(appState.progress.completedModules);
		new_completed.add(moduleId);
		appState.progress.completedModules = new_completed;

		const existing = appState.progress.userProgress.get(moduleId);
		const progress: UserProgress = {
			userId: appState.user.id,
			moduleId,
			status: 'completed',
			score,
			timeSpent: existing?.timeSpent || 0,
			lastAccessed: new Date(),
			attempts: (existing?.attempts || 0) + 1,
			bookmarked: existing?.bookmarked || false,
			notes: existing?.notes || '',
			completedAt: new Date()
		};

		const new_progress = new Map(appState.progress.userProgress);
		new_progress.set(moduleId, progress);
		appState.progress.userProgress = new_progress;
	},

	startModule: (moduleId: string) => {
		const existing = appState.progress.userProgress.get(moduleId);
		const progress: UserProgress = {
			userId: appState.user.id,
			moduleId,
			status: 'in-progress',
			timeSpent: existing?.timeSpent || 0,
			lastAccessed: new Date(),
			attempts: existing?.attempts || 0,
			bookmarked: existing?.bookmarked || false,
			notes: existing?.notes || '',
			startedAt: existing?.startedAt || new Date()
		};

		const new_progress = new Map(appState.progress.userProgress);
		new_progress.set(moduleId, progress);
		appState.progress.userProgress = new_progress;
	},

	updateTimeSpent: (moduleId: string, additionalTime: number) => {
		const existing = appState.progress.userProgress.get(moduleId);
		if (existing) {
			const updated = { ...existing, timeSpent: existing.timeSpent + additionalTime, lastAccessed: new Date() };
			const new_progress = new Map(appState.progress.userProgress);
			new_progress.set(moduleId, updated);
			appState.progress.userProgress = new_progress;
		}
	},

	loadUserProgress: (progressMap: Map<string, UserProgress>) => {
		appState.progress.userProgress = new Map(progressMap);

		// Update completed modules set
		const new_completed = new Set<string>();
		for (const [moduleId, progress] of progressMap) {
			if (progress.status === 'completed') {
				new_completed.add(moduleId);
			}
		}
		appState.progress.completedModules = new_completed;

		// Update total time spent
		appState.progress.totalTimeSpent = Array.from(progressMap.values()).reduce(
			(total, progress) => total + progress.timeSpent,
			0
		);
	},

	updateUserProgress: (moduleId: string, updates: Partial<UserProgress>) => {
		const existing = appState.progress.userProgress.get(moduleId);
		if (existing) {
			const new_progress = new Map(appState.progress.userProgress);
			new_progress.set(moduleId, { ...existing, ...updates });
			appState.progress.userProgress = new_progress;
		}
	},

	// UI actions
	toggleSidebar: () => {
		appState.ui.sidebarOpen = !appState.ui.sidebarOpen;
	},

	setCurrentView: (view: typeof appState.ui.currentView) => {
		appState.ui.currentView = view;
	},

	addNotification: (
		notification: Omit<(typeof appState.ui.notifications)[0], 'id' | 'timestamp'>
	) => {
		const id = crypto.randomUUID();
		appState.ui.notifications.push({
			...notification,
			id,
			timestamp: new Date()
		});
	},

	removeNotification: (id: string) => {
		const index = appState.ui.notifications.findIndex((n) => n.id === id);
		if (index > -1) {
			appState.ui.notifications.splice(index, 1);
		}
	},

	// Sync actions
	setOnlineStatus: (isOnline: boolean) => {
		appState.sync.isOnline = isOnline;
	},

	addPendingChange: (changeId: string) => {
		if (!appState.sync.pendingChanges.includes(changeId)) {
			appState.sync.pendingChanges.push(changeId);
		}
	},

	removePendingChange: (changeId: string) => {
		const index = appState.sync.pendingChanges.indexOf(changeId);
		if (index > -1) {
			appState.sync.pendingChanges.splice(index, 1);
		}
	},

	setSyncStatus: (isSyncing: boolean) => {
		appState.sync.isSyncing = isSyncing;
		if (!isSyncing) {
			appState.sync.lastSync = new Date();
		}
	}
};
