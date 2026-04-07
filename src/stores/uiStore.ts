import { create } from 'zustand'
import type { ActiveView, Theme } from '@/lib/types'
import { getTheme, setTheme as ipcSetTheme } from '@/lib/ipc'

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
  initTheme: () => Promise<void>
}

const SIDEBAR_MIN = 48
const SIDEBAR_MAX = 400
const SIDEBAR_DEFAULT = 260
const SIDEBAR_COLLAPSE_THRESHOLD = 120

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
    set({
      sidebarWidth: collapsed ? SIDEBAR_MIN : clamped,
      sidebarCollapsed: collapsed,
    })
  },

  toggleSidebar: () => {
    const { sidebarCollapsed } = get()
    if (sidebarCollapsed) {
      set({ sidebarWidth: SIDEBAR_DEFAULT, sidebarCollapsed: false })
    } else {
      set({ sidebarWidth: SIDEBAR_MIN, sidebarCollapsed: true })
    }
  },

  setActiveView: (view) => set({ activeView: view }),

  initTheme: async () => {
    try {
      const theme = await getTheme()
      const resolved = resolveTheme(theme)
      applyTheme(resolved)
      set({ theme, resolvedTheme: resolved })
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
