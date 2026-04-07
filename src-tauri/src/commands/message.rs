use crate::db::types::Message;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn list_messages(state: State<'_, AppState>, chat_id: String) -> Result<Vec<Message>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_messages(&chat_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_message(
    state: State<'_, AppState>,
    chat_id: String,
    role: String,
    content: String,
    agent_id: Option<String>,
    metadata: Option<String>,
) -> Result<Message, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_message(
        &chat_id,
        &role,
        &content,
        agent_id.as_deref(),
        metadata.as_deref(),
    )
    .map_err(|e| e.to_string())
}
