<!--
  Performance Monitor Component
  Displays real-time performance metrics and bundle analysis
-->
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { performanceMonitor, type PerformanceMetrics } from '$lib/utils/performanceMonitor.js';
	import { bundleAnalyzer, type BundleAnalysis } from '$lib/utils/bundleAnalyzer.js';

	// Component props
	interface Props {
		showDetails?: boolean;
		autoUpdate?: boolean;
		updateInterval?: number;
	}

	let { showDetails = false, autoUpdate = true, updateInterval = 5000 }: Props = $props();

	// Reactive state
	let performanceData = $state<ReturnType<typeof performanceMonitor.getSummary> | null>(null);
	let bundleData = $state<BundleAnalysis | null>(null);
	let isVisible = $state(false);
	let updateTimer: number | null = null;

	// Update performance data
	function updateData() {
		performanceData = performanceMonitor.getSummary();
		bundleData = bundleAnalyzer.analyzeBundles();
	}

	// Toggle visibility
	function toggleVisibility() {
		isVisible = !isVisible;
	}

	// Format bytes
	function formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	// Format time
	function formatTime(ms: number): string {
		if (ms < 1000) return `${ms.toFixed(0)}ms`;
		return `${(ms / 1000).toFixed(2)}s`;
	}

	// Get performance status color
	function getPerformanceColor(value: number, thresholds: { good: number; warning: number }): string {
		if (value <= thresholds.good) return 'text-green-600';
		if (value <= thresholds.warning) return 'text-yellow-600';
		return 'text-red-600';
	}

	onMount(() => {
		updateData();
		
		if (autoUpdate) {
			updateTimer = window.setInterval(updateData, updateInterval);
		}

		// Record initial performance entry
		performanceMonitor.recordEntry(window.location.pathname);
	});

	onDestroy(() => {
		if (updateTimer) {
			clearInterval(updateTimer);
		}
	});
</script>

