import { create } from 'zustand'
import type { Message } from '@/lib/types'
import { isTauri } from '@/lib/tauri'
import * as ipc from '@/lib/ipc'
import { useWorkspaceStore } from './workspaceStore'
import { useEngineStore } from './engineStore'

const AUTO_TITLE_MAX_LENGTH = 50
const CONTROL_TOKEN_RE = /<\|im_(end|start)\|?>?/g

function deriveTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim()
  if (firstLine.length <= AUTO_TITLE_MAX_LENGTH) return firstLine
  return firstLine.slice(0, AUTO_TITLE_MAX_LENGTH - 1) + '…'
}

function stripControlTokens(s: string): string {
  return s.replace(CONTROL_TOKEN_RE, '').trim()
}

let _listenersActive = false
let _unlisten: (() => void) | null = null

export interface ToolCallEvent {
  chatId: string
  round: number
  tool: { name: string; args: Record<string, unknown> }
}

export interface ToolResultEvent {
  chatId: string
  round: number
  result: {
    toolName: string
    success: boolean
    output: string
    durationMs: number
  }
}

export interface ActiveToolCall {
  round: number
  toolName: string
  args: Record<string, unknown>
  status: 'running' | 'completed' | 'error'
  output?: string
  durationMs?: number
}

interface ChatState {
  messages: Message[]
  currentChatId: string | null
  streamingChatId: string | null
  isStreaming: boolean
  streamingContent: string
  loading: boolean
  activeToolCalls: ActiveToolCall[]

  setCurrentChat: (chatId: string | null) => void
  loadMessages: (chatId: string) => Promise<void>
  sendMessage: (chatId: string, content: string) => Promise<void>
  appendToken: (chatId: string, token: string) => void
  finalizeStream: (chatId: string, content: string) => Promise<void>
  handleStreamError: (chatId: string, error: string) => void
  handleToolCall: (event: ToolCallEvent) => void
  handleToolResult: (event: ToolResultEvent) => void
  clearMessages: () => void
  setupListeners: () => Promise<void>
  teardownListeners: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentChatId: null,
  streamingChatId: null,
  isStreaming: false,
  streamingContent: '',
  loading: false,
  activeToolCalls: [],

  setCurrentChat: (chatId) => {
    const prev = get().currentChatId
    if (prev === chatId) return

    const { streamingChatId } = get()
    if (streamingChatId && streamingChatId !== chatId) {
      set({ isStreaming: false, streamingContent: '' })
    }

    set({ currentChatId: chatId })
  },

  loadMessages: async (chatId) => {
    get().setCurrentChat(chatId)
    set({ loading: true, messages: [] })

    try {
      const messages = await ipc.listMessages(chatId)
      if (get().currentChatId !== chatId) return
      set({ messages, loading: false })
    } catch (err) {
      console.error('Failed to load messages:', err)
      if (get().currentChatId === chatId) {
        set({ loading: false })
      }
    }
  },

  sendMessage: async (chatId, content) => {
    try {
      const message = await ipc.createMessage(chatId, 'user', content)
      if (get().currentChatId !== chatId) return

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
    const { streamingChatId, currentChatId } = get()
    if (chatId !== streamingChatId || chatId !== currentChatId) return
    const clean = stripControlTokens(token)
    if (!clean) return
    set((s) => ({ streamingContent: s.streamingContent + clean }))
  },

  finalizeStream: async (chatId, content) => {
    const { streamingChatId } = get()
    const isActiveStream = streamingChatId === chatId

    set({ streamingChatId: null })

    if (!isActiveStream) {
      set({ isStreaming: false, streamingContent: '' })
    }

    const trimmed = stripControlTokens(content)
    if (!trimmed) {
      if (get().currentChatId === chatId) {
        set((s) => ({
          messages: [
            ...s.messages,
            {
              id: `empty-${Date.now()}`,
              chatId,
              agentId: null,
              role: 'system' as const,
              content:
                'The model returned an empty response. It may not be compatible with this prompt format, or the input was too short to generate a meaningful reply.',
              metadata: null,
              createdAt: new Date().toISOString(),
              sortOrder: s.messages.length,
            },
          ],
          isStreaming: false,
          streamingContent: '',
        }))
      } else {
        set({ isStreaming: false, streamingContent: '' })
      }
      useEngineStore.getState().setGenerating(false)
      return
    }

    try {
      const message = await ipc.createMessage(chatId, 'assistant', trimmed)

      if (get().currentChatId === chatId) {
        set((s) => ({
          messages: [...s.messages, message],
          isStreaming: false,
          streamingContent: '',
          activeToolCalls: [],
        }))
      } else {
        set({ isStreaming: false, streamingContent: '', activeToolCalls: [] })
      }
    } catch (err) {
      console.error('Failed to save assistant message:', err)
      set({ isStreaming: false, streamingContent: '', activeToolCalls: [] })
    }
    useEngineStore.getState().setGenerating(false)
  },

  handleToolCall: (event) => {
    const { currentChatId } = get()
    if (event.chatId !== currentChatId) return

    set((s) => ({
      activeToolCalls: [
        ...s.activeToolCalls,
        {
          round: event.round,
          toolName: event.tool.name,
          args: event.tool.args,
          status: 'running',
        },
      ],
      streamingContent: '',
    }))
  },

  handleToolResult: (event) => {
    const { currentChatId } = get()
    if (event.chatId !== currentChatId) return

    set((s) => ({
      activeToolCalls: s.activeToolCalls.map((tc) =>
        tc.round === event.round
          ? {
              ...tc,
              status: event.result.success ? 'completed' : 'error',
              output: event.result.output,
              durationMs: event.result.durationMs,
            }
          : tc
      ),
    }))
  },

  handleStreamError: (_chatId, error) => {
    console.error('Inference error:', error)
    set({
      isStreaming: false,
      streamingContent: '',
      streamingChatId: null,
      activeToolCalls: [],
    })
    useEngineStore.getState().setGenerating(false)
  },

  clearMessages: () =>
    set({
      messages: [],
      loading: false,
      currentChatId: null,
    }),

  setupListeners: async () => {
    if (_listenersActive) return
    _listenersActive = true

    if (!isTauri) return

    const { listen } = await import('@tauri-apps/api/event')

    const u1 = await listen<{ chatId: string; token: string }>(
      'chat:token',
      (event) => {
        useChatStore
          .getState()
          .appendToken(event.payload.chatId, event.payload.token)
      }
    )

    const u2 = await listen<{ chatId: string; content: string }>(
      'chat:complete',
      (event) => {
        useChatStore
          .getState()
          .finalizeStream(event.payload.chatId, event.payload.content)
      }
    )

    const u3 = await listen<{ chatId: string; error: string }>(
      'chat:error',
      (event) => {
        useChatStore
          .getState()
          .handleStreamError(event.payload.chatId, event.payload.error)
      }
    )

    const u4 = await listen<ToolCallEvent>('tool:call', (event) => {
      useChatStore.getState().handleToolCall(event.payload)
    })

    const u5 = await listen<ToolResultEvent>('tool:result', (event) => {
      useChatStore.getState().handleToolResult(event.payload)
    })

    _unlisten = () => {
      u1()
      u2()
      u3()
      u4()
      u5()
    }
  },

  teardownListeners: () => {
    if (_unlisten) {
      _unlisten()
      _unlisten = null
    }
    _listenersActive = false
  },
}))
