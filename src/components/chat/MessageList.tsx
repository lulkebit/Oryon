import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/types'
import type { ActiveToolCall } from '@/stores/chatStore'
import { MessageBubble } from './MessageBubble'
import { MarkdownContent } from './MarkdownContent'
import { ToolCallBubble } from './ToolCallBubble'
import { ThinkingBubble, parseThinkContent } from './ThinkingBubble'
import { CollapsedToolBlock, splitToolCallBlocks } from './CollapsedToolBlock'

interface MessageListProps {
  messages: Message[]
  loading?: boolean
  isStreaming?: boolean
  streamingContent?: string
  activeToolCalls?: ActiveToolCall[]
  onSuggestionSelect?: (prompt: string) => void
  canSuggest?: boolean
}

const SUGGESTED_PROMPTS: { label: string; prompt: string }[] = [
  {
    label: 'Summarize this project',
    prompt: 'Summarize the current workspace: what is this project, its architecture, and the most important entry points.',
  },
  {
    label: 'Explain a file',
    prompt: 'Open the file I name next and explain what it does, its public API, and any non-obvious details.',
  },
  {
    label: 'Find a bug',
    prompt: 'Walk the codebase looking for likely bugs, logic errors, or unsafe code paths. Report your top 3 findings with file references.',
  },
  {
    label: 'Run a command',
    prompt: 'Run the project tests and summarize the results. Ask before running anything destructive.',
  },
]

export const MessageList = ({
  messages,
  loading,
  isStreaming,
  streamingContent,
  activeToolCalls = [],
  onSuggestionSelect,
  canSuggest,
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
      <div
        className="anim-fade-in flex flex-1 flex-col items-center justify-center"
        style={{ padding: '24px', gap: '24px' }}
      >
        <div className="text-center" style={{ maxWidth: '420px' }}>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Start the conversation
          </h2>
          <p
            style={{
              marginTop: '6px',
              fontSize: '12.5px',
              lineHeight: '18px',
              color: 'var(--text-muted)',
            }}
          >
            Ask a question, describe a task, or pick a suggestion below.
          </p>
        </div>

        {onSuggestionSelect && (
          <div
            className="flex flex-wrap items-center justify-center"
            style={{
              gap: '8px',
              maxWidth: '520px',
              opacity: canSuggest ? 1 : 0.5,
              pointerEvents: canSuggest ? 'auto' : 'none',
            }}
          >
            {SUGGESTED_PROMPTS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => onSuggestionSelect(s.prompt)}
                className="btn-press"
                style={{
                  height: '30px',
                  padding: '0 12px',
                  borderRadius: '9999px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                  e.currentTarget.style.borderColor = 'var(--border-default)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                  e.currentTarget.style.borderColor = 'var(--border-subtle)'
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div
          className="flex items-center"
          style={{
            gap: '14px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          <span>
            <Kbd>Enter</Kbd> to send
          </span>
          <span
            aria-hidden="true"
            style={{
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              background: 'var(--text-muted)',
              opacity: 0.5,
            }}
          />
          <span>
            <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for a new line
          </span>
        </div>
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
                const segments = splitToolCallBlocks(rest)
                const hasText = segments.some((s) => s.type === 'markdown' && s.text)
                return (
                  <div style={{ maxWidth: '95%' }}>
                    {thinkingBlocks.map((block, i) => (
                      <ThinkingBubble
                        key={i}
                        content={block}
                        isOpen={thinkingOpen && i === thinkingBlocks.length - 1}
                      />
                    ))}
                    {segments.map((seg, i) => {
                      if (seg.type === 'toolcall') {
                        return (
                          <CollapsedToolBlock
                            key={i}
                            success={seg.success}
                            toolName={seg.toolName}
                            argSummary={seg.argSummary}
                            duration={seg.duration}
                            output={seg.output}
                          />
                        )
                      }
                      if (!seg.text) return null
                      const isLast = i === segments.length - 1
                      return (
                        <span key={i} style={{ display: 'block' }}>
                          <MarkdownContent content={seg.text} />
                          {isLast && (
                            <span
                              className="inline-block anim-cursor-blink"
                              style={{
                                width: '2px',
                                height: '14px',
                                marginLeft: '1px',
                                verticalAlign: 'text-bottom',
                                background: 'var(--accent)',
                              }}
                            />
                          )}
                        </span>
                      )
                    })}
                    {!hasText && !thinkingOpen && segments.every((s) => s.type === 'toolcall') && (
                      <span
                        className="inline-block anim-cursor-blink"
                        style={{
                          width: '2px',
                          height: '14px',
                          marginLeft: '1px',
                          verticalAlign: 'text-bottom',
                          background: 'var(--accent)',
                        }}
                      />
                    )}
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

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <kbd
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '10.5px',
      padding: '1px 5px',
      borderRadius: '4px',
      border: '1px solid var(--border-subtle)',
      background: 'var(--bg-elevated)',
      color: 'var(--text-secondary)',
    }}
  >
    {children}
  </kbd>
)

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
