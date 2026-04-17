import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { Add, Send2, StopCircle, CloseCircle, Document } from 'iconsax-react'
import { isTauri } from '@/lib/tauri'

export interface ChatInputHandle {
  /** Replace the composer draft text. */
  setValue: (value: string) => void
  /** Focus the textarea. */
  focus: () => void
}

interface AttachedFile {
  filename: string
  content: string
  size: number
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ChatInputProps {
  onSend: (content: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(
  function ChatInput({ onSend, onStop, disabled, isStreaming }, ref) {
  const [value, setValue] = useState('')
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const [attachError, setAttachError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(
    ref,
    () => ({
      setValue: (next: string) => {
        setValue(next)
        // Let the textarea autosize to fit the new content.
        requestAnimationFrame(() => {
          const el = textareaRef.current
          if (!el) return
          el.style.height = 'auto'
          el.style.height = Math.min(el.scrollHeight, 200) + 'px'
        })
      },
      focus: () => textareaRef.current?.focus(),
    }),
    []
  )

  const handleAttach = useCallback(async () => {
    if (!isTauri) return
    setAttachError(null)
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({ multiple: true })
      if (!selected) return

      const raw = Array.isArray(selected) ? selected : [selected]
      const paths: string[] = raw.filter(
        (p): p is string => typeof p === 'string'
      )
      const { readFileText } = await import('@/lib/ipc/engine')

      const files = await Promise.allSettled(
        paths.map((p) => readFileText(p))
      )

      const newAttachments: AttachedFile[] = []
      for (const result of files) {
        if (result.status === 'fulfilled') {
          newAttachments.push(result.value)
        }
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments])
      }
    } catch {
      setAttachError('Failed to read files')
      setTimeout(() => setAttachError(null), 3000)
    }
  }, [])

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && attachments.length === 0) || disabled) return

    let content = ''
    for (const att of attachments) {
      const ext = att.filename.split('.').pop() ?? ''
      content += `[Attached: ${att.filename} (${formatSize(att.size)})]\n\`\`\`${ext}\n${att.content}\n\`\`\`\n\n`
    }
    content += trimmed

    onSend(content.trim())
    setValue('')
    setAttachments([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, attachments, disabled, onSend])

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

  const hasContent = value.trim().length > 0 || attachments.length > 0

  return (
    <div style={{ padding: '8px 24px 20px' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto' }}>
      {attachError && (
        <p
          className="anim-slide-up"
          style={{
            fontSize: '12px',
            color: 'var(--status-error)',
            marginBottom: '8px',
          }}
        >
          {attachError}
        </p>
      )}
      {attachments.length > 0 && (
        <div
          className="flex flex-wrap"
          style={{ gap: '8px', marginBottom: '8px' }}
        >
          {attachments.map((att, i) => (
            <div
              key={`${att.filename}-${i}`}
              className="anim-slide-up flex items-center"
              style={{
                gap: '8px',
                padding: '4px 8px 4px 12px',
                borderRadius: '8px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
              }}
            >
              <Document size={12} color="var(--accent)" />
              <span
                style={{
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {att.filename}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                {formatSize(att.size)}
              </span>
              <button
                onClick={() => removeAttachment(i)}
                className="flex items-center justify-center"
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  color: 'var(--text-muted)',
                }}
              >
                <CloseCircle size={12} color="currentColor" />
              </button>
            </div>
          ))}
        </div>
      )}

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
          onClick={handleAttach}
          className="btn-press flex shrink-0 items-center justify-center"
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
          data-chat-input
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
            key="stop"
            onClick={onStop}
            className="btn-press anim-scale-in flex shrink-0 items-center justify-center"
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
            key="send"
            onClick={handleSend}
            disabled={!hasContent || disabled}
            className="btn-press anim-scale-in flex shrink-0 items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: hasContent ? 'var(--accent)' : 'var(--bg-elevated)',
              color: hasContent
                ? 'var(--text-inverse)'
                : 'var(--text-muted)',
              opacity: !hasContent || disabled ? 0.5 : 1,
              transition: 'background 200ms var(--ease-out), color 200ms var(--ease-out), opacity 200ms var(--ease-out)',
            }}
            aria-label="Send message"
          >
            <Send2 size={16} color="currentColor" />
          </button>
        )}
      </div>
      </div>
    </div>
  )
  }
)
