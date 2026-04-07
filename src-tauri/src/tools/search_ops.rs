use super::sandbox;
use super::ToolContext;
use serde_json::Value;
use std::process::Command;

pub fn glob(args: &Value, ctx: &ToolContext) -> Result<String, String> {
    let pattern = args["pattern"]
        .as_str()
        .ok_or("Missing required argument: pattern")?;

    let base = std::path::Path::new(&ctx.workspace)
        .canonicalize()
        .map_err(|e| format!("Invalid workspace: {e}"))?;

    let full_pattern = base.join(pattern).to_string_lossy().to_string();
    let mut matches: Vec<String> = Vec::new();

    for entry in ::glob::glob(&full_pattern).map_err(|e| format!("Invalid pattern: {e}"))? {
        match entry {
            Ok(path) => {
                if let Ok(rel) = path.strip_prefix(&base) {
                    let rel_str = rel.to_string_lossy().to_string();
                    if is_excluded(&rel_str, &ctx.excluded_patterns) {
                        continue;
                    }
                    matches.push(rel_str);
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

pub fn grep(args: &Value, ctx: &ToolContext) -> Result<String, String> {
    let pattern = args["pattern"]
        .as_str()
        .ok_or("Missing required argument: pattern")?;
    let file_glob = args["glob"].as_str();
    let context = args["context"].as_u64().unwrap_or(2);

    sandbox::resolve_and_check(&ctx.workspace, ".")?;

    let mut cmd = Command::new("grep");
    cmd.arg("-rn")
        .arg("--color=never")
        .arg("-E")
        .arg(format!("-C{context}"))
        .arg(pattern);

    if let Some(fg) = file_glob {
        cmd.arg("--include").arg(fg);
    }

    for excluded in &ctx.excluded_patterns {
        cmd.arg("--exclude-dir").arg(excluded);
    }

    cmd.arg(".");
    cmd.current_dir(&ctx.workspace);

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

fn is_excluded(path: &str, patterns: &[String]) -> bool {
    for pattern in patterns {
        for component in path.split('/') {
            if component == pattern {
                return true;
            }
        }
        if let Some(ext_pattern) = pattern.strip_prefix("*.") {
            if path.ends_with(&format!(".{ext_pattern}")) {
                return true;
            }
        }
    }
    false
}
