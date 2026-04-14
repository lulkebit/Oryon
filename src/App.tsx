import { useEffect } from 'react'
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'
import { Titlebar } from '@/components/titlebar/Titlebar'
import { Sidebar } from '@/components/sidebar'
import { ChatView } from '@/components/chat'
import { ModelHubView } from '@/components/model-hub'
import { SettingsView } from '@/components/settings'
import { AgentConfigView } from '@/components/agents/AgentConfigView'
import { useUiStore } from '@/stores/uiStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useEngineStore } from '@/stores/engineStore'
import { useChatStore } from '@/stores/chatStore'
import { useAgentStore } from '@/stores/agentStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { RightSidebar } from '@/components/right-sidebar'

export const App = () => {
  const { activeView, init } = useUiStore()
  const { loadWorkspaces } = useWorkspaceStore()
  const { init: initEngine } = useEngineStore()

  useGlobalShortcuts()

  useEffect(() => {
    init()
    loadWorkspaces()
    useChatStore.getState().setupListeners()
    useAgentStore.getState().loadAgents()
    // Settings must be loaded before the engine so auto-load on startup
    // can read defaultModelId, autoLoadDefaultEnabled and gpuLayers.
    useSettingsStore
      .getState()
      .load()
      .finally(() => {
        initEngine()
      })
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
          <ErrorBoundary fallbackTitle="View failed to load">
            <div key={activeView} className="anim-slide-up flex h-full flex-col">
              {activeView === 'chat' && <ChatView />}
              {activeView === 'models' && <ModelHubView />}
              {activeView === 'settings' && <SettingsView />}
              {activeView === 'agents' && (
                <AgentConfigView
                  onBack={() => useUiStore.getState().setActiveView('chat')}
                />
              )}
            </div>
          </ErrorBoundary>
        </main>
        <RightSidebar />
      </div>
    </div>
  )
}
