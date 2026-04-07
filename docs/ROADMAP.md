# Roadmap

## Implementation Phases

### Phase 1 — Foundation (Weeks 1–2)

**Goal**: Tauri app boots, basic layout renders, project structure solid.

| Task                                  | Priority | Depends On |
| ------------------------------------- | -------- | ---------- |
| Init Tauri 2 project with React + TS  | P0       | —          |
| Configure Vite + Tailwind 4           | P0       | —          |
| Set up design tokens in Tailwind conf | P0       | —          |
| Implement CSS variables (dark/light)  | P0       | Tailwind   |
| Bundle Inter + JetBrains Mono fonts   | P1       | —          |
| Custom titlebar component             | P0       | Tauri      |
| App shell: sidebar + main content     | P0       | Titlebar   |
| Sidebar: resizable + collapsible      | P0       | App shell  |
| Basic routing (React Router)          | P0       | App shell  |
| SQLite setup (rusqlite + migrations)  | P0       | Tauri      |
| Database schema (initial migration)   | P0       | SQLite     |
| Zustand store scaffolding             | P1       | React      |
| IPC wrapper layer (typed invoke/listen)| P1      | Tauri      |

**Deliverable**: App window opens with sidebar and main content area.
Theme switching works. Database is initialized.

---

### Phase 2 — Workspaces & Chats (Weeks 3–4)

**Goal**: Users can create workspaces, open chats, and see messages.
No AI yet — just the data layer and UI.

| Task                                  | Priority | Depends On |
| ------------------------------------- | -------- | ---------- |
| Workspace CRUD (backend commands)     | P0       | DB         |
| Workspace list in sidebar             | P0       | Sidebar    |
| Add workspace (native folder dialog)  | P0       | Workspace  |
| Chat CRUD (backend commands)          | P0       | DB         |
| Chat list under workspaces            | P0       | Sidebar    |
| New chat button + flow                | P0       | Chat CRUD  |
| Chat view: message list component     | P0       | Routing    |
| Chat view: message rendering (MD)     | P0       | Chat view  |
| Chat view: input bar component        | P0       | Chat view  |
| Chat view: empty state                | P1       | Chat view  |
| Sidebar context menus (rename/delete) | P1       | Sidebar    |
| Active chat highlighting + badge      | P1       | Sidebar    |
| Chat auto-title from first message    | P2       | Chat CRUD  |
| workspaceStore + chatStore             | P0       | Zustand    |
| Persist sidebar width preference      | P2       | Settings   |

**Deliverable**: Full workspace and chat management. Messages display
correctly (user can type and see their own messages, no AI responses yet).

---

### Phase 3 — Inference Engine (Weeks 5–7)

**Goal**: Load a GGUF model and generate streaming responses.

| Task                                  | Priority | Depends On |
| ------------------------------------- | -------- | ---------- |
| Integrate llama-cpp-rs crate          | P0       | Cargo      |
| Engine manager: model loading         | P0       | llama-cpp  |
| Engine manager: session creation      | P0       | Loading    |
| Token generation (blocking thread)    | P0       | Session    |
| Token streaming via Tauri events      | P0       | Generation |
| Token parser: detect tool call blocks | P0       | Streaming  |
| Stop generation command               | P0       | Generation |
| Frontend: streaming message display   | P0       | Events     |
| Frontend: typing indicator            | P1       | Streaming  |
| Frontend: stop button                 | P0       | Stop cmd   |
| Prompt builder (history + system)     | P0       | Engine     |
| Context window management (truncation)| P1       | Prompt     |
| KV cache reuse between turns          | P1       | Session    |
| Sampling parameter configuration      | P1       | Generation |
| Auto-unload idle models               | P2       | Manager    |
| Hardware detection (RAM/GPU/Metal)    | P1       | Tauri      |
| engineStore                           | P0       | Zustand    |

**Deliverable**: User can load a model (manually placed GGUF), chat
with it, see streaming responses. No tools yet, no model download.

---

### Phase 4 — Model Hub (Weeks 8–9)

**Goal**: Browse, download, and manage models from within the app.

| Task                                  | Priority | Depends On |
| ------------------------------------- | -------- | ---------- |
| HF API client (Rust, model search)    | P0       | —          |
| Model Hub view: grid layout           | P0       | Routing    |
| Model Hub view: search bar            | P0       | HF client  |
| Model Hub view: filter chips/dropdowns| P0       | Search     |
| Model card component                  | P0       | Grid       |
| Hardware compatibility badges         | P1       | HW detect  |
| Download manager (backend)            | P0       | HF client  |
| Download progress tracking + events   | P0       | Downloader |
| Pause/resume downloads                | P1       | Downloader |
| SHA256 verification                   | P1       | Downloader |
| GGUF metadata parser                  | P0       | Downloader |
| Downloaded models section             | P0       | Hub view   |
| Model deletion                        | P1       | Models DB  |
| Download manager UI (progress bars)   | P0       | Hub view   |
| modelStore + modelHubStore            | P0       | Zustand    |
| Sidebar Model Hub button              | P0       | Sidebar    |

**Deliverable**: Users can search HF for GGUF models, see compatibility,
download them with progress, and they're ready for inference.

---

### Phase 5 — Tool System (Weeks 10–12)

**Goal**: Agents can execute tools — read/write files, run commands,
search code, perform git operations.

