use serde_json::Value;
use std::process::Command;

fn run_git(workspace: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(workspace)
        .output()
        .map_err(|e| format!("git command failed: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !output.status.success() {
        return Err(if stderr.is_empty() { stdout } else { stderr });
    }

    Ok(if stdout.is_empty() {
        "(no output)".to_string()
    } else {
        stdout
    })
}

pub fn git_status(_args: &Value, workspace: &str) -> Result<String, String> {
    run_git(workspace, &["status", "--short", "--branch"])
}

pub fn git_diff(args: &Value, workspace: &str) -> Result<String, String> {
    let staged = args["staged"].as_bool().unwrap_or(false);
    let path = args["path"].as_str();

    let mut git_args = vec!["diff", "--stat", "-p"];
    if staged {
        git_args.push("--cached");
    }
    if let Some(p) = path {
        git_args.push("--");
        git_args.push(p);
    }

    run_git(workspace, &git_args)
}

pub fn git_commit(args: &Value, workspace: &str) -> Result<String, String> {
    let message = args["message"]
        .as_str()
        .ok_or("Missing required argument: message")?;
    let paths = args["paths"]
        .as_array()
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    if paths.is_empty() {
        run_git(workspace, &["add", "-A"])?;
    } else {
        let mut add_args = vec!["add".to_string()];
        add_args.extend(paths);
        let refs: Vec<&str> = add_args.iter().map(|s| s.as_str()).collect();
        run_git(workspace, &refs)?;
    }

    run_git(workspace, &["commit", "-m", message])
}

pub fn git_log(args: &Value, workspace: &str) -> Result<String, String> {
    let count = args["count"].as_u64().unwrap_or(10).min(50);
    let count_str = format!("-{count}");

    let mut git_args = vec![
        "log",
        &count_str,
        "--oneline",
        "--format=%h %s (%an, %ar)",
    ];

    if let Some(path) = args["path"].as_str() {
        git_args.push("--");
        git_args.push(path);
    }

    run_git(workspace, &git_args)
}
