import { useCallback, useRef } from 'react'
import { Add, Box1, Setting2, FolderOpen } from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { SidebarItem } from './SidebarItem'

const RESIZE_HANDLE_WIDTH = 4

export const Sidebar = () => {
  const {
    sidebarWidth,
    sidebarCollapsed,
    setSidebarWidth,
    activeView,
    setActiveView,
  } = useUiStore()
  const { workspaces, chats, activeChatId } = useWorkspaceStore()
  const resizing = useRef(false)

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      resizing.current = true

      const startX = e.clientX
      const startWidth = sidebarWidth

      const handleMove = (moveEvent: MouseEvent) => {
        if (!resizing.current) return
        const delta = moveEvent.clientX - startX
        setSidebarWidth(startWidth + delta)
      }

      const handleUp = () => {
        resizing.current = false
        document.removeEventListener('mousemove', handleMove)
        document.removeEventListener('mouseup', handleUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMove)
      document.addEventListener('mouseup', handleUp)
    },
    [sidebarWidth, setSidebarWidth]
  )

  const handleDoubleClickEdge = useCallback(() => {
    setSidebarWidth(260)
  }, [setSidebarWidth])

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r"
      style={{
        width: sidebarWidth,
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        transition: resizing.current
          ? 'none'
          : 'width var(--duration-smooth) var(--ease-default)',
      }}
    >
      {/* Header buttons */}
      <div
        className="flex flex-col"
        style={{ gap: '4px', padding: '16px 16px 12px' }}
      >
        <SidebarButton
          icon={<Add size={18} color="currentColor" />}
          label="New Agent"
          collapsed={sidebarCollapsed}
          onClick={() => {}}
          shortcut="⌘N"
        />
        <SidebarButton
          icon={<Box1 size={18} color="currentColor" />}
          label="Model Hub"
          collapsed={sidebarCollapsed}
          active={activeView === 'model-hub'}
          onClick={() =>
            setActiveView(
              activeView === 'model-hub' ? 'chat' : 'model-hub'
            )
          }
        />
      </div>

      {/* Divider */}
      <div
        className="h-px"
        style={{
          background: 'var(--border-subtle)',
          margin: '0 16px',
        }}
      />

      {/* Workspace list */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '12px 16px 16px' }}
      >
        {workspaces.length === 0 && !sidebarCollapsed && (
          <div
            className="flex flex-col items-center"
            style={{ gap: '12px', padding: '48px 8px' }}
          >
            <p
              style={{
                fontSize: '12px',
                lineHeight: '18px',
                color: 'var(--text-muted)',
              }}
            >
              No workspaces yet
            </p>
            <button
              className="inline-flex items-center transition-colors"
              style={{
                height: '36px',
                gap: '8px',
                padding: '0 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-overlay)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
            >
              <FolderOpen size={16} color="currentColor" />
              Open Workspace
            </button>
          </div>
        )}

        {workspaces.map((workspace) => {
          const workspaceChats = chats.filter(
            (c) => c.workspaceId === workspace.id
          )
          return (
            <div key={workspace.id} style={{ marginBottom: '12px' }}>
              {!sidebarCollapsed && (
                <p
                  style={{
                    padding: '12px 12px 6px',
                    fontSize: '11px',
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                  }}
                >
                  {workspace.name}
                </p>
              )}
              <div className="flex flex-col" style={{ gap: '2px' }}>
                {workspaceChats.map((chat) => (
                  <SidebarItem
                    key={chat.id}
                    label={chat.title}
                    active={chat.id === activeChatId}
                    collapsed={sidebarCollapsed}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className="border-t"
        style={{
          borderColor: 'var(--border-subtle)',
          padding: '12px 16px',
        }}
      >
        <SidebarButton
          icon={<Setting2 size={18} color="currentColor" />}
          label="Settings"
          collapsed={sidebarCollapsed}
          active={activeView === 'settings'}
          onClick={() =>
            setActiveView(
              activeView === 'settings' ? 'chat' : 'settings'
            )
          }
        />
      </div>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 z-10 h-full cursor-col-resize"
        style={{ width: RESIZE_HANDLE_WIDTH }}
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClickEdge}
      />
    </aside>
  )
}

const SidebarButton = ({
  icon,
  label,
  collapsed,
  active,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  collapsed: boolean
  active?: boolean
  shortcut?: string
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className="flex w-full items-center transition-colors"
    style={{
      height: '36px',
      gap: '10px',
      padding: '0 12px',
      borderRadius: '6px',
      fontSize: '13px',
      fontWeight: 500,
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
    {icon}
    {!collapsed && (
      <>
        <span className="flex-1 text-left">{label}</span>
        {shortcut && (
          <kbd
            style={{
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--text-muted)',
            }}
          >
            {shortcut}
          </kbd>
        )}
      </>
    )}
  </button>
)
