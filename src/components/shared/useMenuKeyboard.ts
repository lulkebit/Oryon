import { useCallback, useEffect, useRef, type RefObject } from 'react'

interface UseMenuKeyboardOptions {
  open: boolean
  onClose: () => void
  /** Menu container element — all `[role="menuitem"]` descendants are targets. */
  containerRef: RefObject<HTMLElement | null>
  /**
   * The trigger that opened the menu. Focus is restored to this element on
   * close so keyboard users don't get dropped at the top of the page.
   */
  triggerRef?: RefObject<HTMLElement | null>
  /**
   * When true, Tab/Shift+Tab closes the menu (standard menu behaviour).
   * Set to false for mega-menus that should trap focus. Defaults to true.
   */
  closeOnTab?: boolean
}

const MENUITEM_SELECTOR =
  '[role="menuitem"]:not([aria-disabled="true"]):not([disabled])'

const getItems = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(MENUITEM_SELECTOR))

/**
 * Turns a plain dropdown into an accessible menu:
 *
 * - Focuses the first `[role="menuitem"]` on open
 * - ArrowUp / ArrowDown / Home / End to move focus between items
 * - Escape (and optionally Tab) to close
 * - Restores focus to the trigger on close
 *
 * The caller is responsible for setting `role="menu"` on the container and
 * `role="menuitem"` on each focusable item.
 */
export function useMenuKeyboard({
  open,
  onClose,
  containerRef,
  triggerRef,
  closeOnTab = true,
}: UseMenuKeyboardOptions) {
  const wasOpen = useRef(false)

  // Focus first item on open; restore focus on close.
  useEffect(() => {
    if (open) {
      wasOpen.current = true
      const raf = requestAnimationFrame(() => {
        const container = containerRef.current
        if (!container) return
        const items = getItems(container)
        if (items.length > 0) items[0].focus()
      })
      return () => cancelAnimationFrame(raf)
    }

    if (wasOpen.current) {
      wasOpen.current = false
      // Only restore if focus is still inside the (now closing) menu's trigger
      // context; avoids stealing focus from an intentional navigation.
      const trigger = triggerRef?.current
      if (trigger) {
        const active = document.activeElement as HTMLElement | null
        if (!active || active === document.body) {
          trigger.focus()
        }
      }
    }
  }, [open, containerRef, triggerRef])

  // Keyboard navigation within the menu.
  useEffect(() => {
    if (!open) return
    const container = containerRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = getItems(container)
      if (items.length === 0) return
      const active = document.activeElement as HTMLElement | null
      const currentIndex = active ? items.indexOf(active) : -1

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault()
          const next = items[(currentIndex + 1) % items.length] ?? items[0]
          next.focus()
          break
        }
        case 'ArrowUp': {
          e.preventDefault()
          const prev =
            items[(currentIndex - 1 + items.length) % items.length] ??
            items[items.length - 1]
          prev.focus()
          break
        }
        case 'Home': {
          e.preventDefault()
          items[0].focus()
          break
        }
        case 'End': {
          e.preventDefault()
          items[items.length - 1].focus()
          break
        }
        case 'Escape': {
          e.preventDefault()
          e.stopPropagation()
          onClose()
          break
        }
        case 'Tab': {
          if (closeOnTab) {
            // Standard menu convention: Tab moves out of the menu.
            onClose()
          }
          break
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [open, containerRef, onClose, closeOnTab])

  // Convenience: an onKeyDown that consumers can put on their trigger button
  // to open the menu via ArrowDown / ArrowUp / Enter / Space.
  const getTriggerHandlers = useCallback(
    (setOpen: (next: boolean) => void) => ({
      onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
        if (
          e.key === 'ArrowDown' ||
          e.key === 'ArrowUp' ||
          e.key === 'Enter' ||
          e.key === ' '
        ) {
          e.preventDefault()
          setOpen(true)
        }
      },
    }),
    []
  )

  return { getTriggerHandlers }
}
