import { useCallback, useState, useEffect } from 'react'
import { isTauri } from '@/lib/tauri'

export const Titlebar = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (!isTauri) return
    let cancelled = false

    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      if (cancelled) return
      const win = getCurrentWindow()
      win.isMaximized().then(setIsMaximized)
      win.onResized(() => {
        win.isMaximized().then(setIsMaximized)
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  const handleMinimize = useCallback(async () => {
    if (!isTauri) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    getCurrentWindow().minimize()
  }, [])

  const handleMaximize = useCallback(async () => {
    if (!isTauri) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const win = getCurrentWindow()
    const maximized = await win.isMaximized()
    if (maximized) {
      win.unmaximize()
    } else {
      win.maximize()
    }
    setIsMaximized(!maximized)
  }, [])

  const handleClose = useCallback(async () => {
    if (!isTauri) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    getCurrentWindow().close()
  }, [])

  const handleDrag = useCallback(
    async (e: React.MouseEvent) => {
      if (!isTauri) return
      if (e.detail === 2) {
        handleMaximize()
        return
      }
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      getCurrentWindow().startDragging()
    },
    [handleMaximize]
  )

  return (
    <header
      className="flex shrink-0 items-center border-b select-none"
      style={{
        height: '44px',
        background: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Traffic lights */}
      <div
        className="flex items-center"
        style={{ gap: '8px', padding: '0 16px' }}
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
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
          }}
        >
          Oryon
        </span>
      </div>

      {/* Balance spacer to keep title centered */}
      <div style={{ width: '88px' }} className="shrink-0" />
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
    className="flex items-center justify-center rounded-full transition-colors"
    style={{
      width: '12px',
      height: '12px',
      background: showIcon ? hoverColor : color,
    }}
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
