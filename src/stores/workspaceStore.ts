import { create } from 'zustand'
import type { Workspace, Chat } from '@/lib/types'
import * as ipc from '@/lib/ipc'

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  chats: Chat[]
  activeChatId: string | null
  loading: boolean

  loadWorkspaces: () => Promise<void>
  addWorkspace: () => Promise<void>
  renameWorkspace: (id: string, name: string) => Promise<void>
  removeWorkspace: (id: string) => Promise<void>
  setWorkspaceIcon: (id: string, icon: string) => Promise<void>
  setActiveWorkspace: (id: string | null) => void
  loadChats: () => Promise<void>
  addChat: (workspaceId: string) => Promise<void>
  renameChat: (id: string, title: string) => Promise<void>
  removeChat: (id: string) => Promise<void>
  setActiveChat: (id: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  chats: [],
  activeChatId: null,
  loading: false,

  loadWorkspaces: async () => {
    set({ loading: true })
    try {
      const workspaces = await ipc.listWorkspaces()
      const chats = await ipc.listAllChats()
      set({ workspaces, chats, loading: false })
    } catch (err) {
      console.error('Failed to load workspaces:', err)
      set({ loading: false })
    }
  },

  addWorkspace: async () => {
    const path = await ipc.pickWorkspaceFolder()
    if (!path) return
    const name =
      path.split('/').filter(Boolean).pop() ??
      path.split('\\').filter(Boolean).pop() ??
      'Workspace'
    try {
      const workspace = await ipc.createWorkspace(name, path)
      set((s) => ({
        workspaces: [...s.workspaces, workspace],
        activeWorkspaceId: workspace.id,
      }))
    } catch (err) {
      console.error('Failed to create workspace:', err)
    }
  },

  renameWorkspace: async (id, name) => {
    try {
      await ipc.renameWorkspace(id, name)
      set((s) => ({
        workspaces: s.workspaces.map((w) =>
          w.id === id ? { ...w, name, updatedAt: new Date().toISOString() } : w
        ),
      }))
    } catch (err) {
      console.error('Failed to rename workspace:', err)
    }
  },

  removeWorkspace: async (id) => {
    try {
      await ipc.deleteWorkspace(id)
      const { activeChatId, chats } = get()
      const removedChatIds = new Set(
        chats.filter((c) => c.workspaceId === id).map((c) => c.id)
      )
      set((s) => ({
        workspaces: s.workspaces.filter((w) => w.id !== id),
        chats: s.chats.filter((c) => c.workspaceId !== id),
        activeWorkspaceId:
          s.activeWorkspaceId === id ? null : s.activeWorkspaceId,
        activeChatId:
          activeChatId && removedChatIds.has(activeChatId)
            ? null
            : activeChatId,
      }))
    } catch (err) {
      console.error('Failed to delete workspace:', err)
    }
  },

  setWorkspaceIcon: async (id, icon) => {
    try {
      await ipc.setWorkspaceIcon(id, icon)
      set((s) => ({
        workspaces: s.workspaces.map((w) =>
          w.id === id ? { ...w, icon, updatedAt: new Date().toISOString() } : w
        ),
      }))
    } catch (err) {
      console.error('Failed to set workspace icon:', err)
    }
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  loadChats: async () => {
    try {
      const chats = await ipc.listAllChats()
      set({ chats })
    } catch (err) {
      console.error('Failed to load chats:', err)
    }
  },

  addChat: async (workspaceId) => {
    try {
      const chat = await ipc.createChat(workspaceId, 'New Chat')
      set((s) => ({
        chats: [chat, ...s.chats],
        activeChatId: chat.id,
      }))
      const { useAgentStore } = await import('./agentStore')
      const agents = useAgentStore.getState().agents
      if (agents.length > 0) {
        await ipc.setChatAgent(chat.id, agents[0].id)
      }
    } catch (err) {
      console.error('Failed to create chat:', err)
    }
  },

  renameChat: async (id, title) => {
    try {
      await ipc.renameChat(id, title)
      set((s) => ({
        chats: s.chats.map((c) =>
          c.id === id
            ? { ...c, title, updatedAt: new Date().toISOString() }
            : c
        ),
      }))
    } catch (err) {
      console.error('Failed to rename chat:', err)
    }
  },

  removeChat: async (id) => {
    try {
      await ipc.deleteChat(id)
      set((s) => ({
        chats: s.chats.filter((c) => c.id !== id),
        activeChatId: s.activeChatId === id ? null : s.activeChatId,
      }))
    } catch (err) {
      console.error('Failed to delete chat:', err)
    }
  },

  setActiveChat: (id) => set({ activeChatId: id }),
}))
