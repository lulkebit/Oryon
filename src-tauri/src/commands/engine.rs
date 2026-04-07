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

    let chat = db.get_chat(&chat_id).map_err(|e| e.to_string())?;
    let workspace_path = chat.as_ref().and_then(|c| {
        db.get_workspace(&c.workspace_id)
            .ok()
            .flatten()
            .map(|w| w.path)
    });

    let agent = db
        .get_chat_agent(&chat_id)
        .ok()
        .flatten()
        .or_else(|| db.ensure_default_agent().ok());

    let (custom_system_prompt, allowed_tools, sampling) = match &agent {
        Some(a) => {
            let tools: Vec<String> =
                serde_json::from_str(&a.tools).unwrap_or_default();
            let sp = if a.system_prompt.is_empty() {
                None
            } else {
                Some(a.system_prompt.clone())
            };
            (
                sp,
                Some(tools),
                SamplingParams {
                    temperature: a.temperature as f32,
                    max_tokens: a.max_tokens,
                    ..SamplingParams::default()
                },
            )
        }
        None => (None, None, SamplingParams::default()),
    };

    let shell_blocklist: Vec<String> = db
        .get_setting("shell_blocklist")
        .ok()
        .flatten()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default();

    let excluded_patterns: Vec<String> = db
        .get_setting("excluded_patterns")
        .ok()
        .flatten()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default();

    drop(db);

    let messages: Vec<(String, String)> = raw_messages
        .iter()
        .filter(|m| m.role == "user" || m.role == "assistant" || m.role == "tool")
        .map(|m| (m.role.clone(), m.content.clone()))
        .collect();

    if messages.is_empty() {
        return Err("No messages to process".to_string());
    }

    engine.start_generate(
        chat_id,
        messages,
        sampling,
        app_handle,
        workspace_path,
        custom_system_prompt,
        allowed_tools,
        shell_blocklist,
        excluded_patterns,
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

#[tauri::command]
pub fn get_process_stats(
    monitor: State<'_, hardware::SystemMonitor>,
) -> hardware::ProcessStats {
    monitor.get_stats()
}
