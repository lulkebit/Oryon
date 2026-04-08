import type { RightSidebarTab } from '@/stores/uiStore'
import { ArrowRight2 } from 'iconsax-react'

const GitIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <path d="M13 6h3a2 2 0 0 1 2 2v7" />
    <line x1="6" y1="9" x2="6" y2="21" />
  </svg>
)

const TerminalIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
)

const FilesIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const TABS: { id: RightSidebarTab; label: string; icon: (s: number) => React.ReactNode }[] = [
  { id: 'git', label: 'Git', icon: (s) => <GitIcon size={s} /> },
  { id: 'terminal', label: 'Terminal', icon: (s) => <TerminalIcon size={s} /> },
  { id: 'files', label: 'Files', icon: (s) => <FilesIcon size={s} /> },
]

interface Props {
  activeTab: RightSidebarTab
  collapsed: boolean
  onTabClick: (tab: RightSidebarTab) => void
  onCollapse: () => void
}

export const RightSidebarTabs = ({ activeTab, collapsed, onTabClick, onCollapse }: Props) => {
  if (collapsed) return null

  return (
    <div
      className="flex shrink-0 items-center border-b"
      style={{
        height: '44px',
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
      }}
    >
      {TABS.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onTabClick(tab.id)}
            className="btn-press flex h-full items-center"
            style={{
              gap: '6px',
              padding: '0 14px',
              fontSize: '12px',
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--text-primary)' : 'var(--text-muted)',
              borderBottom: active
                ? '2px solid var(--accent)'
                : '2px solid transparent',
            }}
            aria-label={tab.label}
            title={tab.label}
          >
            {tab.icon(14)}
            <span>{tab.label}</span>
          </button>
        )
      })}
      <div className="flex-1" />
      <button
        onClick={onCollapse}
        className="btn-press flex items-center justify-center"
        style={{
          width: '36px',
          height: '36px',
          marginRight: '4px',
          borderRadius: '6px',
          color: 'var(--text-muted)',
        }}
        aria-label="Collapse sidebar"
        title="Collapse"
      >
        <ArrowRight2 size={14} color="currentColor" />
      </button>
    </div>
  )
}
