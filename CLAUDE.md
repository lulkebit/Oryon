# Oryon – Agent Instructions

## Project Overview

Oryon is a local-first desktop application for interacting with open-source
AI models. Built with Tauri 2 (Rust backend) and React (TypeScript frontend),
it provides a workspace-based chat interface where users converse with
AI agents that can execute tool calls — reading/writing files, running
terminal commands, searching codebases, performing git operations, and
browsing the web. Models run entirely on-device via llama.cpp bindings,
with no external API required.

## Tech Stack

| Layer          | Technology                                |
| -------------- | ----------------------------------------- |
| Desktop Shell  | Tauri 2 (Rust)                            |
| Frontend       | React 19 + TypeScript                     |
| Styling        | Tailwind CSS 4                            |
| State          | Zustand                                   |
| Routing        | React Router                              |
| Build          | Vite                                      |
| Inference      | llama.cpp (via llama-cpp-rs bindings)     |
| Model Source   | Hugging Face Hub (GGUF format)            |
| Storage        | SQLite (via rusqlite) + filesystem        |
| IPC            | Tauri commands + event system             |

## Repository Structure

```
oryon/
├── AGENTS.md                   ← You are here
├── docs/                       ← Specifications & design docs
│   ├── ARCHITECTURE.md
│   ├── STYLE_GUIDE.md
│   ├── UI_SPEC.md
│   ├── FEATURES.md
│   ├── DATA_MODEL.md
│   ├── TOOL_SYSTEM.md
│   ├── MODEL_ENGINE.md
│   └── ROADMAP.md
├── src-tauri/                  ← Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/           ← Tauri IPC command handlers
│   │   ├── engine/             ← llama.cpp inference engine
│   │   ├── tools/              ← Tool implementations (file, shell, git…)
│   │   ├── models/             ← Model management (download, storage)
│   │   ├── db/                 ← SQLite database layer
│   │   └── workspace/          ← Workspace & chat persistence
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                        ← React frontend
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── sidebar/            ← Sidebar, workspace tree, chat list
│   │   ├── chat/               ← Chat view, messages, input
│   │   ├── model-hub/          ← Model browser, download manager
│   │   ├── settings/           ← Settings pages
│   │   ├── shared/             ← Shared UI primitives
│   │   └── titlebar/           ← Custom window titlebar
│   ├── hooks/                  ← Custom React hooks
│   ├── stores/                 ← Zustand stores
│   ├── lib/                    ← Utilities, IPC wrappers, types
│   └── styles/                 ← Global styles, Tailwind config
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── vite.config.ts
```

## Coding Conventions

### General

- Language: English for all code (variables, functions, comments)
- PascalCase for components and filenames (`ChatMessage.tsx`)
- camelCase for functions, variables, hooks (`useWorkspace`, `sendMessage`)
- UPPER_SNAKE_CASE for constants (`MAX_CONTEXT_LENGTH`)
- Prettier formatting: print width 80, single quotes, no semicolons
- Meaningful comments only — no narration of obvious logic

### React / TypeScript

- Functional components with hooks exclusively
- Prefer `const` arrow functions for components
- Memoize expensive renders with `React.memo`, `useMemo`, `useCallback`
- Lazy-load routes and heavy components with `React.lazy` + `Suspense`
- Use semantic HTML elements (`<nav>`, `<main>`, `<aside>`, `<section>`)
- All interactive elements must have ARIA labels and keyboard support
- Types live next to their usage; shared types in `src/lib/types/`
- No `any` — use `unknown` when type is truly unknown

### Rust

- Follow Rust 2021 edition idioms
- Use `thiserror` for custom error types
- Use `serde` for all serialization
- Async where possible (`tokio` runtime via Tauri)
- Tauri commands return `Result<T, String>` for frontend error handling
- Group related commands in module files under `commands/`

### Styling

- Tailwind CSS utility-first; avoid custom CSS unless necessary
- Design tokens defined in `tailwind.config.ts` (see STYLE_GUIDE.md)
- Dark and light themes via Tailwind `dark:` variant
- CSS variables for theme-dependent values
- No inline styles in components

### State Management

- Zustand stores organized by domain (`chatStore`, `workspaceStore`, etc.)
- Tauri IPC calls wrapped in typed async functions in `src/lib/ipc/`
- Optimistic UI updates where appropriate
- Streaming responses handled via Tauri event listeners

### Testing

- Frontend: Vitest + React Testing Library
- Backend: Rust built-in tests + integration tests
- E2E: Playwright (via Tauri WebDriver)

### Git

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
- Feature branches: `feat/feature-name`, `fix/bug-name`
- PR-based workflow; no direct pushes to `main`

## Key Design Decisions

1. **Local-first**: All inference runs on-device. No telemetry, no cloud.
2. **One workspace = one folder**: Simplifies scoping and permissions.
3. **Adaptive chat layout**: Chat starts clean, panels appear on tool calls.
4. **Multi-agent**: Multiple agents can operate in parallel within a chat.
5. **Model Hub in-app**: Browse, download, manage models without leaving.

## Documentation Index

| Document                                      | Purpose                           |
| --------------------------------------------- | --------------------------------- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)       | System architecture & IPC design  |
| [STYLE_GUIDE.md](docs/STYLE_GUIDE.md)         | Design system & visual language   |
| [UI_SPEC.md](docs/UI_SPEC.md)                 | Layout, screens, interactions     |
| [FEATURES.md](docs/FEATURES.md)               | Feature specifications            |
| [DATA_MODEL.md](docs/DATA_MODEL.md)           | Database schema & data structures |
| [TOOL_SYSTEM.md](docs/TOOL_SYSTEM.md)         | Agent tool call system            |
| [MODEL_ENGINE.md](docs/MODEL_ENGINE.md)       | Inference engine & model hub      |
| [ROADMAP.md](docs/ROADMAP.md)                 | Implementation phases             |
