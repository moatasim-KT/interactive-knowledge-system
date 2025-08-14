export interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title?: string;
    message: string;
    duration?: number;
    timestamp: Date;
    actions?: Array<{ label: string; action: () => void }>;
}

export interface ToastItem extends Toast {
    // Additional properties for internal use
}

export type ToastType = Toast['type'];

export interface ToastOptions {
    title?: string;
    duration?: number;
}