# AI Workspace

Web application for managing AI agent sessions with multi-provider support.

## Status

**Version:** 0.4.0 (Development)
**Phase:** 3 - Panels ✅ Completed

## Tech Stack

- React 18 + TypeScript + Vite
- TanStack Router + Query
- Zustand (state management)
- SQLite (relational) + LanceDB (vectors)
- WebSocket + SSE (real-time)

## Architecture

Clean Architecture + Hexagonal (Ports/Adapters)

```
src/
├── domain/          # Entities, value objects, ports
├── use-cases/       # Business logic
├── adapters/        # Port implementations
├── infrastructure/  # DB, WebSocket, SSE
├── app/routes/      # TanStack Router
├── features/        # UI components
└── shared/          # Stores, common UI
```

## Getting Started

```bash
cd ai-workspace
npm install
npm run dev
```

## Features

### Phase 1 ✅ Completed
- **Block-based Chat** - 7 renderers (text, code, diff, file, command, thinking)
- **Kanban Board** - Drag-drop task columns with @dnd-kit
- **Task Management** - Create, update, move tasks across columns
- **Session Control** - Start, stop, pause sessions with streaming output
- **Real-time Updates** - WebSocket + SSE with auto-reconnect
- **CLI Adapters** - Claude and Gemini provider integration (browser stubs)
- **Diff Approval** - Review and approve code changes

### Phase 2+ (Planned)
- API key management
- Configuration UI
- File explorer + Monaco editor
- Git integration
- Global search
- Cross-session memory (LanceDB vector search)

## Documentation

- [System Architecture](./docs/system-architecture.md) - Clean Architecture layers, data flow, and components
- [Code Standards](./docs/code-standards.md) - TypeScript patterns, naming conventions, and best practices
- [Codebase Summary](./docs/codebase-summary.md) - Project overview, structure, and statistics
- [Development Roadmap](./docs/development-roadmap.md) - Phase milestones and planned features
- [Changelog](./docs/project-changelog.md) - Version history and feature releases
