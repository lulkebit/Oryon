import { create } from 'zustand'
import type { Agent } from '@/lib/types'
import * as ipc from '@/lib/ipc'

const ALL_TOOLS = [
  'file_read',
  'file_write',
  'file_create',
  'file_patch',
  'file_delete',
  'glob',
  'grep',
  'shell_exec',
  'git_status',
  'git_diff',
  'git_commit',
  'git_log',
] as const

const AGENT_COLORS = [
  '#C2D8C4',
  '#A8C8E8',
  '#E8C8A8',
  '#D8A8D8',
  '#E8E8A8',
  '#A8E8D8',
  '#E8A8A8',
  '#C8C8E8',
] as const

interface AgentState {
  agents: Agent[]
  loading: boolean
  chatAgentMap: Record<string, string>

  loadAgents: () => Promise<void>
  createAgent: (name: string) => Promise<Agent>
  updateAgent: (agent: Agent) => Promise<void>
  deleteAgent: (id: string) => Promise<void>
  getChatAgent: (chatId: string) => Promise<Agent | null>
  setChatAgent: (chatId: string, agentId: string) => Promise<void>
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  loading: false,
  chatAgentMap: {},

  loadAgents: async () => {
    set({ loading: true })
    try {
      const agents = await ipc.listAgents()
      set({ agents, loading: false })
    } catch (err) {
      console.error('Failed to load agents:', err)
      set({ loading: false })
    }
  },

  createAgent: async (name) => {
    const idx = get().agents.length % AGENT_COLORS.length
    const agent = await ipc.createAgent(
      name,
      'You are a helpful AI coding assistant. Answer concisely and accurately. Use the given tool calls as much as possible and wisely.',
      [...ALL_TOOLS],
      0.7,
      4096,
      AGENT_COLORS[idx]
    )
    set((s) => ({ agents: [...s.agents, agent] }))
    return agent
  },

  updateAgent: async (agent) => {
    await ipc.updateAgent(
      agent.id,
      agent.name,
      agent.systemPrompt,
      agent.tools,
      agent.temperature,
      agent.maxTokens,
      agent.color,
      agent.modelId
    )
    set((s) => ({
      agents: s.agents.map((a) => (a.id === agent.id ? agent : a)),
    }))
  },

  deleteAgent: async (id) => {
    await ipc.deleteAgent(id)
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
    }))
  },

  getChatAgent: async (chatId) => {
    const cached = get().chatAgentMap[chatId]
    if (cached) {
      return get().agents.find((a) => a.id === cached) ?? null
    }
    const agent = await ipc.getChatAgent(chatId)
    if (agent) {
      set((s) => ({
        chatAgentMap: { ...s.chatAgentMap, [chatId]: agent.id },
      }))
    }
    return agent
  },

  setChatAgent: async (chatId, agentId) => {
    await ipc.setChatAgent(chatId, agentId)
    set((s) => ({
      chatAgentMap: { ...s.chatAgentMap, [chatId]: agentId },
    }))
  },
}))

export { ALL_TOOLS, AGENT_COLORS }
