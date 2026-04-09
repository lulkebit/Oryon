import { useState, useRef, useEffect } from 'react'
import { ArrowRight2, TickCircle, CloseCircle } from 'iconsax-react'
import {
  DocumentText1,
  CommandSquare,
  SearchNormal1,
  Code1,
} from 'iconsax-react'

const TOOL_META: Record<string, { label: string; icon: typeof DocumentText1 }> = {
  file_read: { label: 'Read file', icon: DocumentText1 },
  file_write: { label: 'Write file', icon: DocumentText1 },
  file_create: { label: 'Create file', icon: DocumentText1 },
  file_patch: { label: 'Patch file', icon: DocumentText1 },
  file_delete: { label: 'Delete file', icon: DocumentText1 },
  glob: { label: 'Find files', icon: SearchNormal1 },
  grep: { label: 'Search content', icon: SearchNormal1 },
  shell_exec: { label: 'Run command', icon: CommandSquare },
  git_status: { label: 'Git status', icon: Code1 },
  git_diff: { label: 'Git diff', icon: Code1 },
  git_commit: { label: 'Git commit', icon: Code1 },
  git_log: { label: 'Git log', icon: Code1 },
}

interface Props {
  success: boolean
  toolName: string
  argSummary: string
  duration: string
  output: string
}

export const CollapsedToolBlock = ({ success, toolName, argSummary, duration, output }: Props) => {
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(0)

  const meta = TOOL_META[toolName] ?? { label: toolName, icon: CommandSquare }
  const Icon = meta.icon

  useEffect(() => {
    if (expanded && contentRef.current) {
      setContentHeight(Math.min(contentRef.current.scrollHeight, 300))
    }
  }, [expanded])

  return (
    <div
      style={{
        margin: '8px 0',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="btn-press flex w-full items-center"
        style={{
          gap: '8px',
          padding: '8px 12px',
          background: 'transparent',
          fontSize: '12px',
          color: 'var(--text-primary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-overlay)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <Icon size={14} color="var(--text-muted)" />
        <span style={{ fontWeight: 500 }}>{meta.label}</span>
        {argSummary && (
          <span
            style={{
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'left',
            }}
          >
            {argSummary}
          </span>
        )}
        <div className="flex items-center" style={{ gap: '8px', marginLeft: 'auto', flexShrink: 0 }}>
          {success
            ? <TickCircle size={14} color="var(--status-success)" />
            : <CloseCircle size={14} color="var(--status-error)" />
          }
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {duration}
          </span>
          <span
            style={{
              transition: 'transform 200ms var(--ease-out)',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              display: 'flex',
            }}
          >
            <ArrowRight2 size={12} color="var(--text-muted)" />
          </span>
        </div>
      </button>

      <div
        style={{
          maxHeight: expanded ? contentHeight : 0,
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 200ms var(--ease-out), opacity 150ms var(--ease-out)',
        }}
      >
        {output && (
          <div
            ref={contentRef}
            style={{
              borderTop: '1px solid var(--border-subtle)',
              padding: '8px 12px',
              maxHeight: '300px',
              overflow: 'auto',
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                lineHeight: '18px',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {output.length > 5000 ? output.slice(0, 5000) + '\n\n[output truncated]' : output}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Parser ────────────────────────────────────────────────────────────────────
// Matches the format Rust engine emits:
//   \n\n> ✓ **shell_exec** command: ls -la · 0.0s\n>\n> ```\n> ...\n> ```
//
// Note: arg_summary from Rust may be empty, and bold markers wrap the tool name.

export type ContentSegment =
  | { type: 'markdown'; text: string }
  | { type: 'toolcall'; success: boolean; toolName: string; argSummary: string; duration: string; output: string }

// Captures: (✓|✗) **name** summary · Xs\n>\n> ```\n(output lines)\n> ```
const BLOCK_RE =
  /> ([✓✗]) \*\*([^\s*]+)\*\*([^·\n]*)·\s*([^\n]+)\n>\n> ```\n((?:> ?[^\n]*\n)*?)> ```/g

export function splitToolCallBlocks(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  let lastIndex = 0

  for (const match of content.matchAll(BLOCK_RE)) {
    const start = match.index ?? 0

    if (start > lastIndex) {
      const text = content.slice(lastIndex, start).trim()
      if (text) segments.push({ type: 'markdown', text })
    }

    // Strip leading "> " from each output line
    const rawOutput = match[5] ?? ''
    const output = rawOutput.replace(/^> ?/gm, '').trimEnd()

    segments.push({
      type: 'toolcall',
      success: match[1] === '✓',
      toolName: match[2],
      argSummary: match[3].trim(),
      duration: match[4].trim(),
      output,
    })

    lastIndex = start + match[0].length
  }

  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim()
    if (text) segments.push({ type: 'markdown', text })
  }

  return segments
}
