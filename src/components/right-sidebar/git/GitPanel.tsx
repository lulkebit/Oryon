import { useEffect, useState, useCallback } from 'react'
import { useActiveWorkspacePath } from '@/hooks/useActiveWorkspacePath'
import { useUiStore } from '@/stores/uiStore'
import { gitGetStatus, gitGetFileDiff } from '@/lib/ipc/git'
import type { GitFileStatus, GitStatusResult } from '@/lib/ipc/git'
import { GitFileList } from './GitFileList'
import { DiffViewer } from './DiffViewer'

const RefreshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

export const GitPanel = () => {
  const workspacePath = useActiveWorkspacePath()
  const rightSidebarTab = useUiStore((s) => s.rightSidebarTab)

  const [status, setStatus] = useState<GitStatusResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedFile, setSelectedFile] = useState<GitFileStatus | null>(null)
  const [diffText, setDiffText] = useState<string>('')
  const [diffLoading, setDiffLoading] = useState(false)
  const [showDiff, setShowDiff] = useState(false)

  const fetchStatus = useCallback(async () => {
    if (!workspacePath) return
    setLoading(true)
    setError(null)
    try {
      const result = await gitGetStatus(workspacePath)
      setStatus(result)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [workspacePath])

  // Fetch on mount and workspace change
  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Re-fetch when tab becomes active
  useEffect(() => {
    if (rightSidebarTab === 'git') {
      fetchStatus()
    }
  }, [rightSidebarTab, fetchStatus])

  const handleSelectFile = useCallback(
    async (file: GitFileStatus) => {
      if (!workspacePath) return
      setSelectedFile(file)
      setShowDiff(true)
      setDiffLoading(true)
      try {
        const diff = await gitGetFileDiff(
          workspacePath,
          file.path,
          file.staged,
          file.status === '?'
        )
        setDiffText(diff)
      } catch (e) {
        setDiffText('')
        console.error(e)
      } finally {
        setDiffLoading(false)
      }
    },
    [workspacePath]
  )

  if (!workspacePath) {
    return (
      <EmptyState message="No active workspace. Open one from the left sidebar." />
    )
  }

  if (loading && !status) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center" style={{ gap: '8px', padding: '24px' }}>
        <p style={{ fontSize: '12px', color: 'var(--status-error)', textAlign: 'center' }}>{error}</p>
        <button
          onClick={fetchStatus}
          className="btn-press"
          style={{ fontSize: '12px', color: 'var(--accent)', padding: '4px 12px', borderRadius: '6px', background: 'var(--bg-elevated)' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (status && !status.isRepo) {
    return <EmptyState message="Not a git repository." />
  }

  const totalFiles = status?.files.length ?? 0

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Branch header */}
      <div
        className="flex shrink-0 items-center border-b"
        style={{
          height: '36px',
          padding: '0 12px',
          gap: '8px',
          borderColor: 'var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" />
          <path d="M13 6h3a2 2 0 0 1 2 2v7" /><line x1="6" y1="9" x2="6" y2="21" />
        </svg>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {status?.branch ?? '…'}
        </span>
        {status && (status.ahead > 0 || status.behind > 0) && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
            {status.ahead > 0 && `↑${status.ahead}`}
            {status.ahead > 0 && status.behind > 0 && ' '}
            {status.behind > 0 && `↓${status.behind}`}
          </span>
        )}
        <button
          onClick={fetchStatus}
          className="btn-press flex items-center justify-center"
          style={{ width: '24px', height: '24px', borderRadius: '4px', color: loading ? 'var(--accent)' : 'var(--text-muted)' }}
          title="Refresh"
          aria-label="Refresh git status"
        >
          <RefreshIcon />
        </button>
      </div>

      {totalFiles === 0 ? (
        <EmptyState message="Working tree clean. No changes to show." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          {showDiff ? (
            <>
              {/* Diff header */}
              <div
                className="flex shrink-0 items-center border-b"
                style={{
                  height: '32px',
                  padding: '0 8px',
                  gap: '6px',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <button
                  onClick={() => setShowDiff(false)}
                  className="btn-press flex items-center justify-center"
                  style={{ width: '24px', height: '24px', borderRadius: '4px', color: 'var(--text-muted)' }}
                  title="Back to file list"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFile?.path}
                </span>
              </div>
              {diffLoading ? (
                <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading diff…</div>
              ) : (
                <DiffViewer diffText={diffText} filePath={selectedFile?.path ?? ''} />
              )}
            </>
          ) : (
            <GitFileList
              files={status?.files ?? []}
              selectedPath={selectedFile?.path ?? null}
              selectedStaged={selectedFile?.staged ?? null}
              onSelect={handleSelectFile}
            />
          )}
        </div>
      )}
    </div>
  )
}

const EmptyState = ({ message }: { message: string }) => (
  <div
    className="flex flex-1 items-center justify-center"
    style={{ padding: '24px', textAlign: 'center' }}
  >
    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{message}</p>
  </div>
)
