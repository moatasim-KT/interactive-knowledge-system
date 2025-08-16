/**
 * Minimal EventEmitter interface for app-wide utilities
 */
export interface EventEmitter<T = any> {
    on(event: string, handler: (payload: T) => void): void;
    off(event: string, handler: (payload: T) => void): void;
    emit(event: string, payload: T): void;
}


