import type { FsEntry } from '@/lib/ipc/fs'

const ChevronRight = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
)
const ChevronDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
)
const FileIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
)
const FolderIcon = ({ open }: { open: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {open
      ? <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /><line x1="2" y1="10" x2="22" y2="10" /></>
      : <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    }
  </svg>
)

interface Props {
  entry: FsEntry
  depth: number
  expanded: Set<string>
  children: Map<string, FsEntry[]>
  loading: Set<string>
  selectedPath: string | null
  onExpand: (path: string) => void
  onSelect: (entry: FsEntry) => void
}

export const FileTreeNode = ({
  entry,
  depth,
  expanded,
  children,
  loading,
  selectedPath,
  onExpand,
  onSelect,
}: Props) => {
  const isExpanded = expanded.has(entry.path)
  const isLoading = loading.has(entry.path)
  const isSelected = entry.path === selectedPath
  const childEntries = children.get(entry.path)

  return (
    <div>
      <button
        onClick={() => {
          if (entry.isDir) {
            onExpand(entry.path)
          } else {
            onSelect(entry)
          }
        }}
        className="btn-press flex w-full items-center"
        style={{
          height: '26px',
          paddingLeft: `${8 + depth * 12}px`,
          paddingRight: '8px',
          gap: '4px',
          background: isSelected ? 'var(--bg-overlay)' : 'transparent',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'var(--bg-elevated)'
        }}
        onMouseLeave={(e) => {
          if (!isSelected) e.currentTarget.style.background = 'transparent'
        }}
      >
        <span style={{ width: '12px', flexShrink: 0, color: 'var(--text-muted)' }}>
          {entry.isDir ? (isExpanded ? <ChevronDown /> : <ChevronRight />) : null}
        </span>
        <span style={{ color: entry.isDir ? 'var(--text-secondary)' : 'var(--text-muted)', flexShrink: 0 }}>
          {entry.isDir ? <FolderIcon open={isExpanded} /> : <FileIcon />}
        </span>
        <span
          style={{
            fontSize: '12px',
            color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isLoading ? `${entry.name} …` : entry.name}
        </span>
      </button>

      {entry.isDir && isExpanded && childEntries && (
        <div>
          {childEntries.map((child) => (
            <FileTreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              expanded={expanded}
              children={children}
              loading={loading}
              selectedPath={selectedPath}
              onExpand={onExpand}
              onSelect={onSelect}
            />
          ))}
          {childEntries.length === 0 && (
            <div
              style={{
                paddingLeft: `${8 + (depth + 1) * 12 + 16}px`,
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              Empty
            </div>
          )}
        </div>
      )}
    </div>
  )
}
