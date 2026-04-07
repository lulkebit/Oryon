use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tauri::{Manager, State};
use tokio::sync::Mutex;

use crate::db::types::StoredModel;
use crate::hub::{download, hf_api};
use crate::AppState;

pub struct DownloadState {
    pub cancel: Arc<AtomicBool>,
    pub paused: Arc<AtomicBool>,
    pub active_id: Mutex<Option<String>>,
}

impl DownloadState {
    pub fn new() -> Self {
        Self {
            cancel: Arc::new(AtomicBool::new(false)),
            paused: Arc::new(AtomicBool::new(false)),
            active_id: Mutex::new(None),
        }
    }
}

#[tauri::command]
pub async fn search_models(query: String) -> Result<Vec<hf_api::HfModelResult>, String> {
    hf_api::search_models(&query).await
}

#[tauri::command]
pub async fn search_models_featured(
    query: String,
) -> Result<Vec<hf_api::HfModelResult>, String> {
    hf_api::search_models_with_sizes(&query).await
}

#[tauri::command]
pub async fn download_model(
    app_state: State<'_, AppState>,
    dl_state: State<'_, DownloadState>,
    app_handle: tauri::AppHandle,
    repo_id: String,
    filename: String,
) -> Result<(), String> {
    let download_id = uuid::Uuid::now_v7().to_string();
    dl_state.cancel.store(false, Ordering::SeqCst);
    dl_state.paused.store(false, Ordering::SeqCst);
    *dl_state.active_id.lock().await = Some(download_id.clone());

    let models_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("models");

    let cancel = dl_state.cancel.clone();
    let paused = dl_state.paused.clone();

    let result = download::download_model(
        &repo_id,
        &filename,
        &models_dir,
        &download_id,
        cancel,
        paused,
        app_handle.clone(),
    )
    .await;

    match result {
        Ok((target_path, sha256)) => {
            let file_size = std::fs::metadata(&target_path)
                .map(|m| m.len())
                .unwrap_or(0);

            let model_id = filename
                .strip_suffix(".gguf")
                .unwrap_or(&filename)
                .to_string();

            {
                let db = app_state.db.lock().map_err(|e| e.to_string())?;
                db.save_model(
                    &model_id,
                    &filename,
                    &repo_id,
                    file_size,
                    &target_path.to_string_lossy(),
                    Some(&sha256),
                )
                .map_err(|e| e.to_string())?;
            }

            *dl_state.active_id.lock().await = None;
            Ok(())
        }
        Err(e) if e.contains("paused") => Err(e),
        Err(e) => {
            *dl_state.active_id.lock().await = None;
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn pause_download(dl_state: State<'_, DownloadState>) -> Result<(), String> {
    dl_state.paused.store(true, Ordering::SeqCst);
    dl_state.cancel.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn cancel_download(dl_state: State<'_, DownloadState>) -> Result<(), String> {
    dl_state.paused.store(false, Ordering::SeqCst);
    dl_state.cancel.store(true, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub fn list_downloaded_models(
    app_state: State<'_, AppState>,
) -> Result<Vec<StoredModel>, String> {
    let db = app_state.db.lock().map_err(|e| e.to_string())?;
    db.list_models().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_model(
    app_state: State<'_, AppState>,
    model_id: String,
) -> Result<(), String> {
    let db = app_state.db.lock().map_err(|e| e.to_string())?;
    if let Some(model) = db.get_model(&model_id).map_err(|e| e.to_string())? {
        let _ = std::fs::remove_file(&model.storage_path);
    }
    db.delete_model(&model_id).map_err(|e| e.to_string())
}
