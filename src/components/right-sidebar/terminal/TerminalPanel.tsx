import { useCallback, useEffect, useState } from 'react'
import { useActiveWorkspacePath } from '@/hooks/useActiveWorkspacePath'
import { ptyCreate, ptyKill } from '@/lib/ipc/pty'
import type { PtySessionInfo } from '@/lib/ipc/pty'
import { TerminalSession } from './TerminalSession'

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
)
const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)

export const TerminalPanel = () => {
  const workspacePath = useActiveWorkspacePath()
  const [sessions, setSessions] = useState<PtySessionInfo[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [spawning, setSpawning] = useState(false)

  const spawnSession = useCallback(async (cwd: string) => {
    if (spawning) return
    setSpawning(true)
    setError(null)
    try {
      const info = await ptyCreate(cwd, 80, 24)
      setSessions((prev) => [...prev, info])
      setActiveSessionId(info.id)
    } catch (e) {
      setError(String(e))
    } finally {
      setSpawning(false)
    }
  }, [spawning])

  // Auto-spawn first session
  useEffect(() => {
    if (!workspacePath || sessions.length > 0) return
    spawnSession(workspacePath)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacePath])

  const handleNewSession = useCallback(() => {
    if (!workspacePath) return
    spawnSession(workspacePath)
  }, [workspacePath, spawnSession])

  const handleCloseSession = useCallback(
    async (sessionId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      await ptyKill(sessionId).catch(console.error)
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId)
        if (activeSessionId === sessionId) {
          setActiveSessionId(next[next.length - 1]?.id ?? null)
        }
        return next
      })
    },
    [activeSessionId]
  )

  const handleSessionExit = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== sessionId)
      if (activeSessionId === sessionId) {
        setActiveSessionId(next[next.length - 1]?.id ?? null)
      }
      return next
    })
  }, [activeSessionId])

  if (!workspacePath) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '24px', textAlign: 'center' }}>
        No active workspace to spawn a terminal in.
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab bar */}
      <div
        className="flex shrink-0 items-center border-b overflow-x-auto"
        style={{
          height: '36px',
          minHeight: '36px',
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-surface)',
          gap: '2px',
          padding: '0 4px',
        }}
      >
        {sessions.map((session) => {
          const active = session.id === activeSessionId
          return (
            <button
              key={session.id}
              onClick={() => setActiveSessionId(session.id)}
              className="btn-press flex shrink-0 items-center"
              style={{
                height: '28px',
                padding: '0 8px',
                gap: '6px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: active ? 500 : 400,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                background: active ? 'var(--bg-overlay)' : 'transparent',
              }}
            >
              <span>{session.title}</span>
              <span
                role="button"
                onClick={(e) => handleCloseSession(session.id, e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  color: 'var(--text-muted)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }}
                title="Close terminal"
                aria-label="Close terminal"
              >
                <CloseIcon />
              </span>
            </button>
          )
        })}

        <button
          onClick={handleNewSession}
          disabled={spawning}
          className="btn-press flex shrink-0 items-center justify-center"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '5px',
            color: 'var(--text-muted)',
            opacity: spawning ? 0.5 : 1,
          }}
          title="New terminal"
          aria-label="New terminal"
        >
          <PlusIcon />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex shrink-0 items-center justify-between"
          style={{ padding: '6px 12px', background: 'rgba(248,113,113,0.1)', borderBottom: '1px solid var(--border-subtle)' }}
        >
          <span style={{ fontSize: '11px', color: 'var(--status-error)' }}>{error}</span>
          <button
            onClick={() => workspacePath && spawnSession(workspacePath)}
            style={{ fontSize: '11px', color: 'var(--accent)', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-elevated)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Terminal sessions (all rendered, toggled via display:none to preserve backscroll) */}
      <div className="flex min-h-0 flex-1 flex-col" style={{ position: 'relative' }}>
        {sessions.length === 0 && !spawning && (
          <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            No active terminals
          </div>
        )}
        {sessions.map((session) => (
          <TerminalSession
            key={session.id}
            sessionId={session.id}
            active={session.id === activeSessionId}
            onExit={handleSessionExit}
          />
        ))}
      </div>
    </div>
  )
}
