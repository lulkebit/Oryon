# Data Model

## Storage Strategy

Oryon uses a hybrid storage approach:

| Data Type         | Storage           | Reason                              |
| ----------------- | ----------------- | ----------------------------------- |
| Workspaces        | SQLite            | Relational, queryable               |
| Chats & Messages  | SQLite            | Relational, full-text search        |
| Agent configs     | SQLite            | Relational, linked to chats         |
| Settings          | SQLite             | Key-value, simple persistence       |
| Models (metadata) | SQLite            | Queryable, linked to agents         |
| Models (weights)  | Filesystem        | Large binary files, direct access   |
| Downloads (state) | SQLite            | Resume support, progress tracking   |

**Database location**: `~/.oryon/oryon.db` (SQLite, WAL mode)
**Model storage**: `~/.oryon/models/` (configurable in settings)

---

## SQLite Schema

### workspaces

```sql
CREATE TABLE workspaces (
    id          TEXT PRIMARY KEY,   -- UUID v7 (time-sortable)
    name        TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    created_at  TEXT NOT NULL,      -- ISO 8601
    updated_at  TEXT NOT NULL,
    last_opened TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_workspaces_path ON workspaces(path);
```

### chats

```sql
CREATE TABLE chats (
    id            TEXT PRIMARY KEY,
    workspace_id  TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title         TEXT NOT NULL DEFAULT 'New Chat',
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL,
    is_archived   INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

CREATE INDEX idx_chats_workspace ON chats(workspace_id, updated_at DESC);
```

### messages

```sql
CREATE TABLE messages (
    id          TEXT PRIMARY KEY,
    chat_id     TEXT NOT NULL,
    agent_id    TEXT,                 -- NULL for user/system messages
    role        TEXT NOT NULL,        -- 'user' | 'agent' | 'tool_call' | 'tool_result' | 'system'
    content     TEXT NOT NULL,
    metadata    TEXT,                 -- JSON: attachments, tool call details
    created_at  TEXT NOT NULL,
    sort_order  INTEGER NOT NULL,     -- monotonic within chat

    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_chat ON messages(chat_id, sort_order);
CREATE INDEX idx_messages_role ON messages(chat_id, role);
```

### agents

```sql
CREATE TABLE agents (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    model_id       TEXT,              -- references models.id
    system_prompt  TEXT NOT NULL DEFAULT '',
    tools          TEXT NOT NULL DEFAULT '[]',  -- JSON array of tool IDs
    temperature    REAL NOT NULL DEFAULT 0.7,
    max_tokens     INTEGER NOT NULL DEFAULT 4096,
    color          TEXT NOT NULL DEFAULT '#C2D8C4',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,

    FOREIGN KEY (model_id) REFERENCES models(id) ON DELETE SET NULL
);
```

### chat_agents (many-to-many)

```sql
CREATE TABLE chat_agents (
    chat_id    TEXT NOT NULL,
    agent_id   TEXT NOT NULL,
    added_at   TEXT NOT NULL,
    is_active  INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY (chat_id, agent_id),
    FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);
```

### models

```sql
CREATE TABLE models (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    filename        TEXT NOT NULL,          -- GGUF filename on disk
    hf_repo_id      TEXT,                   -- e.g. "TheBloke/CodeLlama-7B-GGUF"
    hf_filename     TEXT,                   -- filename on HF
    file_size       INTEGER NOT NULL,       -- bytes
    quantization    TEXT,                   -- e.g. "Q4_K_M"
    parameters      TEXT,                   -- e.g. "7B"
    architecture    TEXT,                   -- e.g. "llama"
    context_length  INTEGER,               -- max context window
    family          TEXT,                   -- e.g. "Llama 3.3"
    license         TEXT,
    sha256          TEXT,
    downloaded_at   TEXT NOT NULL,
    last_used_at    TEXT,
    storage_path    TEXT NOT NULL           -- full path to GGUF file
);

CREATE INDEX idx_models_family ON models(family);
CREATE INDEX idx_models_architecture ON models(architecture);
```

### downloads

```sql
CREATE TABLE downloads (
    id              TEXT PRIMARY KEY,
    model_name      TEXT NOT NULL,
    hf_repo_id      TEXT NOT NULL,
    hf_filename     TEXT NOT NULL,
    url             TEXT NOT NULL,
    file_size       INTEGER NOT NULL,       -- total bytes
    downloaded      INTEGER NOT NULL DEFAULT 0, -- bytes downloaded
    status          TEXT NOT NULL DEFAULT 'queued',
        -- 'queued' | 'downloading' | 'paused' | 'verifying' | 'completed' | 'failed'
    error_message   TEXT,
    sha256_expected TEXT,
    temp_path       TEXT NOT NULL,           -- partial download path
    target_path     TEXT NOT NULL,           -- final path after completion
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    queue_position  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_downloads_status ON downloads(status);
```

### settings

```sql
CREATE TABLE settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL       -- JSON-encoded value
);
```

### Predefined Settings Keys

```
theme                  → "system" | "dark" | "light"
language               → "en"
sidebar_width          → 260
reduced_motion         → false
toast_duration         → 5000
default_model_id       → "<model-uuid>" | null
temperature            → 0.7
top_p                  → 0.9
top_k                  → 40
max_tokens             → 4096
gpu_layers_percent     → 100
context_window         → 8192
auto_unload_minutes    → 30
model_storage_path     → "~/.oryon/models"
default_tools          → ["file_ops","terminal","search","git","browser"]
shell_blocklist        → ["rm -rf /","sudo","shutdown"]
max_concurrent_agents  → 4
```

