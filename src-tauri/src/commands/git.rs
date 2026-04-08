use serde::{Deserialize, Serialize};
use tokio::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
    pub original_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatusResult {
    pub branch: String,
    pub upstream: Option<String>,
    pub ahead: u32,
    pub behind: u32,
    pub files: Vec<GitFileStatus>,
    pub is_repo: bool,
}

#[tauri::command]
pub async fn git_get_status(workspace_path: String) -> Result<GitStatusResult, String> {
    let output = Command::new("git")
        .args(["-C", &workspace_path, "status", "--porcelain=v2", "--branch", "-z"])
        .output()
        .await
        .map_err(|e| format!("Failed to run git: {e}"))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.contains("not a git repository") || !output.status.success() && output.stdout.is_empty() {
        return Ok(GitStatusResult {
            branch: String::new(),
            upstream: None,
            ahead: 0,
            behind: 0,
            files: vec![],
            is_repo: false,
        });
    }

    let raw = String::from_utf8_lossy(&output.stdout);
    parse_git_status_v2(&raw)
}

fn parse_git_status_v2(raw: &str) -> Result<GitStatusResult, String> {
    let mut branch = String::from("HEAD");
    let mut upstream: Option<String> = None;
    let mut ahead = 0u32;
    let mut behind = 0u32;
    let mut files: Vec<GitFileStatus> = Vec::new();

    // Split on NUL bytes for entries, newline for headers
    let entries: Vec<&str> = raw.split('\0').collect();

    for entry in &entries {
        let entry = entry.trim_end_matches('\n');
        if entry.starts_with("# branch.head ") {
            branch = entry["# branch.head ".len()..].to_string();
        } else if entry.starts_with("# branch.upstream ") {
            upstream = Some(entry["# branch.upstream ".len()..].to_string());
        } else if entry.starts_with("# branch.ab ") {
            let ab = &entry["# branch.ab ".len()..];
            let parts: Vec<&str> = ab.split_whitespace().collect();
            if parts.len() >= 2 {
                ahead = parts[0].trim_start_matches('+').parse().unwrap_or(0);
                behind = parts[1].trim_start_matches('-').parse().unwrap_or(0);
            }
        } else if entry.starts_with('1') {
            // Ordinary changed entry
            // format: 1 XY sub mH mI mW hH hI path
            let parts: Vec<&str> = entry.splitn(9, ' ').collect();
            if parts.len() >= 9 {
                let xy = parts[1];
                let path = parts[8].to_string();
                let staged_char = xy.chars().next().unwrap_or(' ');
                let unstaged_char = xy.chars().nth(1).unwrap_or(' ');

                if staged_char != '.' && staged_char != '?' {
                    files.push(GitFileStatus {
                        path: path.clone(),
                        status: staged_char.to_string(),
                        staged: true,
                        original_path: None,
                    });
                }
                if unstaged_char != '.' && unstaged_char != '?' {
                    files.push(GitFileStatus {
                        path: path.clone(),
                        status: unstaged_char.to_string(),
                        staged: false,
                        original_path: None,
                    });
                }
            }
        } else if entry.starts_with('2') {
            // Renamed/copied entry
            // format: 2 XY sub mH mI mW hH hI X score path\0origPath
            let parts: Vec<&str> = entry.splitn(10, ' ').collect();
            if parts.len() >= 10 {
                let xy = parts[1];
                let path_and_orig = parts[9];
                let path_parts: Vec<&str> = path_and_orig.splitn(2, '\0').collect();
                let path = path_parts[0].to_string();
                let orig = path_parts.get(1).map(|s| s.to_string());

                let staged_char = xy.chars().next().unwrap_or(' ');
                let unstaged_char = xy.chars().nth(1).unwrap_or(' ');

                if staged_char != '.' {
                    files.push(GitFileStatus {
                        path: path.clone(),
                        status: staged_char.to_string(),
                        staged: true,
                        original_path: orig.clone(),
                    });
                }
                if unstaged_char != '.' {
                    files.push(GitFileStatus {
                        path: path.clone(),
                        status: unstaged_char.to_string(),
                        staged: false,
                        original_path: orig,
                    });
                }
            }
        } else if entry.starts_with('?') {
            // Untracked
            let parts: Vec<&str> = entry.splitn(2, ' ').collect();
            if parts.len() >= 2 {
                files.push(GitFileStatus {
                    path: parts[1].to_string(),
                    status: "?".to_string(),
                    staged: false,
                    original_path: None,
                });
            }
        }
    }

    Ok(GitStatusResult {
        branch,
        upstream,
        ahead,
        behind,
        files,
        is_repo: true,
    })
}

#[tauri::command]
pub async fn git_get_file_diff(
    workspace_path: String,
    file_path: String,
    staged: bool,
    untracked: bool,
) -> Result<String, String> {
    let output = if untracked {
        Command::new("git")
            .args([
                "-C",
                &workspace_path,
                "diff",
                "--no-index",
                "/dev/null",
                &file_path,
            ])
            .output()
            .await
            .map_err(|e| format!("Failed to run git: {e}"))?
    } else if staged {
        Command::new("git")
            .args(["-C", &workspace_path, "diff", "--cached", "--", &file_path])
            .output()
            .await
            .map_err(|e| format!("Failed to run git: {e}"))?
    } else {
        Command::new("git")
            .args(["-C", &workspace_path, "diff", "--", &file_path])
            .output()
            .await
            .map_err(|e| format!("Failed to run git: {e}"))?
    };

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
