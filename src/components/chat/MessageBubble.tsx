import { InfoCircle } from 'iconsax-react'
import type { MessageRole } from '@/lib/types'
import { MarkdownContent } from './MarkdownContent'
import { ThinkingBubble, parseThinkContent } from './ThinkingBubble'
import { CollapsedToolBlock, splitToolCallBlocks } from './CollapsedToolBlock'

interface MessageBubbleProps {
  role: MessageRole
  content: string
}

export const MessageBubble = ({ role, content }: MessageBubbleProps) => {
  const isUser = role === 'user'
  const isSystem = role === 'system'
  const isAgent = !isUser && !isSystem

  if (isSystem) {
    return (
      <div
        className="anim-message-in flex items-start"
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
        className="anim-message-in flex justify-end"
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

  if (isAgent) {
    const { thinkingBlocks, rest } = parseThinkContent(content)
    const segments = splitToolCallBlocks(rest)
    return (
      <div className="anim-message-in" style={{ padding: '14px 0' }}>
        {thinkingBlocks.map((block, i) => (
          <ThinkingBubble key={i} content={block} isOpen={false} />
        ))}
        {segments.map((seg, i) =>
          seg.type === 'toolcall' ? (
            <CollapsedToolBlock
              key={i}
              success={seg.success}
              toolName={seg.toolName}
              argSummary={seg.argSummary}
              duration={seg.duration}
              output={seg.output}
            />
          ) : (
            <MarkdownContent key={i} content={seg.text} />
          )
        )}
      </div>
    )
  }

  return (
    <div className="anim-message-in" style={{ padding: '14px 0' }}>
      <MarkdownContent content={content} />
    </div>
  )
}
