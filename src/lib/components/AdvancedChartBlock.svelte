<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, registerables } from 'chart.js';

	// Register Chart.js components
	Chart.register(...registerables);

	interface Props {
		chartId: string;
		initialData?: any;
		initialOptions?: any;
		chartType?: string;
		onChartReady?: (chartInstance: Chart) => void;
	}

	let { 
		chartId,
		initialData = {},
		initialOptions = {},
		chartType = 'bar',
		onChartReady
	}: Props = $props();

	let canvas: HTMLCanvasElement = $state();
	let chartInstance: Chart | null = $state(null);
	let currentTheme: string = $state('light');

	// Initialize chart when component mounts
	$effect(() => {
		if (!canvas) return;

		// Initialize chart with data from props
		chartInstance = new Chart(canvas, {
			type: chartType as any,
			data: initialData,
			options: initialOptions,
		});

		// Dispatch event when chart is ready
		onChartReady?.(chartInstance);

		return () => {
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		};
	});

	function updateChartTheme(chart: Chart, theme: string) {
		// Example: Update text color based on theme
		chart.options.color = theme === 'dark' ? '#fff' : '#333';
		chart.options.scales = {
			x: {
				ticks: {
					color: theme === 'dark' ? '#fff' : '#333',
				},
				grid: {
					color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
				},
			},
			y: {
				ticks: {
					color: theme === 'dark' ? '#fff' : '#333',
				},
				grid: {
					color: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
				},
			},
		};
		chart.update();
	}
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    width: 100%;
    height: 100%;
  }
</style>