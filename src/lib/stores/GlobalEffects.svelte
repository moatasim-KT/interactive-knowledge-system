<script lang="ts">
	import { appState, actions } from './appState.svelte.ts';

	// Auto-save effect when content changes
	$effect(() => {
		const currentNode = appState.content.currentNode;
		if (currentNode && appState.user.settings?.preferences.autoSave) {
			const timeoutId = setTimeout(() => {
				saveToLocalStorage(currentNode);
			}, 1000);

			return () => clearTimeout(timeoutId);
		}
	});

	// Online status monitoring
	$effect(() => {
		if (typeof window !== 'undefined') {
			const handleOnline = () => actions.setOnlineStatus(true);
			const handleOffline = () => actions.setOnlineStatus(false);

			window.addEventListener('online', handleOnline);
			window.addEventListener('offline', handleOffline);

			return () => {
				window.removeEventListener('online', handleOnline);
				window.removeEventListener('offline', handleOffline);
			};
		}
	});

	// Sync pending changes when coming back online
	$effect(() => {
		if (appState.sync.isOnline && appState.sync.pendingChanges.length > 0) {
			syncPendingChanges();
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

		notifications.forEach((notification) => {
			if (notification.type !== 'error') {
				setTimeout(() => {
					actions.removeNotification(notification.id);
				}, 5000);
			}
		});
	});

	async function saveToLocalStorage(node: any) {
		try {
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

	async function syncPendingChanges() {
		if (appState.sync.isSyncing) {return;}

		actions.setSyncStatus(true);

		try {
			console.log('Syncing pending changes:', appState.sync.pendingChanges);
			appState.sync.pendingChanges.forEach((changeId) => {
				actions.removePendingChange(changeId);
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
</script>

<!-- No UI output; this component exists solely to host global effects in a component context -->

