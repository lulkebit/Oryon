pub mod hardware;

use std::num::NonZeroU32;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc};
use std::thread;

use llama_cpp_4::context::params::LlamaContextParams;
use llama_cpp_4::llama_backend::LlamaBackend;
use llama_cpp_4::llama_batch::LlamaBatch;
use llama_cpp_4::model::params::LlamaModelParams;
use llama_cpp_4::model::{AddBos, LlamaChatMessage, LlamaModel, Special};
use llama_cpp_4::sampling::LlamaSampler;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

// ── Public types ─────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SamplingParams {
    pub temperature: f32,
    pub top_p: f32,
    pub top_k: i32,
    pub max_tokens: i32,
    pub repeat_penalty: f32,
}

impl Default for SamplingParams {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            top_p: 0.9,
            top_k: 40,
            max_tokens: 4096,
            repeat_penalty: 1.1,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub model_id: String,
    pub path: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineStatus {
    pub loaded_model: Option<ModelInfo>,
    pub generating: bool,
}

// ── Channel command types ────────────────────────────

type Resp<T> = tokio::sync::oneshot::Sender<T>;

enum Cmd {
    Load {
        path: String,
        model_id: String,
        gpu_layers: u32,
        resp: Resp<Result<ModelInfo, String>>,
    },
    Unload {
        resp: Resp<Result<(), String>>,
    },
    Generate {
        chat_id: String,
        messages: Vec<(String, String)>,
        params: SamplingParams,
        app_handle: tauri::AppHandle,
        workspace_path: Option<String>,
        custom_system_prompt: Option<String>,
        allowed_tools: Option<Vec<String>>,
    },
    Status {
        resp: Resp<EngineStatus>,
    },
    Shutdown,
}

// ── Engine handle (thread-safe, cloneable) ───────────

pub struct Engine {
    tx: mpsc::Sender<Cmd>,
    join_handle: std::sync::Mutex<Option<thread::JoinHandle<()>>>,
    pub cancel: Arc<AtomicBool>,
    pub generating: Arc<AtomicBool>,
}

impl Drop for Engine {
    fn drop(&mut self) {
        log::info!("Engine shutting down — unloading model and freeing resources");
        self.cancel.store(true, Ordering::SeqCst);
        let _ = self.tx.send(Cmd::Shutdown);
        if let Ok(mut handle) = self.join_handle.lock() {
            if let Some(h) = handle.take() {
                let _ = h.join();
            }
        }
    }
}

impl Engine {
    pub fn spawn() -> Result<Self, String> {
        let (tx, rx) = mpsc::channel();
        let cancel = Arc::new(AtomicBool::new(false));
        let generating = Arc::new(AtomicBool::new(false));

        let c = cancel.clone();
        let g = generating.clone();

        let handle = thread::Builder::new()
            .name("inference-engine".into())
            .spawn(move || engine_loop(rx, c, g))
            .map_err(|e| format!("Failed to start engine thread: {e}"))?;

        Ok(Self {
            tx,
            join_handle: std::sync::Mutex::new(Some(handle)),
            cancel,
            generating,
        })
    }

    pub async fn load_model(
        &self,
        path: String,
        model_id: String,
        gpu_layers: u32,
    ) -> Result<ModelInfo, String> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        self.tx
            .send(Cmd::Load {
                path,
                model_id,
                gpu_layers,
                resp: tx,
            })
            .map_err(|_| "Engine thread disconnected".to_string())?;
        rx.await.map_err(|_| "Engine dropped response".to_string())?
    }

