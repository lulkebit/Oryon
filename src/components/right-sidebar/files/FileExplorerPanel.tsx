import { useCallback, useEffect, useRef, useState } from 'react'
import { useActiveWorkspacePath } from '@/hooks/useActiveWorkspacePath'
import { fsListDirectory } from '@/lib/ipc/fs'
import type { FsEntry } from '@/lib/ipc/fs'
import { FileTreeNode } from './FileTreeNode'
import { FileViewer } from './FileViewer'

export const FileExplorerPanel = () => {
  const workspacePath = useActiveWorkspacePath()

  const [rootEntries, setRootEntries] = useState<FsEntry[]>([])
  const [rootLoading, setRootLoading] = useState(false)
  const [rootError, setRootError] = useState<string | null>(null)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [children, setChildren] = useState<Map<string, FsEntry[]>>(new Map())
  const [loading, setLoading] = useState<Set<string>>(new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<FsEntry | null>(null)

  // Vertical split state
  const [splitRatio, setSplitRatio] = useState(0.5)
  const splitResizing = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!workspacePath) return
    setRootLoading(true)
    setRootError(null)
    fsListDirectory(workspacePath, false)
      .then(setRootEntries)
      .catch((e) => setRootError(String(e)))
      .finally(() => setRootLoading(false))
  }, [workspacePath])

  const handleExpand = useCallback(
    async (path: string) => {
      setExpanded((prev) => {
        const next = new Set(prev)
        if (next.has(path)) {
          next.delete(path)
        } else {
          next.add(path)
        }
        return next
      })

      if (!children.has(path)) {
        setLoading((prev) => new Set(prev).add(path))
        try {
          const entries = await fsListDirectory(path, false)
          setChildren((prev) => new Map(prev).set(path, entries))
        } catch {
          setChildren((prev) => new Map(prev).set(path, []))
        } finally {
          setLoading((prev) => {
            const next = new Set(prev)
            next.delete(path)
            return next
          })
        }
      }
    },
    [children]
  )

  const handleSelect = useCallback((entry: FsEntry) => {
    setSelectedPath(entry.path)
    setSelectedEntry(entry)
  }, [])

  const handleSplitResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    splitResizing.current = true
    const startY = e.clientY
    const containerHeight = containerRef.current?.clientHeight ?? 400
    const startRatio = splitRatio

    const handleMove = (ev: MouseEvent) => {
      if (!splitResizing.current) return
      const delta = ev.clientY - startY
      const newRatio = Math.max(0.2, Math.min(0.8, startRatio + delta / containerHeight))
      setSplitRatio(newRatio)
    }

    const handleUp = () => {
      splitResizing.current = false
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
  }, [splitRatio])

  if (!workspacePath) {
    return <EmptyState message="No active workspace. Open one from the left sidebar." />
  }

  if (rootLoading) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
        Loading…
      </div>
    )
  }

  if (rootError) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: 'var(--status-error)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>
        {rootError}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      {/* File tree */}
      <div
        className="overflow-y-auto"
        style={{
          height: `${splitRatio * 100}%`,
          borderBottom: '1px solid var(--border-subtle)',
          paddingTop: '4px',
          paddingBottom: '4px',
        }}
      >
        {rootEntries.map((entry) => (
          <FileTreeNode
            key={entry.path}
            entry={entry}
            depth={0}
            expanded={expanded}
            children={children}
            loading={loading}
            selectedPath={selectedPath}
            onExpand={handleExpand}
            onSelect={handleSelect}
          />
        ))}
        {rootEntries.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            Empty directory
          </div>
        )}
      </div>

      {/* Resize handle */}
      <div
        style={{
          height: '4px',
          cursor: 'row-resize',
          background: 'var(--border-subtle)',
          flexShrink: 0,
        }}
        onMouseDown={handleSplitResizeStart}
      />

      {/* File viewer */}
      <div
        className="flex min-h-0 flex-col"
        style={{ height: `${(1 - splitRatio) * 100}%` }}
      >
        {selectedEntry && (
          <div
            className="flex shrink-0 items-center border-b"
            style={{
              height: '28px',
              padding: '0 12px',
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-surface)',
            }}
          >
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedEntry.name}
            </span>
          </div>
        )}
        <FileViewer path={selectedPath} />
      </div>
    </div>
  )
}

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-1 items-center justify-center" style={{ padding: '24px', textAlign: 'center' }}>
    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{message}</p>
  </div>
)
