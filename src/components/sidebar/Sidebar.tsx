import { useCallback, useMemo, useRef, useState } from 'react'
import { Add, Setting2, FolderOpen, People } from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useChatStore } from '@/stores/chatStore'
import { SidebarItem } from './SidebarItem'
import type { BadgeType } from './SidebarItem'
import {
  ContextMenu,
  type ContextMenuItem,
} from '@/components/shared/ContextMenu'
import { WorkspaceIcon, WorkspaceIconPicker } from './WorkspaceIcon'

const RESIZE_HANDLE_WIDTH = 4
const CHATS_PREVIEW_COUNT = 5

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'now'
  if (h < 1) return `${m}m ago`
  if (d < 1) return `${h}h ago`
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

interface IconPickerState {
  workspaceId: string
  currentIcon: string
  x: number
  y: number
}

export const Sidebar = () => {
  const {
    sidebarWidth,
    sidebarCollapsed,
    setSidebarWidth,
    activeView,
    setActiveView,
  } = useUiStore()
  const {
    workspaces,
    chats,
    activeChatId,
    addWorkspace,
    addChat,
    renameWorkspace,
    removeWorkspace,
    setWorkspaceIcon,
    renameChat,
    removeChat,
    setActiveChat,
  } = useWorkspaceStore()
  const { streamingChatId, errorChatId } = useChatStore()

  const resizing = useRef(false)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [iconPicker, setIconPicker] = useState<IconPickerState | null>(null)
  const [collapsedWorkspaces, setCollapsedWorkspaces] = useState<Set<string>>(
    new Set()
  )
  const [expandedChatSets, setExpandedChatSets] = useState<Set<string>>(
    new Set()
  )
  const [sortByRecent, setSortByRecent] = useState(false)

  const sortedWorkspaces = useMemo(() => {
    if (!sortByRecent)
      return [...workspaces].sort((a, b) => a.sortOrder - b.sortOrder)
    return [...workspaces].sort((a, b) => {
      const aTime = a.lastOpened ?? a.updatedAt
      const bTime = b.lastOpened ?? b.updatedAt
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  }, [workspaces, sortByRecent])

  const getBadge = useCallback(
    (chatId: string): BadgeType => {
      if (chatId === streamingChatId) return 'running'
      if (chatId === errorChatId) return 'error'
      return null
    },
    [streamingChatId, errorChatId]
  )

  const toggleWorkspace = useCallback((id: string) => {
    setCollapsedWorkspaces((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleExpandChats = useCallback((id: string) => {
    setExpandedChatSets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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

  const handleWorkspaceContext = useCallback(
    (e: React.MouseEvent, workspaceId: string, name: string) => {
      e.preventDefault()
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: 'New Chat',
            onClick: () => {
              addChat(workspaceId)
              setActiveView('chat')
            },
          },
          {
            label: 'Rename',
            onClick: () => {
              const newName = window.prompt('Rename workspace', name)
              if (newName?.trim()) renameWorkspace(workspaceId, newName.trim())
            },
          },
          {
            label: 'Remove',
            variant: 'danger',
            onClick: () => removeWorkspace(workspaceId),
          },
        ],
      })
    },
    [addChat, setActiveView, renameWorkspace, removeWorkspace]
  )

  const handleChatContext = useCallback(
    (e: React.MouseEvent, chatId: string, title: string) => {
      e.preventDefault()
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: 'Rename',
            onClick: () => {
              const newTitle = window.prompt('Rename chat', title)
              if (newTitle?.trim()) renameChat(chatId, newTitle.trim())
            },
          },
          {
            label: 'Delete',
            variant: 'danger',
            onClick: () => removeChat(chatId),
          },
        ],
      })
    },
    [renameChat, removeChat]
  )

  return (
    <aside
      className="relative flex shrink-0 flex-col"
      style={{
        width: sidebarWidth,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        transition: resizing.current
          ? 'none'
          : 'width var(--duration-smooth) var(--ease-default)',
      }}
    >
      {/* Header */}
      {!sidebarCollapsed && (
        <div
          className="flex items-center"
          style={{ padding: '14px 10px 8px', gap: '2px' }}
        >
          <span
            className="flex-1"
            style={{
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-muted)',
              paddingLeft: '4px',
            }}
          >
            Projects
          </span>
          <IconButton
            aria-label={sortByRecent ? 'Sort manually' : 'Sort by recent'}
            title={sortByRecent ? 'Sort manually' : 'Sort by recent'}
            active={sortByRecent}
            onClick={() => setSortByRecent((v) => !v)}
          >
            <SortIcon active={sortByRecent} />
          </IconButton>
          <IconButton
            aria-label="Add workspace"
            title="Add workspace"
            onClick={addWorkspace}
          >
            <Add size={13} color="currentColor" />
          </IconButton>
        </div>
      )}

      {/* Workspace list */}
      <div className="flex-1 overflow-y-auto" style={{ padding: '2px 6px 8px' }}>
        {workspaces.length === 0 && !sidebarCollapsed && (
          <div
            className="flex flex-col items-center"
            style={{ gap: '12px', padding: '48px 8px' }}
          >
            <p
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              No projects yet
            </p>
            <button
              className="btn-press inline-flex items-center"
              style={{
                height: '34px',
                gap: '8px',
                padding: '0 14px',
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
              onClick={addWorkspace}
            >
              <FolderOpen size={15} color="currentColor" />
              Open Workspace
            </button>
          </div>
        )}

        {sortedWorkspaces.map((workspace) => {
          const isWsCollapsed = collapsedWorkspaces.has(workspace.id)
          const workspaceChats = chats
            .filter((c) => c.workspaceId === workspace.id)
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() -
                new Date(a.updatedAt).getTime()
            )
          const isExpanded = expandedChatSets.has(workspace.id)
          const visibleChats = isExpanded
            ? workspaceChats
            : workspaceChats.slice(0, CHATS_PREVIEW_COUNT)
          const hasMore = workspaceChats.length > CHATS_PREVIEW_COUNT

          return (
            <div key={workspace.id} style={{ marginBottom: '2px' }}>
              {/* Workspace header row */}
              <div
                className="group flex select-none items-center"
                style={{
                  padding: '3px 4px',
                  gap: '4px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
                onClick={() => toggleWorkspace(workspace.id)}
                onContextMenu={(e) =>
                  handleWorkspaceContext(e, workspace.id, workspace.name)
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-elevated)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                {/* Chevron */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    width: 14,
                    color: 'var(--text-muted)',
                    transform: isWsCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                    transition: 'transform 220ms var(--ease-out)',
                  }}
                >
                  <ChevronRight size={14} />
                </div>

                {/* Workspace icon */}
                <button
                  aria-label="Change workspace icon"
                  title="Change icon"
                  className="btn-press shrink-0 flex items-center justify-center"
                  style={{ width: 14, height: 14, padding: 0 }}
                  onClick={(e) => {
                    e.stopPropagation()
                    setIconPicker({
                      workspaceId: workspace.id,
                      currentIcon: workspace.icon ?? 'folder',
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }}
                >
                  <WorkspaceIcon
                    iconId={workspace.icon ?? 'folder'}
                    size={13}
                  />
                </button>

                {/* Workspace name */}
                {!sidebarCollapsed && (
                  <span
                    className="flex-1 truncate"
                    style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {workspace.name}
                  </span>
                )}

                {/* Add chat — visible on hover */}
                {!sidebarCollapsed && (
                  <button
                    aria-label="New chat"
                    title="New chat"
                    className="btn-press flex items-center justify-center rounded opacity-0 group-hover:opacity-100"
                    style={{
                      width: 18,
                      height: 18,
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                      transition: 'opacity 120ms ease',
                      borderRadius: '3px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      addChat(workspace.id)
                      setActiveView('chat')
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-overlay)'
                      e.currentTarget.style.color = 'var(--text-primary)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--text-muted)'
                    }}
                  >
                    <Add size={11} color="currentColor" />
                  </button>
                )}
              </div>

              {/* Chat items — animated expand/collapse */}
              {!sidebarCollapsed && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateRows: isWsCollapsed ? '0fr' : '1fr',
                    transition: `grid-template-rows ${isWsCollapsed ? '150ms' : '220ms'} var(--ease-out)`,
                  }}
                >
                  <div
                    style={{
                      overflow: 'hidden',
                      opacity: isWsCollapsed ? 0 : 1,
                      transition: `opacity ${isWsCollapsed ? '80ms' : '180ms'} var(--ease-out)`,
                    }}
                  >
                <div
                  style={{
                    marginLeft: '10.5px',
                    paddingLeft: '8px',
                    borderLeft: '1px solid var(--border-subtle)',
                    marginTop: '2px',
                    marginBottom: '4px',
                  }}
                >
                  <div className="flex flex-col" style={{ gap: '1px' }}>
                    {visibleChats.map((chat) => (
                      <SidebarItem
                        key={chat.id}
                        label={chat.title}
                        active={chat.id === activeChatId}
                        collapsed={sidebarCollapsed}
                        badge={getBadge(chat.id)}
                        timestamp={relativeTime(chat.updatedAt)}
                        onClick={() => {
                          setActiveChat(chat.id)
                          setActiveView('chat')
                        }}
                        onContextMenu={(e) =>
                          handleChatContext(e, chat.id, chat.title)
                        }
                      />
                    ))}

                    {hasMore && (
                      <button
                        className="btn-press text-left"
                        style={{
                          padding: '2px 8px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          borderRadius: '5px',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }}
                        onClick={() => toggleExpandChats(workspace.id)}
                      >
                        {isExpanded
                          ? 'Show less'
                          : `Show ${workspaceChats.length - CHATS_PREVIEW_COUNT} more`}
                      </button>
                    )}

                    {workspaceChats.length === 0 && (
                      <button
                        className="btn-press flex items-center"
                        style={{
                          height: '26px',
                          gap: '6px',
                          padding: '0 8px',
                          borderRadius: '5px',
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--bg-elevated)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                        onClick={() => {
                          addChat(workspace.id)
                          setActiveView('chat')
                        }}
                      >
                        <Add size={12} color="currentColor" />
                        New Chat
                      </button>
                    )}
                  </div>
                </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div
        className="flex flex-col border-t"
        style={{ borderColor: 'var(--border-subtle)', padding: '6px 6px', gap: '2px' }}
      >
        <FooterButton
          icon={<People size={15} color="currentColor" />}
          label="Agents"
          collapsed={sidebarCollapsed}
          active={activeView === 'agents'}
          onClick={() =>
            setActiveView(activeView === 'agents' ? 'chat' : 'agents')
          }
        />
        <FooterButton
          icon={<ModelHubIcon size={15} />}
          label="Model Hub"
          collapsed={sidebarCollapsed}
          active={activeView === 'models'}
          onClick={() =>
            setActiveView(activeView === 'models' ? 'chat' : 'models')
          }
        />
        <FooterButton
          icon={<Setting2 size={15} color="currentColor" />}
          label="Settings"
          collapsed={sidebarCollapsed}
          active={activeView === 'settings'}
          onClick={() =>
            setActiveView(activeView === 'settings' ? 'chat' : 'settings')
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

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Icon picker */}
      {iconPicker && (
        <WorkspaceIconPicker
          currentIcon={iconPicker.currentIcon}
          x={iconPicker.x}
          y={iconPicker.y}
          onSelect={(icon) => setWorkspaceIcon(iconPicker.workspaceId, icon)}
          onClose={() => setIconPicker(null)}
        />
      )}
    </aside>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

const ModelHubIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.7 22.7507H9.30001C4.36001 22.7507 2.26001 20.6407 2.26001 15.7107V11.2207C2.26001 10.8107 2.60001 10.4707 3.01001 10.4707C3.42001 10.4707 3.76001 10.8107 3.76001 11.2207V15.7107C3.76001 19.8007 5.21001 21.2507 9.30001 21.2507H14.69C18.78 21.2507 20.23 19.8007 20.23 15.7107V11.2207C20.23 10.8107 20.57 10.4707 20.98 10.4707C21.39 10.4707 21.73 10.8107 21.73 11.2207V15.7107C21.74 20.6407 19.63 22.7507 14.7 22.7507Z" />
    <path d="M12 12.75C10.9 12.75 9.9 12.32 9.19 11.53C8.48 10.74 8.15 9.71 8.26 8.61L8.93 1.93C8.97 1.55 9.29 1.25 9.68 1.25H14.35C14.74 1.25 15.06 1.54 15.1 1.93L15.77 8.61C15.88 9.71 15.55 10.74 14.84 11.53C14.1 12.32 13.1 12.75 12 12.75ZM10.35 2.75L9.75 8.76C9.68 9.43 9.88 10.06 10.3 10.52C11.15 11.46 12.85 11.46 13.7 10.52C14.12 10.05 14.32 9.42 14.25 8.76L13.65 2.75H10.35Z" />
    <path d="M18.31 12.75C16.28 12.75 14.47 11.11 14.26 9.09L13.56 2.08C13.54 1.87 13.61 1.66 13.75 1.5C13.89 1.34 14.09 1.25 14.31 1.25H17.36C20.3 1.25 21.67 2.48 22.08 5.5L22.36 8.28C22.48 9.46 22.12 10.58 21.35 11.43C20.58 12.28 19.5 12.75 18.31 12.75ZM15.14 2.75L15.76 8.94C15.89 10.19 17.05 11.25 18.31 11.25C19.07 11.25 19.75 10.96 20.24 10.43C20.72 9.9 20.94 9.19 20.87 8.43L20.59 5.68C20.28 3.42 19.55 2.75 17.36 2.75H15.14Z" />
    <path d="M5.64002 12.75C4.45002 12.75 3.37002 12.28 2.60002 11.43C1.83002 10.58 1.47002 9.46 1.59002 8.28L1.86002 5.53C2.28002 2.48 3.65002 1.25 6.59002 1.25H9.64002C9.85002 1.25 10.05 1.34 10.2 1.5C10.35 1.66 10.41 1.87 10.39 2.08L9.69002 9.09C9.48002 11.11 7.67002 12.75 5.64002 12.75ZM6.59002 2.75C4.40002 2.75 3.67002 3.41 3.35002 5.7L3.08002 8.43C3.00002 9.19 3.23002 9.9 3.71002 10.43C4.19002 10.96 4.87002 11.25 5.64002 11.25C6.90002 11.25 8.07002 10.19 8.19002 8.94L8.81002 2.75H6.59002Z" />
    <path d="M14.5 22.75H9.5C9.09 22.75 8.75 22.41 8.75 22V19.5C8.75 17.4 9.9 16.25 12 16.25C14.1 16.25 15.25 17.4 15.25 19.5V22C15.25 22.41 14.91 22.75 14.5 22.75ZM10.25 21.25H13.75V19.5C13.75 18.24 13.26 17.75 12 17.75C10.74 17.75 10.25 18.24 10.25 19.5V21.25Z" />
  </svg>
)

// ── Small helpers ────────────────────────────────────────────────────────────

const IconButton = ({
  children,
  active,
  onClick,
  ...rest
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  'aria-label'?: string
  title?: string
}) => (
  <button
    {...rest}
    onClick={onClick}
    className="btn-press flex items-center justify-center rounded"
    style={{
      width: 24,
      height: 24,
      borderRadius: '4px',
      color: active ? 'var(--text-secondary)' : 'var(--text-muted)',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'var(--bg-elevated)'
      e.currentTarget.style.color = 'var(--text-secondary)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'transparent'
      e.currentTarget.style.color = active
        ? 'var(--text-secondary)'
        : 'var(--text-muted)'
    }}
  >
    {children}
  </button>
)

const ChevronRight = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.90991 19.9201L15.4299 13.4001C16.1999 12.6301 16.1999 11.3701 15.4299 10.6001L8.90991 4.08008" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const SortIcon = ({ active }: { active: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path
      d="M1.5 3.5h10M3 6.5h7M4.5 9.5h4"
      stroke="currentColor"
      strokeWidth={active ? '1.6' : '1.3'}
      strokeLinecap="round"
    />
  </svg>
)

const FooterButton = ({
  icon,
  label,
  collapsed,
  active,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  collapsed: boolean
  active?: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className="btn-press flex w-full items-center"
    style={{
      height: '30px',
      gap: '8px',
      padding: '0 8px',
      borderRadius: '5px',
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
    {!collapsed && <span className="flex-1 text-left">{label}</span>}
  </button>
)
