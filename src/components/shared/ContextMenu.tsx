import { useEffect, useRef } from 'react'
import { useMenuKeyboard } from './useMenuKeyboard'

export interface ContextMenuItem {
  label: string
  onClick: () => void
  variant?: 'default' | 'danger'
  disabled?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement>(null)
  // Capture the element that had focus before the menu opened so we can
  // restore it on close — mirrors native menu behaviour.
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    return () => {
      restoreRef.current?.focus?.()
    }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useMenuKeyboard({
    open: true,
    onClose,
    containerRef: ref,
    triggerRef: restoreRef,
  })

  return (
    <div
      ref={ref}
      role="menu"
      aria-orientation="vertical"
      className="popover-enter fixed z-50 border"
      style={{
        left: x,
        top: y,
        minWidth: '180px',
        padding: '4px',
        borderRadius: '8px',
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border-default)',
        boxShadow: 'var(--shadow-md)',
        outline: 'none',
        ['--popover-origin' as string]: 'top left',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.onClick()
            onClose()
          }}
          className="btn-press flex w-full items-center text-left"
          style={{
            height: '30px',
            padding: '0 10px',
            borderRadius: '5px',
            fontSize: '13px',
            color:
              item.variant === 'danger'
                ? 'var(--status-error)'
                : 'var(--text-primary)',
            opacity: item.disabled ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (!item.disabled) {
              e.currentTarget.style.background = 'var(--bg-overlay)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          onFocus={(e) => {
            e.currentTarget.style.background = 'var(--bg-overlay)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
