# Model Engine

## Overview

Oryon runs AI models entirely on-device using llama.cpp via Rust
bindings. No external API calls, no cloud, no accounts. Models are
GGUF files downloaded from Hugging Face and stored locally.

## Inference Engine

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Engine Manager                        │
│                                                         │
│  Manages model lifecycle: load, inference, unload       │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │  Model Slot A   │  │  Model Slot B   │  ...          │
│  │  (Qwen 7B)      │  │  (DeepSeek 16B) │               │
│  │                  │  │                 │               │
│  │  ┌────────────┐ │  │  ┌────────────┐ │               │
│  │  │ KV Cache   │ │  │  │ KV Cache   │ │               │
│  │  └────────────┘ │  │  └────────────┘ │               │
│  │                  │  │                 │               │
│  │  Sessions:       │  │  Sessions:      │               │
│  │  - Chat 1        │  │  - Chat 3       │               │
│  │  - Chat 2        │  │                 │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                         │
│  Thread pool: tokio::spawn_blocking for inference       │
│  Max loaded models: limited by available RAM            │
└─────────────────────────────────────────────────────────┘
```

### Rust Binding

Using `llama-cpp-rs` (the `llama_cpp` crate) which provides safe Rust
bindings to llama.cpp:

```rust
// Pseudocode for engine interface
pub struct EngineManager {
    loaded_models: HashMap<String, LoadedModel>,
    config: EngineConfig,
}

pub struct LoadedModel {
    model: LlamaModel,
    sessions: HashMap<String, LlamaSession>,
    last_used: Instant,
    metadata: ModelMetadata,
}

pub struct EngineConfig {
    pub gpu_layers: u32,
    pub context_size: u32,
    pub batch_size: u32,
    pub threads: u32,
    pub max_loaded_models: usize,
}

impl EngineManager {
    pub async fn load_model(&mut self, model_id: &str) -> Result<()>;
    pub async fn unload_model(&mut self, model_id: &str) -> Result<()>;

    pub async fn create_session(
        &mut self,
        model_id: &str,
        chat_id: &str,
    ) -> Result<String>;

    pub async fn generate(
        &self,
        session_id: &str,
        prompt: &str,
        params: &SamplingParams,
        token_callback: impl Fn(String) + Send,
    ) -> Result<String>;

    pub async fn stop_generation(&self, session_id: &str) -> Result<()>;
    pub fn get_status(&self) -> EngineStatus;
    fn auto_unload_idle(&mut self);
}
```

### Model Loading

1. Parse GGUF file header for metadata
2. Determine GPU layers based on settings and available VRAM
3. Load model weights into memory (mmap for efficiency)
4. Allocate KV cache for the configured context window
5. Emit `model:loaded` event to frontend

**Memory estimation** (approximate):

| Quantization | Multiplier  | 7B Model   | 13B Model  |
| ------------ | ----------- | ---------- | ---------- |
| Q4_K_M       | ~0.6 GB/B   | ~4.2 GB    | ~7.8 GB    |
| Q5_K_M       | ~0.7 GB/B   | ~4.9 GB    | ~9.1 GB    |
| Q8_0         | ~1.0 GB/B   | ~7.0 GB    | ~13 GB     |
| F16          | ~2.0 GB/B   | ~14 GB     | ~26 GB     |

Plus KV cache: ~0.5–2 GB depending on context window size.

### Session Management

- Each chat gets an inference session
- Sessions hold the KV cache state for that conversation
- When switching chats, the session is preserved in memory
- Idle sessions are evicted LRU-style when memory pressure is high
- Re-opening an evicted session re-processes the chat history

### Token Streaming

```
Engine generates token
    │
    ▼
Token callback fires
    │
    ▼
Check for tool call markers
    │
    ├── No marker → Emit "chat:token" event to frontend
    │               Frontend appends to message in real-time
    │
    └── <tool_call> detected → Buffer until </tool_call>
                               Parse JSON, execute tool
                               Append result to context
                               Resume generation
