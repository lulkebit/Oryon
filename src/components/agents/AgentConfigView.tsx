import { useEffect, useState, useCallback } from 'react'
import { Add, Trash, ArrowLeft } from 'iconsax-react'
import { useAgentStore, ALL_TOOLS, AGENT_COLORS } from '@/stores/agentStore'
import type { Agent } from '@/lib/types'

interface AgentConfigViewProps {
  onBack: () => void
}

export const AgentConfigView = ({ onBack }: AgentConfigViewProps) => {
  const { agents, loadAgents, createAgent, updateAgent, deleteAgent } =
    useAgentStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  useEffect(() => {
    if (!selectedId && agents.length > 0) {
      setSelectedId(agents[0].id)
    }
  }, [agents, selectedId])

  const selected = agents.find((a) => a.id === selectedId) ?? null

  const handleCreate = useCallback(async () => {
    const agent = await createAgent('New Agent')
    setSelectedId(agent.id)
  }, [createAgent])

  const handleDelete = useCallback(
    async (id: string) => {
      if (agents.length <= 1) return
      await deleteAgent(id)
      setSelectedId(agents.find((a) => a.id !== id)?.id ?? null)
    },
    [agents, deleteAgent]
  )

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center border-b"
        style={{
          height: '52px',
          padding: '0 24px',
          gap: '12px',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center justify-center transition-colors"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-elevated)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <ArrowLeft size={16} color="var(--text-secondary)" />
        </button>
        <h1
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Agents
        </h1>
      </div>

      <div className="flex flex-1" style={{ overflow: 'hidden' }}>
        {/* Agent list */}
        <div
          className="flex flex-col border-r"
          style={{
            width: '240px',
            flexShrink: 0,
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="flex-1"
            style={{ overflowY: 'auto', padding: '8px' }}
          >
            {agents.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="flex w-full items-center transition-colors"
                style={{
                  height: '36px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  gap: '8px',
                  fontSize: '13px',
                  color:
                    a.id === selectedId
                      ? 'var(--text-primary)'
                      : 'var(--text-secondary)',
                  fontWeight: a.id === selectedId ? 500 : 400,
                  background:
                    a.id === selectedId
                      ? 'var(--bg-elevated)'
                      : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (a.id !== selectedId)
                    e.currentTarget.style.background = 'var(--bg-elevated)'
                }}
                onMouseLeave={(e) => {
                  if (a.id !== selectedId)
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
              </button>
            ))}
          </div>
          <div
            style={{
              padding: '8px',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <button
              onClick={handleCreate}
              className="flex w-full items-center justify-center transition-colors"
              style={{
                height: '32px',
                borderRadius: '8px',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-overlay)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--bg-elevated)'
              }}
            >
              <Add size={14} color="currentColor" />
              New Agent
            </button>
          </div>
        </div>

        {/* Agent editor */}
        {selected ? (
          <AgentEditor
            key={selected.id}
            agent={selected}
            onUpdate={updateAgent}
            onDelete={() => handleDelete(selected.id)}
            canDelete={agents.length > 1}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}
            >
              Select an agent to configure
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function AgentEditor({
  agent,
  onUpdate,
  onDelete,
  canDelete,
}: {
  agent: Agent
  onUpdate: (agent: Agent) => Promise<void>
  onDelete: () => void
  canDelete: boolean
}) {
  const [name, setName] = useState(agent.name)
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt)
  const [tools, setTools] = useState<string[]>(agent.tools)
  const [temperature, setTemperature] = useState(agent.temperature)
  const [maxTokens, setMaxTokens] = useState(agent.maxTokens)
  const [color, setColor] = useState(agent.color)
  const [dirty, setDirty] = useState(false)

  const save = useCallback(async () => {
    await onUpdate({
      ...agent,
      name,
      systemPrompt,
      tools,
      temperature,
      maxTokens,
      color,
    })
    setDirty(false)
  }, [agent, name, systemPrompt, tools, temperature, maxTokens, color, onUpdate])

  const toggleTool = useCallback((tool: string) => {
    setTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    )
    setDirty(true)
  }, [])

  const markDirty = useCallback(() => setDirty(true), [])

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ overflow: 'hidden' }}
    >
      <div className="flex-1" style={{ overflowY: 'auto', padding: '24px' }}>
        <div className="flex flex-col" style={{ gap: '20px', maxWidth: '560px' }}>
          {/* Name */}
          <FieldGroup label="Name">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                markDirty()
              }}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </FieldGroup>

          {/* Color */}
          <FieldGroup label="Color">
            <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
              {AGENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c)
                    markDirty()
                  }}
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: c,
                    border:
                      c === color
                        ? '2px solid var(--text-primary)'
                        : '2px solid transparent',
                    outline: 'none',
                  }}
                />
              ))}
            </div>
          </FieldGroup>

          {/* System prompt */}
          <FieldGroup label="System Prompt">
            <textarea
              value={systemPrompt}
              onChange={(e) => {
                setSystemPrompt(e.target.value)
                markDirty()
              }}
              rows={6}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                lineHeight: '20px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'var(--font-mono)',
              }}
            />
          </FieldGroup>

          {/* Temperature */}
          <FieldGroup label={`Temperature: ${temperature.toFixed(1)}`}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => {
                setTemperature(parseFloat(e.target.value))
                markDirty()
              }}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
          </FieldGroup>

          {/* Max tokens */}
          <FieldGroup label="Max Tokens">
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => {
                setMaxTokens(parseInt(e.target.value, 10) || 0)
                markDirty()
              }}
              min={128}
              max={32768}
              step={128}
              style={{
                width: '160px',
                height: '36px',
                padding: '0 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-default)',
                background: 'var(--bg-base)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </FieldGroup>

          {/* Tools */}
          <FieldGroup label="Allowed Tools">
            <div className="flex flex-col" style={{ gap: '4px' }}>
              {ALL_TOOLS.map((tool) => (
                <label
                  key={tool}
                  className="flex items-center"
                  style={{
                    gap: '8px',
                    height: '28px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={tools.includes(tool)}
                    onChange={() => toggleTool(tool)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {tool}
                  </span>
                </label>
              ))}
            </div>
          </FieldGroup>

          {/* Delete */}
          {canDelete && (
            <div>
              <button
                onClick={onDelete}
                className="flex items-center transition-colors"
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  gap: '6px',
                  fontSize: '12px',
                  color: 'var(--status-error)',
                  background: 'transparent',
                  border: '1px solid var(--status-error)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    'color-mix(in srgb, var(--status-error), transparent 90%)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <Trash size={14} color="currentColor" />
                Delete Agent
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Save bar */}
      {dirty && (
        <div
          className="flex items-center justify-end border-t"
          style={{
            height: '52px',
            padding: '0 24px',
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <button
            onClick={save}
            className="flex items-center transition-colors"
            style={{
              height: '32px',
              padding: '0 16px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--bg-base)',
              background: 'var(--accent)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  )
}

function FieldGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col" style={{ gap: '6px' }}>
      <label
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
