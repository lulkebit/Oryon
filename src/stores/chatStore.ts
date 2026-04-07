import { create } from 'zustand'
import type { Message } from '@/lib/types'
import * as ipc from '@/lib/ipc'
import { useWorkspaceStore } from './workspaceStore'

const AUTO_TITLE_MAX_LENGTH = 50

function deriveTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim()
  if (firstLine.length <= AUTO_TITLE_MAX_LENGTH) return firstLine
  return firstLine.slice(0, AUTO_TITLE_MAX_LENGTH - 1) + '…'
}

interface ChatState {
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  loading: boolean

  loadMessages: (chatId: string) => Promise<void>
  sendMessage: (chatId: string, content: string) => Promise<void>
  setStreaming: (streaming: boolean) => void
  appendStreamContent: (token: string) => void
  clearStreamContent: () => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',
  loading: false,

  loadMessages: async (chatId) => {
    set({ loading: true, messages: [] })
    try {
      const messages = await ipc.listMessages(chatId)
      set({ messages, loading: false })
    } catch (err) {
      console.error('Failed to load messages:', err)
      set({ loading: false })
    }
  },

  sendMessage: async (chatId, content) => {
    try {
      const message = await ipc.createMessage(chatId, 'user', content)
      set((s) => ({ messages: [...s.messages, message] }))

      const isFirstMessage = get().messages.length === 1
      if (isFirstMessage) {
        const title = deriveTitle(content)
        useWorkspaceStore.getState().renameChat(chatId, title)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  },

  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamContent: (token) =>
    set((s) => ({ streamingContent: s.streamingContent + token })),
  clearStreamContent: () => set({ streamingContent: '' }),
  clearMessages: () => set({ messages: [], loading: false }),
}))
