import { useEffect } from 'react'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useEngineStore } from '@/stores/engineStore'

export function useGlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      const shift = e.shiftKey
      const key = e.key.toLowerCase()

      // ⌘ N — New Chat
      if (meta && !shift && key === 'n') {
        e.preventDefault()
        const ws = useWorkspaceStore.getState()
        const first = ws.workspaces[0]
        if (first) {
          ws.addChat(first.id)
          useUiStore.getState().setActiveView('chat')
        }
        return
      }

      // ⌘ , — Open Settings
      if (meta && key === ',') {
        e.preventDefault()
        const ui = useUiStore.getState()
        ui.setActiveView(ui.activeView === 'settings' ? 'chat' : 'settings')
        return
      }

      // ⌘ B — Toggle Sidebar
      if (meta && !shift && key === 'b') {
        e.preventDefault()
        useUiStore.getState().toggleSidebar()
        return
      }

      // ⌘ ⇧ M — Model Hub
      if (meta && shift && key === 'm') {
        e.preventDefault()
        const ui = useUiStore.getState()
        ui.setActiveView(ui.activeView === 'models' ? 'chat' : 'models')
        return
      }

      // ⌘ ⇧ A — Agents
      if (meta && shift && key === 'a') {
        e.preventDefault()
        const ui = useUiStore.getState()
        ui.setActiveView(ui.activeView === 'agents' ? 'chat' : 'agents')
        return
      }

      // Escape — Stop Generation
      if (key === 'escape') {
        const engine = useEngineStore.getState()
        if (engine.generating) {
          e.preventDefault()
          engine.stopInference()
          return
        }
      }

      // ⌘ L — Focus Chat Input
      if (meta && !shift && key === 'l') {
        e.preventDefault()
        const input = document.querySelector<HTMLTextAreaElement>(
          '[data-chat-input]'
        )
        input?.focus()
        return
      }

      // ⌘ ↑ / ⌘ ↓ — Navigate chats
      if (meta && !shift && (key === 'arrowup' || key === 'arrowdown')) {
        e.preventDefault()
        const ws = useWorkspaceStore.getState()
        const { chats, activeChatId } = ws
        if (chats.length === 0) return

        const currentIdx = chats.findIndex((c) => c.id === activeChatId)
        let nextIdx: number
        if (key === 'arrowup') {
          nextIdx = currentIdx <= 0 ? chats.length - 1 : currentIdx - 1
        } else {
          nextIdx = currentIdx >= chats.length - 1 ? 0 : currentIdx + 1
        }
        ws.setActiveChat(chats[nextIdx].id)
        useUiStore.getState().setActiveView('chat')
        return
      }

      // ⌘ W — Close/deselect chat
      if (meta && !shift && key === 'w') {
        e.preventDefault()
        useWorkspaceStore.getState().setActiveChat(null)
        return
      }

      // ⌘ ⇧ B — Toggle Right Sidebar
      if (meta && shift && key === 'b') {
        e.preventDefault()
        useUiStore.getState().toggleRightSidebar()
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
