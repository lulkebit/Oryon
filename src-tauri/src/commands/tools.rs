use crate::tools::{executor, ToolCall, ToolResult};

#[tauri::command]
pub fn execute_tool(
    tool_name: String,
    args: serde_json::Value,
    workspace_path: String,
) -> Result<ToolResult, String> {
    let call = ToolCall {
        name: tool_name,
        args,
    };
    Ok(executor::execute(&call, &workspace_path))
}

#[tauri::command]
pub fn list_available_tools() -> Vec<ToolInfo> {
    TOOL_DEFS.to_vec()
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub group: &'static str,
    pub description: &'static str,
}

const TOOL_DEFS: &[ToolInfo] = &[
    ToolInfo { id: "file_read", name: "Read File", group: "file", description: "Read file contents" },
    ToolInfo { id: "file_write", name: "Write File", group: "file", description: "Write or overwrite a file" },
    ToolInfo { id: "file_create", name: "Create File", group: "file", description: "Create a new file" },
    ToolInfo { id: "file_patch", name: "Patch File", group: "file", description: "Search and replace in a file" },
    ToolInfo { id: "file_delete", name: "Delete File", group: "file", description: "Delete a file or empty directory" },
    ToolInfo { id: "glob", name: "Find Files", group: "search", description: "Find files matching a glob pattern" },
    ToolInfo { id: "grep", name: "Search Content", group: "search", description: "Search file contents with regex" },
    ToolInfo { id: "shell_exec", name: "Run Command", group: "terminal", description: "Execute a shell command" },
    ToolInfo { id: "git_status", name: "Git Status", group: "git", description: "Show workspace git status" },
    ToolInfo { id: "git_diff", name: "Git Diff", group: "git", description: "Show file changes" },
    ToolInfo { id: "git_commit", name: "Git Commit", group: "git", description: "Stage and commit changes" },
    ToolInfo { id: "git_log", name: "Git Log", group: "git", description: "Show recent commit history" },
];
