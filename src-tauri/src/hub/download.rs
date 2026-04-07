use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use futures_util::StreamExt;
use serde::Serialize;
use tauri::Emitter;
use tokio::io::AsyncWriteExt;

use super::hf_api;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    pub download_id: String,
    pub downloaded: u64,
    pub total: u64,
    pub speed_bps: u64,
}

pub async fn download_model(
    repo_id: &str,
    filename: &str,
    target_dir: &Path,
    download_id: &str,
    cancel: Arc<AtomicBool>,
    app_handle: tauri::AppHandle,
) -> Result<PathBuf, String> {
    let url = hf_api::download_url(repo_id, filename);
    let target_path = target_dir.join(filename);
    let temp_path = target_dir.join(format!("{filename}.part"));

    std::fs::create_dir_all(target_dir)
        .map_err(|e| format!("Failed to create models dir: {e}"))?;

    let mut downloaded: u64 = 0;
    if temp_path.exists() {
        downloaded = std::fs::metadata(&temp_path)
            .map(|m| m.len())
            .unwrap_or(0);
    }

    let client = reqwest::Client::new();
    let mut req = client.get(&url);
    if downloaded > 0 {
        req = req.header("Range", format!("bytes={downloaded}-"));
    }

    let resp = req
        .send()
        .await
        .map_err(|e| format!("Download request failed: {e}"))?;

    if !resp.status().is_success() && resp.status().as_u16() != 206 {
        return Err(format!("Download failed with status {}", resp.status()));
    }

    let total = if resp.status().as_u16() == 206 {
        resp.headers()
            .get("content-range")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.rsplit('/').next())
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0)
    } else {
        downloaded = 0;
        resp.content_length().unwrap_or(0)
    };

    let _ = app_handle.emit(
        "download:started",
        serde_json::json!({
            "downloadId": download_id,
            "filename": filename,
            "total": total,
        }),
    );

    let mut file = if downloaded > 0 {
        tokio::fs::OpenOptions::new()
            .append(true)
            .open(&temp_path)
            .await
            .map_err(|e| format!("Failed to open temp file: {e}"))?
    } else {
        tokio::fs::File::create(&temp_path)
            .await
            .map_err(|e| format!("Failed to create temp file: {e}"))?
    };

    let mut stream = resp.bytes_stream();
    let mut last_emit = std::time::Instant::now();
    let mut speed_bytes = 0u64;
    let mut speed_start = std::time::Instant::now();

    while let Some(chunk) = stream.next().await {
        if cancel.load(Ordering::SeqCst) {
            let _ = app_handle.emit(
                "download:cancelled",
                serde_json::json!({ "downloadId": download_id }),
            );
            return Err("Download cancelled".to_string());
        }

        let chunk = chunk.map_err(|e| format!("Download stream error: {e}"))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("Write error: {e}"))?;

        downloaded += chunk.len() as u64;
        speed_bytes += chunk.len() as u64;

        if last_emit.elapsed().as_millis() >= 300 {
            let elapsed = speed_start.elapsed().as_secs_f64().max(0.01);
            let speed_bps = (speed_bytes as f64 / elapsed) as u64;

            let _ = app_handle.emit(
                "download:progress",
                DownloadProgress {
                    download_id: download_id.to_string(),
                    downloaded,
                    total,
                    speed_bps,
                },
            );

            last_emit = std::time::Instant::now();
            speed_bytes = 0;
            speed_start = std::time::Instant::now();
        }
    }

    file.flush()
        .await
        .map_err(|e| format!("Flush error: {e}"))?;
    drop(file);

    tokio::fs::rename(&temp_path, &target_path)
        .await
        .map_err(|e| format!("Failed to rename completed download: {e}"))?;

    let _ = app_handle.emit(
        "download:completed",
        serde_json::json!({
            "downloadId": download_id,
            "path": target_path.to_string_lossy(),
            "filename": filename,
        }),
    );

    Ok(target_path)
}
