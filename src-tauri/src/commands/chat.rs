use crate::db::types::Chat;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn list_all_chats(state: State<'_, AppState>) -> Result<Vec<Chat>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_all_chats().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_chat(
    state: State<'_, AppState>,
    workspace_id: String,
    title: String,
) -> Result<Chat, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_chat(&workspace_id, &title)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_chat(
    state: State<'_, AppState>,
    id: String,
    title: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.rename_chat(&id, &title).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_chat(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_chat(&id).map_err(|e| e.to_string())
}