    pub async fn unload_model(&self) -> Result<(), String> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        self.tx
            .send(Cmd::Unload { resp: tx })
            .map_err(|_| "Engine thread disconnected".to_string())?;
        rx.await.map_err(|_| "Engine dropped response".to_string())?
    }

    pub fn start_generate(
        &self,
        chat_id: String,
        messages: Vec<(String, String)>,
        params: SamplingParams,
        app_handle: tauri::AppHandle,
        workspace_path: Option<String>,
        custom_system_prompt: Option<String>,
        allowed_tools: Option<Vec<String>>,
    ) -> Result<(), String> {
        self.cancel.store(false, Ordering::SeqCst);
        self.tx
            .send(Cmd::Generate {
                chat_id,
                messages,
                params,
                app_handle,
                workspace_path,
                custom_system_prompt,
                allowed_tools,
            })
            .map_err(|_| "Engine thread disconnected".to_string())
    }

    pub fn stop(&self) {
        self.cancel.store(true, Ordering::SeqCst);
    }

    pub async fn status(&self) -> Result<EngineStatus, String> {
        let (tx, rx) = tokio::sync::oneshot::channel();
        self.tx
            .send(Cmd::Status { resp: tx })
            .map_err(|_| "Engine thread disconnected".to_string())?;
        rx.await.map_err(|_| "Engine dropped response".to_string())
    }
}

// ── Engine thread ────────────────────────────────────

fn engine_loop(rx: mpsc::Receiver<Cmd>, cancel: Arc<AtomicBool>, generating: Arc<AtomicBool>) {
    let mut backend = match LlamaBackend::init() {
        Ok(b) => b,
        Err(e) => {
            log::error!("llama backend init failed: {e}");
            return;
        }
    };
    backend.void_logs();

    let mut loaded: Option<(LlamaModel, ModelInfo)> = None;

    while let Ok(cmd) = rx.recv() {
        match cmd {
            Cmd::Load {
                path,
                model_id,
                gpu_layers,
                resp,
            } => {
                log::info!("Loading model from {path} (gpu_layers={gpu_layers})");
                let params = LlamaModelParams::default().with_n_gpu_layers(gpu_layers);
                let params = std::pin::pin!(params);

                match LlamaModel::load_from_file(&backend, &path, &params) {
                    Ok(model) => {
                        let size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                        let info = ModelInfo {
                            model_id,
                            path,
                            size,
                        };
                        log::info!("Model loaded ({} MB)", size / 1_048_576);
                        loaded = Some((model, info.clone()));
                        resp.send(Ok(info)).ok();
                    }
                    Err(e) => {
                        let msg = format!("Model load failed: {e}");
                        log::error!("{msg}");
                        resp.send(Err(msg)).ok();
                    }
                }
            }

            Cmd::Unload { resp } => {
                loaded = None;
                log::info!("Model unloaded");
                resp.send(Ok(())).ok();
            }

            Cmd::Generate {
                chat_id,
                messages,
                params,
                app_handle,
                workspace_path,
                custom_system_prompt,
                allowed_tools,
            } => {
                generating.store(true, Ordering::SeqCst);

                if let Some((ref model, _)) = loaded {
                    run_agentic_loop(
                        &backend,
                        model,
                        messages,
                        &params,
                        &cancel,
                        &chat_id,
                        &app_handle,
                        workspace_path.as_deref(),
                        custom_system_prompt.as_deref(),
                        allowed_tools.as_deref(),
                    );
                } else {
                    let _ = app_handle.emit(
                        "chat:error",
                        serde_json::json!({
                            "chatId": chat_id,
                            "error": "No model loaded",
                        }),
                    );
                }

                generating.store(false, Ordering::SeqCst);
            }

            Cmd::Status { resp } => {
                resp.send(EngineStatus {
                    loaded_model: loaded.as_ref().map(|(_, i)| i.clone()),
                    generating: generating.load(Ordering::SeqCst),
                })
                .ok();
            }

            Cmd::Shutdown => {
                log::info!("Engine thread: dropping model and exiting");
                loaded = None;
                break;
            }
        }
    }

    drop(loaded);
    log::info!("Engine thread: all resources freed");
}

const CONTROL_PATTERNS: &[&str] = &[
    "<|im_end|>",
    "<|im_start|>",
    "<|im_end",
    "<|im_start",
    "<|endoftext|>",
    "<|eot_id|>",
    "<|end|>",
    "</s>",
    "<|assistant|>",
];

