import { useCallback, useRef } from 'react'
import { Plus, Box, Settings, FolderOpen } from 'lucide-react'
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
      <div className="flex flex-col gap-1 p-3">
        <SidebarButton
          icon={<Plus size={16} />}
          label="New Agent"
          collapsed={sidebarCollapsed}
          onClick={() => {}}
          shortcut="⌘N"
        />
        <SidebarButton
          icon={<Box size={16} />}
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

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {workspaces.length === 0 && !sidebarCollapsed && (
          <div className="px-2 py-8 text-center">
            <p
              className="mb-3 text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              No workspaces yet
            </p>
            <button
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
              }}
            >
              <FolderOpen size={14} />
              Open Workspace
            </button>
          </div>
        )}

        {workspaces.map((workspace) => {
          const workspaceChats = chats.filter(
            (c) => c.workspaceId === workspace.id
          )
          return (
            <div key={workspace.id} className="mb-2">
              {!sidebarCollapsed && (
                <p
                  className="px-2 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {workspace.name}
                </p>
              )}
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
          )
        })}
      </div>

      {/* Footer */}
      <div
        className="border-t p-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <SidebarButton
          icon={<Settings size={16} />}
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
    className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
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
            className="text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            {shortcut}
          </kbd>
        )}
      </>
    )}
  </button>
)
