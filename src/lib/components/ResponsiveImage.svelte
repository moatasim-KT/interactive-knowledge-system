<script lang="ts">
	import LazyMedia from './LazyMedia.svelte';
	import type { ResponsiveImageSizes, LazyLoadOptions } from '$lib/types/media.js';

	interface Props {
		src: string;
		alt: string;
		sizes?: ResponsiveImageSizes;
		webpSrc?: string;
		avifSrc?: string;
		placeholder?: string;
		lazyLoad?: boolean;
		lazyOptions?: LazyLoadOptions;
		class?: string;
		style?: string;
		width?: number;
		height?: number;
		caption?: string;
	}

	let {
		src,
		alt,
		sizes,
		webpSrc,
		avifSrc,
		placeholder,
		lazyLoad = true,
		lazyOptions = {},
		class: className = '',
		style = '',
		width,
		height,
		caption
	}: Props = $props();

	// Generate srcset for responsive images
	let src_set = $derived(
		sizes
			? Object.entries(sizes)
					.map(([breakpoint, url]) => {
						const widths = {
							small: '480w',
							medium: '768w',
							large: '1200w',
							xlarge: '1920w'
						};
						return `${url} ${widths[breakpoint as keyof typeof widths] || '1x'}`;
					})
					.join(', ')
			: ''
	);

	// Generate sizes attribute for responsive behavior
	let sizes_attr = $derived(
		sizes
			? '(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1920px'
			: '100vw'
	);

	// Determine the best source to use
	let best_src = $derived(
		(() => {
			// Check for modern format support
			if (avifSrc && supports_avif()) return avifSrc;
			if (webpSrc && supports_web_p()) return webpSrc;
			return src;
		})()
	);

	// Feature detection for image formats
	function supports_web_p(): boolean {
		if (typeof window === 'undefined') return false;
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
	}

	function supports_avif(): boolean {
		if (typeof window === 'undefined') return false;
		const canvas = document.createElement('canvas');
		canvas.width = 1;
		canvas.height = 1;
		return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
	}
</script>

<figure class="responsive-image-container {className}" {style}>
	{#if lazyLoad}
		<LazyMedia
			src={bestSrc}
			{alt}
			type="image"
			{placeholder}
			options={lazyOptions}
			{width}
			{height}
			class="responsive-image"
		/>
	{:else}
		<picture class="responsive-picture">
			{#if avifSrc}
				<source srcset={avifSrc} type="image/avif" />
			{/if}
			{#if webpSrc}
				<source srcset={webpSrc} type="image/webp" />
			{/if}
			<img
				{src}
				srcset={srcSet}
				sizes={sizesAttr}
				{alt}
				{width}
				{height}
				class="responsive-image"
				loading="lazy"
			/>
		</picture>
	{/if}

	{#if caption}
		<figcaption class="image-caption">
			{caption}
		</figcaption>
	{/if}
</figure>

<style>
	.responsive-image-container {
		margin: 0;
		display: block;
		width: 100%;
	}

	.responsive-picture {
		display: block;
		width: 100%;
	}

	.responsive-image {
		width: 100%;
		height: auto;
		display: block;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.image-caption {
		margin-top: 0.5rem;
		font-size: 0.9rem;
		color: #666;
		font-style: italic;
		text-align: center;
		line-height: 1.4;
	}

	/* Responsive behavior */
	@media (max-width: 768px) {
		.responsive-image-container {
			margin: 0 -1rem;
		}

		.responsive-image {
			border-radius: 0;
		}
	}

	@media (max-width: 480px) {
		.image-caption {
			font-size: 0.8rem;
			padding: 0 1rem;
		}
	}
</style>
