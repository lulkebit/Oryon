import { create } from 'zustand'
import type { ActiveView, Theme } from '@/lib/types'
import {
  getTheme,
  setTheme as ipcSetTheme,
  getSetting,
  setSetting,
} from '@/lib/ipc'

export type RightSidebarTab = 'git' | 'terminal' | 'files'

interface UiState {
  theme: Theme
  resolvedTheme: 'dark' | 'light'
  sidebarWidth: number
  sidebarCollapsed: boolean
  activeView: ActiveView
  rightSidebarWidth: number
  rightSidebarCollapsed: boolean
  rightSidebarTab: RightSidebarTab
  rightSidebarOpen: boolean

  setTheme: (theme: Theme) => void
  setSidebarWidth: (width: number) => void
  toggleSidebar: () => void
  setActiveView: (view: ActiveView) => void
  setRightSidebarWidth: (width: number) => void
  toggleRightSidebar: () => void
  setRightSidebarTab: (tab: RightSidebarTab) => void
  setRightSidebarOpen: (open: boolean) => void
  init: () => Promise<void>
}

const SIDEBAR_MIN = 48
const SIDEBAR_MAX = 400
const SIDEBAR_DEFAULT = 260
const SIDEBAR_COLLAPSE_THRESHOLD = 120

const RIGHT_SIDEBAR_MIN = 48
const RIGHT_SIDEBAR_MAX = 720
const RIGHT_SIDEBAR_DEFAULT = 340
const RIGHT_SIDEBAR_COLLAPSE_THRESHOLD = 160

let sidebarPersistTimer: ReturnType<typeof setTimeout> | null = null
let rightSidebarPersistTimer: ReturnType<typeof setTimeout> | null = null
let rightSidebarLastExpandedWidth = RIGHT_SIDEBAR_DEFAULT

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
  rightSidebarWidth: RIGHT_SIDEBAR_DEFAULT,
  rightSidebarCollapsed: false,
  rightSidebarTab: 'git',
  rightSidebarOpen: true,

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

  setRightSidebarWidth: (width) => {
    const clamped = Math.max(RIGHT_SIDEBAR_MIN, Math.min(RIGHT_SIDEBAR_MAX, width))
    const collapsed = clamped <= RIGHT_SIDEBAR_COLLAPSE_THRESHOLD
    const finalWidth = collapsed ? RIGHT_SIDEBAR_MIN : clamped
    if (!collapsed) rightSidebarLastExpandedWidth = finalWidth
    set({ rightSidebarWidth: finalWidth, rightSidebarCollapsed: collapsed })

    if (rightSidebarPersistTimer) clearTimeout(rightSidebarPersistTimer)
    rightSidebarPersistTimer = setTimeout(() => {
      setSetting('right_sidebar_width', String(finalWidth)).catch(console.error)
    }, 500)
  },

  toggleRightSidebar: () => {
    const { rightSidebarCollapsed } = get()
    if (rightSidebarCollapsed) {
      const w = rightSidebarLastExpandedWidth
      set({ rightSidebarWidth: w, rightSidebarCollapsed: false })
      setSetting('right_sidebar_width', String(w)).catch(console.error)
    } else {
      set({ rightSidebarWidth: RIGHT_SIDEBAR_MIN, rightSidebarCollapsed: true })
      setSetting('right_sidebar_width', String(RIGHT_SIDEBAR_MIN)).catch(console.error)
    }
  },

  setRightSidebarTab: (tab) => {
    set({ rightSidebarTab: tab })
    setSetting('right_sidebar_tab', tab).catch(console.error)
  },

  setRightSidebarOpen: (open) => {
    set({ rightSidebarOpen: open })
    setSetting('right_sidebar_open', open ? '1' : '0').catch(console.error)
  },

  init: async () => {
    try {
      const [theme, savedWidth, savedRightWidth, savedRightTab, savedRightOpen] =
        await Promise.all([
          getTheme(),
          getSetting('sidebar_width'),
          getSetting('right_sidebar_width'),
          getSetting('right_sidebar_tab'),
          getSetting('right_sidebar_open'),
        ])

      const resolved = resolveTheme(theme)
      applyTheme(resolved)

      const width = savedWidth ? parseInt(savedWidth, 10) : SIDEBAR_DEFAULT
      const validWidth =
        isNaN(width) || width < SIDEBAR_MIN || width > SIDEBAR_MAX
          ? SIDEBAR_DEFAULT
          : width
      const collapsed = validWidth <= SIDEBAR_COLLAPSE_THRESHOLD

      const rw = savedRightWidth ? parseInt(savedRightWidth, 10) : RIGHT_SIDEBAR_DEFAULT
      const validRw =
        isNaN(rw) || rw < RIGHT_SIDEBAR_MIN || rw > RIGHT_SIDEBAR_MAX
          ? RIGHT_SIDEBAR_DEFAULT
          : rw
      const rCollapsed = validRw <= RIGHT_SIDEBAR_COLLAPSE_THRESHOLD
      const validTab = ['git', 'terminal', 'files'].includes(savedRightTab ?? '')
        ? (savedRightTab as RightSidebarTab)
        : 'git'
      const rOpen = savedRightOpen !== '0'

      rightSidebarLastExpandedWidth = rCollapsed ? RIGHT_SIDEBAR_DEFAULT : validRw

      set({
        theme,
        resolvedTheme: resolved,
        sidebarWidth: collapsed ? SIDEBAR_MIN : validWidth,
        sidebarCollapsed: collapsed,
        rightSidebarWidth: rCollapsed ? RIGHT_SIDEBAR_MIN : validRw,
        rightSidebarCollapsed: rCollapsed,
        rightSidebarTab: validTab,
        rightSidebarOpen: rOpen,
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
