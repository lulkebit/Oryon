# Tool System

## Overview

The tool system enables agents to interact with the user's workspace —
reading files, executing commands, searching code, managing git, and
fetching web content. Tools are executed in the Rust backend with
strict permission and sandboxing controls.

## Tool Call Protocol

### Format

Models output tool calls using a structured JSON format within markers.
The token parser in the inference engine detects these patterns:

```
<tool_call>
{"name": "file_read", "args": {"path": "src/main.rs"}}
</tool_call>
```

### Lifecycle

```
1. Model generates <tool_call> opening tag
2. Token parser detects marker, switches to tool-call buffering mode
3. JSON content is accumulated until </tool_call>
4. Generation pauses
5. Tool call is validated (permissions, path scoping)
6. Frontend receives tool_call message (status: "pending")
7. Backend executes tool
8. Frontend updates tool_call status to "running"
9. Tool completes → result is appended to conversation context
10. Frontend updates to "completed" with result
11. Generation resumes with tool result in context
```

### Error Handling

- **Permission denied**: Tool is not in the agent's allowed tools list.
  Error returned to model context so it can inform the user.
- **Path violation**: Requested path is outside workspace scope.
  Error returned with explanation.
- **Execution failure**: Tool crashes or times out.
  Error with stderr/message returned to model context.
- **Timeout**: Tools have per-type timeouts. On timeout, the process
  is killed and an error is returned.

---

## Tool Definitions

### file_read

Read the contents of a file within the workspace.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `path`     | string   | yes      | Relative path from workspace root |
| `offset`   | number   | no       | Start line (1-based)              |
| `limit`    | number   | no       | Number of lines to read           |

**Returns**: File contents as string with line numbers.
**Timeout**: 5 seconds
**Scoping**: Must be within workspace root.

```json
{
  "name": "file_read",
  "args": {"path": "src/lib.rs", "offset": 10, "limit": 50}
}
```

### file_write

Write or overwrite a file.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `path`     | string   | yes      | Relative path from workspace root |
| `content`  | string   | yes      | Full file content                 |

**Returns**: Confirmation with bytes written.
**Timeout**: 10 seconds
**Scoping**: Must be within workspace root. Creates directories if needed.

### file_create

Create a new file (fails if file already exists).

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `path`     | string   | yes      | Relative path from workspace root |
| `content`  | string   | yes      | Initial file content              |

**Returns**: Confirmation.
**Timeout**: 10 seconds

### file_patch

Apply a search-and-replace edit to a file.

| Parameter    | Type     | Required | Description                     |
| ------------ | -------- | -------- | ------------------------------- |
| `path`       | string   | yes      | Relative path                   |
| `old_string` | string   | yes      | Exact text to find              |
| `new_string` | string   | yes      | Replacement text                |
| `all`        | boolean  | no       | Replace all occurrences (false) |

**Returns**: Number of replacements made, updated line numbers.
**Timeout**: 10 seconds
**Validation**: Fails if `old_string` is not found in the file.

### file_delete

Delete a file or empty directory.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `path`     | string   | yes      | Relative path                     |

**Returns**: Confirmation.
**Timeout**: 5 seconds

### glob

Find files matching a glob pattern.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `pattern`  | string   | yes      | Glob pattern (e.g. `**/*.rs`)     |

**Returns**: List of matching file paths, sorted by modification time.
**Timeout**: 10 seconds
**Limit**: Max 500 results.

### grep

Search file contents using regex.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `pattern`  | string   | yes      | Regex pattern                     |
| `glob`     | string   | no       | File filter (e.g. `*.ts`)         |
| `context`  | number   | no       | Lines of context (default 2)      |

**Returns**: Matching lines with file paths and line numbers.
**Timeout**: 15 seconds
**Implementation**: Uses ripgrep (`rg`) binary bundled with the app.
**Limit**: Max 200 matches.

### shell_exec

Execute a shell command in the workspace directory.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `command`  | string   | yes      | Shell command to execute          |
| `cwd`      | string   | no       | Working directory (relative)      |
| `timeout`  | number   | no       | Timeout in ms (default 30000)     |

**Returns**: stdout, stderr, exit code.
**Timeout**: Configurable, default 30 seconds, max 5 minutes.
**Sandboxing**:
- Commands are checked against the blocklist before execution
- Environment is restricted (clean PATH)
- Runs in a PTY for proper terminal emulation
- Long-running commands can be backgrounded

**Streaming**: stdout/stderr are streamed to the frontend in real-time
via Tauri events, enabling live terminal output display.

### git_status

Get the current git status of the workspace.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| (none)     |          |          |                                   |

**Returns**: Modified, staged, untracked files; current branch; ahead/behind.
**Timeout**: 10 seconds

### git_diff

Show diffs of changes.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `staged`   | boolean  | no       | Show staged changes (default all) |
| `path`     | string   | no       | Diff specific file                |