const MAX_TOOL_ROUNDS: usize = 10;
const MAX_TOOL_RESULT_CHARS: usize = 3000;

fn truncate_tool_output(output: &str) -> String {
    if output.len() <= MAX_TOOL_RESULT_CHARS {
        return output.to_string();
    }
    let mut truncated = output[..MAX_TOOL_RESULT_CHARS].to_string();
    truncated.push_str("\n\n[output truncated]");
    truncated
}

fn truncate_tool_output_preview(output: &str, max: usize) -> String {
    let trimmed = output.trim();
    if trimmed.len() <= max {
        return trimmed.to_string();
    }
    let mut t = trimmed[..max].to_string();
    t.push_str("\n...");
    t
}

fn format_tool_args_summary(call: &crate::tools::ToolCall) -> String {
    if let Some(obj) = call.args.as_object() {
        let parts: Vec<String> = obj
            .iter()
            .take(3)
            .map(|(k, v)| {
                let val = match v {
                    serde_json::Value::String(s) => {
                        if s.len() > 40 {
                            format!("{}…", &s[..37])
                        } else {
                            s.clone()
                        }
                    }
                    other => other.to_string(),
                };
                format!("`{k}: {val}`")
            })
            .collect();
        parts.join(" ")
    } else {
        String::new()
    }
}

fn strip_tool_call_markup(s: &str) -> String {
    let mut result = s.to_string();
    if let Some(start) = result.find("<tool_call>") {
        result.truncate(start);
    } else if let Some(start) = result.find("{\"name\"") {
        result.truncate(start);
    }
    result.trim().to_string()
}

fn run_agentic_loop(
    backend: &LlamaBackend,
    model: &LlamaModel,
    initial_messages: Vec<(String, String)>,
    params: &SamplingParams,
    cancel: &AtomicBool,
    chat_id: &str,
    app_handle: &tauri::AppHandle,
    workspace: Option<&str>,
    custom_system_prompt: Option<&str>,
    allowed_tools: Option<&[String]>,
) {
    let mut messages = initial_messages;
    let mut total_output = String::new();

    for round in 0..MAX_TOOL_ROUNDS {
        log::info!(
            "Agentic loop round {round}, messages={}, total_output={}chars",
            messages.len(),
            total_output.len()
        );

        match run_inference(backend, model, &messages, params, cancel, chat_id, app_handle, workspace, custom_system_prompt, allowed_tools) {
            Ok(content) => {
                log::info!(
                    "Round {round} inference result: {} chars, has_tool_call={}",
                    content.len(),
                    content.contains("<tool_call>")
                );

                if let Some(tool_call) = extract_tool_call(&content) {
                    let text_before = strip_tool_call_markup(
                        &strip_control_tokens(&content),
                    );
                    if !text_before.is_empty() {
                        total_output.push_str(&text_before);
                        total_output.push('\n');
                    }

                    if let Some(ws) = workspace {
                        if let Some(ref list) = allowed_tools {
                            if !list.iter().any(|t| t == &tool_call.name) {
                                log::warn!("Tool '{}' not allowed for this agent", tool_call.name);
                                messages.push((
                                    "tool".to_string(),
                                    format!("<tool_result>\nError: Tool '{}' is not enabled for this agent.\n</tool_result>", tool_call.name),
                                ));
                                continue;
                            }
                        }

                        let _ = app_handle.emit(
                            "tool:call",
                            serde_json::json!({
                                "chatId": chat_id,
                                "round": round,
                                "tool": tool_call,
                            }),
                        );

                        let result = crate::tools::executor::execute(&tool_call, ws);
                        log::info!(
                            "Tool {} result: success={}, output={}chars",
                            tool_call.name,
                            result.success,
                            result.output.len()
                        );

                        let _ = app_handle.emit(
                            "tool:result",
                            serde_json::json!({
                                "chatId": chat_id,
                                "round": round,
                                "result": result,
                            }),
                        );

                        let tool_output = truncate_tool_output(&result.output);

                        let arg_summary = format_tool_args_summary(&tool_call);
                        let status = if result.success { "✓" } else { "✗" };
                        let duration = format!("{:.1}s", result.duration_ms as f64 / 1000.0);
                        let output_preview = truncate_tool_output_preview(&result.output, 800);

                        total_output.push_str(&format!(
                            "\n\n> {status} **{}** {arg_summary} · {duration}\n>\n> ```\n> {}\n> ```\n\n",
                            tool_call.name,
                            output_preview.replace('\n', "\n> "),
                        ));

                        messages.push((
                            "assistant".to_string(),
                            format!(
                                "{text_before}\n<tool_call>\n{}\n</tool_call>",
                                serde_json::to_string(&tool_call).unwrap_or_default()
                            ),
                        ));
                        messages.push((
                            "tool".to_string(),
                            format!("<tool_result>\n{tool_output}\n</tool_result>"),
                        ));

                        continue;
                    }
                }

                let clean = strip_tool_call_markup(
                    &strip_control_tokens(&content),
                );
                total_output.push_str(&clean);

                let _ = app_handle.emit(
                    "chat:complete",
                    serde_json::json!({
                        "chatId": chat_id,
                        "content": total_output.trim(),
                    }),
                );
                return;
            }
            Err(e) => {
                log::error!("Agentic loop round {round} error: {e}");

                if !total_output.trim().is_empty() {
                    total_output.push_str(&format!(
                        "\n\n*Error: {e}*"
                    ));
                    let _ = app_handle.emit(
                        "chat:complete",
                        serde_json::json!({
                            "chatId": chat_id,
                            "content": total_output.trim(),
                        }),
                    );
                } else {
                    let _ = app_handle.emit(
                        "chat:error",
                        serde_json::json!({
                            "chatId": chat_id,
                            "error": e,
                        }),
                    );
                }
                return;
            }
        }
    }

    total_output.push_str("\n\n[Reached maximum tool call rounds]");
    let _ = app_handle.emit(
        "chat:complete",
        serde_json::json!({
            "chatId": chat_id,
            "content": total_output.trim(),
        }),
    );
}

