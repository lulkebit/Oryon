# Architecture

## System Overview

Oryon follows a two-process architecture defined by Tauri 2:

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri Window                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React Frontend (WebView)             │  │
│  │                                                   │  │
│  │  ┌──────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ Sidebar  │  │  Chat View  │  │  Model Hub  │  │  │
│  │  │ Store    │  │  Store      │  │  Store      │  │  │
│  │  └────┬─────┘  └──────┬──────┘  └──────┬──────┘  │  │
│  │       │               │                │          │  │
│  │       └───────────────┼────────────────┘          │  │
│  │                       │                           │  │
│  │              ┌────────▼────────┐                  │  │
│  │              │   IPC Bridge    │                  │  │
│  │              │  (invoke/listen)│                  │  │
│  └──────────────┴────────┬────────┴──────────────────┘  │
│                          │ Tauri Commands + Events       │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │              Rust Backend (Core)                   │  │
│  │                                                   │  │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────────┐  │  │
│  │  │  Inference │ │   Tools    │ │    Models     │  │  │
│  │  │  Engine    │ │  Runtime   │ │   Manager     │  │  │
│  │  │ (llama.cpp)│ │            │ │  (HF Client)  │  │  │
│  │  └─────┬──────┘ └─────┬──────┘ └──────┬───────┘  │  │
│  │        │              │               │           │  │
│  │  ┌─────▼──────────────▼───────────────▼───────┐  │  │
│  │  │          Database (SQLite)                  │  │  │
│  │  │     Chats · Workspaces · Settings · Models  │  │  │
│  │  └────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Component Tree

```
<App>
├── <CustomTitlebar />
├── <AppLayout>
│   ├── <Sidebar>                          ← resizable + collapsible
│   │   ├── <SidebarHeader>
│   │   │   ├── <NewAgentButton />
│   │   │   └── <ModelHubButton />
│   │   ├── <WorkspaceList>
│   │   │   └── <WorkspaceItem>            ← folder-style, expandable
│   │   │       └── <ChatItem />           ← flat list per workspace
│   │   └── <SidebarFooter>
│   │       └── <SettingsButton />
│   └── <MainContent>                      ← right of sidebar
│       ├── <ChatView>                     ← default view
│       │   ├── <MessageList>
│       │   │   ├── <UserMessage />
│       │   │   ├── <AgentMessage />
│       │   │   │   └── <ToolCallBlock />  ← inline collapsed
│       │   │   └── <AgentStatusIndicator />
│       │   ├── <AdaptivePanels>           ← appear on tool calls
│       │   │   ├── <FilePreviewPanel />
│       │   │   ├── <DiffPanel />
│       │   │   └── <TerminalPanel />
│       │   └── <ChatInput />              ← fixed bottom bar
│       ├── <ModelHubView>                 ← replaces chat when active
│       │   ├── <ModelSearchBar />
│       │   ├── <ModelFilters />
│       │   ├── <ModelGrid />
│       │   └── <DownloadManager />
│       └── <SettingsView>                 ← full-page settings
│           ├── <SettingsNav />
│           └── <SettingsContent />
└── <ToastContainer />                     ← notifications
```

### State Architecture (Zustand)

```
stores/
├── workspaceStore.ts     ← active workspace, workspace list, folder path
├── chatStore.ts          ← messages, active chat, streaming state
├── agentStore.ts         ← agent configs, running agents, tool permissions
├── modelStore.ts         ← installed models, downloads, active model
├── settingsStore.ts      ← user preferences, theme, keybindings
├── uiStore.ts            ← sidebar state, active view, panels, toasts
└── modelHubStore.ts      ← HF search results, filters, pagination
```

Each store is independent and subscribes to Tauri events for backend
state synchronization. Stores use the `persist` middleware for offline
resilience where appropriate.

### IPC Layer

All Tauri communication is wrapped in typed functions:

```
src/lib/ipc/
├── chat.ts               ← sendMessage, streamResponse, stopGeneration
├── workspace.ts          ← openWorkspace, listWorkspaces, createChat
├── models.ts             ← listModels, downloadModel, deleteModel
├── tools.ts              ← executeToolCall, getToolResult
├── settings.ts           ← getSettings, updateSettings
└── engine.ts             ← loadModel, unloadModel, getEngineStatus
```

Commands use `invoke()` for request-response. Streaming inference and
long-running tool calls use `listen()` with Tauri's event system.

### Routing

```
/                         → redirect to last active workspace/chat
/workspace/:id            → workspace view, no chat selected
/workspace/:id/chat/:id   → active chat
/models                   → model hub
/settings                 → settings (sub-routes per category)
/settings/general
/settings/models
/settings/agents
/settings/keybindings
/settings/workspace
```

## Backend Architecture (Rust)

### Module Structure

