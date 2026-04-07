import { isTauri } from '@/lib/tauri'
import type { Message, MessageRole } from '@/lib/types'

interface RawMessage {
  id: string
  chatId: string
  agentId: string | null
  role: string
  content: string
  metadata: string | null
  createdAt: string
  sortOrder: number
}

function parseMessage(raw: RawMessage): Message {
  return {
    ...raw,
    role: raw.role as MessageRole,
    metadata: raw.metadata ? JSON.parse(raw.metadata) : null,
  }
}

export async function listMessages(chatId: string): Promise<Message[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  const raw = await invoke<RawMessage[]>('list_messages', { chatId })
  return raw.map(parseMessage)
}

export async function createMessage(
  chatId: string,
  role: string,
  content: string,
  agentId?: string,
  metadata?: string
): Promise<Message> {
  const { invoke } = await import('@tauri-apps/api/core')
  const raw = await invoke<RawMessage>('create_message', {
    chatId,
    role,
    content,
    agentId: agentId ?? null,
    metadata: metadata ?? null,
  })
  return parseMessage(raw)
}
