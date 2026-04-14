import { useEffect, useRef } from 'react'

// ── Icon registry ─────────────────────────────────────────────────────────
// All tech icons load from /icons/workspace/{id}.svg (place files in public/).
// The folder entry is the only exception — it uses an inline SVG.

export const WORKSPACE_ICONS: Record<string, { label: string }> = {
  folder:     { label: 'Folder' },
  react:      { label: 'React' },
  nextjs:     { label: 'Next.js' },
  vue:        { label: 'Vue.js' },
  angular:    { label: 'Angular' },
  svelte:     { label: 'Svelte' },
  astro:      { label: 'Astro' },
  vite:       { label: 'Vite' },
  typescript: { label: 'TypeScript' },
  javascript: { label: 'JavaScript' },
  python:     { label: 'Python' },
  rust:       { label: 'Rust' },
  go:         { label: 'Go' },
  java:       { label: 'Java' },
  kotlin:     { label: 'Kotlin' },
  swift:      { label: 'Swift' },
  ruby:       { label: 'Ruby' },
  php:        { label: 'PHP' },
  docker:     { label: 'Docker' },
  elixir:     { label: 'Elixir' },
  cpp:        { label: 'C++' },
  csharp:     { label: 'C#' },
}

// ── Folder SVG (inline, theme-aware) ─────────────────────────────────────

const FolderIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g clipPath="url(#ws-folder-clip)">
      <path
        d="M22 11V17C22 21 21 22 17 22H7C3 22 2 21 2 17V7C2 3 3 2 7 2H8.5C10 2 10.33 2.44 10.9 3.2L12.4 5.2C12.78 5.7 13 6 14 6H17C21 6 22 7 22 11Z"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
        strokeMiterlimit="10"
      />
      <path
        opacity="0.4"
        d="M8 2H17C19 2 20 3 20 5V6.38"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
    <defs>
      <clipPath id="ws-folder-clip">
        <rect width="24" height="24" fill="white" />
      </clipPath>
    </defs>
  </svg>
)

// ── WorkspaceIcon ─────────────────────────────────────────────────────────

interface WorkspaceIconProps {
  iconId: string
  size?: number
}

export const WorkspaceIcon = ({ iconId, size = 14 }: WorkspaceIconProps) => {
  if (iconId === 'folder') {
    return <FolderIcon size={size} />
  }

  const label = WORKSPACE_ICONS[iconId]?.label ?? iconId

  return (
    <img
      src={`/icons/workspace/${iconId}.svg`}
      width={size}
      height={size}
      alt={label}
      draggable={false}
      style={{ objectFit: 'contain', display: 'block' }}
    />
  )
}

// ── WorkspaceIconPicker ───────────────────────────────────────────────────

interface WorkspaceIconPickerProps {
  currentIcon: string
  x: number
  y: number
  onSelect: (iconId: string) => void
  onClose: () => void
}

const ICON_GROUPS: Array<{ label: string; ids: string[] }> = [
  { label: 'General', ids: ['folder'] },
  {
    label: 'JavaScript',
    ids: [
      'javascript', 'typescript', 'react', 'nextjs',
      'vue', 'angular', 'svelte', 'astro', 'vite',
    ],
  },
  {
    label: 'Backend & Systems',
    ids: ['python', 'rust', 'go', 'java', 'kotlin', 'swift', 'ruby', 'php', 'elixir'],
  },
  { label: 'Other', ids: ['docker', 'cpp', 'csharp'] },
]

export const WorkspaceIconPicker = ({
  currentIcon,
  x,
  y,
  onSelect,
  onClose,
}: WorkspaceIconPickerProps) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const pickerWidth = 216
  const pickerLeft = Math.min(x, window.innerWidth - pickerWidth - 8)
  const pickerTop = Math.min(y, window.innerHeight - 400)

  return (
    <div
      ref={ref}
      className="popover-enter fixed z-50 border"
      style={{
        left: pickerLeft,
        top: pickerTop,
        width: pickerWidth,
        padding: '8px',
        borderRadius: '10px',
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border-default)',
        boxShadow: 'var(--shadow-md)',
        '--popover-origin': 'top left',
      } as React.CSSProperties}
    >
      <p
        style={{
          padding: '2px 6px 8px',
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Change Icon
      </p>

      {ICON_GROUPS.map((group) => (
        <div key={group.label} style={{ marginBottom: '8px' }}>
          <p
            style={{
              padding: '2px 6px 4px',
              fontSize: '10px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}
          >
            {group.label}
          </p>
          <div className="flex flex-wrap" style={{ gap: '2px' }}>
            {group.ids.map((id) => {
              const isActive = id === currentIcon
              return (
                <button
                  key={id}
                  title={WORKSPACE_ICONS[id]?.label ?? id}
                  aria-label={WORKSPACE_ICONS[id]?.label ?? id}
                  aria-pressed={isActive}
                  onClick={() => {
                    onSelect(id)
                    onClose()
                  }}
                  className="btn-press flex items-center justify-center"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: isActive ? 'var(--bg-overlay)' : 'transparent',
                    outline: isActive
                      ? '1.5px solid var(--border-default)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = 'var(--bg-surface)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <WorkspaceIcon iconId={id} size={18} />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
