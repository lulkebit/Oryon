use crate::AppState;
use tauri::State;

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
pub fn set_theme(
    state: State<'_, AppState>,
    theme: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let value = serde_json::to_string(&theme).map_err(|e| e.to_string())?;
    db.set_setting("theme", &value).map_err(|e| e.to_string())
}
