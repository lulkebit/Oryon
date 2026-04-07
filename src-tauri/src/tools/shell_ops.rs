use super::sandbox;
use super::ToolContext;
use serde_json::Value;
use std::process::Command;
use std::time::Duration;

pub fn shell_exec(args: &Value, ctx: &ToolContext) -> Result<String, String> {
    let command = args["command"]
        .as_str()
        .ok_or("Missing required argument: command")?;
    let cwd_rel = args["cwd"].as_str();
    let timeout_ms = args["timeout"].as_u64().unwrap_or(30_000).min(300_000);

    sandbox::check_command(command, &ctx.shell_blocklist)?;

    let work_dir = match cwd_rel {
        Some(rel) => sandbox::resolve_and_check(&ctx.workspace, rel)?
            .to_string_lossy()
            .to_string(),
        None => ctx.workspace.clone(),
    };

    let child = Command::new("sh")
        .arg("-c")
        .arg(command)
        .current_dir(&work_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn command: {e}"))?;

    let output = child
        .wait_with_output()
        .map_err(|e| format!("Command failed: {e}"))?;

    let _ = Duration::from_millis(timeout_ms);

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let code = output.status.code().unwrap_or(-1);

    let mut result = String::new();

    if !stdout.is_empty() {
        result.push_str(&stdout);
    }
    if !stderr.is_empty() {
        if !result.is_empty() {
            result.push('\n');
        }
        result.push_str("[stderr]\n");
        result.push_str(&stderr);
    }

    result.push_str(&format!("\n[exit code: {code}]"));

    if code != 0 {
        return Err(result);
    }
    Ok(result)
}
