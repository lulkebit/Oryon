import { create } from 'zustand'
import type { ActiveView, Theme } from '@/lib/types'
import {
  getTheme,
  setTheme as ipcSetTheme,
  getSetting,
  setSetting,
} from '@/lib/ipc'

interface UiState {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  sidebarWidth: number
  sidebarCollapsed: boolean
  activeView: ActiveView

  setTheme: (theme: Theme) => void
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  setActiveView: (view: ActiveView) => void
  init: () => Promise<void>
}

const SIDEBAR_MIN = 48
const SIDEBAR_MAX = 400
const SIDEBAR_DEFAULT = 260
const SIDEBAR_COLLAPSE_THRESHOLD = 120

let sidebarPersistTimer: ReturnType<typeof setTimeout> | null = null

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return theme
}

function applyTheme(resolved: 'dark' | 'light') {
  document.documentElement.classList.toggle('light', resolved === 'light')
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'system',
  resolvedTheme: 'dark',
  sidebarWidth: SIDEBAR_DEFAULT,
  sidebarCollapsed: false,
  activeView: 'chat',

  setTheme: (theme) => {
    const resolved = resolveTheme(theme)
    applyTheme(resolved)
    set({ theme, resolvedTheme: resolved })
    ipcSetTheme(theme).catch(console.error)
  },

  setSidebarWidth: (width) => {
    const clamped = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, width))
    const collapsed = clamped <= SIDEBAR_COLLAPSE_THRESHOLD
    const finalWidth = collapsed ? SIDEBAR_MIN : clamped
    set({ sidebarWidth: finalWidth, sidebarCollapsed: collapsed })

    if (sidebarPersistTimer) clearTimeout(sidebarPersistTimer)
    sidebarPersistTimer = setTimeout(() => {
      setSetting('sidebar_width', String(finalWidth)).catch(console.error)
    }, 500)
  },

  toggleSidebar: () => {
    const { sidebarCollapsed } = get()
    if (sidebarCollapsed) {
      set({ sidebarWidth: SIDEBAR_DEFAULT, sidebarCollapsed: false })
      setSetting('sidebar_width', String(SIDEBAR_DEFAULT)).catch(console.error)
    } else {
      set({ sidebarWidth: SIDEBAR_MIN, sidebarCollapsed: true })
      setSetting('sidebar_width', String(SIDEBAR_MIN)).catch(console.error)
    }
  },

  setActiveView: (view) => set({ activeView: view }),

  init: async () => {
    try {
      const [theme, savedWidth] = await Promise.all([
        getTheme(),
        getSetting('sidebar_width'),
      ])

      const resolved = resolveTheme(theme)
      applyTheme(resolved)

      const width = savedWidth ? parseInt(savedWidth, 10) : SIDEBAR_DEFAULT
      const validWidth =
        isNaN(width) || width < SIDEBAR_MIN || width > SIDEBAR_MAX
          ? SIDEBAR_DEFAULT
          : width
      const collapsed = validWidth <= SIDEBAR_COLLAPSE_THRESHOLD

      set({
        theme,
        resolvedTheme: resolved,
        sidebarWidth: collapsed ? SIDEBAR_MIN : validWidth,
        sidebarCollapsed: collapsed,
      })
    } catch {
      applyTheme('dark')
    }
  },
}))

if (typeof window !== 'undefined') {
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      const { theme } = useUiStore.getState()
      if (theme === 'system') {
        const resolved = resolveTheme('system')
        applyTheme(resolved)
        useUiStore.setState({ resolvedTheme: resolved })
      }
    })
}
