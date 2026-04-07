import { Message } from 'iconsax-react'

interface SidebarItemProps {
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  hasActivity?: boolean
}

export const SidebarItem = ({
  label,
  active,
  collapsed,
  onClick,
  onContextMenu,
  hasActivity,
}: SidebarItemProps) => (
  <button
    onClick={onClick}
    onContextMenu={onContextMenu}
    className="relative flex w-full items-center transition-colors"
    style={{
      height: '32px',
      gap: '10px',
      padding: '0 12px',
      borderRadius: '6px',
      fontSize: '13px',
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
        className="absolute top-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: 0,
          width: '2px',
          height: '16px',
          background: 'var(--accent)',
        }}
      />
    )}
    <Message size={16} color="var(--text-muted)" className="shrink-0" />
    {!collapsed && (
      <span className="flex-1 truncate text-left">{label}</span>
    )}
    {hasActivity && (
      <div
        className="shrink-0 rounded-full"
        style={{
          width: '6px',
          height: '6px',
          background: 'var(--status-running)',
        }}
      />
    )}
  </button>
)
