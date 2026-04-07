import { Message } from 'iconsax-react'

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
    className="relative flex h-[32px] w-full items-center gap-[8px] rounded-[6px] px-[10px] text-[13px] transition-colors"
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
        className="absolute left-0 top-1/2 h-[16px] w-[2px] -translate-y-1/2 rounded-full"
        style={{ background: 'var(--accent)' }}
      />
    )}
    <Message
      size={16}
      color="var(--text-muted)"
      className="shrink-0"
    />
    {!collapsed && (
      <span className="flex-1 truncate text-left">{label}</span>
    )}
    {hasActivity && (
      <div
        className="h-[6px] w-[6px] shrink-0 rounded-full"
        style={{ background: 'var(--status-running)' }}
      />
    )}
  </button>
)
