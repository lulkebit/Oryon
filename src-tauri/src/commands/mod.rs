pub mod agent;
mod chat;
pub mod engine;
pub mod hub;
mod message;
pub mod tools;
mod workspace;

use crate::AppState;
use tauri::State;

pub use chat::*;
pub use message::*;
pub use workspace::*;

#[tauri::command]
pub fn get_app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "Oryon",
        "version": env!("CARGO_PKG_VERSION"),
    })
}

#[tauri::command]
pub fn get_theme(state: State<'_, AppState>) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let theme = db
        .get_setting("theme")
        .map_err(|e| e.to_string())?
        .unwrap_or_else(|| "\"system\"".to_string());
    Ok(theme)
}

#[tauri::command]
pub fn set_theme(state: State<'_, AppState>, theme: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let value = serde_json::to_string(&theme).map_err(|e| e.to_string())?;
    db.set_setting("theme", &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_setting(&key, &value).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn read_file_text(path: String) -> Result<serde_json::Value, String> {
    let metadata =
        std::fs::metadata(&path).map_err(|e| format!("Cannot access file: {e}"))?;
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Cannot read file: {e}"))?;
    let filename = std::path::Path::new(&path)
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_default();

    Ok(serde_json::json!({
        "filename": filename,
        "content": content,
        "size": metadata.len(),
    }))
}
