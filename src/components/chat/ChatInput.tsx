import { useState, useRef, useCallback } from 'react'
import { Add, Send2, StopCircle } from 'iconsax-react'

interface ChatInputProps {
  onSend: (content: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
}

export const ChatInput = ({
  onSend,
  onStop,
  disabled,
  isStreaming,
}: ChatInputProps) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [])

  const hasContent = value.trim().length > 0

  return (
    <div style={{ padding: '8px 24px 20px' }}>
      <div
        className="flex items-center border"
        style={{
          gap: '4px',
          padding: '4px 4px 4px 6px',
          borderRadius: '9999px',
          background: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          className="flex shrink-0 items-center justify-center transition-colors"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elevated)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Attach file"
        >
          <Add size={18} color="currentColor" />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder="Send a message..."
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none"
          style={{
            fontSize: '13px',
            lineHeight: '20px',
            padding: '6px 4px',
            color: 'var(--text-primary)',
            maxHeight: '200px',
          }}
          disabled={disabled}
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex shrink-0 items-center justify-center transition-colors"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: 'var(--status-error)',
              color: 'var(--text-inverse)',
            }}
            aria-label="Stop generation"
          >
            <StopCircle size={16} color="currentColor" variant="Bold" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!hasContent || disabled}
            className="flex shrink-0 items-center justify-center transition-colors"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: hasContent ? 'var(--accent)' : 'var(--bg-elevated)',
              color: hasContent
                ? 'var(--text-inverse)'
                : 'var(--text-muted)',
              opacity: !hasContent || disabled ? 0.5 : 1,
            }}
            aria-label="Send message"
          >
            <Send2 size={16} color="currentColor" />
          </button>
        )}
      </div>
    </div>
  )
}
