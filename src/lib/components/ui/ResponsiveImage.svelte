<script lang="ts">
	import { onMount } from 'svelte';
	import { getDeviceInfo, getOptimizedImageSrc, MobilePerformanceOptimizer } from '$lib/utils/mobileOptimization';

	interface Props {
		src: string;
		alt: string;
		sizes?: { mobile?: string; tablet?: string; desktop?: string };
		lazy?: boolean;
		aspectRatio?: string;
		objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
		placeholder?: string;
		class?: string;
		width?: number;
		height?: number;
	}

	let {
		src,
		alt,
		sizes,
		lazy = true,
		aspectRatio,
		objectFit = 'cover',
		placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjI0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+',
		class: className = '',
		width,
		height
	}: Props = $props();

	let imageElement: HTMLImageElement;
	let isLoaded = $state(false);
	let isInView = $state(!lazy);
	let currentSrc = $state(placeholder);
	let optimizer: MobilePerformanceOptimizer;

	$effect(() => {
		const deviceInfo = getDeviceInfo();
		const optimizedSrc = getOptimizedImageSrc(src, deviceInfo, sizes);

		if (lazy) {
			optimizer = new MobilePerformanceOptimizer();
			optimizer.setupLazyLoading([imageElement], () => {
				isInView = true;
				loadImage(optimizedSrc);
			});
		} else {
			loadImage(optimizedSrc);
		}

		return () => {
			optimizer?.destroy();
		};
	});

	function loadImage(imageSrc: string) {
		const img = new Image();
		img.onload = () => {
			currentSrc = imageSrc;
			isLoaded = true;
		};
		img.onerror = () => {
			console.warn(`Failed to load image: ${imageSrc}`);
			// Keep placeholder on error
		};
		img.src = imageSrc;
	}

	const containerClasses = $derived(() =>
		[
			'responsive-image',
			isLoaded ? 'responsive-image--loaded' : 'responsive-image--loading',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const imageStyles = $derived(() => {
		const styles: Record<string, string> = {
			'object-fit': objectFit,
			'transition': 'opacity 0.3s ease'
		};

		if (aspectRatio) {
			styles['aspect-ratio'] = aspectRatio;
		}

		if (width) {
			styles['width'] = `${width}px`;
		}

		if (height) {
			styles['height'] = `${height}px`;
		}

		return Object.entries(styles)
			.map(([key, value]) => `${key}: ${value}`)
			.join('; ');
	});
</script>

<div class={containerClasses}>
	<img
		bind:this={imageElement}
		src={currentSrc}
		{alt}
		style={imageStyles()}
		class="responsive-image__img"
		loading={lazy ? 'lazy' : 'eager'}
		decoding="async"
		{width}
		{height}
	/>
	
	{#if !isLoaded}
		<div class="responsive-image__placeholder" aria-hidden="true">
			<div class="responsive-image__spinner"></div>
		</div>
	{/if}
</div>

<style>
	.responsive-image {
		position: relative;
		display: inline-block;
		overflow: hidden;
		background-color: var(--color-gray-100);
		border-radius: var(--radius-base);
	}

	.responsive-image__img {
		width: 100%;
		height: 100%;
		display: block;
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.responsive-image--loaded .responsive-image__img {
		opacity: 1;
	}

	.responsive-image__placeholder {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: var(--color-gray-100);
		transition: opacity 0.3s ease;
	}

	.responsive-image--loaded .responsive-image__placeholder {
		opacity: 0;
		pointer-events: none;
	}

	.responsive-image__spinner {
		width: 24px;
		height: 24px;
		border: 2px solid var(--color-gray-300);
		border-top: 2px solid var(--color-primary-500);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Mobile optimizations */
	@media (max-width: 768px) {
		.responsive-image {
			border-radius: var(--radius-sm);
		}

		.responsive-image__img {
			/* Optimize for mobile performance */
			image-rendering: -webkit-optimize-contrast;
			image-rendering: crisp-edges;
		}
	}

	/* High contrast mode */
	@media (prefers-contrast: high) {
		.responsive-image {
			border: 1px solid var(--color-border);
		}
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.responsive-image__img,
		.responsive-image__placeholder {
			transition: none;
		}

		.responsive-image__spinner {
			animation: none;
		}
	}
</style>