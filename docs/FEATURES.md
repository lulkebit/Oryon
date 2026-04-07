# Features

## F1: Workspaces

### Description

A workspace maps 1:1 to a project folder on the user's filesystem.
It defines the scope in which agents operate — all file access, git
operations, and search are scoped to the workspace root.

### Behavior

- **Adding a workspace**: User selects a folder via native OS dialog.
  The folder path is stored and appears as a folder item in the sidebar.
- **Opening a workspace**: Clicking a workspace in the sidebar expands
  it to show its chats. The workspace becomes "active", scoping all
  agent tool calls to that folder.
- **Removing a workspace**: Right-click → Remove. Only removes from
  Oryon, does not delete the folder. Chats within are preserved in
  the database (can be re-linked if the same folder is re-added).
- **Workspace metadata**: Name (defaults to folder name, editable),
  path, creation date, last accessed date.
- **No multi-folder workspaces**: Each workspace is exactly one folder.
  This simplifies permissions and reduces cognitive overhead.

### Constraints

- Maximum workspaces: unlimited (practical limit ~50 for sidebar UX)
- Workspace folder must exist on disk; if missing, show warning badge
- Workspace names must be unique within the app

---

## F2: Chats

### Description

A chat is a conversation between the user and one or more agents within
a workspace context. Each chat maintains its own message history and
agent configuration.

### Behavior

- **Creating a chat**: "New Agent" button in sidebar header creates a
  new chat in the active workspace. The chat opens with an agent
  selector dropdown allowing the user to pick a model before the
  first message.
- **Chat title**: Auto-generated from the first user message (first
  ~50 characters). Editable via double-click or right-click → Rename.
- **Switching chats**: Click a chat in the sidebar to load it in the
  main content area. Previous chat state is preserved.
- **Deleting a chat**: Right-click → Delete. Confirmation dialog.
  Removes all messages from the database.
- **Chat ordering**: Flat list per workspace, sorted by last activity
  (most recent at top).

### Message Types

| Type          | Sender  | Content                                      |
| ------------- | ------- | -------------------------------------------- |
| `user`        | User    | Plain text, optional file attachments        |
| `agent`       | Agent   | Markdown text, may contain tool call refs    |
| `tool_call`   | System  | Tool invocation: name, args, status, result  |
| `tool_result` | System  | Tool output: stdout, stderr, exit code       |
| `system`      | System  | Status changes, agent switches, errors       |

### Streaming

- Agent responses stream token-by-token to the frontend
- User sees text appear incrementally (typewriter effect)
- Tool calls are detected mid-stream: when a tool call block is
  identified, the UI inserts a collapsed tool call component
- User can stop generation at any time (Stop button or `⌘.`)

---

## F3: Agents

### Description

An agent is a configured AI persona that operates within a chat. It
combines a model, a system prompt, and a set of tool permissions.

### Default Agent

On first launch, Oryon creates a default agent:

- **Name**: "Oryon"
- **Model**: First downloaded model (or prompts to download one)
- **System prompt**: General-purpose coding assistant prompt
- **Tools**: All tools enabled
- **Color**: `--accent` (sage green)

### Agent Configuration

| Property         | Type       | Description                          |
| ---------------- | ---------- | ------------------------------------ |
| `name`           | string     | Display name (e.g., "Code Reviewer") |
| `model`          | reference  | Selected model (from downloaded)     |
| `systemPrompt`   | string     | System instructions for the model    |
| `tools`          | string[]   | Enabled tool IDs                     |
| `temperature`    | number     | Sampling temperature (0.0–2.0)       |
| `maxTokens`      | number     | Max response tokens                  |
| `color`          | string     | Avatar/indicator color               |

### Multi-Agent

- A chat can have multiple agents active simultaneously
- Each agent is independently invocable (via agent selector in input)
- Agents see each other's messages in the shared chat history
- Agents can be added/removed from a chat at any time
- Each agent shows its name and color in message headers
- Concurrent agent runs are supported (each in its own thread)

### Agent Selector

The chat input has a dropdown button showing the current agent:

```
┌─────────────────────────────────────────────┐
│  Message...                    Agent: Oryon▾│
└─────────────────────────────────────────────┘
                                 ┌────────────┐
                                 │ ● Oryon    │
                                 │ ● Reviewer │
                                 │ + Add agent│
                                 └────────────┘
```

---

