import { create } from 'zustand'
import type { Message } from '@/lib/types'

interface ChatState {
  messages: Message[]
  isStreaming: boolean
  streamingContent: string

  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setStreaming: (streaming: boolean) => void
  appendStreamContent: (token: string) => void
  clearStreamContent: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setStreaming: (isStreaming) => set({ isStreaming }),
  appendStreamContent: (token) =>
    set((state) => ({
      streamingContent: state.streamingContent + token,
    })),
  clearStreamContent: () => set({ streamingContent: '' }),
}))
