import { InfoCircle } from 'iconsax-react'
import type { MessageRole } from '@/lib/types'
import { MarkdownContent } from './MarkdownContent'

interface MessageBubbleProps {
  role: MessageRole
  content: string
}

export const MessageBubble = ({ role, content }: MessageBubbleProps) => {
  const isUser = role === 'user'
  const isSystem = role === 'system'

  if (isSystem) {
    return (
      <div
        className="flex items-start"
        style={{
          gap: '8px',
          padding: '10px 14px',
          margin: '14px 0',
          borderRadius: '12px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <InfoCircle
          size={14}
          color="var(--text-muted)"
          style={{ marginTop: '2px', flexShrink: 0 }}
        />
        <span
          style={{
            fontSize: '12px',
            lineHeight: '18px',
            color: 'var(--text-muted)',
          }}
        >
          {content}
        </span>
      </div>
    )
  }

  if (isUser) {
    return (
      <div
        className="flex justify-end"
        style={{ padding: '14px 0' }}
      >
        <div
          style={{
            maxWidth: '85%',
            fontSize: '13px',
            lineHeight: '20px',
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            textAlign: 'right',
          }}
        >
          {content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 0' }}>
      <MarkdownContent content={content} />
    </div>
  )
}
