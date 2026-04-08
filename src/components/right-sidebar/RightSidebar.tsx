import { useCallback, useRef } from 'react'
import { useUiStore } from '@/stores/uiStore'
import { RightSidebarTabs } from './RightSidebarTabs'
import { RightSidebarCollapsed } from './RightSidebarCollapsed'
import { GitPanel } from './git/GitPanel'
import { TerminalPanel } from './terminal/TerminalPanel'
import { FileExplorerPanel } from './files/FileExplorerPanel'

const RESIZE_HANDLE_WIDTH = 4

export const RightSidebar = () => {
  const {
    rightSidebarWidth,
    rightSidebarCollapsed,
    rightSidebarTab,
    rightSidebarOpen,
    setRightSidebarWidth,
    toggleRightSidebar,
    setRightSidebarTab,
  } = useUiStore()

  const resizing = useRef(false)

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      resizing.current = true

      const startX = e.clientX
      const startWidth = rightSidebarWidth

      const handleMove = (moveEvent: MouseEvent) => {
        if (!resizing.current) return
        // Inverted delta: drag left increases width
        const delta = startX - moveEvent.clientX
        setRightSidebarWidth(startWidth + delta)
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
    [rightSidebarWidth, setRightSidebarWidth]
  )

  const handleDoubleClickEdge = useCallback(() => {
    setRightSidebarWidth(340)
  }, [setRightSidebarWidth])

  if (!rightSidebarOpen) return null

  return (
    <aside
      className="relative flex shrink-0 flex-col border-l"
      style={{
        width: rightSidebarWidth,
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        transition: resizing.current
          ? 'none'
          : 'width var(--duration-smooth) var(--ease-default)',
      }}
    >
      {/* Resize handle on LEFT edge */}
      <div
        className="absolute left-0 top-0 z-10 h-full cursor-col-resize"
        style={{ width: RESIZE_HANDLE_WIDTH }}
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClickEdge}
      />

      {rightSidebarCollapsed ? (
        <RightSidebarCollapsed
          activeTab={rightSidebarTab}
          onExpand={(tab) => {
            setRightSidebarTab(tab)
            toggleRightSidebar()
          }}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <RightSidebarTabs
            activeTab={rightSidebarTab}
            collapsed={rightSidebarCollapsed}
            onTabClick={setRightSidebarTab}
            onCollapse={toggleRightSidebar}
          />
          <div className="flex min-h-0 flex-1 flex-col">
            {rightSidebarTab === 'git' && <GitPanel />}
            {rightSidebarTab === 'terminal' && <TerminalPanel />}
            {rightSidebarTab === 'files' && <FileExplorerPanel />}
          </div>
        </div>
      )}
    </aside>
  )
}
