import { useEffect, useRef } from 'react'

// ── Icon definitions ───────────────────────────────────────────────────────

interface IconDef {
  label: string
  color: string
  render: (size: number) => React.ReactElement
}

const badge = (
  text: string,
  bg: string,
  fg = 'white',
  size: number
): React.ReactElement => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="1" y="1" width="22" height="22" rx="4" fill={bg} />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fontSize={text.length > 2 ? '7' : '9'}
      fontWeight="700"
      fill={fg}
      fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
    >
      {text}
    </text>
  </svg>
)

export const WORKSPACE_ICONS: Record<string, IconDef> = {
  folder: {
    label: 'Folder',
    color: '#6B7280',
    render: (size) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M3 7C3 5.9 3.9 5 5 5h4.17c.53 0 1.04.21 1.41.59L12 7h7c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V7z"
          fill="#6B7280"
        />
      </svg>
    ),
  },
  react: {
    label: 'React',
    color: '#61DAFB',
    render: (size) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse
          cx="12"
          cy="12"
          rx="10"
          ry="3.8"
          stroke="#61DAFB"
          strokeWidth="1.6"
        />
        <ellipse
          cx="12"
          cy="12"
          rx="10"
          ry="3.8"
          stroke="#61DAFB"
          strokeWidth="1.6"
          transform="rotate(60 12 12)"
        />
        <ellipse
          cx="12"
          cy="12"
          rx="10"
          ry="3.8"
          stroke="#61DAFB"
          strokeWidth="1.6"
          transform="rotate(120 12 12)"
        />
        <circle cx="12" cy="12" r="2.4" fill="#61DAFB" />
      </svg>
    ),
  },
  nextjs: {
    label: 'Next.js',
    color: 'currentColor',
    render: (size) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="11" fill="black" />
        <path
          d="M8 7.5v9l8-9v9"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    ),
  },
  vue: {
    label: 'Vue.js',
    color: '#41B883',
    render: (size) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        {/* Outer V – dark teal */}
        <path
          d="M0 2h4.5L12 15.5 19.5 2H24L12 22z"
          fill="#34495E"
        />
        {/* Inner V – green */}
        <path
          d="M4.5 2l7.5 10L19.5 2h-4L12 7.5 8.5 2z"
          fill="#41B883"
        />
      </svg>
    ),
  },
  angular: {
    label: 'Angular',
    color: '#DD0031',
    render: (size) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 2L2.5 5.5l1.4 10.9L12 21l8.1-4.6 1.4-10.9z" fill="#DD0031" />
        <path d="M12 2v19l8.1-4.6 1.4-10.9z" fill="#C3002F" />
        <path
          d="M12 5.5L9 14h1.3l.65-1.7h2.1l.65 1.7H15L12 5.5zm.8 5.4h-1.6L12 8l.8 2.9z"
          fill="white"
        />
      </svg>
    ),
  },
  svelte: {
    label: 'Svelte',
    color: '#FF3E00',
    render: (size) => badge('Sv', '#FF3E00', 'white', size),
  },
  astro: {
    label: 'Astro',
    color: '#FF5D01',
    render: (size) => badge('As', '#FF5D01', 'white', size),
  },
  typescript: {
    label: 'TypeScript',
    color: '#3178C6',
    render: (size) => badge('TS', '#3178C6', 'white', size),
  },
  javascript: {
    label: 'JavaScript',
    color: '#F7DF1E',
    render: (size) => badge('JS', '#F7DF1E', '#111', size),
  },
  python: {
    label: 'Python',
    color: '#3776AB',
    render: (size) => badge('Py', '#3776AB', 'white', size),
  },
  rust: {
    label: 'Rust',
    color: '#CE422B',
    render: (size) => badge('Rs', '#CE422B', 'white', size),
  },
  go: {
    label: 'Go',
    color: '#00ADD8',
    render: (size) => badge('Go', '#00ADD8', 'white', size),
  },
  java: {
    label: 'Java',
    color: '#007396',
    render: (size) => badge('Jv', '#007396', 'white', size),
  },
  kotlin: {
    label: 'Kotlin',
    color: '#7F52FF',
    render: (size) => badge('Kt', '#7F52FF', 'white', size),
  },
  swift: {
    label: 'Swift',
    color: '#FA7343',
    render: (size) => badge('Sw', '#FA7343', 'white', size),
  },
  ruby: {
    label: 'Ruby',
    color: '#CC342D',
    render: (size) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M12 2l4.5 4.5L22 12l-5.5 5.5L12 22l-4.5-4.5L2 12l5.5-5.5z"
          fill="#CC342D"
        />
        <path
          d="M12 6l3 3 3 3-3 3-3 3-3-3-3-3 3-3z"
          fill="#E05252"
        />
      </svg>
    ),
  },
  php: {
    label: 'PHP',
    color: '#777BB4',
    render: (size) => badge('php', '#777BB4', 'white', size),
  },
  docker: {
    label: 'Docker',
    color: '#2496ED',
    render: (size) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="2" y="12" width="20" height="7" rx="2" fill="#2496ED" />
        {/* Container stacks */}
        <rect x="3" y="9" width="4" height="3" rx="0.5" fill="#2496ED" />
        <rect x="8" y="9" width="4" height="3" rx="0.5" fill="#2496ED" />
        <rect x="13" y="9" width="4" height="3" rx="0.5" fill="#2496ED" />
        <rect x="8" y="6" width="4" height="3" rx="0.5" fill="#2496ED" />
        {/* Whale tail */}
        <path d="M19 12c2-1 3-3 2-5" stroke="#2496ED" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        {/* Eye */}
        <circle cx="12" cy="15.5" r="1" fill="white" />
      </svg>
    ),
  },
  elixir: {
    label: 'Elixir',
    color: '#6E4A7E',
    render: (size) => badge('Ex', '#6E4A7E', 'white', size),
  },
  cpp: {
    label: 'C++',
    color: '#00599C',
    render: (size) => badge('C++', '#00599C', 'white', size),
  },
  csharp: {
    label: 'C#',
    color: '#239120',
    render: (size) => badge('C#', '#239120', 'white', size),
  },
}

// ── WorkspaceIcon component ───────────────────────────────────────────────

interface WorkspaceIconProps {
  iconId: string
  size?: number
}

export const WorkspaceIcon = ({ iconId, size = 14 }: WorkspaceIconProps) => {
  const def = WORKSPACE_ICONS[iconId] ?? WORKSPACE_ICONS['folder']
  return def.render(size)
}

// ── WorkspaceIconPicker component ────────────────────────────────────────

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
    ids: ['javascript', 'typescript', 'react', 'nextjs', 'vue', 'angular', 'svelte', 'astro'],
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

  // Keep picker on screen
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
          <div
            className="flex flex-wrap"
            style={{ gap: '2px' }}
          >
            {group.ids.map((id) => {
              const def = WORKSPACE_ICONS[id]
              const isActive = id === currentIcon
              return (
                <button
                  key={id}
                  title={def.label}
                  aria-label={def.label}
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
