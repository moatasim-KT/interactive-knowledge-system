<script lang="ts">
	import { syncService } from '../services/syncService.js';

	// Reactive sync status
	let sync_status = $state(syncService.getSyncStatus());
	let offline_stats = $state(syncService.getOfflineStats());

	// Update status every few seconds
	let status_interval;

	$effect(() => {
		status_interval = setInterval(() => {
			sync_status = syncService.getSyncStatus();
			offline_stats = syncService.getOfflineStats();
		}, 2000);

		return () => {
			if (status_interval) {
				clearInterval(status_interval);
			}
		};
	});

	// Handle manual sync
	const handle_sync_now = async () => {
		await syncService.syncNow();
		sync_status = syncService.getSyncStatus();
	};

	// Handle clear offline data
	const handle_clear_offline = async () => {
		if (confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
			await syncService.clearOfflineData();
			sync_status = syncService.getSyncStatus();
			offline_stats = syncService.getOfflineStats();
		}
	};

	// Format time ago
	function time_ago(date: Date | null): string {
		if (!date) return 'Never';

		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) return `${days}d ago`;
		if (hours > 0) return `${hours}h ago`;
		if (minutes > 0) return `${minutes}m ago`;
		return 'Just now';
	}

	// Get status color
	function get_status_color(): string {
		if (!sync_status.networkStatus.isOnline) return 'text-red-600';
		if (sync_status.isSyncing) return 'text-blue-600';
		if (sync_status.queueSize > 0) return 'text-yellow-600';
		return 'text-green-600';
	}

	// Get status icon
	function get_status_icon(): string {
		if (!sync_status.networkStatus.isOnline) return '🔴';
		if (sync_status.isSyncing) return '🔄';
		if (sync_status.queueSize > 0) return '⏳';
		return '✅';
	}

	// Get status text
	function get_status_text(): string {
		if (!sync_status.networkStatus.isOnline) return 'Offline';
		if (sync_status.isSyncing) return 'Syncing...';
		if (sync_status.queueSize > 0) return `${sync_status.queueSize} pending`;
		return 'Up to date';
	}
</script>

<div class="sync-status">
	<div class="sync-header">
		<div class="status-indicator">
			<span class="status-icon">{get_status_icon()}</span>
			<span class="status-text {get_status_color()}">{get_status_text()}</span>
		</div>

		<div class="sync-actions">
			<button
				class="sync-button"
				onclick={handleSyncNow}
				disabled={!sync_status.canSync}
				title="Sync now"
			>
				🔄 Sync
			</button>
		</div>
	</div>

	<div class="sync-details">
		<div class="detail-row">
			<span class="detail-label">Network:</span>
			<span class="detail-value">
				{sync_status.networkStatus.isOnline ? 'Online' : 'Offline'}
				{#if sync_status.networkStatus.connectionType}
					({sync_status.networkStatus.connectionType})
				{/if}
			</span>
		</div>

		<div class="detail-row">
			<span class="detail-label">Last sync:</span>
			<span class="detail-value">{time_ago(sync_status.lastSync)}</span>
		</div>

		{#if sync_status.queueSize > 0}
			<div class="detail-row">
				<span class="detail-label">Queue:</span>
				<span class="detail-value">{sync_status.queueSize} operations</span>
			</div>
		{/if}

		{#if sync_status.pendingOptimisticUpdates > 0}
			<div class="detail-row">
				<span class="detail-label">Pending:</span>
				<span class="detail-value">{sync_status.pendingOptimisticUpdates} optimistic updates</span>
			</div>
		{/if}
	</div>

	{#if offline_stats.total > 0}
		<div class="offline-stats">
			<h4>Offline Queue</h4>
			<div class="stats-grid">
				<div class="stat-item">
					<span class="stat-label">Total:</span>
					<span class="stat-value">{offline_stats.total}</span>
				</div>

				{#each Object.entries(offline_stats.byType) as [type, count] (type)}
					<div class="stat-item">
						<span class="stat-label">{type}:</span>
						<span class="stat-value">{count}</span>
					</div>
				{/each}
			</div>

			{#if offline_stats.oldestOperation}
				<div class="detail-row">
					<span class="detail-label">Oldest:</span>
					<span class="detail-value">{time_ago(offline_stats.oldestOperation)}</span>
				</div>
			{/if}

			<button class="clear-button" onclick={handleClearOffline} title="Clear offline data">
				🗑️ Clear Offline Data
			</button>
		</div>
	{/if}
</div>

<style>
	.sync-status {
		background: var(--surface-color);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 16px;
		font-size: 14px;
	}

	.sync-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.status-icon {
		font-size: 16px;
	}

	.status-text {
		font-weight: 500;
	}

	.sync-actions {
		display: flex;
		gap: 8px;
	}

	.sync-button,
	.clear-button {
		background: var(--primary-color);
		color: white;
		border: none;
		border-radius: 4px;
		padding: 6px 12px;
		font-size: 12px;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.sync-button:hover:not(:disabled),
	.clear-button:hover {
		background: var(--primary-hover-color);
	}

	.sync-button:disabled {
		background: var(--disabled-color);
		cursor: not-allowed;
	}

	.clear-button {
		background: var(--danger-color);
		font-size: 11px;
		padding: 4px 8px;
	}

	.clear-button:hover {
		background: var(--danger-hover-color);
	}

	.sync-details {
		border-top: 1px solid var(--border-color);
		padding-top: 12px;
		margin-bottom: 12px;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		margin-bottom: 4px;
	}

	.detail-label {
		color: var(--text-secondary-color);
		font-weight: 500;
	}

	.detail-value {
		color: var(--text-primary-color);
	}

	.offline-stats {
		border-top: 1px solid var(--border-color);
		padding-top: 12px;
	}

	.offline-stats h4 {
		margin: 0 0 8px 0;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary-color);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
		margin-bottom: 8px;
	}

	.stat-item {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
	}

	.stat-label {
		color: var(--text-secondary-color);
	}

	.stat-value {
		color: var(--text-primary-color);
		font-weight: 500;
	}

	/* Color utilities */
	:global(.text-red-600) {
		color: #dc2626;
	}
	:global(.text-blue-600) {
		color: #2563eb;
	}
	:global(.text-yellow-600) {
		color: #d97706;
	}
	:global(.text-green-600) {
		color: #16a34a;
	}
</style>
