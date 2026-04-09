import { useMemo } from 'react'
import type { ContextUsage } from '@/lib/ipc'

interface ContextIndicatorProps {
  usage: ContextUsage | null
}

function formatTokens(n: number): string {
  if (n < 1000) return n.toString()
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

type Tier = 'idle' | 'low' | 'mid' | 'warn' | 'critical'

function tierFor(percent: number, overflow: boolean): Tier {
  if (overflow) return 'critical'
  if (percent >= 95) return 'critical'
  if (percent >= 80) return 'warn'
  if (percent >= 50) return 'mid'
  if (percent > 0) return 'low'
  return 'idle'
}

const TIER_COLORS: Record<
  Tier,
  { ring: string; text: string; bg: string; track: string }
> = {
  idle: {
    ring: 'var(--text-muted)',
    text: 'var(--text-muted)',
    bg: 'var(--bg-elevated)',
    track: 'var(--border-subtle)',
  },
  low: {
    ring: 'var(--accent)',
    text: 'var(--text-secondary)',
    bg: 'var(--bg-elevated)',
    track: 'var(--border-subtle)',
  },
  mid: {
    ring: 'var(--accent)',
    text: 'var(--text-secondary)',
    bg: 'var(--accent-muted)',
    track: 'var(--border-subtle)',
  },
  warn: {
    ring: 'var(--status-warning)',
    text: 'var(--status-warning)',
    bg: 'var(--accent-muted)',
    track: 'var(--border-subtle)',
  },
  critical: {
    ring: 'var(--status-error)',
    text: 'var(--status-error)',
    bg: 'var(--accent-muted)',
    track: 'var(--border-subtle)',
  },
}

export const ContextIndicator = ({ usage }: ContextIndicatorProps) => {
  const computed = useMemo(() => {
    if (!usage || usage.nCtx === 0) return null
    const percent = Math.min(
      100,
      Math.round((usage.promptTokens / usage.nCtx) * 100)
    )
    const headroom = Math.max(0, usage.nCtx - usage.promptTokens)
    const tier = tierFor(percent, usage.overflow)
    return { percent, headroom, tier }
  }, [usage])

  if (!usage || !computed) return null

  const { percent, headroom, tier } = computed
  const colors = TIER_COLORS[tier]
  const cappedByUser = usage.nCtx < usage.nCtxTrain

  // SVG ring geometry — small enough to sit inside a 28px pill.
  const size = 14
  const stroke = 2
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dash = (percent / 100) * circumference

  const tooltip = [
    `Prompt: ${usage.promptTokens.toLocaleString()} tokens`,
    `Context: ${usage.nCtx.toLocaleString()} tokens` +
      (cappedByUser
        ? ` (capped from ${usage.nCtxTrain.toLocaleString()})`
        : ''),
    `Reserved for reply: up to ${usage.maxGenTokens.toLocaleString()} tokens`,
    `Headroom: ${headroom.toLocaleString()} tokens (${100 - percent}% free)`,
    usage.overflow
      ? '⚠ Prompt exceeds the context window — the next message will fail.'
      : percent >= 80
        ? '⚠ Approaching the limit — older messages may be truncated.'
        : null,
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div
      role="status"
      aria-label={`Context usage: ${percent} percent. ${tooltip}`}
      title={tooltip}
      className="flex items-center"
      style={{
        height: '28px',
        gap: '6px',
        padding: '0 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontVariantNumeric: 'tabular-nums',
        color: colors.text,
        background: colors.bg,
        cursor: 'default',
        transition:
          'background 200ms var(--ease-out), color 200ms var(--ease-out)',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.ring}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dasharray 300ms var(--ease-out), stroke 200ms var(--ease-out)',
          }}
        />
      </svg>
      <span>
        {formatTokens(usage.promptTokens)}
        <span style={{ opacity: 0.5 }}> / </span>
        {formatTokens(usage.nCtx)}
      </span>
    </div>
  )
}
