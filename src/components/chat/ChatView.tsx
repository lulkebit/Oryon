import {
  useEffect,
  useState,
  useRef,
  useCallback,
  useId,
  forwardRef,
} from 'react'
import {
  MessageText1,
  DocumentDownload,
  Cpu,
  ArrowDown2,
  CloseCircle,
  Warning2,
} from 'iconsax-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useChatStore } from '@/stores/chatStore'
import { useEngineStore } from '@/stores/engineStore'
import { useModelHubStore } from '@/stores/modelHubStore'
import { useUiStore } from '@/stores/uiStore'
import { MessageList } from './MessageList'
import { ChatInput, type ChatInputHandle } from './ChatInput'
import { AgentSelector } from './AgentSelector'
import { ContextIndicator } from './ContextIndicator'
import { useMenuKeyboard } from '@/components/shared/useMenuKeyboard'

export const ChatView = () => {
  const { activeChatId, chats } = useWorkspaceStore()
  const {
    messages,
    loading,
    isStreaming,
    streamingContent,
    activeToolCalls,
    contextChatId,
    contextUsage,
    errorChatId,
    lastError,
    loadMessages,
    sendMessage,
    clearMessages,
    clearError,
    refreshContextUsage,
  } = useChatStore()
  const {
    loadedModel,
    generating,
    loading: modelLoading,
    loadModelFromPath,
    unloadModel,
  } = useEngineStore()
  const { downloadedModels, loadDownloaded } = useModelHubStore()
  const { setActiveView } = useUiStore()

  const activeChat = chats.find((c) => c.id === activeChatId)
  const chatInputRef = useRef<ChatInputHandle>(null)

  useEffect(() => {
    loadDownloaded()
  }, [loadDownloaded])

  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId)
    } else {
      clearMessages()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId])

  // When a model is loaded/swapped after the chat is already open, the
  // existing usage estimate is stale (different tokenizer / context size).
  // Re-estimate on model id changes.
  useEffect(() => {
    if (activeChatId && loadedModel) {
      refreshContextUsage(activeChatId)
    }
  }, [activeChatId, loadedModel?.modelId, refreshContextUsage])

  const visibleUsage =
    contextUsage && contextChatId === activeChatId ? contextUsage : null

  const handleSuggestion = useCallback((prompt: string) => {
    chatInputRef.current?.setValue(prompt)
    chatInputRef.current?.focus()
  }, [])

  if (!activeChatId || !activeChat) {
    return <EmptyState />
  }

  const showBanner = errorChatId === activeChatId && lastError

  return (
    <div className="flex h-full flex-col">
      {/* Chat header — title is primary; secondary controls sit to the right. */}
      <div
        className="flex items-center justify-between border-b"
        style={{
          height: '52px',
          padding: '0 24px',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div
          className="flex min-w-0 items-center"
          style={{ gap: '10px', flex: 1 }}
        >
          <h1
            className="truncate"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
            title={activeChat.title}
          >
            {activeChat.title}
          </h1>
        </div>

        <div
          className="flex shrink-0 items-center"
          style={{ gap: '6px' }}
        >
          <AgentSelector
            chatId={activeChatId}
            onOpenConfig={() => setActiveView('agents')}
          />
          <ContextIndicator usage={visibleUsage} />
          <div
            aria-hidden="true"
            style={{
              width: '1px',
              height: '18px',
              background: 'var(--border-subtle)',
              margin: '0 2px',
            }}
          />
          <ModelSelector
            downloadedModels={downloadedModels}
            loadedModel={loadedModel}
            modelLoading={modelLoading}
            onSelect={(path, id) => loadModelFromPath(path, id)}
            onUnload={unloadModel}
            onGoToHub={() => setActiveView('models')}
          />
        </div>
      </div>

      {/* Inline error banner — surfaces failures inside the chat surface. */}
      {showBanner && (
        <div
          role="alert"
          className="anim-slide-up flex items-start"
          style={{
            gap: '10px',
            margin: '12px 24px 0',
            padding: '10px 12px',
            borderRadius: '8px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--status-error)',
            color: 'var(--text-primary)',
          }}
        >
          <Warning2
            size={16}
            color="var(--status-error)"
            style={{ marginTop: '1px', flexShrink: 0 }}
            variant="Bold"
          />
          <div style={{ flex: 1, fontSize: '12.5px', lineHeight: '18px' }}>
            <div
              style={{
                fontWeight: 600,
                color: 'var(--status-error)',
                marginBottom: '2px',
              }}
            >
              Message failed
            </div>
            <div style={{ color: 'var(--text-secondary)' }}>{lastError}</div>
          </div>
          <button
            type="button"
            onClick={clearError}
            aria-label="Dismiss error"
            className="btn-press flex shrink-0 items-center justify-center"
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-overlay)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            <CloseCircle size={14} color="currentColor" />
          </button>
        </div>
      )}

      {!loadedModel && !modelLoading && (
        <button
          onClick={() => setActiveView('models')}
          className="btn-press flex items-center justify-center"
          style={{
            padding: '12px 24px',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elevated)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-surface)'
          }}
        >
          <DocumentDownload size={14} color="currentColor" />
          {downloadedModels.length > 0
            ? 'Select a model to start chatting'
            : 'Download a model from the Model Hub to start chatting'}
        </button>
      )}

      <MessageList
        messages={messages}
        loading={loading}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        activeToolCalls={activeToolCalls}
        onSuggestionSelect={handleSuggestion}
        canSuggest={!!loadedModel}
      />

      <ChatInput
        ref={chatInputRef}
        onSend={(content) => sendMessage(activeChatId, content)}
        disabled={generating}
        isStreaming={isStreaming}
        onStop={() => useEngineStore.getState().stopInference()}
      />
    </div>
  )
}

