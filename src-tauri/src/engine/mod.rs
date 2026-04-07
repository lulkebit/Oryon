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
    ) -> Result<(), String> {
        self.cancel.store(false, Ordering::SeqCst);
        self.tx
            .send(Cmd::Generate {
                chat_id,
                messages,
                params,
                app_handle,
                workspace_path,
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

fn run_agentic_loop(
    backend: &LlamaBackend,
    model: &LlamaModel,
    initial_messages: Vec<(String, String)>,
    params: &SamplingParams,
    cancel: &AtomicBool,
    chat_id: &str,
    app_handle: &tauri::AppHandle,
    workspace: Option<&str>,
) {
    let mut messages = initial_messages;
    let mut total_output = String::new();

    for round in 0..MAX_TOOL_ROUNDS {
        match run_inference(backend, model, &messages, params, cancel, chat_id, app_handle, workspace) {
            Ok(content) => {
                if let Some(tool_call) = extract_tool_call(&content) {
                    let text_before = content
                        .find("<tool_call>")
                        .map(|p| content[..p].to_string())
                        .unwrap_or_default();

                    let text_before = strip_control_tokens(&text_before);
                    if !text_before.is_empty() {
                        total_output.push_str(&text_before);
                        total_output.push('\n');
                    }

                    if let Some(ws) = workspace {
                        let _ = app_handle.emit(
                            "tool:call",
                            serde_json::json!({
                                "chatId": chat_id,
                                "round": round,
                                "tool": tool_call,
                            }),
                        );

                        let result = crate::tools::executor::execute(&tool_call, ws);

                        let _ = app_handle.emit(
                            "tool:result",
                            serde_json::json!({
                                "chatId": chat_id,
                                "round": round,
                                "result": result,
                            }),
                        );

                        messages.push((
                            "assistant".to_string(),
                            format!(
                                "{text_before}\n<tool_call>\n{}\n</tool_call>",
                                serde_json::to_string(&tool_call).unwrap_or_default()
                            ),
                        ));
                        messages.push((
                            "tool".to_string(),
                            format!("<tool_result>\n{}\n</tool_result>", result.output),
                        ));

                        continue;
                    }
                }

                let clean = strip_control_tokens(&content);
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
                let _ = app_handle.emit(
                    "chat:error",
                    serde_json::json!({
                        "chatId": chat_id,
                        "error": e,
                    }),
                );
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
    let start = content.find("<tool_call>")?;
    let end = content.find("</tool_call>")?;
    if end <= start {
        return None;
    }
    let json_str = &content[start + "<tool_call>".len()..end].trim();
    serde_json::from_str(json_str).ok()
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
    "You are a helpful AI coding assistant. Answer concisely and accurately.";

const TOOL_PROMPT_SECTION: &str = r#"

You have access to the following tools:

- file_read: Read a file. Args: {"path": "relative/path", "offset": 1, "limit": 50}
- file_write: Write/overwrite a file. Args: {"path": "relative/path", "content": "..."}
- file_create: Create a new file. Args: {"path": "relative/path", "content": "..."}
- file_patch: Search and replace in a file. Args: {"path": "relative/path", "old_string": "...", "new_string": "..."}
- file_delete: Delete a file. Args: {"path": "relative/path"}
- glob: Find files by pattern. Args: {"pattern": "**/*.rs"}
- grep: Search file contents. Args: {"pattern": "regex", "glob": "*.ts"}
- shell_exec: Run a shell command. Args: {"command": "ls -la"}
- git_status: Show git status. Args: {}
- git_diff: Show diffs. Args: {"staged": false}
- git_commit: Commit changes. Args: {"message": "..."}
- git_log: Show commit history. Args: {"count": 10}

To use a tool, output:
<tool_call>
{"name": "tool_name", "args": {"key": "value"}}
</tool_call>

Wait for the tool result before continuing. Tool results appear as:
<tool_result>
{result}
</tool_result>

Guidelines:
- Read files before editing to understand context
- Use grep/glob to explore the codebase before making changes
- Keep changes minimal and focused
- Explain your reasoning to the user
"#;

fn build_system_prompt(workspace: Option<&str>) -> String {
    let mut prompt = SYSTEM_PROMPT_BASE.to_string();
    if let Some(ws) = workspace {
        prompt.push_str(&format!("\n\nYou are working in the project at: {ws}"));
        prompt.push_str(TOOL_PROMPT_SECTION);
    }
    prompt
}

fn build_prompt(
    model: &LlamaModel,
    messages: &[(String, String)],
    workspace: Option<&str>,
) -> String {
    if let Ok(prompt) = build_prompt_native(model, messages, workspace) {
        return prompt;
    }
    log::warn!("Native chat template failed, falling back to ChatML");
    build_prompt_chatml(messages, workspace)
}

fn build_prompt_native(
    model: &LlamaModel,
    messages: &[(String, String)],
    workspace: Option<&str>,
) -> Result<String, String> {
    let system = build_system_prompt(workspace);
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

fn build_prompt_chatml(messages: &[(String, String)], workspace: Option<&str>) -> String {
    let system = build_system_prompt(workspace);
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
) -> Result<String, String> {
    let prompt = build_prompt(model, messages, workspace);

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
    let last_idx = tokens.len() - 1;
    for (i, &tok) in tokens.iter().enumerate() {
        batch
            .add(tok, i as i32, &[0], i == last_idx)
            .map_err(|e| format!("Batch error: {e}"))?;
    }

    ctx.decode(&mut batch)
        .map_err(|e| format!("Prompt decode failed: {e}"))?;

    let mut output = String::new();
    let mut decoder = encoding_rs::UTF_8.new_decoder();
    let mut n_cur = batch.n_tokens();
    let n_max = n_prompt + params.max_tokens;

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

            if let Some(pos) = contains_stop_sequence(&output) {
                output.truncate(pos);
                if pos > prev_len {
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

            let _ = app_handle.emit(
                "chat:token",
                serde_json::json!({
                    "chatId": chat_id,
                    "token": fragment,
                }),
            );
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
