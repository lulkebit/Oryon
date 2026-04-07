use crate::engine::hardware;
use crate::engine::{Engine, EngineStatus, ModelInfo, SamplingParams};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn load_model(
    engine: State<'_, Engine>,
    path: String,
    model_id: String,
    gpu_layers: Option<u32>,
) -> Result<ModelInfo, String> {
    engine
        .load_model(path, model_id, gpu_layers.unwrap_or(999))
        .await
}

#[tauri::command]
pub async fn unload_model(engine: State<'_, Engine>) -> Result<(), String> {
    engine.unload_model().await
}

#[tauri::command]
pub async fn start_inference(
    app_state: State<'_, AppState>,
    engine: State<'_, Engine>,
    app_handle: tauri::AppHandle,
    chat_id: String,
) -> Result<(), String> {
    let db = app_state.db.lock().map_err(|e| e.to_string())?;
    let raw_messages = db.list_messages(&chat_id).map_err(|e| e.to_string())?;
    drop(db);

    let messages: Vec<(String, String)> = raw_messages
        .iter()
        .filter(|m| m.role == "user" || m.role == "assistant")
        .map(|m| (m.role.clone(), m.content.clone()))
        .collect();

    if messages.is_empty() {
        return Err("No messages to process".to_string());
    }

    engine.start_generate(
        chat_id,
        messages,
        SamplingParams::default(),
        app_handle,
    )
}

#[tauri::command]
pub fn stop_inference(engine: State<'_, Engine>) {
    engine.stop();
}

#[tauri::command]
pub async fn get_engine_status(engine: State<'_, Engine>) -> Result<EngineStatus, String> {
    engine.status().await
}

#[tauri::command]
pub fn get_hardware_info() -> hardware::HardwareInfo {
    hardware::detect()
}
