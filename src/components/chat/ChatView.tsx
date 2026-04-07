import { useEffect, useState, useRef, useCallback } from 'react'
import { MessageText1, DocumentDownload, Cpu, ArrowDown2 } from 'iconsax-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useChatStore } from '@/stores/chatStore'
import { useEngineStore } from '@/stores/engineStore'
import { useModelHubStore } from '@/stores/modelHubStore'
import { useUiStore } from '@/stores/uiStore'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

export const ChatView = () => {
  const { activeChatId, chats } = useWorkspaceStore()
  const {
    messages,
    loading,
    isStreaming,
    streamingContent,
    loadMessages,
    sendMessage,
    clearMessages,
    initEventListeners,
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

  useEffect(() => {
    loadDownloaded()
  }, [loadDownloaded])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    initEventListeners().then((fn) => {
      cleanup = fn
    })
    return () => cleanup?.()
  }, [initEventListeners])

  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId)
    } else {
      clearMessages()
    }
  }, [activeChatId, loadMessages, clearMessages])

  if (!activeChatId || !activeChat) {
    return <EmptyState />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div
        className="flex items-center justify-between border-b"
        style={{
          height: '52px',
          padding: '0 24px',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <h1
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {activeChat.title}
        </h1>

        <ModelSelector
          downloadedModels={downloadedModels}
          loadedModel={loadedModel}
          modelLoading={modelLoading}
          onSelect={(path, id) => loadModelFromPath(path, id)}
          onUnload={unloadModel}
          onGoToHub={() => setActiveView('models')}
        />
      </div>

      {!loadedModel && !modelLoading && (
        <button
          onClick={() => setActiveView('models')}
          className="flex items-center justify-center transition-colors"
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
      />

      <ChatInput
        onSend={(content) => sendMessage(activeChatId, content)}
        disabled={generating}
        isStreaming={isStreaming}
        onStop={() => useEngineStore.getState().stopInference()}
      />
    </div>
  )
}

function ModelSelector({
  downloadedModels,
  loadedModel,
  modelLoading,
  onSelect,
  onUnload,
  onGoToHub,
}: {
  downloadedModels: { id: string; name: string; storagePath: string }[]
  loadedModel: { modelId: string } | null
  modelLoading: boolean
  onSelect: (path: string, id: string) => void
  onUnload: () => void
  onGoToHub: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        disabled={modelLoading}
        className="flex items-center transition-colors"
        style={{
          height: '28px',
          gap: '6px',
          padding: '0 10px',
          borderRadius: '6px',
          fontSize: '12px',
          color: loadedModel
            ? 'var(--text-secondary)'
            : 'var(--text-muted)',
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
          className="border"
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
            zIndex: 50,
          }}
        >
          {loadedModel && (
            <button
              onClick={() => {
                onUnload()
                setOpen(false)
              }}
              className="flex w-full items-center transition-colors"
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
            >
              Unload current model
            </button>
          )}

          {loadedModel && downloadedModels.length > 0 && (
            <div
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
                onClick={() => handleSelect(m.storagePath, m.id)}
                disabled={isActive}
                className="flex w-full items-center transition-colors"
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  gap: '8px',
                  color: isActive
                    ? 'var(--accent)'
                    : 'var(--text-primary)',
                  fontWeight: isActive ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'var(--bg-overlay)'
                }}
                onMouseLeave={(e) => {
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
              style={{
                height: '1px',
                margin: '4px 0',
                background: 'var(--border-subtle)',
              }}
            />
          )}

          <button
            onClick={() => {
              onGoToHub()
              setOpen(false)
            }}
            className="flex w-full items-center transition-colors"
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
}

const EmptyState = () => (
  <div
    className="flex h-full flex-col items-center justify-center"
    style={{ padding: '40px' }}
  >
    <div className="flex flex-col items-center" style={{ gap: '24px' }}>
      <MessageText1 size={48} color="var(--text-muted)" variant="Broken" />
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