```

Events emitted:

| Event              | Payload                                   |
| ------------------ | ----------------------------------------- |
| `chat:token`       | `{ chatId, agentId, token, messageId }`   |
| `chat:tool_call`   | `{ chatId, agentId, toolCall }`           |
| `chat:tool_result` | `{ chatId, toolCallId, result }`          |
| `chat:complete`    | `{ chatId, agentId, messageId }`          |
| `chat:error`       | `{ chatId, agentId, error }`              |
| `model:loaded`     | `{ modelId, memoryUsed }`                 |
| `model:unloaded`   | `{ modelId }`                             |
| `engine:status`    | `{ loadedModels, memoryUsed, gpuUsed }`   |

### Sampling Parameters

| Parameter       | Type   | Default | Range       | Description              |
| --------------- | ------ | ------- | ----------- | ------------------------ |
| `temperature`   | f32    | 0.7     | 0.0–2.0     | Randomness               |
| `top_p`         | f32    | 0.9     | 0.0–1.0     | Nucleus sampling         |
| `top_k`         | i32    | 40      | 0–100       | Top-K sampling           |
| `max_tokens`    | i32    | 4096    | 1–32768     | Max output tokens        |
| `repeat_penalty`| f32    | 1.1     | 1.0–2.0     | Repetition penalty       |
| `stop`          | Vec    | []      | -           | Stop sequences           |

### Auto-Unload

- Configurable idle timeout (default: 30 minutes)
- When a model is idle (no active sessions generating), a timer starts
- On timeout, the model is unloaded from memory
- Next request for that model triggers a re-load
- Disabled by setting timeout to 0

---

## Hugging Face Integration

### API Client

Oryon communicates with the Hugging Face Hub API to browse and download
models. No authentication required for public models.

**Base URL**: `https://huggingface.co/api`

### Model Discovery

```
GET /api/models?search={query}&filter=gguf&sort=downloads&direction=-1

Response: [
  {
    "id": "Qwen/Qwen2.5-Coder-7B-Instruct-GGUF",
    "author": "Qwen",
    "downloads": 150000,
    "tags": ["gguf", "code", "7b", ...],
    "siblings": [
      {"rfilename": "qwen2.5-coder-7b-instruct-q4_k_m.gguf", "size": 4500000000},
      {"rfilename": "qwen2.5-coder-7b-instruct-q5_k_m.gguf", "size": 5200000000},
      ...
    ]
  }
]
```

### Search Pipeline

1. User types in search bar (debounced 300ms)
2. Frontend calls `invoke("search_models", { query, filters })`
3. Backend makes HF API request with query and tag filters
4. Results are parsed: extract model name, family, sizes, quant variants
5. Hardware compatibility is checked against detected system specs
6. Results returned to frontend with compatibility annotations

### Filter Mapping

| UI Filter       | HF API Parameter                              |
| --------------- | --------------------------------------------- |
| Type: Code      | `&filter=gguf&search=coder+instruct`          |
| Type: Chat      | `&filter=gguf&search=instruct+chat`           |
| Type: Reasoning | `&filter=gguf&search=reasoning`               |
| Size: 1–3B      | Post-filter on parameter count from tags      |
| Size: 7B        | Post-filter on parameter count                |
| Size: 13B+      | Post-filter on parameter count                |
| Provider        | `&author={provider}`                          |
| Compatible      | Post-filter against detected RAM/VRAM         |

### Hardware Detection

On app start, Oryon detects:

```rust
pub struct HardwareInfo {
    pub total_ram: u64,          // bytes
    pub available_ram: u64,
    pub gpu_name: Option<String>,
    pub gpu_vram: Option<u64>,   // bytes
    pub cpu_cores: u32,
    pub cpu_name: String,
    pub os: String,
    pub arch: String,            // x86_64, aarch64
    pub metal_support: bool,     // macOS Metal
    pub cuda_support: bool,      // NVIDIA CUDA
    pub vulkan_support: bool,    // Cross-platform GPU
}
```

**Compatibility levels**:

| Level    | Condition                                     | Badge   |
| -------- | --------------------------------------------- | ------- |
| Good     | Model fits in RAM with headroom               | Green   |
| Tight    | Model fits but leaves < 2GB free              | Yellow  |
| Too Large| Model exceeds available RAM                   | Red     |

