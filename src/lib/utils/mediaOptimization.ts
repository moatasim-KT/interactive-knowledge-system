/**
 * Media optimization utilities for compression, resizing, and format conversion
 */

import type { MediaFile, MediaUploadOptions, ResponsiveImageSizes } from '../types/media.js';

/**
 * Compress and optimize an image file
 */
export function optimizeImage(
	file: File,
	options: MediaUploadOptions = {}
): Promise<{ original: string; optimized?: string; webp?: string; thumbnail?: string }> {
	const {
		quality = 0.8,
		maxWidth = 1920,
		maxHeight = 1080,
		generateThumbnail = true,
		generateWebP = true
	} = options;

	return new Promise((resolve, reject) => {
		const img = new Image();
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			reject(new Error('Canvas context not available'));
			return;
		}

		img.onload = () => {
			try {
				// Calculate dimensions maintaining aspect ratio
				const { width: newWidth, height: newHeight } = calculate_dimensions(
					img.width,
					img.height,
					maxWidth,
					maxHeight
				);

				canvas.width = newWidth;
				canvas.height = newHeight;

				// Draw and compress original
				ctx.drawImage(img, 0, 0, newWidth, newHeight);
				const original = canvas.toDataURL('image/jpeg', quality);

				const result: any = { original };

				// Generate WebP if supported
				if (generateWebP && canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
					result.webp = canvas.toDataURL('image/webp', quality);
				}

				// Generate thumbnail
				if (generateThumbnail) {
					const thumb_canvas = document.createElement('canvas');
					const thumb_ctx = thumb_canvas.getContext('2d');
					if (thumb_ctx) {
						const thumb_size = 200;
						const thumb_dimensions = calculate_dimensions(
							newWidth,
							newHeight,
							thumb_size,
							thumb_size
						);
						thumb_canvas.width = thumb_dimensions.width;
						thumb_canvas.height = thumb_dimensions.height;
						thumb_ctx.drawImage(canvas, 0, 0, thumb_dimensions.width, thumb_dimensions.height);
						result.thumbnail = thumb_canvas.toDataURL('image/jpeg', 0.7);
					}
				}

				resolve(result);
			} catch (error) {
				reject(error);
			}
		};

		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = URL.createObjectURL(file);
	});
}

/**
 * Generate responsive image sizes
 */
export function generateResponsiveSizes(
	file: File,
	breakpoints: Record<string, number> = {
		small: 480,
		medium: 768,
		large: 1200,
		xlarge: 1920
	}
): Promise<ResponsiveImageSizes> {
	const img = new Image();
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	if (!ctx) {
		throw new Error('Canvas context not available');
	}

	return new Promise((resolve, reject) => {
		img.onload = () => {
			try {
				const sizes: Partial<ResponsiveImageSizes> = {};

				Object.entries(breakpoints).forEach(([key, maxWidth]) => {
					const { width, height } = calculate_dimensions(
						img.width,
						img.height,
						maxWidth,
						img.height
					);

					canvas.width = width;
					canvas.height = height;
					ctx.drawImage(img, 0, 0, width, height);
					sizes[key as keyof ResponsiveImageSizes] = canvas.toDataURL('image/jpeg', 0.8);
				});

				resolve(sizes as ResponsiveImageSizes);
			} catch (error) {
				reject(error);
			}
		};

		img.onerror = () => reject(new Error('Failed to load image'));
		img.src = URL.createObjectURL(file);
	});
}

/**
 * Compress video file (basic implementation - in production would use FFmpeg.wasm)
 */
export async function optimizeVideo(
	file: File,
	options: MediaUploadOptions = {}
): Promise<{ original: string; compressed?: string; thumbnail?: string }> {
	// For now, just return the original file as data URL
	// In production, this would use FFmpeg.wasm for actual video compression
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = async () => {
			try {
				const original = reader.result as string;
				const result: any = { original };

				// Generate video thumbnail
				if (options.generateThumbnail) {
					const thumbnail = await generateVideoThumbnail(file);
					if (thumbnail) {
						result.thumbnail = thumbnail;
					}
				}

				resolve(result);
			} catch (error) {
				reject(error);
			}
		};

		reader.onerror = () => reject(new Error('Failed to read video file'));
		reader.readAsDataURL(file);
	});
}

/**
 * Generate video thumbnail
 */
export async function generateVideoThumbnail(file: File): Promise<string | null> {
	return new Promise((resolve) => {
		const video = document.createElement('video');
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');

		if (!ctx) {
			resolve(null);
			return;
		}

		video.onloadedmetadata = () => {
			// Seek to 1 second or 10% of video duration
			video.currentTime = Math.min(1, video.duration * 0.1);
		};

		video.onseeked = () => {
			try {
				canvas.width = video.videoWidth;
				canvas.height = video.videoHeight;
				ctx.drawImage(video, 0, 0);
				const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
				resolve(thumbnail);
			} catch {
				resolve(null);
			}
		};

		video.onerror = () => resolve(null);
		video.src = URL.createObjectURL(file);
		video.load();
	});
}

/**
 * Calculate optimal dimensions maintaining aspect ratio
 */
function calculate_dimensions(
	original_width: number,
	original_height: number,
	max_width: number,
	max_height: number
): { width: number; height: number } {
	let { width, height } = { width: original_width, height: original_height };

	// Scale down if necessary
	if (width > max_width) {
		height = (height * max_width) / width;
		width = max_width;
	}

	if (height > max_height) {
		width = (width * max_height) / height;
		height = max_height;
	}

	return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate file type and size
 */
export function validateMediaFile(
	file: File,
	options: MediaUploadOptions = {}
): { valid: boolean; error?: string } {
	const { maxSize = 10 * 1024 * 1024, allowedTypes = ['image/*', 'video/*'] } = options;

	// Check file size
	if (file.size > maxSize) {
		return {
			valid: false,
			error: `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`
		};
	}

	// Check file type
	const is_allowed = allowedTypes.some((type) => {
		if (type.endsWith('/*')) {
			return file.type.startsWith(type.slice(0, -1));
		}
		return file.type === type;
	});

	if (!is_allowed) {
		return {
			valid: false,
			error: `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
		};
	}

	return { valid: true };
}
