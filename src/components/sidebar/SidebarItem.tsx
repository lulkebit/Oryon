import { MessageSquare } from 'lucide-react'

interface SidebarItemProps {
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
  hasActivity?: boolean
}

export const SidebarItem = ({
  label,
  active,
  collapsed,
  onClick,
  hasActivity,
}: SidebarItemProps) => (
  <button
    onClick={onClick}
    className="relative flex w-full items-center gap-2 rounded-md px-2.5 py-1 text-xs transition-colors"
    style={{
      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
      background: active ? 'var(--bg-overlay)' : 'transparent',
    }}
    onMouseEnter={(e) => {
      if (!active) e.currentTarget.style.background = 'var(--bg-elevated)'
    }}
    onMouseLeave={(e) => {
      if (!active) e.currentTarget.style.background = 'transparent'
    }}
    title={collapsed ? label : undefined}
    aria-label={label}
  >
    {active && (
      <div
        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
        style={{ background: 'var(--accent)' }}
      />
    )}
    <MessageSquare
      size={14}
      style={{ color: 'var(--text-muted)' }}
      className="shrink-0"
    />
    {!collapsed && (
      <span className="flex-1 truncate text-left">{label}</span>
    )}
    {hasActivity && (
      <div
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: 'var(--status-running)' }}
      />
    )}
  </button>
)
