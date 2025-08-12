import type { KnowledgeNode, UserSettings, UserProgress, SearchResult } from '../types/index.js';

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
		}>
	}
});

/**
 * Derived state functions for computed values
 */
// Filtered content based on search query
export function getFilteredContent() {
	const { nodes, searchQuery } = appState.content;
	if (!searchQuery.trim()) return Array.from(nodes.values());

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
	const total_modules = appState.content.nodes.size;
	const completion_rate = total_modules > 0 ? (completedModules.size / total_modules) * 100 : 0;

	let average_score = 0;
	const progress_array = Array.from(userProgress.values());
	if (progress_array.length > 0) {
		const total_score = progress_array.reduce((sum, progress) => sum + (progress.score || 0), 0);
		average_score = total_score / progress_array.length;
	}

	return {
		totalModules: total_modules,
		completedModules: completedModules.size,
		completionRate: completion_rate,
		averageScore: average_score,
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

/**
 * Actions for state mutations
 */
export const actions = {
	// Content actions
	setCurrentNode: (node: KnowledgeNode | null) => {
		appState.content.currentNode = node;
	},

	addKnowledgeNode: (node: KnowledgeNode) => {
		appState.content.nodes.set(node.id, node);
	},

	updateKnowledgeNode: (id: string, updates: Partial<KnowledgeNode>) => {
		const existing = appState.content.nodes.get(id);
		if (existing) {
			appState.content.nodes.set(id, { ...existing, ...updates });
		}
	},

	removeKnowledgeNode: (id: string) => {
		appState.content.nodes.delete(id);
		appState.progress.completedModules.delete(id);
		appState.progress.userProgress.delete(id);
	},

	// Search actions
	setSearchQuery: (query: string) => {
		appState.content.searchQuery = query;
	},

	setSearchResults: (results: SearchResult[]) => {
		appState.content.searchResults = results;
	},

	// Progress actions
	markModuleCompleted: (module_id: string, score?: number) => {
		appState.progress.completedModules.add(module_id);

		const existing = appState.progress.userProgress.get(module_id);
		const progress: UserProgress = {
			userId: appState.user.id,
			moduleId: module_id,
			status: 'completed',
			score,
			timeSpent: existing?.timeSpent || 0,
			lastAccessed: new Date(),
			attempts: (existing?.attempts || 0) + 1,
			bookmarked: existing?.bookmarked || false,
			notes: existing?.notes || '',
			completedAt: new Date()
		};

		appState.progress.userProgress.set(module_id, progress);
	},

	startModule: (module_id: string) => {
		const existing = appState.progress.userProgress.get(module_id);
		const progress: UserProgress = {
			userId: appState.user.id,
			moduleId: module_id,
			status: 'in-progress',
			timeSpent: existing?.timeSpent || 0,
			lastAccessed: new Date(),
			attempts: existing?.attempts || 0,
			bookmarked: existing?.bookmarked || false,
			notes: existing?.notes || '',
			startedAt: existing?.startedAt || new Date()
		};

		appState.progress.userProgress.set(module_id, progress);
	},

	updateTimeSpent: (module_id: string, additional_time: number) => {
		const existing = appState.progress.userProgress.get(module_id);
		if (existing) {
			existing.timeSpent += additional_time;
			existing.lastAccessed = new Date();
			appState.progress.userProgress.set(module_id, existing);
		}
	},

	loadUserProgress: (progress_map: Map<string, UserProgress>) => {
		appState.progress.userProgress = progress_map;

		// Update completed modules set
		appState.progress.completedModules.clear();
		for (const [module_id, progress] of progress_map) {
			if (progress.status === 'completed') {
				appState.progress.completedModules.add(module_id);
			}
		}

		// Update total time spent
		appState.progress.totalTimeSpent = Array.from(progress_map.values()).reduce(
			(total, progress) => total + progress.timeSpent,
			0
		);
	},

	updateUserProgress: (module_id: string, updates: Partial<UserProgress>) => {
		const existing = appState.progress.userProgress.get(module_id);
		if (existing) {
			appState.progress.userProgress.set(module_id, { ...existing, ...updates });
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
	setOnlineStatus: (is_online: boolean) => {
		appState.sync.isOnline = is_online;
	},

	addPendingChange: (change_id: string) => {
		if (!appState.sync.pendingChanges.includes(change_id)) {
			appState.sync.pendingChanges.push(change_id);
		}
	},

	removePendingChange: (change_id: string) => {
		const index = appState.sync.pendingChanges.indexOf(change_id);
		if (index > -1) {
			appState.sync.pendingChanges.splice(index, 1);
		}
	},

	setSyncStatus: (is_syncing: boolean) => {
		appState.sync.isSyncing = is_syncing;
		if (!is_syncing) {
			appState.sync.lastSync = new Date();
		}
	}
};
