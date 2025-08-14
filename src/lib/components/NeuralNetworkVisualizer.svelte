<script lang="ts">
	import ParameterControls from './ParameterControls.svelte';

	type Activation = 'relu' | 'sigmoid' | 'tanh' | 'linear';

	interface Props {
		inputSize?: number;
		outputSize?: number;
		hiddenLayers?: number;
		neuronsPerHidden?: number;
		activation?: Activation;
	}

	let {
		inputSize = 3,
		outputSize = 2,
		hiddenLayers = 2,
		neuronsPerHidden = 5,
		activation = 'relu'
	}: Props = $props();

	// Derived architecture
	const layers = $derived(() => {
		const sizes: number[] = [inputSize];
		for (let i = 0; i < hiddenLayers; i++) sizes.push(neuronsPerHidden);
		sizes.push(outputSize);
		return sizes;
	});

	// ParameterControls bridge
	const parameters = $derived(() => [
		{ name: 'Hidden Layers', type: 'slider', default: hiddenLayers, description: 'Number of hidden layers', constraints: { min: 0, max: 5, step: 1 } },
		{ name: 'Neurons/Hidden', type: 'slider', default: neuronsPerHidden, description: 'Neurons per hidden layer', constraints: { min: 1, max: 12, step: 1 } },
		{ name: 'Activation', type: 'select', default: activation, description: 'Activation function', constraints: { options: ['relu', 'sigmoid', 'tanh', 'linear'] } }
	]);

	function handleParamChange(e: CustomEvent<{ parameter: string; value: any }>) {
		const { parameter, value } = e.detail;
		if (parameter === 'Hidden Layers') hiddenLayers = Number(value);
		if (parameter === 'Neurons/Hidden') neuronsPerHidden = Number(value);
		if (parameter === 'Activation') activation = value as Activation;
	}

	// Layout
	const width = 800;
	const height = 420;
	const margin = { top: 20, right: 40, bottom: 20, left: 40 };
	const innerWidth = $derived(() => width - margin.left - margin.right);
	const innerHeight = $derived(() => height - margin.top - margin.bottom);

	function nodePositions() {
		const positions: Array<{ x: number; y: number; layer: number; index: number }> = [];
		const layerCount = layers().length;
		for (let L: number = 0; L < layerCount; L++) {
			const nodes = layers()[L];
			for (let i: number = 0; i < nodes; i++) {
				const x = margin.left + (innerWidth() * (L as number)) / Math.max(1, layerCount - 1);
				const y = margin.top + (innerHeight() * ((i as number) + 1)) / (nodes + 1);
				positions.push({ x, y, layer: L, index: i });
			}
		}
		return positions;
	}

	const positions = $derived(nodePositions);

	function layerLabel(L: number): string {
		if (L === 0) return 'Input';
		if (L === layers().length - 1) return 'Output';
		return `Hidden ${L}`;
	}
</script>

<div class="nn-visualizer">
	<header class="nn-header">
		<h3 class="title">Neural Network Visualizer</h3>
		<p class="subtitle">Adjust structure and activation to explore architectures</p>
	</header>

	<div class="controls">
		<ParameterControls parameters={parameters()} onParameterChange={(p) => handleParamChange(new CustomEvent('parameterchange', { detail: p }))} />
	</div>

	<div class="canvas-wrapper">
		<svg {width} {height} class="nn-svg" role="img" aria-label="Neural network diagram">
			<!-- Layer labels -->
			{#each layers() as size, L (L)}
				<text x={margin.left + (innerWidth() * L) / Math.max(1, layers().length - 1)} y={16} text-anchor="middle" class="layer-label">{layerLabel(L)} ({size})</text>
			{/each}

			<!-- Connections -->
			{#each Array(layers().length - 1) as _, L (L)}
				{#each positions().filter(p => p.layer === L) as src (src.index)}
					{#each positions().filter(p => p.layer === L + 1) as dst (dst.index)}
						<line x1={src.x} y1={src.y} x2={dst.x} y2={dst.y} class="edge" />
					{/each}
				{/each}
			{/each}

			<!-- Nodes -->
			{#each positions() as p (`${p.layer}-${p.index}`)}
				<circle cx={p.x} cy={p.y} r={12} class="node" />
			{/each}

			<!-- Activation badge -->
			<g transform={`translate(${width - 160}, ${height - 24})`}>
				<rect width="150" height="22" rx="6" class="badge" />
				<text x="75" y="15" text-anchor="middle" class="badge-text">Activation: {activation}</text>
			</g>
		</svg>
	</div>
</div>

<style>
	.nn-visualizer { border: 1px solid var(--border-color, #e1e5e9); border-radius: 8px; padding: 1rem; background: var(--bg-color, #fff); }
	.nn-header { margin-bottom: 0.75rem; }
	.title { margin: 0 0 0.25rem 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary, #1a1a1a); }
	.subtitle { margin: 0; color: var(--text-secondary, #666); font-size: 0.9rem; }
	.controls { margin-bottom: 0.75rem; background: var(--bg-secondary, #f8f9fa); padding: 0.75rem; border-radius: 6px; border: 1px solid var(--border-light, #e9ecef); }
	.canvas-wrapper { overflow: auto; }
	.nn-svg { width: 100%; max-width: 100%; display: block; }
	.layer-label { fill: var(--text-secondary, #555); font-size: 12px; }
	.edge { stroke: var(--edge-color, #cbd5e1); stroke-width: 1.25; opacity: 0.9; }
	.node { fill: var(--node-fill, #0ea5e9); stroke: #fff; stroke-width: 2; }
	.node:hover { fill: var(--node-hover, #0284c7); }
	.badge { fill: #0f172a; opacity: 0.85; }
	.badge-text { fill: #fff; font-size: 12px; }
</style>
