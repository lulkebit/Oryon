use super::sandbox;
use serde_json::Value;
use std::process::Command;

pub fn glob(args: &Value, workspace: &str) -> Result<String, String> {
    let pattern = args["pattern"]
        .as_str()
        .ok_or("Missing required argument: pattern")?;

    let base = std::path::Path::new(workspace)
        .canonicalize()
        .map_err(|e| format!("Invalid workspace: {e}"))?;

    let full_pattern = base.join(pattern).to_string_lossy().to_string();
    let mut matches: Vec<String> = Vec::new();

    for entry in ::glob::glob(&full_pattern).map_err(|e| format!("Invalid pattern: {e}"))? {
        match entry {
            Ok(path) => {
                if let Ok(rel) = path.strip_prefix(&base) {
                    matches.push(rel.to_string_lossy().to_string());
                }
            }
            Err(e) => log::warn!("Glob entry error: {e}"),
        }
        if matches.len() >= 500 {
            break;
        }
    }

    if matches.is_empty() {
        return Ok("No files matched the pattern.".to_string());
    }

    Ok(format!(
        "{}\n\n{} file(s) matched",
        matches.join("\n"),
        matches.len()
    ))
}

pub fn grep(args: &Value, workspace: &str) -> Result<String, String> {
    let pattern = args["pattern"]
        .as_str()
        .ok_or("Missing required argument: pattern")?;
    let file_glob = args["glob"].as_str();
    let context = args["context"].as_u64().unwrap_or(2);

    sandbox::resolve_and_check(workspace, ".")?;

    let mut cmd = Command::new("grep");
    cmd.arg("-rn")
        .arg("--color=never")
        .arg("-E")
        .arg(format!("-C{context}"))
        .arg(pattern);

    if let Some(fg) = file_glob {
        cmd.arg("--include").arg(fg);
    }

    cmd.arg(".");
    cmd.current_dir(workspace);

    let output = cmd.output().map_err(|e| format!("grep failed: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout);

    let lines: Vec<&str> = stdout.lines().take(200).collect();

    if lines.is_empty() {
        return Ok("No matches found.".to_string());
    }

    Ok(format!(
        "{}\n\n{} match(es)",
        lines.join("\n"),
        lines.iter().filter(|l| !l.starts_with("--")).count()
    ))
}
