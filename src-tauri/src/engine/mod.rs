pub mod hardware;

use std::num::NonZeroU32;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc};
use std::thread;

use llama_cpp_4::context::params::LlamaContextParams;
use llama_cpp_4::llama_backend::LlamaBackend;
use llama_cpp_4::llama_batch::LlamaBatch;
use llama_cpp_4::model::params::LlamaModelParams;
use llama_cpp_4::model::{AddBos, LlamaModel, Special};
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
    },
    Status {
        resp: Resp<EngineStatus>,
    },
}

// ── Engine handle (thread-safe, cloneable) ───────────

pub struct Engine {
    tx: mpsc::Sender<Cmd>,
    pub cancel: Arc<AtomicBool>,
    pub generating: Arc<AtomicBool>,
}

impl Engine {
    pub fn spawn() -> Result<Self, String> {
        let (tx, rx) = mpsc::channel();
        let cancel = Arc::new(AtomicBool::new(false));
        let generating = Arc::new(AtomicBool::new(false));

        let c = cancel.clone();
        let g = generating.clone();

        thread::Builder::new()
            .name("inference-engine".into())
            .spawn(move || engine_loop(rx, c, g))
            .map_err(|e| format!("Failed to start engine thread: {e}"))?;

        Ok(Self {
            tx,
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
    ) -> Result<(), String> {
        self.cancel.store(false, Ordering::SeqCst);
        self.tx
            .send(Cmd::Generate {
                chat_id,
                messages,
                params,
                app_handle,
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
            } => {
                generating.store(true, Ordering::SeqCst);

                if let Some((ref model, _)) = loaded {
                    match run_inference(
                        &backend,
                        model,
                        &messages,
                        &params,
                        &cancel,
                        &chat_id,
                        &app_handle,
                    ) {
                        Ok(content) => {
                            let _ = app_handle.emit(
                                "chat:complete",
                                serde_json::json!({
                                    "chatId": chat_id,
                                    "content": content,
                                }),
                            );
                        }
                        Err(e) => {
                            let _ = app_handle.emit(
                                "chat:error",
                                serde_json::json!({
                                    "chatId": chat_id,
                                    "error": e,
                                }),
                            );
                        }
                    }
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
        }
    }
}

// ── Prompt builder ───────────────────────────────────

const SYSTEM_PROMPT: &str =
    "You are a helpful AI coding assistant. Answer concisely and accurately.";

fn build_prompt(messages: &[(String, String)]) -> String {
    let mut prompt = format!("<|im_start|>system\n{SYSTEM_PROMPT}<|im_end|>\n");
    for (role, content) in messages {
        prompt.push_str("<|im_start|>");
        prompt.push_str(role);
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
) -> Result<String, String> {
    let prompt = build_prompt(messages);

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
            if output.ends_with("<|im_end") || fragment.contains("<|im_end|>") {
                if let Some(pos) = output.rfind("<|im_end") {
                    output.truncate(pos);
                }
                break;
            }

            output.push_str(&fragment);

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

    Ok(output.trim().to_string())
}