## F4: Model Hub

### Description

An in-app browser for discovering, downloading, and managing
open-source models from Hugging Face.

### Discovery

- Search powered by Hugging Face API (GGUF-tagged models)
- Filter by: model type, parameter count, provider, hardware fit
- Hardware compatibility check: compares model RAM requirements
  against detected system RAM/VRAM
- Cards show: name, provider, size, quantization, compatibility badge

### Download Management

- Downloads run in the background with progress tracking
- Pause/resume support (HTTP range requests)
- Queue system: max 2 concurrent downloads
- Download speed and ETA display
- Storage location: configurable (defaults to `~/.oryon/models/`)
- Integrity check: SHA256 verification after download

### Model Metadata

After download, Oryon parses GGUF metadata to extract:

- Architecture, parameter count, quantization type
- Context window size, vocabulary size
- Training data information (if available)
- License information

### Model Management

- View all downloaded models with size and last-used date
- Delete models to free disk space
- Set default model for new chats
- Quick-assign model to specific agents

---

## F5: Settings

### Description

Full-page settings view with categorized preferences.

### Categories

**General** (F5.1)
- Theme: System / Dark / Light
- Language: English (expandable)
- Sidebar default width (slider, 200–400px)
- Reduced motion toggle
- Toast notification duration (slider, 3–10 seconds)
- Auto-update check toggle

**Models** (F5.2)
- Default model for new chats (dropdown of downloaded models)
- Inference defaults: temperature, top_p, top_k, max tokens
- GPU layer offloading (slider: 0–100%)
- Context window size (dropdown: 2048, 4096, 8192, 16384, 32768)
- Auto-unload idle models (toggle + timeout in minutes)
- Model storage path (folder picker)
- Total disk usage display

**Agents** (F5.3)
- Default tool permissions (checkbox per tool type)
- Shell command blocklist (editable list)
- Additional allowed paths beyond workspace (path list)
- Max concurrent agents (1–8)
- System prompt template (code editor with placeholder tokens)

**Keybindings** (F5.4)
- Searchable table of all shortcuts
- Click to rebind (records next key combination)
- Conflict detection with warning
- "Reset to defaults" button

**Workspace** (F5.5, context-dependent)
- Active workspace info (path, created, chats count)
- Excluded file patterns (glob pattern list)
- File indexing toggle and re-index button
- Workspace-specific model override (optional)

---

## F6: Notifications

### Toast Notifications

Displayed for events that happen outside the current view:

| Event                        | Type    | Message                           |
| ---------------------------- | ------- | --------------------------------- |
| Agent completed task         | success | "Agent completed task in [chat]"  |
| Agent encountered error      | error   | "Agent error in [chat]: [msg]"    |
| Model download complete      | success | "[Model] downloaded successfully" |
| Download failed              | error   | "[Model] download failed: [msg]"  |
| Model loaded                 | info    | "[Model] loaded and ready"        |
| Low disk space               | warning | "Low disk space: [X] GB remaining"|

### Sidebar Badges

- Running agent: pulsing green dot on the chat item
- Completed with unread: static green dot
- Error: static red dot
- Clears when user opens the chat

---

## F7: File Attachments

### Description

Users can attach files to their messages for additional context.

### Behavior

- Attach via button in chat input or drag-and-drop onto chat
- Supported: text files, images (for vision models), code files
- Files are read and included in the prompt context
- Attached files show as chips above the input before sending
- Removable before sending
- Size limit: 1MB per file, 5 files per message

---

## F8: Custom Titlebar

### Description

Platform-appropriate custom titlebar with integrated controls.

### Behavior

- macOS: Traffic lights in their native position (top-left)
- Windows/Linux: Minimize, maximize, close buttons (top-right)
- Double-click titlebar to maximize/restore
- Entire bar is draggable except buttons
- Shows app name and active workspace name
- Integrates with native window management (snap, spaces, etc.)

---

## F9: Onboarding (First Launch)

### Flow

1. **Welcome screen**: App name, one-liner description
2. **Download a model**: Curated list of recommended starter models
   (small, fast, good quality). User picks one to download.
3. **Create workspace**: Prompt to select a project folder
4. **Ready**: Opens the workspace with a new chat, ready to go

### Design

- Full-screen overlay, step indicator (1/3, 2/3, 3/3)
- Minimal, focused on one action per step
- Skippable (all steps except model download on first use)
