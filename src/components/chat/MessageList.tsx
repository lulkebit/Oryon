import { useEffect, useRef } from 'react'
import { Cpu } from 'iconsax-react'
import type { Message } from '@/lib/types'
import type { ActiveToolCall } from '@/stores/chatStore'
import { MessageBubble } from './MessageBubble'
import { MarkdownContent } from './MarkdownContent'
import { ToolCallBubble } from './ToolCallBubble'

interface MessageListProps {
  messages: Message[]
  loading?: boolean
  isStreaming?: boolean
  streamingContent?: string
  activeToolCalls?: ActiveToolCall[]
}

export const MessageList = ({
  messages,
  loading,
  isStreaming,
  streamingContent,
  activeToolCalls = [],
}: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingContent, activeToolCalls.length])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center" style={{ gap: '12px' }}>
          <div className="flex items-center" style={{ gap: '6px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-full"
                style={{
                  width: '6px',
                  height: '6px',
                  background: 'var(--text-muted)',
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Loading messages...
          </p>
        </div>
      </div>
    )
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Send a message to start the conversation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '0 24px' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto' }}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.createdAt}
          />
        ))}

        {isStreaming && (
          <div className="flex" style={{ gap: '12px', padding: '16px 0' }}>
            <div
              className="flex shrink-0 items-center justify-center"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'var(--accent-muted)',
              }}
            >
              <Cpu size={16} color="var(--accent)" />
            </div>
            <div className="flex-1" style={{ minWidth: 0 }}>
              <div
                className="flex items-center"
                style={{ gap: '8px', marginBottom: '4px' }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  Agent
                </span>
              </div>

              {activeToolCalls.map((tc) => (
                <ToolCallBubble key={tc.round} toolCall={tc} />
              ))}

              {streamingContent ? (
                <div style={{ position: 'relative' }}>
                  <MarkdownContent content={streamingContent} />
                  <span
                    className="inline-block animate-pulse"
                    style={{
                      width: '2px',
                      height: '14px',
                      marginLeft: '1px',
                      verticalAlign: 'text-bottom',
                      background: 'var(--accent)',
                    }}
                  />
                </div>
              ) : activeToolCalls.length === 0 ? (
                <ThinkingIndicator />
              ) : null}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function ThinkingIndicator() {
  return (
    <div
      className="flex items-center"
      style={{
        gap: '8px',
        height: '28px',
        padding: '4px 12px',
        borderRadius: '8px',
        background: 'var(--bg-elevated)',
        width: 'fit-content',
      }}
    >
      <div className="flex items-center" style={{ gap: '3px' }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block rounded-full"
            style={{
              width: '5px',
              height: '5px',
              background: 'var(--accent)',
              opacity: 0.7,
              animation: 'bounce-dot 1.2s ease-in-out infinite',
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
      <span
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--text-muted)',
        }}
      >
        Thinking...
      </span>
      <style>{`
        @keyframes bounce-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
