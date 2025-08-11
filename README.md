# Interactive Knowledge System

A comprehensive interactive knowledge management system built with Svelte 5, featuring modern reactive state management and TypeScript support.

## Project Structure

```
interactive-knowledge-system/
├── src/
│   ├── lib/
│   │   ├── types/           # TypeScript interfaces and type definitions
│   │   │   ├── content.ts   # Content and module types
│   │   │   ├── knowledge.ts # Knowledge tree and learning path types
│   │   │   ├── user.ts      # User progress and settings types
│   │   │   ├── interactive.ts # Quiz, flashcard, and search types
│   │   │   └── index.ts     # Type exports
│   │   └── stores/          # Reactive state management
│   │       ├── appState.svelte.ts # Global application state using Svelte 5 runes
│   │       └── effects.svelte.ts  # Side effects and reactive behaviors
│   ├── routes/              # SvelteKit routes
│   │   ├── +layout.svelte   # Main application layout
│   │   └── +page.svelte     # Home page with demo functionality
│   └── app.html             # HTML template
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── svelte.config.js        # Svelte configuration
```

## Core Features Implemented

### 1. TypeScript Interfaces

- **ContentBlock**: Represents different types of learning content (text, image, video, code, quiz, flashcard, diagram)
- **ContentModule**: Complete learning modules with metadata, relationships, and analytics
- **KnowledgeNode**: Hierarchical knowledge tree structure with progress tracking
- **UserProgress**: Individual user progress tracking for modules
- **UserSettings**: User preferences and personalization options
- **Interactive Types**: Quiz questions, flashcards, and search functionality

### 2. Svelte 5 Runes-Based State Management

- **$state**: Reactive global application state
- **$derived**: Computed values that automatically update when dependencies change
- **$effect**: Side effects for auto-save, online status monitoring, and notifications

### 3. Reactive State Features

- Global application state with user, content, progress, sync, and UI sections
- Derived state for filtered content and progress statistics
- Actions for state mutations with proper encapsulation
- Automatic state persistence and synchronization preparation

### 4. Side Effects System

- Auto-save functionality with debouncing
- Online/offline status monitoring
- Automatic sync of pending changes when coming back online
- Theme preference application
- Notification auto-removal

## Key State Management Patterns

### Global State Structure

```typescript
const appState = $state({
  user: { id, settings, isAuthenticated },
  content: { nodes, currentNode, searchQuery, searchResults },
  progress: { completedModules, currentStreak, userProgress },
  sync: { isOnline, lastSync, pendingChanges, isSyncing },
  ui: { sidebarOpen, currentView, theme, notifications }
});
```

### Derived State Examples

```typescript
const derivedState = {
  filteredContent: $derived(() => /* filter logic */),
  progressStats: $derived(() => /* progress calculations */),
  userPreferences: $derived(() => /* user settings */)
};
```

### Actions Pattern

```typescript
const actions = {
  addKnowledgeNode: (node) => {
    /* mutation logic */
  },
  markModuleCompleted: (id, score) => {
    /* progress update */
  },
  setSearchQuery: (query) => {
    /* search state update */
  }
};
```

## Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Setup

```bash
cd interactive-knowledge-system
pnpm install
```

### Development Server

```bash
pnpm dev
```

### Testing

```bash
pnpm test
```

### Build

```bash
pnpm build
```

## Demo Features

The current implementation includes a working demo with:

- Interactive sidebar with knowledge tree navigation
- Dashboard with progress statistics
- Content view with module details
- Search functionality
- Notification system
- Online/offline status indicator
- Reactive state updates throughout the UI

## Next Steps

This foundation enables the implementation of:

1. Local storage layer with IndexedDB (Task 2)
2. Content editor components (Task 3)
3. Interactive elements (quizzes, flashcards)
4. Advanced search and discovery
5. Collaborative features
6. Data export/import functionality

## Architecture Decisions

1. **Local-First Approach**: All data stored locally with optional cloud sync
2. **Reactive State Management**: Svelte 5 runes for optimal performance
3. **TypeScript Throughout**: Full type safety and developer experience
4. **Component-Driven**: Modular, reusable components
5. **Progressive Enhancement**: Works offline, enhanced when online
