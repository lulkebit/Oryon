import { isTauri } from '@/lib/tauri'
import type { Workspace } from '@/lib/types'

export async function listWorkspaces(): Promise<Workspace[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('list_workspaces')
}

export async function createWorkspace(
  name: string,
  path: string
): Promise<Workspace> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('create_workspace', { name, path })
}

export async function renameWorkspace(
  id: string,
  name: string
): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('rename_workspace', { id, name })
}

export async function deleteWorkspace(id: string): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('delete_workspace', { id })
}

export async function setWorkspaceIcon(
  id: string,
  icon: string
): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('set_workspace_icon', { id, icon })
}

export async function detectWorkspaceIcon(id: string): Promise<string> {
  if (!isTauri) return 'folder'
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('detect_workspace_icon', { id })
}

export async function pickWorkspaceFolder(): Promise<string | null> {
  if (!isTauri) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const selected = await open({ directory: true, multiple: false })
  return selected as string | null
}
