// Ambient declarations for Svelte 5 runes used in .svelte.ts stores
// These provide minimal typing to satisfy TypeScript in non-.svelte files.

declare function $state<T>(initial: T): T;

declare function $effect(run: () => void | (() => void)): void;
