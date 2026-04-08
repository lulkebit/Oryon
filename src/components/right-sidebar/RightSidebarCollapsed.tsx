import type { RightSidebarTab } from '@/stores/uiStore'

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

interface Props {
  activeTab: RightSidebarTab
  onExpand: (tab: RightSidebarTab) => void
}

export const RightSidebarCollapsed = ({ activeTab, onExpand }: Props) => {
  const tabs: { id: RightSidebarTab; icon: React.ReactNode; label: string }[] = [
    { id: 'git', icon: <GitIcon size={16} />, label: 'Git' },
    { id: 'terminal', icon: <TerminalIcon size={16} />, label: 'Terminal' },
    { id: 'files', icon: <FilesIcon size={16} />, label: 'Files' },
  ]

  return (
    <div
      className="flex h-full flex-col items-center"
      style={{ gap: '4px', paddingTop: '12px' }}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onExpand(tab.id)}
            className="btn-press flex items-center justify-center"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              background: active ? 'var(--accent-muted)' : 'transparent',
            }}
            aria-label={tab.label}
            title={tab.label}
          >
            {tab.icon}
          </button>
        )
      })}
    </div>
  )
}
