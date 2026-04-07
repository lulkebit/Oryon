import { isTauri } from '@/lib/tauri'
import type { Chat } from '@/lib/types'

export async function listAllChats(): Promise<Chat[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('list_all_chats')
}

export async function createChat(
  workspaceId: string,
  title: string
): Promise<Chat> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke('create_chat', { workspaceId, title })
}

export async function renameChat(
  id: string,
  title: string
): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('rename_chat', { id, title })
}

export async function deleteChat(id: string): Promise<void> {
  if (!isTauri) return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('delete_chat', { id })
}
