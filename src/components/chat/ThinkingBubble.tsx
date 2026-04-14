import { useState } from 'react'
import { ArrowRight2 } from 'iconsax-react'

interface ThinkingBubbleProps {
  content: string
  isOpen?: boolean // still streaming
}

export const ThinkingBubble = ({ content, isOpen = false }: ThinkingBubbleProps) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="anim-slide-up"
      style={{
        margin: '4px 0 12px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
        opacity: 0.85,
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="btn-press flex w-full items-center"
        style={{
          gap: '8px',
          padding: '7px 12px',
          background: 'transparent',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-overlay)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
        aria-label={expanded ? 'Collapse thinking' : 'Expand thinking'}
      >
        {/* Brain icon */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, color: 'var(--accent)' }}
        >
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
        </svg>
        <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
          {isOpen ? 'Thinking…' : 'Thought'}
        </span>
        {isOpen && (
          <span
            className="inline-block"
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: 'var(--accent)',
              opacity: 0.7,
              animation: 'pulse-badge 1.2s ease-in-out infinite',
              marginLeft: '2px',
            }}
          />
        )}
        <div style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex', transition: 'transform 200ms var(--ease-out)', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          <ArrowRight2 size={12} color="var(--text-muted)" />
        </div>
      </button>

      <div
        style={{
          display: 'grid',
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transition: `grid-template-rows ${expanded ? '240ms' : '160ms'} var(--ease-out), opacity ${expanded ? '200ms' : '100ms'} var(--ease-out)`,
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
        <div
          style={{
            borderTop: '1px solid var(--border-subtle)',
            padding: '10px 14px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              lineHeight: '1.6',
              color: 'var(--text-muted)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontStyle: 'italic',
            }}
          >
            {content.trim()}
          </p>
        </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Splits content into { thinking, thinkingOpen, rest }.
 * Handles one or more <think>...</think> blocks.
 * If a <think> is open (no closing tag), thinkingOpen = true.
 */
export function parseThinkContent(raw: string): {
  thinkingBlocks: string[]
  thinkingOpen: boolean
  rest: string
} {
  const thinkingBlocks: string[] = []
  let rest = raw
  let thinkingOpen = false

  // Extract all closed <think>...</think> blocks
  const closedRe = /<think>([\s\S]*?)<\/think>/g
  rest = rest.replace(closedRe, (_, inner) => {
    if (inner.trim()) thinkingBlocks.push(inner)
    return ''
  })

  // Check for an unclosed <think> (still streaming)
  const openIdx = rest.indexOf('<think>')
  if (openIdx !== -1) {
    const inner = rest.slice(openIdx + 7)
    if (inner.trim()) thinkingBlocks.push(inner)
    rest = rest.slice(0, openIdx)
    thinkingOpen = true
  }

  return { thinkingBlocks, thinkingOpen, rest: rest.trim() }
}
