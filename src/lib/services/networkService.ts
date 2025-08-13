/**
 * Network monitoring and offline detection service
 */

import type { NetworkStatus } from '../types/sync.js';
import { appState, actions } from '../stores/appState.svelte.js';

export class NetworkService {
	private static instance: NetworkService;
	private networkStatus: NetworkStatus = {
		isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true
	};
	private listeners: Set<(status: NetworkStatus) => void> = new Set();
	private connectionMonitor: number | null = null;

	private constructor() {
		this.initializeNetworkMonitoring();
	}

	static getInstance(): NetworkService {
		if (!NetworkService.instance) {
			NetworkService.instance = new NetworkService();
		}
		return NetworkService.instance;
	}

	private initializeNetworkMonitoring(): void {
		if (typeof window === 'undefined') {return;}

		// Basic online/offline detection
		window.addEventListener('online', this.handleOnline.bind(this));
		window.addEventListener('offline', this.handleOffline.bind(this));

		// Enhanced connection monitoring if available
		if ('connection' in navigator) {
			const connection = (navigator as any).connection;
			if (connection) {
				this.updateConnectionInfo(connection);
				connection.addEventListener('change', () => {
					this.updateConnectionInfo(connection);
				});
			}
		}

		// Periodic connectivity check
		this.startPeriodicCheck();
	}

	private handleOnline(): void {
		this.networkStatus.isOnline = true;
		actions.setOnlineStatus(true);
		this.notifyListeners();
	}

	private handleOffline(): void {
		this.networkStatus.isOnline = false;
		actions.setOnlineStatus(false);
		this.notifyListeners();
	}

	private updateConnectionInfo(connection: any): void {
		this.networkStatus = {
			...this.networkStatus,
			connectionType: connection.type || 'unknown',
			effectiveType: connection.effectiveType,
			downlink: connection.downlink,
			rtt: connection.rtt
		};
		this.notifyListeners();
	}

	private startPeriodicCheck(): void {
		// Check connectivity every 30 seconds
		this.connectionMonitor = window.setInterval(async () => {
			const wasOnline = this.networkStatus.isOnline;
			const isOnline = await this.checkConnectivity();

			if (wasOnline !== isOnline) {
				this.networkStatus.isOnline = isOnline;
				actions.setOnlineStatus(isOnline);
				this.notifyListeners();
			}
		}, 30000);
	}

	private async checkConnectivity(): Promise<boolean> {
		try {
			// Try to fetch a small resource to verify connectivity
			const response = await fetch('/favicon.ico', {
				method: 'HEAD',
				cache: 'no-cache',
				signal: AbortSignal.timeout(5000)
			});
			return response.ok;
		} catch {
			return false;
		}
	}

	private notifyListeners(): void {
		this.listeners.forEach((listener) => {
			try {
				listener(this.networkStatus);
			} catch (error) { }
		});
	}

	// Public API
	getNetworkStatus(): NetworkStatus {
		return { ...this.networkStatus };
	}

	isOnline(): boolean {
		return this.networkStatus.isOnline;
	}

	isSlowConnection(): boolean {
		const { effectiveType, downlink } = this.networkStatus;
		return (
			effectiveType === 'slow-2g' ||
			effectiveType === '2g' ||
			(downlink !== undefined && downlink < 1)
		);
	}

	addListener(listener: (status: NetworkStatus) => void): () => void {
		this.listeners.add(listener);

		// Return unsubscribe function
		return () => {
			this.listeners.delete(listener);
		};
	}

	destroy(): void {
		if (typeof window === 'undefined') {return;}

		window.removeEventListener('online', this.handleOnline.bind(this));
		window.removeEventListener('offline', this.handleOffline.bind(this));

		if (this.connectionMonitor) {
			clearInterval(this.connectionMonitor);
			this.connectionMonitor = null;
		}

		this.listeners.clear();
	}
}

// Export singleton instance
export const networkService = NetworkService.getInstance();
