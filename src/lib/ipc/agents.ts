import type { Agent } from '@/lib/types'
import { isTauri } from '@/lib/tauri'

interface RawAgent {
  id: string
  name: string
  modelId: string | null
  systemPrompt: string
  tools: string
  temperature: number
  maxTokens: number
  color: string
  createdAt: string
  updatedAt: string
}

function parseAgent(raw: RawAgent): Agent {
  let tools: string[] = []
  try {
    tools = JSON.parse(raw.tools)
  } catch {
    tools = []
  }
  return { ...raw, tools }
}

export async function listAgents(): Promise<Agent[]> {
  if (!isTauri) return []
  const { invoke } = await import('@tauri-apps/api/core')
  const raw: RawAgent[] = await invoke('list_agents')
  return raw.map(parseAgent)
}

export async function getAgent(id: string): Promise<Agent | null> {
  if (!isTauri) return null
  const { invoke } = await import('@tauri-apps/api/core')
  const raw: RawAgent | null = await invoke('get_agent', { id })
  return raw ? parseAgent(raw) : null
}

export async function createAgent(
  name: string,
  systemPrompt: string,
  tools: string[],
  temperature: number,
  maxTokens: number,
  color: string
): Promise<Agent> {
  const { invoke } = await import('@tauri-apps/api/core')
  const raw: RawAgent = await invoke('create_agent', {
    name,
    systemPrompt,
    tools: JSON.stringify(tools),
    temperature,
    maxTokens,
    color,
  })
  return parseAgent(raw)
}

export async function updateAgent(
  id: string,
  name: string,
  systemPrompt: string,
  tools: string[],
  temperature: number,
  maxTokens: number,
  color: string,
  modelId: string | null
): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('update_agent', {
    id,
    name,
    systemPrompt,
    tools: JSON.stringify(tools),
    temperature,
    maxTokens,
    color,
    modelId,
  })
}

export async function deleteAgent(id: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('delete_agent', { id })
}

export async function getChatAgent(
  chatId: string
): Promise<Agent | null> {
  if (!isTauri) return null
  const { invoke } = await import('@tauri-apps/api/core')
  const raw: RawAgent | null = await invoke('get_chat_agent', { chatId })
  return raw ? parseAgent(raw) : null
}

export async function setChatAgent(
  chatId: string,
  agentId: string
): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('set_chat_agent', { chatId, agentId })
}