fn extract_tool_call(content: &str) -> Option<crate::tools::ToolCall> {
    if let Some(tc) = extract_tool_call_tagged(content) {
        return Some(tc);
    }
    extract_tool_call_bare_json(content)
}

fn extract_tool_call_tagged(content: &str) -> Option<crate::tools::ToolCall> {
    let tag = "<tool_call>";
    let start = content.find(tag)?;
    let json_start = start + tag.len();

    let json_str = if let Some(rel_end) = content[json_start..].find("</tool_call>") {
        content[json_start..json_start + rel_end].trim()
    } else {
        content[json_start..].trim()
    };

    match serde_json::from_str::<crate::tools::ToolCall>(json_str) {
        Ok(tc) => {
            log::info!("Extracted tagged tool call: {} args={}", tc.name, tc.args);
            Some(tc)
        }
        Err(e) => {
            log::warn!("Failed to parse tagged tool call: {e}\nRaw: {json_str}");
            None
        }
    }
}

fn extract_tool_call_bare_json(content: &str) -> Option<crate::tools::ToolCall> {
    let search = content;
    let mut start = 0;
    while let Some(pos) = search[start..].find("{\"name\"") {
        let abs = start + pos;
        let slice = &search[abs..];
        let mut depth = 0;
        let mut end = 0;
        for (i, ch) in slice.char_indices() {
            match ch {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        end = i + 1;
                        break;
                    }
                }
                _ => {}
            }
        }
        if end > 0 {
            let json_str = &slice[..end];
            if let Ok(tc) = serde_json::from_str::<crate::tools::ToolCall>(json_str) {
                log::info!("Extracted bare JSON tool call: {} args={}", tc.name, tc.args);
                return Some(tc);
            }
        }
        start = abs + 1;
    }
    None
}

