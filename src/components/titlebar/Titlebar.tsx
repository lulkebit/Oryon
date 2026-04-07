import { useCallback, useState, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

const appWindow = getCurrentWindow()

export const Titlebar = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    appWindow.isMaximized().then(setIsMaximized)
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized)
    })
    return () => {
      unlisten.then((fn) => fn())
    }
  }, [])

  const handleMinimize = useCallback(() => {
    appWindow.minimize()
  }, [])

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      appWindow.unmaximize()
    } else {
      appWindow.maximize()
    }
  }, [isMaximized])

  const handleClose = useCallback(() => {
    appWindow.close()
  }, [])

  const handleDrag = useCallback(
    (e: React.MouseEvent) => {
      if (e.detail === 2) {
        handleMaximize()
        return
      }
      appWindow.startDragging()
    },
    [handleMaximize]
  )

  return (
    <header
      className="flex h-[44px] shrink-0 items-center border-b select-none"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Traffic lights */}
      <div
        className="flex items-center gap-[8px] px-[16px]"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <TrafficLight
          color="#FF5F57"
          hoverColor="#FF3B30"
          onClick={handleClose}
          aria-label="Close"
          showIcon={hovered}
          icon="close"
        />
        <TrafficLight
          color="#FDBC40"
          hoverColor="#F5A623"
          onClick={handleMinimize}
          aria-label="Minimize"
          showIcon={hovered}
          icon="minimize"
        />
        <TrafficLight
          color="#33C748"
          hoverColor="#2DB83D"
          onClick={handleMaximize}
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          showIcon={hovered}
          icon="maximize"
        />
      </div>

      {/* Draggable title area */}
      <div
        className="flex flex-1 items-center justify-center cursor-default"
        onMouseDown={handleDrag}
      >
        <span
          className="text-[12px] font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Oryon
        </span>
      </div>

      {/* Balance spacer to keep title centered */}
      <div className="w-[88px] shrink-0" />
    </header>
  )
}

const TrafficLight = ({
  color,
  hoverColor,
  onClick,
  'aria-label': ariaLabel,
  showIcon,
  icon,
}: {
  color: string
  hoverColor: string
  onClick: () => void
  'aria-label': string
  showIcon: boolean
  icon: 'close' | 'minimize' | 'maximize'
}) => (
  <button
    onClick={onClick}
    aria-label={ariaLabel}
    className="flex h-[12px] w-[12px] items-center justify-center rounded-full transition-colors"
    style={{ background: showIcon ? hoverColor : color }}
    onMouseDown={(e) => e.stopPropagation()}
  >
    {showIcon && (
      <svg
        width="6"
        height="6"
        viewBox="0 0 6 6"
        fill="none"
        stroke="rgba(0,0,0,0.6)"
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        {icon === 'close' && (
          <>
            <line x1="0.5" y1="0.5" x2="5.5" y2="5.5" />
            <line x1="5.5" y1="0.5" x2="0.5" y2="5.5" />
          </>
        )}
        {icon === 'minimize' && <line x1="0.5" y1="3" x2="5.5" y2="3" />}
        {icon === 'maximize' && (
          <>
            <line x1="0.5" y1="1" x2="3" y2="5" />
            <line x1="5.5" y1="1" x2="3" y2="5" />
          </>
        )}
      </svg>
    )}
  </button>
)
