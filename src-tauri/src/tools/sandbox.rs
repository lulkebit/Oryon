use std::path::{Path, PathBuf};

pub fn resolve_and_check(workspace: &str, relative: &str) -> Result<PathBuf, String> {
    let base = Path::new(workspace)
        .canonicalize()
        .map_err(|e| format!("Invalid workspace path: {e}"))?;

    let joined = base.join(relative);

    let resolved = if joined.exists() {
        joined
            .canonicalize()
            .map_err(|e| format!("Path resolution failed: {e}"))?
    } else {
        let parent = joined
            .parent()
            .ok_or_else(|| "Invalid path: no parent".to_string())?;

        if parent.exists() {
            let canonical_parent = parent
                .canonicalize()
                .map_err(|e| format!("Parent path resolution failed: {e}"))?;
            canonical_parent.join(joined.file_name().unwrap_or_default())
        } else {
            joined
        }
    };

    if !resolved.starts_with(&base) {
        return Err(format!(
            "Path '{}' escapes the workspace boundary",
            relative
        ));
    }

    Ok(resolved)
}

const BLOCKED_COMMANDS: &[&str] = &[
    "rm -rf /",
    "sudo",
    "shutdown",
    "reboot",
    "mkfs",
    "dd if=",
    ":(){ :|:& };:",
];

pub fn check_command(cmd: &str) -> Result<(), String> {
    let lower = cmd.to_lowercase();
    for blocked in BLOCKED_COMMANDS {
        if lower.contains(blocked) {
            return Err(format!("Blocked command: contains '{blocked}'"));
        }
    }
    Ok(())
}
