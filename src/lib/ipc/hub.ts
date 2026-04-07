import { isTauri } from '@/lib/tauri'

export interface GgufFile {
  filename: string
  size: number
  quantization: string | null
}

export interface HfModelResult {
  id: string
  author: string | null
  downloads: number | null
  likes: number | null
  tags: string[]
  files: GgufFile[]
}

export interface StoredModel {
  id: string
  name: string
  filename: string
  hfRepoId: string | null
  fileSize: number
  storagePath: string
  downloadedAt: string
}

export async function searchModels(
  query: string
): Promise<HfModelResult[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('search_models', { query })
}

export async function searchModelsFeatured(
  query: string
): Promise<HfModelResult[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('search_models_featured', { query })
}

export async function downloadModel(
  repoId: string,
  filename: string
): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('download_model', { repoId, filename })
}

export async function cancelDownload(): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('cancel_download')
}

export async function listDownloadedModels(): Promise<StoredModel[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('list_downloaded_models')
}

export async function deleteModel(modelId: string): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('delete_model', { modelId })
}
