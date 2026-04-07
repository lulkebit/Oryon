use crate::db::types::Agent;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn list_agents(state: State<'_, AppState>) -> Result<Vec<Agent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_agents().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_agent(state: State<'_, AppState>, id: String) -> Result<Option<Agent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_agent(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_agent(
    state: State<'_, AppState>,
    name: String,
    system_prompt: String,
    tools: String,
    temperature: f64,
    max_tokens: i32,
    color: String,
) -> Result<Agent, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.create_agent(&name, &system_prompt, &tools, temperature, max_tokens, &color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_agent(
    state: State<'_, AppState>,
    id: String,
    name: String,
    system_prompt: String,
    tools: String,
    temperature: f64,
    max_tokens: i32,
    color: String,
    model_id: Option<String>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.update_agent(
        &id,
        &name,
        &system_prompt,
        &tools,
        temperature,
        max_tokens,
        &color,
        model_id.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_agent(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.delete_agent(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chat_agent(
    state: State<'_, AppState>,
    chat_id: String,
) -> Result<Option<Agent>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.get_chat_agent(&chat_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_chat_agent(
    state: State<'_, AppState>,
    chat_id: String,
    agent_id: String,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.set_chat_agent(&chat_id, &agent_id)
        .map_err(|e| e.to_string())
}
