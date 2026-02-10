<p align="center">
  <img src="frontend/public/logo.svg" width="120" alt="NoteCode Logo" />
</p>

<h1 align="center">NoteCode</h1>

<p align="center">
  <strong>AI-Powered Coding Task Management</strong><br/>
  Orchestrate Claude, Gemini, and more in a unified workspace with approval workflows, real-time streaming, and desktop support.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#development">Development</a> &bull;
  <a href="#license">License</a>
</p>

---

## Quick Start

### Run with npx (no install)

```bash
npx notecode-app
```

Opens in your browser automatically. That's it.

### Options

```bash
npx notecode-app -p 5000         # Custom port
npx notecode-app --no-browser    # Don't auto-open browser
npx notecode-app --help          # Show all options
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `41920` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `NO_BROWSER` | `false` | Skip opening browser |
| `NOTECODE_DATA_DIR` | `~/.notecode` | Data directory |

---

## Features

### Multi-Provider AI Orchestration
Seamlessly switch between AI providers (Claude, Gemini) within the same workspace. Each task can use a different model.

### Task Management
Kanban board with drag-and-drop, task dependencies, context files, and image attachments. Assign AI agents to tasks and track progress.

### Real-Time Session Streaming
WebSocket-powered live streaming of AI sessions. Watch code being generated in real-time with token usage tracking.

### Approval Workflows
Hook-based approval gates for AI-generated code changes. Review diffs, approve or reject file modifications before they're applied.

### File Explorer
VS Code-style file browser with syntax highlighting, diff tracking, and the ability to open files in your preferred editor.

### Git Integration
Branch management, commit tracking, and approval-based commit workflows directly from the UI.

### Desktop App (Electron)
Native desktop experience for Windows, macOS, and Linux with auto-updates.

---

## Architecture

```
notecode/
├── backend/          # Fastify + Clean Architecture (Node.js)
│   ├── src/
│   │   ├── adapters/         # Controllers, repositories, gateways
│   │   ├── domain/           # Entities, use cases, ports
│   │   └── infrastructure/   # Database (SQLite), server, CLI adapters
│   └── bin/cli.js            # CLI entry point
├── frontend/         # React 19 + TypeScript + TanStack Router
│   └── src/
│       ├── components/       # UI components (shadcn/ui)
│       ├── features/         # Feature modules
│       └── lib/              # Utilities, API client
├── electron/         # Electron desktop wrapper
└── package.json      # Monorepo root
```

**Backend:** Fastify server with Clean Architecture (Domain → Use Cases → Adapters → Infrastructure). SQLite via Drizzle ORM. WebSocket for real-time streaming.

**Frontend:** React 19, TanStack Router, TanStack Query, shadcn/ui components. Tailwind CSS for styling.

**Desktop:** Electron shell that bundles the backend server and loads the frontend.

---

## Development

### Prerequisites

- Node.js >= 18
- npm >= 9
- AI CLI tools installed (at least one):
  - [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`)
  - [Gemini CLI](https://github.com/google-gemini/gemini-cli) (`gemini`)

### Setup

```bash
git clone https://github.com/therichardngai-code/notecode.git
cd notecode
npm install
```

### Run (Development)

```bash
# Start both frontend and backend in dev mode
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:41920

### Build

```bash
# Build frontend + backend
npm run build
```

### Electron (Desktop)

```bash
# Development
npm run build --prefix backend
# Terminal 1: npm run dev --prefix frontend
# Terminal 2: cd electron && npm run dev

# Production build
npm run build
cd electron && npm run build && npm run package:win   # or package:mac, package:linux
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, TanStack Router/Query, shadcn/ui, Tailwind CSS |
| Backend | Node.js, Fastify, Drizzle ORM, SQLite |
| Desktop | Electron, electron-builder, electron-updater |
| AI Providers | Claude Code CLI, Gemini CLI |
| Real-time | WebSocket (Fastify WebSocket) |

---

## Contributing

We welcome contributions! Please follow these guidelines:

### Branch Strategy

- `main` — stable release branch, protected
- Feature branches: `feat/description`
- Bug fix branches: `fix/description`

### Pull Request Policy

1. **Fork & branch** — create a feature branch from `main`
2. **Keep PRs focused** — one feature or fix per PR
3. **Conventional commits** — use `feat:`, `fix:`, `chore:`, `docs:` prefixes
4. **Tests must pass** — PRs with failing tests will not be merged
5. **No secrets** — never commit API keys, `.env` files, or credentials
6. **Code review required** — all PRs require at least one approval before merge

### Commit Format

```
type(scope): description

feat(backend): add session forking support
fix(frontend): resolve kanban drag-drop on mobile
chore(ci): update release workflow
docs: update README with contributing guide
```

### What We Accept

- Bug fixes with clear reproduction steps
- Performance improvements with benchmarks
- Documentation improvements
- New AI provider adapters
- UI/UX enhancements

### What Requires Discussion First

- Architectural changes — open an issue first
- New dependencies — justify the addition
- Breaking API changes — requires a migration plan

---

## License

[BSL-1.1](LICENSE) - Business Source License 1.1

Copyright (c) 2026 NoteCode Team
