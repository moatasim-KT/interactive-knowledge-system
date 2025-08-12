# Interactive Knowledge System

Interactive Knowledge System is a local-first platform for exploring, organizing, and transforming knowledge. It combines Svelte 5's reactivity with rich visualization components, a robust service layer, and Model Context Protocol (MCP) tools for working with external content.

## Features

- **Type-safe content model** – Comprehensive TypeScript types for content blocks, modules, knowledge trees, users, and interactive elements.
- **Runes-based state management** – Reactive global state with derived values, effects, and persistence helpers.
- **Local storage layer** – IndexedDB-backed storage for content, relationships, user data, and media assets.
- **Service layer** – Modular services for network access, synchronization, conflict resolution, content analysis, and offline queueing.
- **Component library** – Svelte components for knowledge maps, progress dashboards, interactive charts, simulations, editors, and more.
- **MCP integration** – Tools and server for processing web content using the Model Context Protocol.
- **Demo routes** – Example pages showcasing progress tracking, relationship management, simulations, code editing, and interactive visualizations.

## Project Structure

```
interactive-knowledge-system/
├── src/
│   ├── lib/
│   │   ├── components/   # UI components and visualization blocks
│   │   ├── mcp/          # Model Context Protocol tools and server
│   │   ├── services/     # Data processing, sync, and analysis services
│   │   ├── storage/      # IndexedDB adapters and storage helpers
│   │   ├── stores/       # Global state, effects, and persistence
│   │   ├── styles/       # Shared styles and themes
│   │   ├── types/        # TypeScript interfaces and type exports
│   │   └── utils/        # Helper utilities (export, import, logging, etc.)
│   ├── routes/           # SvelteKit routes and demo pages
│   └── app.html          # HTML template
├── package.json          # Dependencies and scripts
├── svelte.config.js      # Svelte configuration
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite build configuration
└── README.md             # Project documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
pnpm install
# or
npm install
```

### Development Commands

```bash
pnpm dev        # Start development server
pnpm test       # Run unit tests with Vitest
pnpm lint       # Prettier & ESLint checks
pnpm build      # Production build
pnpm preview    # Preview production build
```

## Architecture Overview

### State Management

The global application state lives in [`src/lib/stores`](src/lib/stores) and uses Svelte 5 runes (`$state`, `$derived`, `$effect`). Separate stores handle app state, web content state, progress persistence, and side effects.

### Services

The [`src/lib/services`](src/lib/services) directory contains modular services for tasks such as web content fetching, synchronization, conflict resolution, interactive analysis, network management, and processing pipelines.

### Storage

Local-first storage is implemented in [`src/lib/storage`](src/lib/storage) with IndexedDB adapters for content, relationships, media, and user data. An offline queue and data management service support eventual synchronization.

### Components

Reusable UI components live in [`src/lib/components`](src/lib/components). Highlights include interactive visualization blocks, knowledge maps, progress dashboards, simulation tools, code editors, and content editors.

### MCP Integration

[`src/lib/mcp`](src/lib/mcp) provides a Model Context Protocol server and tools for fetching, analyzing, and transforming web content, enabling automated extraction of structured knowledge.

## Demo Routes

Several demo pages illustrate system capabilities:

- `/` – Main application shell
- `/knowledge` – Knowledge tree navigation
- `/progress-demo` – Progress tracking dashboard
- `/relationships-demo` – Relationship management
- `/simulation-demo` – Interactive simulation components
- `/code-demo` – Code editor and execution demo
- `/demo-interactive-viz` – Interactive visualization showcase

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes and add tests when applicable
4. Run `pnpm lint` and `pnpm test`
5. Submit a pull request

## Roadmap

- Advanced visualization types (neural networks, system diagrams)
- Content editing and authoring tools
- Enhanced search and discovery
- Collaborative features and cloud sync
- Data export/import workflows

## License

This project is licensed under the MIT License. See `LICENSE` for details.

