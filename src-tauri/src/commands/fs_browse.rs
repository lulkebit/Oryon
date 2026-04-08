use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FsFileContent {
    pub name: String,
    pub path: String,
    pub content: String,
    pub size: u64,
    pub is_binary: bool,
    pub truncated: bool,
}

#[tauri::command]
pub fn fs_list_directory(
    path: String,
    show_hidden: bool,
) -> Result<Vec<FsEntry>, String> {
    let read_dir =
        fs::read_dir(&path).map_err(|e| format!("Cannot read directory: {e}"))?;

    let mut entries: Vec<FsEntry> = Vec::new();

    for entry in read_dir {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let name = entry.file_name().to_string_lossy().to_string();

        if !show_hidden && name.starts_with('.') {
            continue;
        }

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let is_dir = metadata.is_dir();
        let size = if is_dir { 0 } else { metadata.len() };
        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .ok()
                    .map(|d| d.as_millis() as i64)
            });

        entries.push(FsEntry {
            path: entry.path().to_string_lossy().to_string(),
            name,
            is_dir,
            size,
            modified,
        });
    }

    // Sort: directories first, then files, case-insensitive by name
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

#[tauri::command]
pub fn fs_read_file(path: String, max_bytes: Option<u64>) -> Result<FsFileContent, String> {
    let max = max_bytes.unwrap_or(2_000_000);

    let metadata = fs::metadata(&path).map_err(|e| format!("Cannot access file: {e}"))?;
    let size = metadata.len();

    let name = std::path::Path::new(&path)
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_default();

    // Read first 8 KB for binary detection
    let probe_size = size.min(8192) as usize;
    let mut probe_buf = vec![0u8; probe_size];
    {
        use std::io::Read;
        let mut f = fs::File::open(&path).map_err(|e| format!("Cannot open file: {e}"))?;
        f.read_exact(&mut probe_buf[..probe_size])
            .map_err(|e| format!("Cannot read file: {e}"))?;
    }

    let is_binary = probe_buf.contains(&0u8);
    if is_binary {
        return Ok(FsFileContent {
            name,
            path,
            content: String::new(),
            size,
            is_binary: true,
            truncated: false,
        });
    }

    // Read up to max_bytes
    let read_size = size.min(max) as usize;
    let truncated = size > max;

    let bytes = fs::read(&path).map_err(|e| format!("Cannot read file: {e}"))?;
    let slice = &bytes[..read_size.min(bytes.len())];
    let content = String::from_utf8_lossy(slice).to_string();

    Ok(FsFileContent {
        name,
        path,
        content,
        size,
        is_binary: false,
        truncated,
    })
}
