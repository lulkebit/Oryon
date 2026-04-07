import { User, Cpu } from 'iconsax-react'
import type { MessageRole } from '@/lib/types'

interface MessageBubbleProps {
  role: MessageRole
  content: string
  timestamp: string
}

export const MessageBubble = ({
  role,
  content,
  timestamp,
}: MessageBubbleProps) => {
  const isUser = role === 'user'

  return (
    <div className="flex" style={{ gap: '12px', padding: '16px 0' }}>
      <div
        className="flex shrink-0 items-center justify-center"
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '8px',
          background: isUser ? 'var(--bg-elevated)' : 'var(--accent-muted)',
        }}
      >
        {isUser ? (
          <User size={16} color="var(--text-secondary)" />
        ) : (
          <Cpu size={16} color="var(--accent)" />
        )}
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
            {isUser ? 'You' : 'Agent'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div
          style={{
            fontSize: '13px',
            lineHeight: '22px',
            color: 'var(--text-primary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {content}
        </div>
      </div>
    </div>
  )
}
