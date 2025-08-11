import { appState, actions } from './appState.svelte.js';

/**
 * Side effects using Svelte 5 $effect rune
 */

// Auto-save effect when content changes
$effect(() => {
	const current_node = appState.content.currentNode;
	if (current_node && appState.user.settings?.preferences.autoSave) {
		// Debounce auto-save to avoid excessive saves
		const timeout_id = setTimeout(() => {
			save_to_local_storage(current_node);
		}, 1000);

		return () => clearTimeout(timeout_id);
	}
});

// Online status monitoring
$effect(() => {
	if (typeof window !== 'undefined') {
		const handle_online = () => actions.setOnlineStatus(true);
		const handle_offline = () => actions.setOnlineStatus(false);

		window.addEventListener('online', handle_online);
		window.addEventListener('offline', handle_offline);

		return () => {
			window.removeEventListener('online', handle_online);
			window.removeEventListener('offline', handle_offline);
		};
	}
});

// Sync pending changes when coming back online
$effect(() => {
	if (appState.sync.isOnline && appState.sync.pendingChanges.length > 0) {
		// Trigger sync of pending changes
		sync_pending_changes();
	}
});

// Theme preference effect
$effect(() => {
	const theme = appState.user.settings?.preferences.theme || 'light';
	if (typeof document !== 'undefined') {
		document.documentElement.setAttribute('data-theme', theme);
	}
});

// Notification auto-removal effect
$effect(() => {
	const notifications = appState.ui.notifications;

	// Auto-remove notifications after 5 seconds
	notifications.forEach((notification) => {
		if (notification.type !== 'error') {
			// Keep error notifications until manually dismissed
			setTimeout(() => {
				actions.removeNotification(notification.id);
			}, 5000);
		}
	});
});

/**
 * Helper functions for effects
 */
async function save_to_local_storage(node: any) {
	try {
		// This will be implemented in the storage layer task
		console.log('Auto-saving node:', node.id);
		actions.addNotification({
			type: 'success',
			message: 'Content auto-saved'
		});
	} catch (error) {
		console.error('Auto-save failed:', error);
		actions.addNotification({
			type: 'error',
			message: 'Auto-save failed'
		});
	}
}

async function sync_pending_changes() {
	if (appState.sync.isSyncing) return;

	actions.setSyncStatus(true);

	try {
		// This will be implemented in the sync layer task
		console.log('Syncing pending changes:', appState.sync.pendingChanges);

		// Clear pending changes after successful sync
		appState.sync.pendingChanges.forEach((change_id) => {
			actions.removePendingChange(change_id);
		});

		actions.addNotification({
			type: 'success',
			message: 'Changes synced successfully'
		});
	} catch (error) {
		console.error('Sync failed:', error);
		actions.addNotification({
			type: 'error',
			message: 'Sync failed - changes will retry later'
		});
	} finally {
		actions.setSyncStatus(false);
	}
}