| Task                                  | Priority | Depends On  |
| ------------------------------------- | -------- | ----------- |
| Tool executor framework               | P0       | Engine      |
| Path sandboxing module                | P0       | —           |
| file_read tool                         | P0       | Sandbox     |
| file_write tool                        | P0       | Sandbox     |
| file_create tool                       | P0       | Sandbox     |
| file_patch tool                        | P0       | Sandbox     |
| file_delete tool                       | P1       | Sandbox     |
| glob tool (file search)               | P0       | Sandbox     |
| grep tool (ripgrep integration)       | P0       | Sandbox     |
| shell_exec tool (PTY)                 | P0       | Sandbox     |
| Shell sandboxing + blocklist          | P0       | shell_exec  |
| Shell output streaming                | P1       | shell_exec  |
| git_status tool                       | P0       | Sandbox     |
| git_diff tool                         | P0       | Sandbox     |
| git_commit tool                       | P1       | Sandbox     |
| git_log tool                          | P1       | Sandbox     |
| web_fetch tool                        | P2       | —           |
| web_search tool                       | P2       | —           |
| Tool permission system                | P0       | Executor    |
| Tool call display: collapsed/expanded | P0       | Chat view   |
| Tool call: live status updates        | P0       | Events      |
| Adaptive panel: file preview          | P1       | Chat view   |
| Adaptive panel: diff view             | P1       | Chat view   |
| Adaptive panel: terminal output       | P1       | Chat view   |

**Deliverable**: Full tool system. Agent can read code, make edits,
run commands, and use git. Results display inline with expand/collapse.

---

### Phase 6 — Agents & Multi-Agent (Weeks 13–14)

**Goal**: Agent configuration and multi-agent support.

| Task                                  | Priority | Depends On |
| ------------------------------------- | -------- | ---------- |
| Agent CRUD (backend commands)         | P0       | DB         |
| Agent configuration UI                | P0       | Chat view  |
| Agent selector in chat input          | P0       | Agents     |
| System prompt template engine         | P0       | Agents     |
| Multi-agent: add/remove from chat     | P0       | Agents     |
| Multi-agent: concurrent sessions      | P0       | Engine     |
| Multi-agent: interleaved messages     | P0       | Chat view  |
| Agent color coding in messages        | P1       | Chat view  |
| Default agent on first launch         | P1       | Agents     |
| agentStore                            | P0       | Zustand    |

**Deliverable**: Users can configure multiple agents with different
models and tool sets, add them to chats, and have them work concurrently.

---

### Phase 7 — Settings & Polish (Weeks 15–16)

**Goal**: Settings system, notifications, onboarding, polish.

| Task                                  | Priority | Depends On |
| ------------------------------------- | -------- | ---------- |
| Settings view: full-page layout       | P0       | Routing    |
| Settings: General category            | P0       | Settings   |
| Settings: Models category             | P0       | Settings   |
| Settings: Agents category             | P0       | Settings   |
| Settings: Keybindings category        | P1       | Settings   |
| Settings: Workspace category          | P1       | Settings   |
| Settings backend (key-value store)    | P0       | DB         |
| settingsStore                         | P0       | Zustand    |
| Toast notification system             | P0       | —          |
| Sidebar badges (agent activity)       | P1       | Sidebar    |
| Onboarding flow (3 steps)             | P1       | Model Hub  |
| Keyboard shortcuts system             | P1       | Tauri      |
| File attachments (chat input)         | P2       | Chat input |
| Theme switching (system/dark/light)   | P0       | CSS vars   |
| Reduced motion support                | P1       | Animations |
| Error boundaries + fallback UI        | P1       | React      |
| Loading states + skeletons            | P1       | Components |
| Performance profiling + optimization  | P1       | All        |

**Deliverable**: Complete, polished app. All settings work, notifications
fire, onboarding guides new users, keyboard shortcuts work.

---

### Phase 8 — Testing & Distribution (Weeks 17–18)

**Goal**: Test coverage, CI, and distributable builds.

| Task                                  | Priority | Depends On |
| ------------------------------------- | -------- | ---------- |
| Unit tests: Rust backend              | P0       | All Rust   |
| Unit tests: React components          | P0       | All React  |
| Integration tests: IPC layer          | P1       | IPC        |
| Integration tests: tool system        | P0       | Tools      |
| E2E tests: Playwright                 | P1       | Full app   |
| CI pipeline (GitHub Actions)          | P0       | Tests      |
| macOS build + signing                 | P0       | CI         |
| Windows build + installer             | P0       | CI         |
| Linux build (AppImage + deb)          | P1       | CI         |
| Auto-update system (Tauri updater)    | P2       | Builds     |
| Crash reporting (local logs)          | P2       | —          |

**Deliverable**: Tested, stable, distributable application for all
three major desktop platforms.

---

## Future Considerations (Post-MVP)

These are explicitly out of scope for the initial build but documented
for future planning:

| Feature                          | Notes                               |
| -------------------------------- | ----------------------------------- |
| Ollama backend support           | Alternative to llama.cpp            |
| Plugin/extension system          | Custom tools via WASM or JS         |
| RAG / vector embeddings          | Semantic codebase search            |
| Conversation branching           | Fork conversation at any point      |
| Prompt templates marketplace     | Community-shared system prompts     |
| Voice input                      | Whisper-based local STT             |
| Image generation                 | Stable Diffusion integration        |
| Collaborative mode               | Share workspaces over LAN           |
| Mobile companion app             | View agent activity on phone        |
| MCP (Model Context Protocol)     | Standardized tool protocol support  |

---

## Definition of Done (per Phase)

A phase is complete when:

1. All P0 tasks are implemented and functional
2. P1 tasks are implemented or explicitly deferred with justification
3. No critical bugs or crashes
4. Code follows conventions defined in AGENTS.md
5. New components follow the design system (STYLE_GUIDE.md)
6. Accessibility requirements are met (keyboard nav, ARIA, contrast)
7. Both dark and light themes render correctly
