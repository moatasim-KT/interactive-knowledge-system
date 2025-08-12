/**
 * Store exports for easier importing
 */

// Main application state
export {
    appState,
    actions,
    filteredContent,
    progressStats,
    userPreferences,
    // Legacy function exports for backward compatibility
    getFilteredContent,
    getProgressStats,
    getUserPreferences
} from './appState.svelte.js';

// Web content state
export {
    webContentState,
    webContentActions,
    filteredSources,
    contentStats,
    batchProgress,
    // Legacy function exports for backward compatibility
    getFilteredSources,
    getContentStats,
    getBatchProgress
} from './webContentState.svelte.js';

// Progress persistence service
export { progressPersistence } from './progressPersistence.svelte.js';

// Effects are imported for side effects only
import './effects.svelte.js';