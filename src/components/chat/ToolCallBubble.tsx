import { useState } from 'react'
import {
  DocumentText1,
  CommandSquare,
  SearchNormal1,
  Code1,
  ArrowDown2,
  ArrowRight2,
  TickCircle,
  CloseCircle,
  Refresh2,
} from 'iconsax-react'
import type { ActiveToolCall } from '@/stores/chatStore'

interface ToolCallBubbleProps {
  toolCall: ActiveToolCall
}

const TOOL_META: Record<
  string,
  { label: string; icon: typeof DocumentText1; group: string }
> = {
  file_read: { label: 'Read file', icon: DocumentText1, group: 'file' },
  file_write: { label: 'Write file', icon: DocumentText1, group: 'file' },
  file_create: { label: 'Create file', icon: DocumentText1, group: 'file' },
  file_patch: { label: 'Patch file', icon: DocumentText1, group: 'file' },
  file_delete: { label: 'Delete file', icon: DocumentText1, group: 'file' },
  glob: { label: 'Find files', icon: SearchNormal1, group: 'search' },
  grep: { label: 'Search content', icon: SearchNormal1, group: 'search' },
  shell_exec: {
    label: 'Run command',
    icon: CommandSquare,
    group: 'terminal',
  },
  git_status: { label: 'Git status', icon: Code1, group: 'git' },
  git_diff: { label: 'Git diff', icon: Code1, group: 'git' },
  git_commit: { label: 'Git commit', icon: Code1, group: 'git' },
  git_log: { label: 'Git log', icon: Code1, group: 'git' },
}

function formatArgsLabel(name: string, args: Record<string, unknown>): string {
  if (name.startsWith('file_') && args.path) return String(args.path)
  if (name === 'glob' && args.pattern) return String(args.pattern)
  if (name === 'grep' && args.pattern) return String(args.pattern)
  if (name === 'shell_exec' && args.command) {
    const cmd = String(args.command)
    return cmd.length > 60 ? cmd.slice(0, 57) + '...' : cmd
  }
  if (name === 'git_commit' && args.message) {
    const msg = String(args.message)
    return msg.length > 50 ? msg.slice(0, 47) + '...' : msg
  }
  return ''
}

export const ToolCallBubble = ({ toolCall }: ToolCallBubbleProps) => {
  const [expanded, setExpanded] = useState(false)
  const meta = TOOL_META[toolCall.toolName] ?? {
    label: toolCall.toolName,
    icon: CommandSquare,
    group: 'unknown',
  }
  const Icon = meta.icon
  const argLabel = formatArgsLabel(toolCall.toolName, toolCall.args)

  const statusIcon =
    toolCall.status === 'running' ? (
      <Refresh2
        size={14}
        color="var(--status-running)"
        className="animate-spin"
      />
    ) : toolCall.status === 'completed' ? (
      <TickCircle size={14} color="var(--status-success)" />
    ) : (
      <CloseCircle size={14} color="var(--status-error)" />
    )

  const ChevronIcon = expanded ? ArrowDown2 : ArrowRight2

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
        onClick={() =>
          toolCall.status !== 'running' && setExpanded(!expanded)
        }
        className="flex w-full items-center transition-colors"
        style={{
          gap: '8px',
          padding: '8px 12px',
          background: 'transparent',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: '12px',
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
        {argLabel && (
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
            {argLabel}
          </span>
        )}
        <div
          className="flex items-center"
          style={{ gap: '6px', marginLeft: 'auto', flexShrink: 0 }}
        >
          {statusIcon}
          {toolCall.durationMs != null && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {(toolCall.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          <ChevronIcon size={12} color="var(--text-muted)" />
        </div>
      </button>

      {expanded && toolCall.output && (
        <div
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
            {toolCall.output.length > 5000
              ? toolCall.output.slice(0, 5000) + '\n\n[output truncated]'
              : toolCall.output}
          </pre>
        </div>
      )}
    </div>
  )
}
