import { create } from 'zustand'
import type { Message } from '@/lib/types'
import { isTauri } from '@/lib/tauri'
import * as ipc from '@/lib/ipc'
import { useWorkspaceStore } from './workspaceStore'
import { useEngineStore } from './engineStore'

const AUTO_TITLE_MAX_LENGTH = 50

function deriveTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim()
  if (firstLine.length <= AUTO_TITLE_MAX_LENGTH) return firstLine
  return firstLine.slice(0, AUTO_TITLE_MAX_LENGTH - 1) + '…'
}

interface ChatState {
  messages: Message[]
  activeChatId: string | null
  streamingChatId: string | null
  isStreaming: boolean
  streamingContent: string
  loading: boolean

  loadMessages: (chatId: string) => Promise<void>
  sendMessage: (chatId: string, content: string) => Promise<void>
  appendToken: (chatId: string, token: string) => void
  finalizeStream: (chatId: string, content: string) => Promise<void>
  handleStreamError: (chatId: string, error: string) => void
  clearMessages: () => void
  initEventListeners: () => Promise<() => void>
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  activeChatId: null,
  streamingChatId: null,
  isStreaming: false,
  streamingContent: '',
  loading: false,

  loadMessages: async (chatId) => {
    set({ loading: true, messages: [], activeChatId: chatId })

    const { streamingChatId } = get()
    if (streamingChatId && streamingChatId !== chatId) {
      set({ isStreaming: false, streamingContent: '' })
    }

    try {
      const messages = await ipc.listMessages(chatId)

      if (get().activeChatId !== chatId) return
      set({ messages, loading: false })
    } catch (err) {
      console.error('Failed to load messages:', err)
      if (get().activeChatId === chatId) {
        set({ loading: false })
      }
    }
  },

  sendMessage: async (chatId, content) => {
    try {
      const message = await ipc.createMessage(chatId, 'user', content)

      if (get().activeChatId !== chatId) return

      set((s) => ({ messages: [...s.messages, message] }))

      const isFirstMessage = get().messages.length === 1
      if (isFirstMessage) {
        const title = deriveTitle(content)
        useWorkspaceStore.getState().renameChat(chatId, title)
      }

      const engine = useEngineStore.getState()
      if (engine.loadedModel) {
        set({
          isStreaming: true,
          streamingContent: '',
          streamingChatId: chatId,
        })
        engine.startInference(chatId)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  },

  appendToken: (chatId, token) => {
    const { streamingChatId, activeChatId } = get()
    if (chatId !== streamingChatId) return
    if (chatId !== activeChatId) return
    set((s) => ({ streamingContent: s.streamingContent + token }))
  },

  finalizeStream: async (chatId, content) => {
    const { streamingChatId } = get()
    if (chatId !== streamingChatId) return

    set({ streamingChatId: null })

    if (!content.trim()) {
      set({ isStreaming: false, streamingContent: '' })
      useEngineStore.getState().setGenerating(false)
      return
    }

    try {
      const message = await ipc.createMessage(
        chatId,
        'assistant',
        content.trim()
      )

      if (get().activeChatId === chatId) {
        set((s) => ({
          messages: [...s.messages, message],
          isStreaming: false,
          streamingContent: '',
        }))
      } else {
        set({ isStreaming: false, streamingContent: '' })
      }
    } catch (err) {
      console.error('Failed to save assistant message:', err)
      set({ isStreaming: false, streamingContent: '' })
    }
    useEngineStore.getState().setGenerating(false)
  },

  handleStreamError: (_chatId, error) => {
    console.error('Inference error:', error)
    set({
      isStreaming: false,
      streamingContent: '',
      streamingChatId: null,
    })
    useEngineStore.getState().setGenerating(false)
  },

  clearMessages: () =>
    set({
      messages: [],
      loading: false,
      activeChatId: null,
    }),

  initEventListeners: async () => {
    if (!isTauri) return () => {}
    const { listen } = await import('@tauri-apps/api/event')

    const unlisten1 = await listen<{ chatId: string; token: string }>(
      'chat:token',
      (event) => {
        get().appendToken(event.payload.chatId, event.payload.token)
      }
    )

    const unlisten2 = await listen<{ chatId: string; content: string }>(
      'chat:complete',
      (event) => {
        get().finalizeStream(event.payload.chatId, event.payload.content)
      }
    )

    const unlisten3 = await listen<{ chatId: string; error: string }>(
      'chat:error',
      (event) => {
        get().handleStreamError(
          event.payload.chatId,
          event.payload.error
        )
      }
    )

    return () => {
      unlisten1()
      unlisten2()
      unlisten3()
    }
  },
}))
