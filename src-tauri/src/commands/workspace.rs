use crate::db::types::Workspace;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn list_workspaces(state: State<'_, AppState>) -> Result<Vec<Workspace>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_workspaces().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_workspace(
    state: State<'_, AppState>,
    name: String,
    path: String,
) -> Result<Workspace, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_workspace(&name, &path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn rename_workspace(
    state: State<'_, AppState>,
    id: String,
    name: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.rename_workspace(&id, &name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_workspace(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_workspace(&id).map_err(|e| e.to_string())
}
