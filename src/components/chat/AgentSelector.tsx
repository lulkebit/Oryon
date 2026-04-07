import { useEffect, useRef, useState, useCallback } from 'react'
import { People, ArrowDown2, Add, Setting2 } from 'iconsax-react'
import { useAgentStore } from '@/stores/agentStore'
import type { Agent } from '@/lib/types'

interface AgentSelectorProps {
  chatId: string
  onOpenConfig: () => void
}

export const AgentSelector = ({ chatId, onOpenConfig }: AgentSelectorProps) => {
  const { agents, loadAgents, getChatAgent, setChatAgent, createAgent } =
    useAgentStore()
  const [open, setOpen] = useState(false)
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  useEffect(() => {
    if (!chatId) return
    getChatAgent(chatId).then((a) => {
      setActiveAgent(a)
      if (!a && agents.length > 0) {
        setChatAgent(chatId, agents[0].id).then(() =>
          setActiveAgent(agents[0])
        )
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, agents.length])

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const handleSelect = useCallback(
    async (agent: Agent) => {
      await setChatAgent(chatId, agent.id)
      setActiveAgent(agent)
      setOpen(false)
    },
    [chatId, setChatAgent]
  )

  const handleCreate = useCallback(async () => {
    const agent = await createAgent('New Agent')
    await setChatAgent(chatId, agent.id)
    setActiveAgent(agent)
    setOpen(false)
  }, [chatId, createAgent, setChatAgent])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-press flex items-center"
        style={{
          height: '28px',
          gap: '6px',
          padding: '0 10px',
          borderRadius: '6px',
          fontSize: '12px',
          color: activeAgent
            ? 'var(--text-secondary)'
            : 'var(--text-muted)',
          background: 'var(--bg-elevated)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-overlay)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-elevated)'
        }}
      >
        {activeAgent && (
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: activeAgent.color,
              flexShrink: 0,
            }}
          />
        )}
        {!activeAgent && <People size={14} color="currentColor" />}
        {activeAgent?.name ?? 'Select Agent'}
        <ArrowDown2 size={12} color="currentColor" />
      </button>

      {open && (
        <div
          className="popover-enter border"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            minWidth: '220px',
            maxHeight: '320px',
            overflowY: 'auto',
            padding: '4px',
            borderRadius: '10px',
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-default)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
          }}
        >
          {agents.map((a) => {
            const isActive = activeAgent?.id === a.id
            return (
              <button
                key={a.id}
                onClick={() => handleSelect(a)}
                className="btn-press flex w-full items-center"
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  gap: '8px',
                  color: isActive
                    ? 'var(--accent)'
                    : 'var(--text-primary)',
                  fontWeight: isActive ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = 'var(--bg-overlay)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: a.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.name}
                </span>
                {isActive && (
                  <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
                    ✓
                  </span>
                )}
              </button>
            )
          })}

          <div
            style={{
              height: '1px',
              margin: '4px 0',
              background: 'var(--border-subtle)',
            }}
          />

          <button
            onClick={handleCreate}
            className="btn-press flex w-full items-center"
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-overlay)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Add size={14} color="currentColor" />
            New Agent
          </button>

          <button
            onClick={() => {
              onOpenConfig()
              setOpen(false)
            }}
            className="btn-press flex w-full items-center"
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: '6px',
              fontSize: '12px',
              color: 'var(--text-muted)',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-overlay)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Setting2 size={14} color="currentColor" />
            Configure Agents…
          </button>
        </div>
      )}
    </div>
  )
}
