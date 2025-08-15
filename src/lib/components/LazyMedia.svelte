<script lang="ts">

	import type { LazyLoadOptions } from '$lib/types/media';

	interface Props {
		src: string;
		alt?: string;
		type: 'image' | 'video';
		placeholder?: string;
		options?: LazyLoadOptions;
		class?: string;
		style?: string;
		width?: number;
		height?: number;
		// Video specific props
		controls?: boolean;
		autoplay?: boolean;
		muted?: boolean;
		loop?: boolean;
		poster?: string;
	}

	let {
		src,
		alt = '',
		type,
		placeholder = '',
		options = {},
		class: className = '',
		style = '',
		width,
		height,
		controls = true,
		autoplay = false,
		muted = false,
		loop = false,
		poster
	}: Props = $props();

	// Default options
	const { rootMargin = '50px', threshold = 0.1, fadeIn = true } = options;

	// State
	let is_loaded = $state(false);
	let is_in_view = $state(false);
	let has_error = $state(false);
	let element: HTMLElement;
	let observer: IntersectionObserver;

	// Generate placeholder if not provided
	const default_placeholder =
		type === 'image'
			? `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width || 400}' height='${height || 300}'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3ELoading...%3C/text%3E%3C/svg%3E`
			: '';

	const placeholder_src = placeholder || default_placeholder;

	$effect(() => {
		// Set up intersection observer
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						is_in_view = true;
						observer.unobserve(entry.target);
					}
				});
			},
			{
				rootMargin,
				threshold
			}
		);

		if (element) {
			observer.observe(element);
		}

		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});

	function handle_load() {
		is_loaded = true;
	}

	function handle_error() {
		has_error = true;
	}

	// Determine which source to use
	let current_src = $derived(is_in_view ? src : placeholder_src);
	let show_content = $derived(is_in_view && !has_error);
</script>

<div
	bind:this={element}
	class="lazy-media {className}"
	class:loaded={is_loaded}
	class:fade-in={fadeIn}
	{style}
>
	{#if type === 'image'}
		{#if has_error}
			<div class="error-placeholder">
				<span class="error-icon">⚠️</span>
				<span class="error-text">Failed to load image</span>
			</div>
		{:else}
			<img
				src={current_src}
				{alt}
				{width}
				{height}
				onload={handle_load}
				onerror={handle_error}
				class="lazy-image"
				class:loaded={is_loaded && is_in_view}
			/>
		{/if}
	{:else if type === 'video'}
		{#if has_error}
			<div class="error-placeholder">
				<span class="error-icon">⚠️</span>
				<span class="error-text">Failed to load video</span>
			</div>
		{:else if show_content}
			<video
				src={current_src}
				{controls}
				{autoplay}
				{muted}
				{loop}
				{poster}
				{width}
				{height}
				onloadeddata={handle_load}
				onerror={handle_error}
				class="lazy-video"
				class:loaded={is_loaded}
			>
				<track kind="captions" src="" srclang="en" label="English captions" />
				Your browser does not support the video tag.
			</video>
		{:else}
			<div class="video-placeholder">
				{#if poster}
					<img src={poster} alt="Video thumbnail" class="video-poster" />
				{/if}
				<div class="play-button">
					<svg
						width="60"
						height="60"
						viewBox="0 0 60 60"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<circle cx="30" cy="30" r="30" fill="rgba(0,0,0,0.7)" />
						<path d="M23 20L40 30L23 40V20Z" fill="white" />
					</svg>
				</div>
			</div>
		{/if}
	{/if}

	{#if !is_in_view && !has_error}
		<div class="loading-indicator">
			<div class="spinner"></div>
		</div>
	{/if}
</div>

<style>
	.lazy-media {
		position: relative;
		display: inline-block;
		overflow: hidden;
		background-color: #f5f5f5;
		border-radius: 4px;
	}

	.lazy-image,
	.lazy-video {
		width: 100%;
		height: auto;
		display: block;
		transition: opacity 0.3s ease;
	}

	.fade-in .lazy-image,
	.fade-in .lazy-video {
		opacity: 0;
	}

	.fade-in .lazy-image.loaded,
	.fade-in .lazy-video.loaded {
		opacity: 1;
	}

	.error-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background-color: #f8f9fa;
		border: 2px dashed #dee2e6;
		border-radius: 4px;
		color: #6c757d;
		min-height: 200px;
	}

	.error-icon {
		font-size: 2rem;
		margin-bottom: 0.5rem;
	}

	.error-text {
		font-size: 0.9rem;
		text-align: center;
	}

	.video-placeholder {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #000;
		min-height: 200px;
		cursor: pointer;
	}

	.video-poster {
		width: 100%;
		height: 100%;
		object-fit: cover;
		position: absolute;
		top: 0;
		left: 0;
	}

	.play-button {
		position: relative;
		z-index: 1;
		transition: transform 0.2s ease;
	}

	.play-button:hover {
		transform: scale(1.1);
	}

	.loading-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 2;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid #007bff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Responsive behavior */
	@media (max-width: 768px) {
		.lazy-media {
			max-width: 100%;
		}

		.lazy-image,
		.lazy-video {
			width: 100%;
			height: auto;
		}
	}
</style>
