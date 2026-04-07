pub mod executor;
pub mod sandbox;

mod file_ops;
mod git_ops;
mod search_ops;
mod shell_ops;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub name: String,
    #[serde(alias = "arguments")]
    pub args: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToolResult {
    pub tool_name: String,
    pub success: bool,
    pub output: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Default)]
pub struct ToolContext {
    pub workspace: String,
    pub shell_blocklist: Vec<String>,
    pub excluded_patterns: Vec<String>,
}

pub type ToolFn = fn(args: &serde_json::Value, ctx: &ToolContext) -> Result<String, String>;

pub fn registry() -> HashMap<&'static str, ToolFn> {
    let mut m: HashMap<&'static str, ToolFn> = HashMap::new();
    m.insert("file_read", file_ops::file_read);
    m.insert("file_write", file_ops::file_write);
    m.insert("file_create", file_ops::file_create);
    m.insert("file_patch", file_ops::file_patch);
    m.insert("file_delete", file_ops::file_delete);
    m.insert("glob", search_ops::glob);
    m.insert("grep", search_ops::grep);
    m.insert("shell_exec", shell_ops::shell_exec);
    m.insert("git_status", git_ops::git_status);
    m.insert("git_diff", git_ops::git_diff);
    m.insert("git_commit", git_ops::git_commit);
    m.insert("git_log", git_ops::git_log);
    m
}