fn strip_control_tokens(s: &str) -> String {
    let mut result = s.to_string();
    for pat in CONTROL_PATTERNS {
        result = result.replace(pat, "");
    }
    if let Some(pos) = result.find("<|") {
        if !result[pos..].contains("|>") {
            result.truncate(pos);
        }
    }
    result.trim().to_string()
}

fn contains_stop_sequence(output: &str) -> Option<usize> {
    for pat in &["<|im_end", "<|eot_id", "<|end|>", "<|endoftext"] {
        if let Some(pos) = output.find(pat) {
            return Some(pos);
        }
    }
    None
}

// ── Prompt builder ───────────────────────────────────

const SYSTEM_PROMPT_BASE: &str =
    "You are a helpful AI coding assistant. Answer concisely and accurately. Use the given tool calls as much as possible and wisely.";

fn build_tool_section(allowed_tools: Option<&[String]>) -> String {
    struct ToolDef {
        name: &'static str,
        json: &'static str,
    }

    const ALL_TOOLS: &[ToolDef] = &[
        ToolDef { name: "glob", json: r#"{"type":"function","function":{"name":"glob","description":"Find files matching a glob pattern in the workspace","parameters":{"type":"object","properties":{"pattern":{"type":"string","description":"Glob pattern like * or **/*.rs"}},"required":["pattern"]}}}"# },
        ToolDef { name: "grep", json: r#"{"type":"function","function":{"name":"grep","description":"Search file contents using regex","parameters":{"type":"object","properties":{"pattern":{"type":"string","description":"Regex search pattern"},"glob":{"type":"string","description":"File filter like *.ts"}},"required":["pattern"]}}}"# },
        ToolDef { name: "file_read", json: r#"{"type":"function","function":{"name":"file_read","description":"Read the contents of a file","parameters":{"type":"object","properties":{"path":{"type":"string","description":"Relative file path"}},"required":["path"]}}}"# },
        ToolDef { name: "file_write", json: r#"{"type":"function","function":{"name":"file_write","description":"Write or overwrite a file","parameters":{"type":"object","properties":{"path":{"type":"string","description":"Relative file path"},"content":{"type":"string","description":"File content"}},"required":["path","content"]}}}"# },
        ToolDef { name: "file_patch", json: r#"{"type":"function","function":{"name":"file_patch","description":"Search and replace text in a file","parameters":{"type":"object","properties":{"path":{"type":"string","description":"Relative file path"},"old_string":{"type":"string","description":"Text to find"},"new_string":{"type":"string","description":"Replacement text"}},"required":["path","old_string","new_string"]}}}"# },
        ToolDef { name: "file_create", json: r#"{"type":"function","function":{"name":"file_create","description":"Create a new file","parameters":{"type":"object","properties":{"path":{"type":"string","description":"Relative file path"},"content":{"type":"string","description":"File content"}},"required":["path","content"]}}}"# },
        ToolDef { name: "file_delete", json: r#"{"type":"function","function":{"name":"file_delete","description":"Delete a file","parameters":{"type":"object","properties":{"path":{"type":"string","description":"Relative file path"}},"required":["path"]}}}"# },
        ToolDef { name: "shell_exec", json: r#"{"type":"function","function":{"name":"shell_exec","description":"Execute a shell command","parameters":{"type":"object","properties":{"command":{"type":"string","description":"Shell command to run"}},"required":["command"]}}}"# },
        ToolDef { name: "git_status", json: r#"{"type":"function","function":{"name":"git_status","description":"Show git status of the workspace","parameters":{"type":"object","properties":{}}}}"# },
        ToolDef { name: "git_diff", json: r#"{"type":"function","function":{"name":"git_diff","description":"Show git diffs","parameters":{"type":"object","properties":{"staged":{"type":"boolean","description":"Show staged changes"}}}}}"# },
        ToolDef { name: "git_commit", json: r#"{"type":"function","function":{"name":"git_commit","description":"Stage and commit changes","parameters":{"type":"object","properties":{"message":{"type":"string","description":"Commit message"}},"required":["message"]}}}"# },
        ToolDef { name: "git_log", json: r#"{"type":"function","function":{"name":"git_log","description":"Show recent commit history","parameters":{"type":"object","properties":{"count":{"type":"number","description":"Number of commits"}}}}}"# },
    ];

    let filtered: Vec<&ToolDef> = match allowed_tools {
        Some(list) => ALL_TOOLS.iter().filter(|t| list.iter().any(|a| a == t.name)).collect(),
        None => ALL_TOOLS.iter().collect(),
    };

    if filtered.is_empty() {
        return String::new();
    }

    let mut section = String::from("\n\n# Tools\n\nYou may call one or more functions to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n<tools>\n");
    for t in &filtered {
        section.push_str(t.json);
        section.push('\n');
    }
    section.push_str("</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags:\n<tool_call>\n{\"name\": \"function_name\", \"arguments\": {\"arg1\": \"value1\"}}\n</tool_call>\n");
    section
}

fn build_system_prompt(
    workspace: Option<&str>,
    custom_system_prompt: Option<&str>,
    allowed_tools: Option<&[String]>,
) -> String {
    let base = custom_system_prompt.unwrap_or(SYSTEM_PROMPT_BASE);
    let mut prompt = base.to_string();
    if let Some(ws) = workspace {
        prompt.push_str(&format!("\n\nYou are working in the project at: {ws}"));
        prompt.push_str(&build_tool_section(allowed_tools));
    }
    prompt
}

fn build_prompt(
    model: &LlamaModel,
    messages: &[(String, String)],
    workspace: Option<&str>,
    custom_system_prompt: Option<&str>,
    allowed_tools: Option<&[String]>,
) -> String {
    if let Ok(prompt) = build_prompt_native(model, messages, workspace, custom_system_prompt, allowed_tools) {
        return prompt;
    }
    log::warn!("Native chat template failed, falling back to ChatML");
    build_prompt_chatml(messages, workspace, custom_system_prompt, allowed_tools)
}

fn build_prompt_native(
    model: &LlamaModel,
    messages: &[(String, String)],
    workspace: Option<&str>,
    custom_system_prompt: Option<&str>,
    allowed_tools: Option<&[String]>,
) -> Result<String, String> {
    let system = build_system_prompt(workspace, custom_system_prompt, allowed_tools);
    let mut chat: Vec<LlamaChatMessage> = Vec::with_capacity(messages.len() + 1);

    chat.push(
        LlamaChatMessage::new("system".into(), system)
            .map_err(|e| e.to_string())?,
    );

    for (role, content) in messages {
        let r = if role == "tool" { "user" } else { role };
        chat.push(
            LlamaChatMessage::new(r.to_string(), content.clone())
                .map_err(|e| e.to_string())?,
        );
    }

    let prompt = model
        .apply_chat_template(None, &chat, true)
        .map_err(|e| format!("apply_chat_template: {e}"))?;

    log::info!("Prompt ({} chars): {}…", prompt.len(), &prompt[..prompt.len().min(200)]);
    Ok(prompt)
}

fn build_prompt_chatml(
    messages: &[(String, String)],
    workspace: Option<&str>,
    custom_system_prompt: Option<&str>,
    allowed_tools: Option<&[String]>,
) -> String {
    let system = build_system_prompt(workspace, custom_system_prompt, allowed_tools);
    let mut prompt = format!("<|im_start|>system\n{system}<|im_end|>\n");
    for (role, content) in messages {
        let r = if role == "tool" { "user" } else { role.as_str() };
        prompt.push_str("<|im_start|>");
        prompt.push_str(r);
        prompt.push('\n');
        prompt.push_str(content);
        prompt.push_str("<|im_end|>\n");
    }
    prompt.push_str("<|im_start|>assistant\n");
    prompt
}

// ── Inference loop ───────────────────────────────────

const BATCH_SIZE: usize = 512;

fn run_inference(
    backend: &LlamaBackend,
    model: &LlamaModel,
    messages: &[(String, String)],
    params: &SamplingParams,
    cancel: &AtomicBool,
    chat_id: &str,
    app_handle: &tauri::AppHandle,
    workspace: Option<&str>,
    custom_system_prompt: Option<&str>,
    allowed_tools: Option<&[String]>,
) -> Result<String, String> {
    let prompt = build_prompt(model, messages, workspace, custom_system_prompt, allowed_tools);

    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .map_err(|e| format!("Tokenization failed: {e}"))?;

    let n_prompt = tokens.len() as i32;
    let n_ctx = 4096u32;

    if n_prompt as u32 >= n_ctx {
        return Err("Prompt exceeds context window".to_string());
    }

    let ctx_params =
        LlamaContextParams::default().with_n_ctx(NonZeroU32::new(n_ctx));

    let mut ctx = model
        .new_context(backend, ctx_params)
        .map_err(|e| format!("Context creation failed: {e}"))?;

    let sampler = if params.temperature < 0.01 {
        LlamaSampler::chain_simple([LlamaSampler::greedy()])
    } else {
        LlamaSampler::chain_simple([
            LlamaSampler::temp(params.temperature),
            LlamaSampler::top_k(params.top_k),
            LlamaSampler::top_p(params.top_p, 1),
            LlamaSampler::dist(0),
        ])
    };

    let mut batch = LlamaBatch::new(BATCH_SIZE, 1);

    for chunk_start in (0..tokens.len()).step_by(BATCH_SIZE) {
        batch.clear();
        let chunk_end = (chunk_start + BATCH_SIZE).min(tokens.len());
        let is_last_chunk = chunk_end == tokens.len();

        for (i, &tok) in tokens[chunk_start..chunk_end].iter().enumerate() {
            let pos = (chunk_start + i) as i32;
            let logits = is_last_chunk && (chunk_start + i == tokens.len() - 1);
            batch
                .add(tok, pos, &[0], logits)
                .map_err(|e| format!("Batch error: {e}"))?;
        }

        ctx.decode(&mut batch)
            .map_err(|e| format!("Prompt decode failed: {e}"))?;
    }

    let mut output = String::new();
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_cur = tokens.len() as i32;
    let n_max = n_prompt + params.max_tokens;
    let mut in_tool_call = false;

    while n_cur < n_max {
        if cancel.load(Ordering::SeqCst) {
            break;
        }

        let tok = sampler.sample(&ctx, batch.n_tokens() - 1);

        if model.is_eog_token(tok) {
            break;
        }

        let bytes = model
            .token_to_bytes(tok, Special::Tokenize)
            .map_err(|e| format!("Token decode failed: {e}"))?;

        let mut fragment = String::with_capacity(32);
        let _ = decoder.decode_to_string(&bytes, &mut fragment, false);

        if !fragment.is_empty() {
            let prev_len = output.len();
            output.push_str(&fragment);

            if !in_tool_call
                && (output.contains("<tool_call")
                    || output.contains("{\"name\""))
            {
                in_tool_call = true;
            }

            if let Some(pos) = contains_stop_sequence(&output) {
                output.truncate(pos);
                if !in_tool_call && pos > prev_len {
                    let clean = &fragment[..pos - prev_len];
                    if !clean.is_empty() {
                        let _ = app_handle.emit(
                            "chat:token",
                            serde_json::json!({
                                "chatId": chat_id,
                                "token": clean,
                            }),
                        );
                    }
                }
                break;
            }

            if !in_tool_call {
                let _ = app_handle.emit(
                    "chat:token",
                    serde_json::json!({
                        "chatId": chat_id,
                        "token": fragment,
                    }),
                );
            }
        }

        batch.clear();
        batch
            .add(tok, n_cur, &[0], true)
            .map_err(|e| format!("Batch error: {e}"))?;
        n_cur += 1;

        ctx.decode(&mut batch)
            .map_err(|e| format!("Decode failed: {e}"))?;
    }

    let result = strip_control_tokens(output.trim());
    Ok(result)
}
