use super::sandbox;
use serde_json::Value;
use std::fs;

pub fn file_read(args: &Value, workspace: &str) -> Result<String, String> {
    let path = args["path"]
        .as_str()
        .ok_or("Missing required argument: path")?;
    let resolved = sandbox::resolve_and_check(workspace, path)?;

    let content =
        fs::read_to_string(&resolved).map_err(|e| format!("Failed to read file: {e}"))?;

    let offset = args["offset"].as_u64().unwrap_or(1).max(1) as usize;
    let limit = args["limit"].as_u64().map(|v| v as usize);

    let lines: Vec<&str> = content.lines().collect();
    let start = (offset - 1).min(lines.len());
    let end = match limit {
        Some(l) => (start + l).min(lines.len()),
        None => lines.len(),
    };

    let mut result = String::new();
    for (i, line) in lines[start..end].iter().enumerate() {
        let line_num = start + i + 1;
        result.push_str(&format!("{line_num:>4} │ {line}\n"));
    }

    result.push_str(&format!(
        "\n{} lines · {} bytes",
        end - start,
        content.len()
    ));

    Ok(result)
}

pub fn file_write(args: &Value, workspace: &str) -> Result<String, String> {
    let path = args["path"]
        .as_str()
        .ok_or("Missing required argument: path")?;
    let content = args["content"]
        .as_str()
        .ok_or("Missing required argument: content")?;

    let resolved = sandbox::resolve_and_check(workspace, path)?;

    if let Some(parent) = resolved.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {e}"))?;
    }

    fs::write(&resolved, content).map_err(|e| format!("Failed to write file: {e}"))?;

    Ok(format!(
        "Wrote {} bytes to {}",
        content.len(),
        path
    ))
}

pub fn file_create(args: &Value, workspace: &str) -> Result<String, String> {
    let path = args["path"]
        .as_str()
        .ok_or("Missing required argument: path")?;
    let content = args["content"].as_str().unwrap_or("");

    let resolved = sandbox::resolve_and_check(workspace, path)?;

    if resolved.exists() {
        return Err(format!("File already exists: {path}"));
    }

    if let Some(parent) = resolved.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create directories: {e}"))?;
    }

    fs::write(&resolved, content).map_err(|e| format!("Failed to create file: {e}"))?;

    Ok(format!("Created {path}"))
}

pub fn file_patch(args: &Value, workspace: &str) -> Result<String, String> {
    let path = args["path"]
        .as_str()
        .ok_or("Missing required argument: path")?;
    let old_string = args["old_string"]
        .as_str()
        .ok_or("Missing required argument: old_string")?;
    let new_string = args["new_string"]
        .as_str()
        .ok_or("Missing required argument: new_string")?;
    let replace_all = args["all"].as_bool().unwrap_or(false);

    let resolved = sandbox::resolve_and_check(workspace, path)?;
    let content =
        fs::read_to_string(&resolved).map_err(|e| format!("Failed to read file: {e}"))?;

    if !content.contains(old_string) {
        return Err(format!(
            "old_string not found in {path}"
        ));
    }

    let (new_content, count) = if replace_all {
        let count = content.matches(old_string).count();
        (content.replace(old_string, new_string), count)
    } else {
        (content.replacen(old_string, new_string, 1), 1)
    };

    fs::write(&resolved, &new_content).map_err(|e| format!("Failed to write file: {e}"))?;

    Ok(format!("Replaced {count} occurrence(s) in {path}"))
}

pub fn file_delete(args: &Value, workspace: &str) -> Result<String, String> {
    let path = args["path"]
        .as_str()
        .ok_or("Missing required argument: path")?;

    let resolved = sandbox::resolve_and_check(workspace, path)?;

    if !resolved.exists() {
        return Err(format!("Path does not exist: {path}"));
    }

    if resolved.is_dir() {
        fs::remove_dir(&resolved).map_err(|e| format!("Failed to remove directory: {e}"))?;
    } else {
        fs::remove_file(&resolved).map_err(|e| format!("Failed to remove file: {e}"))?;
    }

    Ok(format!("Deleted {path}"))
}
