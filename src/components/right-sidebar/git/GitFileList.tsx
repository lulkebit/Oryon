import type { GitFileStatus } from '@/lib/ipc/git'

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  M: { label: 'M', color: 'var(--status-warning)' },
  A: { label: 'A', color: 'var(--status-success)' },
  D: { label: 'D', color: 'var(--status-error)' },
  R: { label: 'R', color: '#60a5fa' },
  U: { label: 'U', color: '#f472b6' },
  '?': { label: '?', color: 'var(--text-muted)' },
}

interface FileRowProps {
  file: GitFileStatus
  selected: boolean
  onClick: () => void
}

const FileRow = ({ file, selected, onClick }: FileRowProps) => {
  const status = STATUS_LABEL[file.status] ?? { label: file.status, color: 'var(--text-muted)' }
  const fileName = file.path.split('/').pop() ?? file.path
  const dirPath = file.path.includes('/')
    ? file.path.slice(0, file.path.lastIndexOf('/'))
    : ''

  return (
    <button
      onClick={onClick}
      className="btn-press flex w-full items-center"
      style={{
        height: '28px',
        gap: '6px',
        padding: '0 12px',
        background: selected ? 'var(--bg-overlay)' : 'transparent',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--bg-elevated)'
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent'
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: status.color,
          width: '14px',
          flexShrink: 0,
        }}
      >
        {status.label}
      </span>
      <span
        style={{ fontSize: '12px', color: 'var(--text-primary)', flexShrink: 0 }}
      >
        {fileName}
      </span>
      {dirPath && (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {dirPath}
        </span>
      )}
    </button>
  )
}

interface SectionProps {
  title: string
  files: GitFileStatus[]
  selectedPath: string | null
  selectedStaged: boolean | null
  onSelect: (file: GitFileStatus) => void
}

const Section = ({ title, files, selectedPath, selectedStaged, onSelect }: SectionProps) => {
  if (files.length === 0) return null
  return (
    <div>
      <div
        style={{
          padding: '8px 12px 4px',
          fontSize: '10px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-muted)',
        }}
      >
        {title} ({files.length})
      </div>
      {files.map((f, i) => (
        <FileRow
          key={i}
          file={f}
          selected={f.path === selectedPath && f.staged === selectedStaged}
          onClick={() => onSelect(f)}
        />
      ))}
    </div>
  )
}

interface Props {
  files: GitFileStatus[]
  selectedPath: string | null
  selectedStaged: boolean | null
  onSelect: (file: GitFileStatus) => void
}

export const GitFileList = ({ files, selectedPath, selectedStaged, onSelect }: Props) => {
  const staged = files.filter((f) => f.staged)
  const unstaged = files.filter((f) => !f.staged && f.status !== '?')
  const untracked = files.filter((f) => f.status === '?')

  return (
    <div className="flex-1 overflow-y-auto" style={{ paddingBottom: '8px' }}>
      <Section
        title="Staged Changes"
        files={staged}
        selectedPath={selectedPath}
        selectedStaged={selectedStaged}
        onSelect={onSelect}
      />
      <Section
        title="Changes"
        files={unstaged}
        selectedPath={selectedPath}
        selectedStaged={selectedStaged}
        onSelect={onSelect}
      />
      <Section
        title="Untracked"
        files={untracked}
        selectedPath={selectedPath}
        selectedStaged={selectedStaged}
        onSelect={onSelect}
      />
    </div>
  )
}