---

## TypeScript Types (Frontend)

```typescript
interface Workspace {
  id: string
  name: string
  path: string
  createdAt: string
  updatedAt: string
  lastOpened: string | null
  sortOrder: number
}

interface Chat {
  id: string
  workspaceId: string
  title: string
  createdAt: string
  updatedAt: string
  isArchived: boolean
}

interface Message {
  id: string
  chatId: string
  agentId: string | null
  role: 'user' | 'agent' | 'tool_call' | 'tool_result' | 'system'
  content: string
  metadata: MessageMetadata | null
  createdAt: string
  sortOrder: number
}

interface MessageMetadata {
  attachments?: Attachment[]
  toolCall?: ToolCallInfo
  toolResult?: ToolResultInfo
}

interface Attachment {
  filename: string
  mimeType: string
  size: number
  content: string       // text content or base64 for images
}

interface ToolCallInfo {
  toolId: string         // e.g. "file_read", "shell_exec"
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'completed' | 'error'
  duration?: number      // ms
}

interface ToolResultInfo {
  toolCallId: string     // references the tool_call message ID
  output: string
  exitCode?: number
  truncated: boolean
}

interface Agent {
  id: string
  name: string
  modelId: string | null
  systemPrompt: string
  tools: string[]
  temperature: number
  maxTokens: number
  color: string
  createdAt: string
  updatedAt: string
}

interface Model {
  id: string
  name: string
  filename: string
  hfRepoId: string | null
  hfFilename: string | null
  fileSize: number
  quantization: string | null
  parameters: string | null
  architecture: string | null
  contextLength: number | null
  family: string | null
  license: string | null
  sha256: string | null
  downloadedAt: string
  lastUsedAt: string | null
  storagePath: string
}

interface Download {
  id: string
  modelName: string
  hfRepoId: string
  hfFilename: string
  url: string
  fileSize: number
  downloaded: number
  status: 'queued' | 'downloading' | 'paused'
         | 'verifying' | 'completed' | 'failed'
  errorMessage: string | null
  progress: number       // computed: downloaded / fileSize
  speed: number | null   // bytes/sec, computed at runtime
  eta: number | null     // seconds remaining, computed
}

type SettingsKey = keyof SettingsMap

interface SettingsMap {
  theme: 'system' | 'dark' | 'light'
  language: string
  sidebarWidth: number
  reducedMotion: boolean
  toastDuration: number
  defaultModelId: string | null
  temperature: number
  topP: number
  topK: number
  maxTokens: number
  gpuLayersPercent: number
  contextWindow: number
  autoUnloadMinutes: number
  modelStoragePath: string
  defaultTools: string[]
  shellBlocklist: string[]
  maxConcurrentAgents: number
}
```

---

## Rust Types (Backend)

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub updated_at: String,
    pub last_opened: Option<String>,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Chat {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    pub is_archived: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MessageRole {
    User,
    Agent,
    ToolCall,
    ToolResult,
    System,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub chat_id: String,
    pub agent_id: Option<String>,
    pub role: MessageRole,
    pub content: String,
    pub metadata: Option<serde_json::Value>,
    pub created_at: String,
    pub sort_order: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Agent {
    pub id: String,
    pub name: String,
    pub model_id: Option<String>,
    pub system_prompt: String,
    pub tools: Vec<String>,
    pub temperature: f32,
    pub max_tokens: i32,
    pub color: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub filename: String,
    pub hf_repo_id: Option<String>,
    pub hf_filename: Option<String>,
    pub file_size: i64,
    pub quantization: Option<String>,
    pub parameters: Option<String>,
    pub architecture: Option<String>,
    pub context_length: Option<i32>,
    pub family: Option<String>,
    pub license: Option<String>,
    pub sha256: Option<String>,
    pub downloaded_at: String,
    pub last_used_at: Option<String>,
    pub storage_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DownloadStatus {
    Queued,
    Downloading,
    Paused,
    Verifying,
    Completed,
    Failed,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Download {
    pub id: String,
    pub model_name: String,
    pub hf_repo_id: String,
    pub hf_filename: String,
    pub url: String,
    pub file_size: i64,
    pub downloaded: i64,
    pub status: DownloadStatus,
    pub error_message: Option<String>,
    pub sha256_expected: Option<String>,
    pub temp_path: String,
    pub target_path: String,
    pub created_at: String,
    pub updated_at: String,
    pub queue_position: i32,
}
```

---

## Database Migrations

Migrations are versioned SQL files under `src-tauri/src/db/migrations/`:

```
migrations/
├── 001_initial.sql        ← All tables above
├── 002_*.sql              ← Future schema changes
└── ...
```

Migration runner executes on app start, tracking applied versions in:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);
```

---

## IPC Data Flow

```
Frontend (React)                     Backend (Rust)
─────────────────                    ──────────────
                    invoke("cmd")
Store action ──────────────────────→ Command handler
                                         │
                                    Validate + DB query
                                         │
                    Result<T, String>     │
Store update ◀─────────────────────── Return
                                         │
                    event("stream")       │
Store update ◀─────────────────────── Emit (for streaming)
```

All IPC payloads are JSON-serialized via `serde`. The frontend receives
camelCase keys (configured via `#[serde(rename_all = "camelCase")]`).
