import { create } from 'zustand'
import type { Message } from '@/lib/types'
import type { ContextUsage } from '@/lib/ipc'
import { isTauri } from '@/lib/tauri'
import * as ipc from '@/lib/ipc'
import { useWorkspaceStore } from './workspaceStore'
import { useEngineStore } from './engineStore'

const AUTO_TITLE_MAX_LENGTH = 50
const CONTROL_TOKEN_RE =
  /<\|im_(end|start)\|?>?|<\/?tool_(call|result)>?/g

function deriveTitle(content: string): string {
  const firstLine = content.split('\n')[0].trim()
  if (firstLine.length <= AUTO_TITLE_MAX_LENGTH) return firstLine
  return firstLine.slice(0, AUTO_TITLE_MAX_LENGTH - 1) + '…'
}

function stripControlTokens(s: string): string {
  let result = s.replace(CONTROL_TOKEN_RE, '')
  const toolIdx = result.indexOf('<tool_call')
  if (toolIdx !== -1) result = result.slice(0, toolIdx)
  return result.trim()
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
  errorChatId: string | null
  isStreaming: boolean
  streamingContent: string
  loading: boolean
  activeToolCalls: ActiveToolCall[]
  contextChatId: string | null
  contextUsage: ContextUsage | null

  setCurrentChat: (chatId: string | null) => void
  loadMessages: (chatId: string) => Promise<void>
  sendMessage: (chatId: string, content: string) => Promise<void>
  appendToken: (chatId: string, token: string) => void
  finalizeStream: (chatId: string, content: string) => Promise<void>
  handleStreamError: (chatId: string, error: string) => void
  handleToolCall: (event: ToolCallEvent) => void
  handleToolResult: (event: ToolResultEvent) => void
  refreshContextUsage: (chatId: string) => Promise<void>
  applyContextEvent: (chatId: string, usage: ContextUsage) => void
  clearMessages: () => void
  setupListeners: () => Promise<void>
  teardownListeners: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentChatId: null,
  streamingChatId: null,
  errorChatId: null,
  isStreaming: false,
  streamingContent: '',
  loading: false,
  activeToolCalls: [],
  contextChatId: null,
  contextUsage: null,

  setCurrentChat: (chatId) => {
    const prev = get().currentChatId
    if (prev === chatId) return

    const { streamingChatId } = get()
    if (streamingChatId && streamingChatId !== chatId) {
      set({ isStreaming: false, streamingContent: '' })
    }

    set({
      currentChatId: chatId,
      // Drop stale usage; the next refresh will repopulate.
      contextChatId: null,
      contextUsage: null,
    })
  },

  loadMessages: async (chatId) => {
    get().setCurrentChat(chatId)
    if (get().errorChatId === chatId) {
      set({ errorChatId: null })
    }
    set({ loading: true, messages: [] })

    try {
      const messages = await ipc.listMessages(chatId)
      if (get().currentChatId !== chatId) return
      set({ messages, loading: false })
      void get().refreshContextUsage(chatId)
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
          activeToolCalls: [],
        }))
      } else {
        set({
          isStreaming: false,
          streamingContent: '',
          activeToolCalls: [],
        })
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
    void get().refreshContextUsage(chatId)
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

  handleStreamError: (chatId, error) => {
    console.error('Inference error:', error)
    const { currentChatId } = get()

    if (currentChatId === chatId) {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: `error-${Date.now()}`,
            chatId,
            agentId: null,
            role: 'system' as const,
            content: `Error: ${error}`,
            metadata: null,
            createdAt: new Date().toISOString(),
            sortOrder: s.messages.length,
          },
        ],
        isStreaming: false,
        streamingContent: '',
        streamingChatId: null,
        errorChatId: chatId,
        activeToolCalls: [],
      }))
    } else {
      set({
        isStreaming: false,
        streamingContent: '',
        streamingChatId: null,
        errorChatId: chatId,
        activeToolCalls: [],
      })
    }
    useEngineStore.getState().setGenerating(false)
  },

  refreshContextUsage: async (chatId) => {
    if (!isTauri) return
    const engine = useEngineStore.getState()
    if (!engine.loadedModel) {
      // Without a loaded model the indicator has nothing to show.
      if (get().contextChatId !== null || get().contextUsage !== null) {
        set({ contextChatId: null, contextUsage: null })
      }
      return
    }
    try {
      const usage = await ipc.estimateContext(chatId)
      // Drop the result if the user has navigated elsewhere in the meantime.
      if (get().currentChatId !== chatId) return
      set({ contextChatId: chatId, contextUsage: usage })
    } catch (err) {
      // Estimation failures are non-fatal — leave whatever we already had.
      console.warn('Failed to estimate context usage:', err)
    }
  },

  applyContextEvent: (chatId, usage) => {
    if (get().currentChatId !== chatId) return
    set({ contextChatId: chatId, contextUsage: usage })
  },

  clearMessages: () =>
    set({
      messages: [],
      loading: false,
      currentChatId: null,
      contextChatId: null,
      contextUsage: null,
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

    const u6 = await listen<{ chatId: string; usage: ContextUsage }>(
      'chat:context',
      (event) => {
        useChatStore
          .getState()
          .applyContextEvent(event.payload.chatId, event.payload.usage)
      }
    )

    _unlisten = () => {
      u1()
      u2()
      u3()
      u4()
      u5()
      u6()
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
