/**
 * Media handling types for the interactive knowledge system
 */

export interface MediaFile {
	id: string;
	name: string;
	type: 'image' | 'video' | 'audio';
	mimeType: string;
	size: number;
	url: string;
	thumbnailUrl?: string;
		metadata: {
		width?: number;
		height?: number;
		duration?: number;
		created: Date;
		modified: Date;
	};
	optimized?: {
		webp?: string;
		avif?: string;
		compressed?: string;
		sizes?: Record<string, string>; // breakpoint -> url
	};
}

export interface MediaUploadOptions {
	maxSize?: number;
	allowedTypes?: string[];
	quality?: number;
	maxWidth?: number;
	maxHeight?: number;
	generateThumbnail?: boolean;
	generateWebP?: boolean;
	generateAVIF?: boolean;
}

export interface MediaStorageQuota {
	used: number;
	available: number;
	total: number;
}

export interface LazyLoadOptions {
	rootMargin?: string;
	threshold?: number;
	placeholder?: string;
	fadeIn?: boolean;
}

export interface ResponsiveImageSizes {
	small: string;
	medium: string;
	large: string;
	xlarge?: string;
}

export interface VideoOptions {
	autoplay?: boolean;
	muted?: boolean;
	loop?: boolean;
	controls?: boolean;
	preload?: 'none' | 'metadata' | 'auto';
	poster?: string;
}
