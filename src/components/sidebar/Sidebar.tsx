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
      <div className="flex flex-col gap-1 px-3 pb-2 pt-3">
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
        className="mx-3 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      />

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-3">
        {workspaces.length === 0 && !sidebarCollapsed && (
          <div className="flex flex-col items-center gap-3 px-2 py-10">
            <p
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              No workspaces yet
            </p>
            <button
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors"
              style={{
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
              <FolderOpen size={14} color="currentColor" />
              Open Workspace
            </button>
          </div>
        )}

        {workspaces.map((workspace) => {
          const workspaceChats = chats.filter(
            (c) => c.workspaceId === workspace.id
          )
          return (
            <div key={workspace.id} className="mb-3">
              {!sidebarCollapsed && (
                <p
                  className="mb-1 px-2 pt-3 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {workspace.name}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
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
        className="border-t px-3 py-3"
        style={{ borderColor: 'var(--border-subtle)' }}
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
    className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors"
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
    {icon}
    {!collapsed && (
      <>
        <span className="flex-1 text-left">{label}</span>
        {shortcut && (
          <kbd
            className="text-[10px] font-normal"
            style={{ color: 'var(--text-muted)' }}
          >
            {shortcut}
          </kbd>
        )}
      </>
    )}
  </button>
)