```
src-tauri/src/
├── main.rs                ← Tauri app setup, plugin registration
├── commands/
│   ├── mod.rs
│   ├── chat.rs            ← create_chat, send_message, list_messages
│   ├── workspace.rs       ← open_workspace, list_workspaces
│   ├── models.rs          ← list_models, download_model, delete_model
│   ├── engine.rs          ← load_model, unload_model, engine_status
│   ├── tools.rs           ← execute_tool, get_tool_result
│   └── settings.rs        ← get_settings, update_settings
├── engine/
│   ├── mod.rs
│   ├── inference.rs       ← llama.cpp session management, generation
│   ├── tokenizer.rs       ← tokenization, context window management
│   └── config.rs          ← model loading parameters, sampling config
├── tools/
│   ├── mod.rs
│   ├── file_ops.rs        ← read, write, create, delete, glob, grep
│   ├── shell.rs           ← command execution, PTY management
│   ├── search.rs          ← ripgrep integration, semantic search
│   ├── git.rs             ← status, diff, commit, branch operations
│   ├── browser.rs         ← web fetching, doc retrieval
│   └── sandbox.rs         ← permission checks, path scoping
├── models/
│   ├── mod.rs
│   ├── registry.rs        ← Hugging Face API client, model search
│   ├── downloader.rs      ← download manager, progress tracking, resume
│   └── storage.rs         ← model file management, GGUF metadata parsing
├── db/
│   ├── mod.rs
│   ├── schema.rs          ← table definitions, migrations
│   ├── queries.rs         ← typed query functions
│   └── migrations/        ← versioned SQL migration files
└── workspace/
    ├── mod.rs
    └── watcher.rs         ← file system watcher for workspace changes
```

### Inference Pipeline

```
User Message
    │
    ▼
┌──────────────┐
│ Chat Store   │  Frontend adds message to store
└──────┬───────┘
       │ invoke("send_message")
       ▼
┌──────────────┐
│  Command     │  Validates, persists to SQLite
│  Handler     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Prompt      │  Builds prompt from chat history + system prompt
│  Builder     │  Manages context window (truncation, summarization)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Inference   │  Runs llama.cpp generation
│  Engine      │  Streams tokens via Tauri events
└──────┬───────┘
       │ event: "chat:token"
       ▼
┌──────────────┐
│  Token       │  Checks for tool call patterns in output
│  Parser      │  Detects <tool_call> blocks
└──────┬───────┘
       │
       ├──── plain text ──→ Stream to frontend
       │
       └──── tool call ───→ ┌──────────────┐
                            │  Tool        │  Executes in sandbox
                            │  Executor    │  Returns result
                            └──────┬───────┘
                                   │
                                   ▼
                            Append result to context
                            Continue generation
```

### Tool Call Flow

1. Model outputs a structured tool call (JSON within markers)
2. Token parser detects the tool call boundary
3. Execution pauses, tool call is sent to frontend for display
4. Backend executes tool in sandboxed context
5. Result is appended to the conversation context
6. Generation resumes with tool result in context
7. Frontend updates the collapsed tool call block with results

### Multi-Agent Architecture

Each agent runs as an independent inference session:

```
┌─────────────────────────────────┐
│           Chat Context          │
│                                 │
│  ┌─────────┐    ┌─────────┐    │
│  │ Agent A  │    │ Agent B  │   │
│  │ Session  │    │ Session  │   │
│  │ (Model X)│    │ (Model Y)│   │
│  └────┬─────┘    └────┬─────┘   │
│       │               │         │
│       └───────┬───────┘         │
│               │                 │
│        Shared Context           │
│    (workspace files, history)   │
└─────────────────────────────────┘
```

- Agents share the workspace context but have independent system prompts
- Each agent can use a different model
- Tool call permissions are per-agent configurable
- Agent outputs are interleaved in the chat timeline

### Security Model

- **Workspace scoping**: Tools can only access files within the active
  workspace folder (configurable allowlist for additional paths)
- **Tool permissions**: Each agent has an explicit permission set
  (e.g., agent A can read files but not execute shell commands)
- **Shell sandboxing**: Commands run in a restricted environment with
  configurable PATH and blocked commands
- **No network by default**: Agents cannot make network requests unless
  the browser tool is explicitly enabled
- **Model isolation**: Each inference session runs in its own thread
  with bounded memory allocation

### Performance Considerations

- **Lazy model loading**: Models are loaded into memory on first use and
  can be configured to unload after idle timeout
- **KV-cache reuse**: Context caching between turns to avoid
  re-processing the full history
- **Streaming everything**: Token streaming, tool output streaming,
  download progress — all via Tauri events
- **Frontend code splitting**: Routes and heavy components are lazy-loaded
- **SQLite WAL mode**: Enables concurrent reads during writes
- **Background downloads**: Model downloads run in a dedicated thread pool
  with pause/resume support
