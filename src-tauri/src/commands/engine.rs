use crate::engine::hardware;
use crate::engine::{
    compute_context_budget, ContextBudget, ContextUsage, Engine, EngineStatus, ModelInfo,
    SamplingParams,
};
use crate::AppState;
use tauri::State;

/// Default RAM (MB) we keep reserved for the OS / other apps when no
/// explicit `ram_reserve_mb` setting has been chosen yet.
const DEFAULT_RAM_RESERVE_MB: u64 = 4096;

#[tauri::command]
pub async fn load_model(
    app_state: State<'_, AppState>,
    engine: State<'_, Engine>,
    path: String,
    model_id: String,
    gpu_layers: Option<u32>,
) -> Result<ModelInfo, String> {
    let info = engine
        .load_model(path, model_id.clone(), gpu_layers.unwrap_or(999))
        .await?;

    if let Ok(db) = app_state.db.lock() {
        let _ = db.touch_model_last_used(&model_id);
    }

    Ok(info)
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

    let n_ctx_cap = db
        .get_setting("context_window")
        .ok()
        .flatten()
        .and_then(|s| s.parse::<u32>().ok())
        .filter(|&n| n > 0);

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
        n_ctx_cap,
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

/// Returns the per-chat context-window budget for the currently-loaded
/// model. Returns `None` when no model is loaded so the UI can hide the
/// recommendation gracefully.
#[tauri::command]
pub fn get_context_budget(
    app_state: State<'_, AppState>,
    engine: State<'_, Engine>,
    monitor: State<'_, hardware::SystemMonitor>,
) -> Result<Option<ContextBudget>, String> {
    let profile = engine
        .profile
        .lock()
        .map_err(|e| e.to_string())?
        .clone();
    let Some(profile) = profile else {
        return Ok(None);
    };

    let reserve_mb = {
        let db = app_state.db.lock().map_err(|e| e.to_string())?;
        db.get_setting("ram_reserve_mb")
            .ok()
            .flatten()
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(DEFAULT_RAM_RESERVE_MB)
    };
    let system_reserve_bytes = reserve_mb.saturating_mul(1024 * 1024);

    let stats = monitor.get_stats();
    let total_ram = stats.system_memory_total;
    let available_ram = total_ram.saturating_sub(stats.system_memory_used);

    Ok(Some(compute_context_budget(
        &profile,
        total_ram,
        available_ram,
        system_reserve_bytes,
    )))
}

/// Estimate how many tokens the next prompt for `chat_id` would consume.
/// Mirrors the message/agent/setting loading from `start_inference` but
/// stops at tokenization instead of running generation.
#[tauri::command]
pub async fn estimate_context(
    app_state: State<'_, AppState>,
    engine: State<'_, Engine>,
    chat_id: String,
) -> Result<ContextUsage, String> {
    // Scope the MutexGuard so it is dropped before the await below —
    // a `MutexGuard` is `!Send` and would otherwise poison the future.
    let (messages, workspace_path, custom_system_prompt, allowed_tools, n_ctx_cap, max_gen_tokens) = {
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

        let (custom_system_prompt, allowed_tools, max_gen_tokens) = match &agent {
            Some(a) => {
                let tools: Vec<String> =
                    serde_json::from_str(&a.tools).unwrap_or_default();
                let sp = if a.system_prompt.is_empty() {
                    None
                } else {
                    Some(a.system_prompt.clone())
                };
                (sp, Some(tools), a.max_tokens.max(0) as u32)
            }
            None => (
                None,
                None,
                SamplingParams::default().max_tokens.max(0) as u32,
            ),
        };

        let n_ctx_cap = db
            .get_setting("context_window")
            .ok()
            .flatten()
            .and_then(|s| s.parse::<u32>().ok())
            .filter(|&n| n > 0);

        let messages: Vec<(String, String)> = raw_messages
            .iter()
            .filter(|m| m.role == "user" || m.role == "assistant" || m.role == "tool")
            .map(|m| (m.role.clone(), m.content.clone()))
            .collect();

        (
            messages,
            workspace_path,
            custom_system_prompt,
            allowed_tools,
            n_ctx_cap,
            max_gen_tokens,
        )
    };

    engine
        .estimate_context(
            messages,
            workspace_path,
            custom_system_prompt,
            allowed_tools,
            n_ctx_cap,
            max_gen_tokens,
        )
        .await
}
