import { useEffect, useRef } from 'react'
import { Cpu } from 'iconsax-react'
import type { Message } from '@/lib/types'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  messages: Message[]
  loading?: boolean
  isStreaming?: boolean
  streamingContent?: string
}

export const MessageList = ({
  messages,
  loading,
  isStreaming,
  streamingContent,
}: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingContent])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Loading messages...
        </p>
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

        {/* Streaming response */}
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
              {streamingContent ? (
                <div
                  style={{
                    fontSize: '13px',
                    lineHeight: '22px',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {streamingContent}
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
              ) : (
                <div
                  className="flex items-center"
                  style={{ gap: '4px', height: '22px' }}
                >
                  <span
                    className="inline-block animate-pulse rounded-full"
                    style={{
                      width: '4px',
                      height: '4px',
                      background: 'var(--text-muted)',
                    }}
                  />
                  <span
                    className="inline-block animate-pulse rounded-full"
                    style={{
                      width: '4px',
                      height: '4px',
                      background: 'var(--text-muted)',
                      animationDelay: '150ms',
                    }}
                  />
                  <span
                    className="inline-block animate-pulse rounded-full"
                    style={{
                      width: '4px',
                      height: '4px',
                      background: 'var(--text-muted)',
                      animationDelay: '300ms',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
