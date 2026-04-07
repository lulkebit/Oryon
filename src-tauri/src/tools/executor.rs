use super::{registry, ToolCall, ToolResult};
use std::time::Instant;

pub fn execute(call: &ToolCall, workspace: &str) -> ToolResult {
    let tools = registry();
    let start = Instant::now();

    let (success, output) = match tools.get(call.name.as_str()) {
        Some(func) => match func(&call.args, workspace) {
            Ok(out) => (true, out),
            Err(e) => (false, e),
        },
        None => (false, format!("Unknown tool: {}", call.name)),
    };

    ToolResult {
        tool_name: call.name.clone(),
        success,
        output,
        duration_ms: start.elapsed().as_millis() as u64,
    }
}