// ── ModelSelector ────────────────────────────────────────────────────────────

const ModelSelector = forwardRef<
  HTMLButtonElement,
  {
    downloadedModels: { id: string; name: string; storagePath: string }[]
    loadedModel: { modelId: string } | null
    modelLoading: boolean
    onSelect: (path: string, id: string) => void
    onUnload: () => void
    onGoToHub: () => void
  }
>(function ModelSelector(
  { downloadedModels, loadedModel, modelLoading, onSelect, onUnload, onGoToHub },
  _outerRef
) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const handleSelect = useCallback(
    (path: string, id: string) => {
      onSelect(path, id)
      setOpen(false)
    },
    [onSelect]
  )

  const close = useCallback(() => setOpen(false), [])
  const { getTriggerHandlers } = useMenuKeyboard({
    open,
    onClose: close,
    containerRef: menuRef,
    triggerRef,
  })
  const triggerKeyHandlers = getTriggerHandlers(setOpen)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        onKeyDown={triggerKeyHandlers.onKeyDown}
        disabled={modelLoading}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className="btn-press flex items-center"
        style={{
          height: '28px',
          gap: '6px',
          padding: '0 10px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: loadedModel ? 500 : 400,
          color: loadedModel ? 'var(--text-primary)' : 'var(--text-muted)',
          background: loadedModel
            ? 'var(--accent-muted)'
            : 'var(--bg-elevated)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-overlay)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = loadedModel
            ? 'var(--accent-muted)'
            : 'var(--bg-elevated)'
        }}
      >
        <Cpu size={14} color="currentColor" />
        {modelLoading
          ? 'Loading…'
          : loadedModel
            ? loadedModel.modelId
            : 'Select Model'}
        <ArrowDown2 size={12} color="currentColor" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-orientation="vertical"
          className="popover-enter border"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            minWidth: '240px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '4px',
            borderRadius: '10px',
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
            outline: 'none',
            zIndex: 50,
          }}
        >
          {loadedModel && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onUnload()
                setOpen(false)
              }}
              className="btn-press flex w-full items-center"
              style={{
                height: '32px',
                padding: '0 12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: 'var(--status-error)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-overlay)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = 'var(--bg-overlay)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              Unload current model
            </button>
          )}

          {loadedModel && downloadedModels.length > 0 && (
            <div
              role="separator"
              style={{
                height: '1px',
                margin: '4px 0',
                background: 'var(--border-subtle)',
              }}
            />
          )}

          {downloadedModels.map((m) => {
            const isActive = loadedModel?.modelId === m.id
            return (
              <button
                key={m.id}
                type="button"
                role="menuitem"
                onClick={() => handleSelect(m.storagePath, m.id)}
                disabled={isActive}
                aria-disabled={isActive}
                className="btn-press flex w-full items-center"
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  gap: '8px',
                  color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: isActive ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'var(--bg-overlay)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'transparent'
                }}
                onFocus={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'var(--bg-overlay)'
                }}
                onBlur={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'transparent'
                }}
              >
                <Cpu size={14} color="currentColor" />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m.name}
                </span>
                {isActive && (
                  <span style={{ marginLeft: 'auto', opacity: 0.6 }}>✓</span>
                )}
              </button>
            )
          })}

          {downloadedModels.length > 0 && (
            <div
              role="separator"
              style={{
                height: '1px',
                margin: '4px 0',
                background: 'var(--border-subtle)',
              }}
            />
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onGoToHub()
              setOpen(false)
            }}
            className="btn-press flex w-full items-center"
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-overlay)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'var(--bg-overlay)'
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <DocumentDownload size={14} color="currentColor" />
            {downloadedModels.length === 0
              ? 'Download a model…'
              : 'Browse more models…'}
          </button>
        </div>
      )}
    </div>
  )
})

// ── Empty state (no active chat) ─────────────────────────────────────────────

const EmptyState = () => (
  <div
    className="anim-fade-in flex h-full flex-col items-center justify-center"
    style={{ padding: '40px' }}
  >
    <div className="flex flex-col items-center" style={{ gap: '24px' }}>
      <div className="anim-float">
        <MessageText1 size={48} color="var(--text-muted)" variant="Broken" />
      </div>
      <div className="text-center">
        <h2
          style={{
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '24px',
            color: 'var(--text-primary)',
          }}
        >
          Start a new chat
        </h2>
        <p
          style={{
            marginTop: '8px',
            maxWidth: '300px',
            fontSize: '13px',
            lineHeight: '20px',
            color: 'var(--text-secondary)',
          }}
        >
          Open a workspace and create a new chat to get started.
        </p>
      </div>
    </div>
  </div>
)