**Returns**: Unified diff output.
**Timeout**: 10 seconds

### git_commit

Stage and commit changes.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `message`  | string   | yes      | Commit message                    |
| `paths`    | string[] | no       | Specific files to stage (or all)  |

**Returns**: Commit hash, summary.
**Timeout**: 15 seconds
**Note**: Never force-pushes, never amends without explicit instruction.

### git_log

Show recent commit history.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `count`    | number   | no       | Number of commits (default 10)    |
| `path`     | string   | no       | Filter by file path               |

**Returns**: Commit hashes, messages, authors, dates.
**Timeout**: 10 seconds

### web_fetch

Fetch content from a URL and return as readable text.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `url`      | string   | yes      | URL to fetch                      |

**Returns**: Page content converted to markdown/text.
**Timeout**: 30 seconds
**Restrictions**: No localhost, no private IPs, no authentication.
**Note**: This tool requires explicit `browser` permission on the agent.

### web_search

Search the web for information.

| Parameter  | Type     | Required | Description                       |
| ---------- | -------- | -------- | --------------------------------- |
| `query`    | string   | yes      | Search query                      |

**Returns**: Top results with titles, snippets, URLs.
**Timeout**: 15 seconds
**Implementation**: Uses a search API (configurable, default DuckDuckGo).

---

## Permission System

Each agent has a `tools` array listing enabled tool IDs:

```json
["file_read", "file_write", "file_create", "file_patch", "file_delete",
 "glob", "grep", "shell_exec", "git_status", "git_diff", "git_commit",
 "git_log", "web_fetch", "web_search"]
```

### Permission Groups

For convenience, tools are grouped in the settings UI:

| Group       | Tool IDs                                            |
| ----------- | --------------------------------------------------- |
| File Ops    | `file_read`, `file_write`, `file_create`,           |
|             | `file_patch`, `file_delete`                         |
| Search      | `glob`, `grep`                                      |
| Terminal    | `shell_exec`                                        |
| Git         | `git_status`, `git_diff`, `git_commit`, `git_log`   |
| Browser     | `web_fetch`, `web_search`                           |

### Path Sandboxing

All file-system-touching tools enforce path scoping:

1. Resolve the requested path relative to workspace root
2. Canonicalize (resolve symlinks)
3. Verify the canonical path starts with the workspace root
4. Optionally check against additional allowed paths (from settings)
5. Reject with clear error if outside scope

### Shell Sandboxing

- Commands are split and checked against the blocklist
- Default blocklist: `rm -rf /`, `sudo`, `shutdown`, `reboot`,
  `mkfs`, `dd`, `:(){ :|:& };:`
- Blocklist is user-configurable in settings
- Environment variables are sanitized (clean PATH with common tools)
- Working directory is always within the workspace

---

## Tool Call Display (Frontend)

### Collapsed View

```
┌──────────────────────────────────────────────────────────┐
│ 📄 Read file: src/main.rs                    ✓  0.2s  ▸ │
└──────────────────────────────────────────────────────────┘
```

- Icon: tool-type-specific (file, terminal, search, git, globe)
- Label: action summary with key argument
- Status: spinner (running), checkmark (success), ✕ (error)
- Duration: shown after completion
- Chevron: click to expand

### Expanded View

```
┌──────────────────────────────────────────────────────────┐
│ 📄 Read file: src/main.rs                    ✓  0.2s  ▾ │
├──────────────────────────────────────────────────────────┤
│  1 │ use std::io;                                        │
│  2 │ use std::fs;                                        │
│  3 │                                                     │
│  4 │ fn main() {                                         │
│  5 │     println!("Hello, world!");                      │
│  6 │ }                                                   │
│    │                                                     │
│    │ 6 lines · 142 bytes                                 │
└──────────────────────────────────────────────────────────┘
```

- Monospace font for output
- Syntax highlighting for file contents
- Line numbers for file reads
- Colored diff output for git diffs
- Terminal-style rendering for shell output
- "Show more" button if output exceeds 50 lines
- Click on file path to open in adaptive panel (file preview/diff)

---

## System Prompt Template

The default system prompt template that wraps agent instructions with
tool definitions:

```
You are {agent_name}, an AI coding assistant working in the project
at {workspace_path}.

{custom_system_prompt}

You have access to the following tools:

{tool_definitions}

To use a tool, output a tool call in this format:
<tool_call>
{"name": "tool_name", "args": {"key": "value"}}
</tool_call>

Wait for the tool result before continuing. Tool results appear as:
<tool_result>
{result content}
</tool_result>

Guidelines:
- Read files before editing to understand context
- Use grep/glob to explore the codebase before making changes
- Test changes when possible by running relevant commands
- Keep changes minimal and focused
- Explain your reasoning to the user
```

This template is user-editable in Settings → Agents.
