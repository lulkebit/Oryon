import { isTauri } from '@/lib/tauri'

export interface ModelInfo {
  modelId: string
  path: string
  size: number
  /** Max context length from GGUF metadata (tokens). */
  contextLength: number
}

export interface EngineStatus {
  loadedModel: ModelInfo | null
  generating: boolean
}

export interface HardwareInfo {
  totalRam: number
  availableRam: number
  cpuCores: number
  cpuName: string
  os: string
  arch: string
  metalSupport: boolean
  cudaSupport: boolean
}

export async function loadModel(
  path: string,
  modelId: string,
  gpuLayers?: number
): Promise<ModelInfo> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('load_model', { path, modelId, gpuLayers })
}

export async function unloadModel(): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('unload_model')
}

export async function startInference(chatId: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('start_inference', { chatId })
}

export async function stopInference(): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('stop_inference')
}

export async function getEngineStatus(): Promise<EngineStatus> {
  if (!isTauri) return { loadedModel: null, generating: false }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('get_engine_status')
}

export async function getHardwareInfo(): Promise<HardwareInfo | null> {
  if (!isTauri) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('get_hardware_info')
}

export interface ProcessStats {
  appCpuPercent: number
  appMemoryBytes: number
  systemCpuPercent: number
  systemMemoryUsed: number
  systemMemoryTotal: number
}

export interface ContextUsage {
  /** Tokens the rendered prompt currently occupies. */
  promptTokens: number
  /** Effective context window after applying any user cap. */
  nCtx: number
  /** Raw context length the model was trained for. */
  nCtxTrain: number
  /** Reserved budget for the next generation. */
  maxGenTokens: number
  /** True if the prompt no longer fits and inference would fail. */
  overflow: boolean
}

export async function estimateContext(
  chatId: string
): Promise<ContextUsage> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('estimate_context', { chatId })
}

export async function getProcessStats(): Promise<ProcessStats | null> {
  if (!isTauri) return null
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('get_process_stats')
}

export async function readFileText(
  path: string
): Promise<{ filename: string; content: string; size: number }> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('read_file_text', { path })
}

export async function pickModelFile(): Promise<string | null> {
  if (!isTauri) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({
    multiple: false,
    filters: [{ name: 'GGUF Models', extensions: ['gguf'] }],
  })
  return selected as string | null
}
