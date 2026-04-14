export type BadgeType = 'running' | 'error' | null

interface SidebarItemProps {
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  badge?: BadgeType
  timestamp?: string
}

const BADGE_COLORS: Record<string, string> = {
  running: 'var(--accent)',
  error: 'var(--status-error)',
}

export const SidebarItem = ({
  label,
  active,
  collapsed,
  onClick,
  onContextMenu,
  badge,
  timestamp,
}: SidebarItemProps) => (
  <button
    onClick={onClick}
    onContextMenu={onContextMenu}
    className="btn-press flex w-full items-center text-left"
    style={{
      height: '26px',
      gap: '6px',
      padding: '0 8px 0 6px',
      borderRadius: '5px',
      fontSize: '12.5px',
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
    {!collapsed && (
      <>
        <span className="flex-1 truncate">{label}</span>
        {badge && (
          <div
            className={`shrink-0 rounded-full${badge === 'running' ? ' badge-running' : ''}`}
            style={{
              width: '5px',
              height: '5px',
              background: BADGE_COLORS[badge] ?? 'var(--text-muted)',
            }}
          />
        )}
        {timestamp && (
          <span
            className="shrink-0"
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
          >
            {timestamp}
          </span>
        )}
      </>
    )}
  </button>
)