<!-- Performance Monitor UI -->
<div class="performance-monitor">
	<!-- Toggle Button -->
	<button
		class="monitor-toggle"
		onclick={toggleVisibility}
		aria-label="Toggle performance monitor"
		title="Performance Monitor"
	>
		📊
	</button>

	<!-- Performance Panel -->
	{#if isVisible}
		<div class="monitor-panel">
			<div class="panel-header">
				<h3>Performance Monitor</h3>
				<button class="close-btn" onclick={toggleVisibility} aria-label="Close">×</button>
			</div>

			<div class="panel-content">
				{#if performanceData}
					<!-- Performance Metrics -->
					<div class="metrics-section">
						<h4>Performance Metrics</h4>
						<div class="metrics-grid">
							<div class="metric">
								<span class="metric-label">Avg Load Time</span>
								<span class="metric-value {getPerformanceColor(performanceData.averageLoadTime, { good: 1000, warning: 3000 })}">
									{formatTime(performanceData.averageLoadTime)}
								</span>
							</div>
							<div class="metric">
								<span class="metric-label">Avg Render Time</span>
								<span class="metric-value {getPerformanceColor(performanceData.averageRenderTime, { good: 16, warning: 50 })}">
									{formatTime(performanceData.averageRenderTime)}
								</span>
							</div>
							<div class="metric">
								<span class="metric-label">Memory Usage</span>
								<span class="metric-value">
									{formatBytes(performanceData.averageMemoryUsage)}
								</span>
							</div>
							<div class="metric">
								<span class="metric-label">Total Entries</span>
								<span class="metric-value">{performanceData.totalEntries}</span>
							</div>
						</div>
					</div>
				{/if}

				{#if bundleData}
					<!-- Bundle Analysis -->
					<div class="metrics-section">
						<h4>Bundle Analysis</h4>
						<div class="metrics-grid">
							<div class="metric">
								<span class="metric-label">Total Size</span>
								<span class="metric-value">
									{formatBytes(bundleData.totalSize)}
								</span>
							</div>
							<div class="metric">
								<span class="metric-label">Gzip Size</span>
								<span class="metric-value">
									{formatBytes(bundleData.totalGzipSize)}
								</span>
							</div>
							<div class="metric">
								<span class="metric-label">Chunks</span>
								<span class="metric-value">{bundleData.chunkCount}</span>
							</div>
							<div class="metric">
								<span class="metric-label">Strategy</span>
								<span class="metric-value">{bundleData.loadingStrategy}</span>
							</div>
						</div>

						{#if bundleData.largestChunk.name}
							<div class="largest-chunk">
								<span class="metric-label">Largest Chunk:</span>
								<span class="chunk-name">{bundleData.largestChunk.name}</span>
								<span class="chunk-size">({formatBytes(bundleData.largestChunk.size)})</span>
							</div>
						{/if}
					</div>
				{/if}

				{#if showDetails && bundleData?.recommendations}
					<!-- Recommendations -->
					<div class="metrics-section">
						<h4>Recommendations</h4>
						<ul class="recommendations">
							{#each bundleData.recommendations as recommendation}
								<li>{recommendation}</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Actions -->
				<div class="actions">
					<button onclick={() => performanceMonitor.clearEntries()}>
						Clear Data
					</button>
					<button onclick={() => bundleAnalyzer.logAnalysis()}>
						Log Analysis
					</button>
					<button onclick={updateData}>
						Refresh
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.performance-monitor {
		position: fixed;
		top: 20px;
		right: 20px;
		z-index: 9999;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.monitor-toggle {
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: #1f2937;
		color: white;
		border: none;
		font-size: 20px;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		transition: all 0.2s ease;
	}

	.monitor-toggle:hover {
		background: #374151;
		transform: scale(1.05);
	}

	.monitor-panel {
		position: absolute;
		top: 60px;
		right: 0;
		width: 320px;
		background: white;
		border-radius: 8px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
		border: 1px solid #e5e7eb;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.panel-header h3 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		color: #1f2937;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 20px;
		cursor: pointer;
		color: #6b7280;
		padding: 0;
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: #1f2937;
	}

	.panel-content {
		padding: 16px;
		max-height: 400px;
		overflow-y: auto;
	}

	.metrics-section {
		margin-bottom: 20px;
	}

	.metrics-section:last-child {
		margin-bottom: 0;
	}

	.metrics-section h4 {
		margin: 0 0 12px 0;
		font-size: 14px;
		font-weight: 600;
		color: #374151;
	}

	.metrics-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.metric {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.metric-label {
		font-size: 12px;
		color: #6b7280;
		font-weight: 500;
	}

	.metric-value {
		font-size: 14px;
		font-weight: 600;
		color: #1f2937;
	}

	.largest-chunk {
		margin-top: 12px;
		padding: 8px;
		background: #f3f4f6;
		border-radius: 4px;
		font-size: 12px;
	}

	.chunk-name {
		font-weight: 600;
		color: #1f2937;
	}

	.chunk-size {
		color: #6b7280;
	}

	.recommendations {
		margin: 0;
		padding-left: 16px;
		font-size: 12px;
		color: #374151;
	}

	.recommendations li {
		margin-bottom: 4px;
	}

	.actions {
		display: flex;
		gap: 8px;
		margin-top: 16px;
		padding-top: 16px;
		border-top: 1px solid #e5e7eb;
	}

	.actions button {
		flex: 1;
		padding: 6px 12px;
		font-size: 12px;
		border: 1px solid #d1d5db;
		background: white;
		color: #374151;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.actions button:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	/* Color classes for performance indicators */
	:global(.text-green-600) {
		color: #059669 !important;
	}

	:global(.text-yellow-600) {
		color: #d97706 !important;
	}

	:global(.text-red-600) {
		color: #dc2626 !important;
	}

	/* Mobile responsiveness */
	@media (max-width: 640px) {
		.performance-monitor {
			top: 10px;
			right: 10px;
		}

		.monitor-panel {
			width: calc(100vw - 20px);
			right: -10px;
		}
	}
</style>