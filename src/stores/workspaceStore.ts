import { create } from 'zustand'
import type { Workspace, Chat } from '@/lib/types'

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  chats: Chat[]
  activeChatId: string | null

  setWorkspaces: (workspaces: Workspace[]) => void
  setActiveWorkspace: (id: string | null) => void
  setChats: (chats: Chat[]) => void
  setActiveChat: (id: string | null) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  activeWorkspaceId: null,
  chats: [],
  activeChatId: null,

  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setChats: (chats) => set({ chats }),
  setActiveChat: (id) => set({ activeChatId: id }),
}))
