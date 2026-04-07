import { useEffect } from 'react'
import { Titlebar } from '@/components/titlebar/Titlebar'
import { Sidebar } from '@/components/sidebar'
import { ChatView } from '@/components/chat'
import { ModelHubView } from '@/components/model-hub'
import { SettingsView } from '@/components/settings'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useEngineStore } from '@/stores/engineStore'

export const App = () => {
  const { activeView, init } = useUiStore()
  const { loadWorkspaces } = useWorkspaceStore()
  const { init: initEngine } = useEngineStore()

  useEffect(() => {
    init()
    loadWorkspaces()
    initEngine()
  }, [init, loadWorkspaces, initEngine])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main
          className="flex flex-1 flex-col overflow-hidden"
          style={{ background: 'var(--bg-base)' }}
        >
          {activeView === 'chat' && <ChatView />}
          {activeView === 'models' && <ModelHubView />}
          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  )
}
