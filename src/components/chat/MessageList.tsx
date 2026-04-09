import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/types'
import type { ActiveToolCall } from '@/stores/chatStore'
import { MessageBubble } from './MessageBubble'
import { MarkdownContent } from './MarkdownContent'
import { ToolCallBubble } from './ToolCallBubble'
import { ThinkingBubble, parseThinkContent } from './ThinkingBubble'

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
        <div className="flex items-center" style={{ gap: '4px' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-full"
              style={{
                width: '5px',
                height: '5px',
                background: 'var(--text-muted)',
                animation: 'bounce-dot 1.2s ease-in-out infinite',
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="anim-fade-in flex flex-1 items-center justify-center">
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
          />
        ))}

        {isStreaming && (
          <div style={{ padding: '14px 0' }}>
            {activeToolCalls.map((tc) => (
              <ToolCallBubble key={tc.round} toolCall={tc} />
            ))}

            {streamingContent ? (
              (() => {
                const { thinkingBlocks, thinkingOpen, rest } = parseThinkContent(streamingContent)
                return (
                  <div style={{ maxWidth: '95%' }}>
                    {thinkingBlocks.map((block, i) => (
                      <ThinkingBubble
                        key={i}
                        content={block}
                        isOpen={thinkingOpen && i === thinkingBlocks.length - 1}
                      />
                    ))}
                    {rest && (
                      <>
                        <MarkdownContent content={rest} />
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
                      </>
                    )}
                    {!rest && thinkingOpen && null}
                  </div>
                )
              })()
            ) : activeToolCalls.length === 0 ? (
              <ThinkingIndicator />
            ) : null}
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
      className="anim-slide-up flex items-center"
      style={{
        gap: '8px',
        height: '28px',
        padding: '4px 12px',
        borderRadius: '8px',
        background: 'var(--bg-elevated)',
        width: 'fit-content',
      }}
    >
      <div className="flex items-center" style={{ gap: '4px' }}>
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
    </div>
  )
}
