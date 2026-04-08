import { isTauri } from '@/lib/tauri'

export interface FsEntry {
  name: string
  path: string
  isDir: boolean
  size: number
  modified?: number
}

export interface FsFileContent {
  name: string
  path: string
  content: string
  size: number
  isBinary: boolean
  truncated: boolean
}

export async function fsListDirectory(
  path: string,
  showHidden = false
): Promise<FsEntry[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('fs_list_directory', { path, showHidden })
}

export async function fsReadFile(
  path: string,
  maxBytes?: number
): Promise<FsFileContent> {
  if (!isTauri) {
    return { name: '', path, content: '', size: 0, isBinary: false, truncated: false }
  }
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('fs_read_file', { path, maxBytes })
}