---

## Download Manager

### Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Download Manager                         │
│                                                          │
│  Queue: [Download 1, Download 2, Download 3, ...]        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                      │
│  │  Worker 1     │  │  Worker 2     │  (max 2 concurrent) │
│  │  Downloading  │  │  Downloading  │                      │
│  │  chunk by     │  │  chunk by     │                      │
│  │  chunk        │  │  chunk        │                      │
│  └──────┬───────┘  └──────┬───────┘                      │
│         │                 │                               │
│         └────────┬────────┘                               │
│                  │                                        │
│         Progress events to frontend                       │
│         Persist state to SQLite for resume                │
└──────────────────────────────────────────────────────────┘
```

### Download Flow

1. User clicks "Download" on a model card
2. `invoke("download_model", { hfRepoId, hfFilename })`
3. Backend creates download record in SQLite (status: "queued")
4. Download is added to the queue
5. When a worker slot is free, download starts
6. File is downloaded in chunks (8MB) with progress tracking
7. Progress events emitted every 500ms: bytes, speed, ETA
8. On completion: SHA256 verification
9. GGUF metadata is parsed and stored in `models` table
10. Download record updated to "completed"
11. Frontend toast: "Model downloaded successfully"

### Resume Support

- Downloads are written to a `.part` temp file
- Progress (bytes downloaded) is persisted to SQLite every chunk
- On app restart, incomplete downloads are detected
- Resume uses HTTP Range headers: `Range: bytes={downloaded}-`
- If server doesn't support range requests, restart from beginning

### Download Events

| Event                  | Payload                                   |
| ---------------------- | ----------------------------------------- |
| `download:started`     | `{ downloadId, modelName }`               |
| `download:progress`    | `{ downloadId, downloaded, total, speed }` |
| `download:paused`      | `{ downloadId }`                          |
| `download:resumed`     | `{ downloadId }`                          |
| `download:verifying`   | `{ downloadId }`                          |
| `download:completed`   | `{ downloadId, modelId }`                 |
| `download:failed`      | `{ downloadId, error }`                   |

---

## Model File Management

### Storage Layout

```
~/.oryon/
├── oryon.db                              ← SQLite database
├── models/
│   ├── qwen2.5-coder-7b-instruct-q4_k_m.gguf
│   ├── deepseek-coder-v2-lite-q5_k_m.gguf
│   └── ...
└── downloads/
    └── deepseek-coder-33b-q4_k_m.gguf.part   ← in-progress
```

### GGUF Metadata Parsing

After download, Oryon reads the GGUF header to extract:

```rust
pub struct GgufMetadata {
    pub architecture: String,         // "llama", "qwen2", ...
    pub context_length: u32,
    pub embedding_length: u32,
    pub block_count: u32,
    pub head_count: u32,
    pub vocab_size: u32,
    pub quantization_version: u32,
    pub file_type: u32,               // maps to Q4_K_M etc.
    pub tokenizer_model: String,      // "llama", "gpt2", ...
    pub description: Option<String>,
    pub license: Option<String>,
    pub author: Option<String>,
}
```

This metadata is stored in the `models` table and used for:
- Showing model details in the UI
- Determining optimal generation parameters
- Checking architecture compatibility

---

## Recommended Starter Models

Curated list shown during onboarding and in the Model Hub:

| Model                              | Size    | Strength        |
| ---------------------------------- | ------- | --------------- |
| Qwen 2.5 Coder 3B Instruct Q4_K_M | ~2.0 GB | Fast code gen   |
| Qwen 2.5 Coder 7B Instruct Q4_K_M | ~4.2 GB | Balanced code   |
| DeepSeek Coder V2 Lite 16B Q4_K_M  | ~9.1 GB | Strong code     |
| Llama 3.3 8B Instruct Q4_K_M       | ~4.7 GB | General purpose |
| Mistral 7B Instruct Q4_K_M         | ~4.1 GB | General purpose |

These models are highlighted in the hub with a "Recommended" badge
and are pre-filtered during the onboarding flow.
