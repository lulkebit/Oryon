import { useCallback } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Minus, Square, X } from 'lucide-react'

const appWindow = getCurrentWindow()

export const Titlebar = () => {
  const handleMinimize = useCallback(() => {
    appWindow.minimize()
  }, [])

  const handleMaximize = useCallback(async () => {
    const maximized = await appWindow.isMaximized()
    if (maximized) {
      appWindow.unmaximize()
    } else {
      appWindow.maximize()
    }
  }, [])

  const handleClose = useCallback(() => {
    appWindow.close()
  }, [])

  const handleDrag = useCallback((e: React.MouseEvent) => {
    if (e.detail === 2) {
      handleMaximize()
      return
    }
    appWindow.startDragging()
  }, [handleMaximize])

  return (
    <header
      className="flex h-10 shrink-0 items-center border-b select-none"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* macOS traffic light spacing */}
      <div className="w-[78px] shrink-0" />

      {/* Draggable title area */}
      <div
        className="flex flex-1 items-center justify-center cursor-default"
        onMouseDown={handleDrag}
      >
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Oryon
        </span>
      </div>

      {/* Window controls (hidden on macOS, shown on Windows/Linux) */}
      <div className="hidden items-center">
        <button
          onClick={handleMinimize}
          className="flex h-10 w-11 items-center justify-center transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="flex h-10 w-11 items-center justify-center transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          onClick={handleClose}
          className="flex h-10 w-11 items-center justify-center transition-colors hover:bg-red-500 hover:text-white"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  )
}
