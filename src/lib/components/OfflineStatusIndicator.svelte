<!--
  Offline Status Indicator Component
  Shows current offline/online status and sync information
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { appState } from '$lib/stores/appState.svelte.js';
	import { offlineManager } from '$lib/services/offlineManager.js';
	import { Button, Badge, Card } from '$lib/components/ui/index.js';

	let status = $state({
		isOnline: true,
		isInitialized: false,
		queueSize: 0,
		pendingUpdates: 0,
		lastSync: null as Date | null,
		storageAvailable: false,
		networkStatus: { 
			isOnline: true,
			effectiveType: undefined as string | undefined
		}
	});

	let showDetails = $state(false);

	// Update status periodically
	let statusInterval: ReturnType<typeof setInterval>;

	onMount(() => {
		// Initialize offline functionality
		initializeOffline();

		// Update status every 5 seconds
		statusInterval = setInterval(updateStatus, 5000);
		updateStatus();

		return () => {
			if (statusInterval) {
				clearInterval(statusInterval);
			}
		};
	});

	async function initializeOffline() {
		try {
			await offlineManager.initialize({
				enableAutoSync: true,
				syncInterval: 30000,
				enableOptimisticUpdates: true,
				enableOfflineQueue: true,
				enableNetworkDetection: true
			});
			updateStatus();
		} catch (error) {
			console.error('Failed to initialize offline functionality:', error);
		}
	}

	function updateStatus() {
		if (offlineManager.isAvailable()) {
			status = offlineManager.getStatus() as any;
		}
	}

	async function handleForceSync() {
		try {
			await offlineManager.forceSync();
			updateStatus();
		} catch (error) {
			console.error('Force sync failed:', error);
		}
	}

	async function handleClearOfflineData() {
		try {
			await offlineManager.clearOfflineData();
			updateStatus();
		} catch (error) {
			console.error('Clear offline data failed:', error);
		}
	}

	function getStatusColor() {
		if (!status.isInitialized) return 'gray';
		if (!status.isOnline) return 'red';
		if (status.queueSize > 0) return 'yellow';
		return 'green';
	}

	function getStatusText() {
		if (!status.isInitialized) return 'Initializing...';
		if (!status.isOnline) return 'Offline';
		if (status.queueSize > 0) return `Online (${status.queueSize} pending)`;
		return 'Online';
	}
</script>

<div class="offline-status-indicator">
	<button 
		class="status-badge" 
		onclick={() => showDetails = !showDetails}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				showDetails = !showDetails;
			}
		}}
		aria-expanded={showDetails}
		aria-label="Toggle offline status details"
	>
		<div class="status-dot" class:online={status.isOnline} class:offline={!status.isOnline}></div>
		<span class="status-text">{getStatusText()}</span>
		<span class="toggle-icon">{showDetails ? '▼' : '▶'}</span>
	</button>

	{#if showDetails}
		<Card class="status-details" padding="md">
			<div class="detail-grid">
				<div class="detail-item">
					<span class="label">Status:</span>
					<Badge variant={status.isOnline ? 'success' : 'error'}>
						{status.isOnline ? 'Online' : 'Offline'}
					</Badge>
				</div>

				<div class="detail-item">
					<span class="label">Storage:</span>
					<Badge variant={status.storageAvailable ? 'success' : 'error'}>
						{status.storageAvailable ? 'Available' : 'Unavailable'}
					</Badge>
				</div>

				<div class="detail-item">
					<span class="label">Queue Size:</span>
					<Badge variant={status.queueSize > 0 ? 'warning' : 'default'}>
						{status.queueSize}
					</Badge>
				</div>

				<div class="detail-item">
					<span class="label">Pending Updates:</span>
					<Badge variant={status.pendingUpdates > 0 ? 'warning' : 'default'}>
						{status.pendingUpdates}
					</Badge>
				</div>

				{#if status.lastSync}
					<div class="detail-item">
						<span class="label">Last Sync:</span>
						<span class="value">{status.lastSync.toLocaleTimeString()}</span>
					</div>
				{/if}

				{#if status.networkStatus.effectiveType}
					<div class="detail-item">
						<span class="label">Connection:</span>
						<span class="value">{status.networkStatus.effectiveType}</span>
					</div>
				{/if}
			</div>

			<div class="actions">
				<Button 
					variant="outline" 
					size="sm" 
					onclick={handleForceSync}
					disabled={!status.isOnline}
				>
					Force Sync
				</Button>
				
				<Button 
					variant="outline" 
					size="sm" 
					onclick={handleClearOfflineData}
				>
					Clear Offline Data
				</Button>
			</div>
		</Card>
	{/if}
</div>

<style>
	.offline-status-indicator {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 1000;
		max-width: 300px;
	}

	.status-badge {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		transition: all 0.2s ease;
	}

	.status-badge:hover {
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #6b7280;
		transition: background-color 0.2s ease;
	}

	.status-dot.online {
		background: #10b981;
	}

	.status-dot.offline {
		background: #ef4444;
	}

	.status-text {
		font-size: 14px;
		font-weight: 500;
		color: #374151;
	}

	.toggle-icon {
		font-size: 12px;
		color: #6b7280;
		margin-left: auto;
	}

	:global(.status-details) {
		margin-top: 8px;
		background: white;
		border: 1px solid #e5e7eb;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
	}

	.detail-grid {
		display: grid;
		gap: 12px;
		margin-bottom: 16px;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.label {
		font-size: 14px;
		font-weight: 500;
		color: #374151;
	}

	.value {
		font-size: 14px;
		color: #6b7280;
	}

	.actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	@media (max-width: 640px) {
		.offline-status-indicator {
			top: 10px;
			right: 10px;
			left: 10px;
			max-width: none;
		}

		.actions {
			flex-direction: column;
		}
	}
</style>