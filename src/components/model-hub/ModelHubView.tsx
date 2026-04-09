import { useEffect, useRef, useCallback, useState, memo } from 'react'
import {
  SearchNormal1,
  CloseCircle,
  DocumentDownload,
  Trash,
  Cpu,
  ArrowDown2,
  Heart,
  ArrowRight2,
  ArrowLeft2,
  Pause,
  Play,
  Activity,
  MonitorMobbile,
} from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'
import { useModelHubStore } from '@/stores/modelHubStore'
import type { FeaturedCategory } from '@/stores/modelHubStore'
import { useEngineStore } from '@/stores/engineStore'
import type { HfModelResult, GgufFile, StoredModel } from '@/lib/ipc/hub'
import type { ProcessStats, HardwareInfo } from '@/lib/ipc/engine'
import { getProcessStats, getHardwareInfo } from '@/lib/ipc/engine'

/* ─── Helpers ─────────────────────────────────────────── */

function formatBytes(bytes: number): string {
  if (bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

function formatNumber(n: number | null | undefined): string {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatSpeed(bps: number): string {
  if (bps === 0) return '0 B/s'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bps) / Math.log(1024))
  return `${(bps / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function cleanModelName(id: string): string {
  const name = id.split('/').pop() ?? id
  return name
    .replace(/-GGUF$/i, '')
    .replace(/_GGUF$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractParamCount(name: string): string | null {
  const m = name.match(/\b(\d+(?:\.\d+)?)\s*[Bb]\b/)
  if (m) return `${m[1]}B`
  const size = name.match(/\b(mini|small|large|medium|tiny|nano)\b/i)
  if (size) return size[1].charAt(0).toUpperCase() + size[1].slice(1).toLowerCase()
  return null
}

interface QuantInfo {
  label: string
  detail: string
  isRecommended: boolean
}

function quantLabel(quant: string | null | undefined): QuantInfo {
  if (!quant) return { label: 'Standard', detail: '', isRecommended: false }
  const q = quant.toUpperCase()
  if (q === 'Q4_K_M')
    return { label: 'Recommended', detail: '4-bit balanced', isRecommended: true }
  if (q === 'Q5_K_M')
    return { label: 'High Quality', detail: '5-bit', isRecommended: true }
  if (q === 'Q4_K_S')
    return { label: 'Compact', detail: '4-bit small', isRecommended: false }
  if (q === 'Q4_0' || q === 'Q4_1')
    return { label: 'Compact', detail: '4-bit', isRecommended: false }
  if (q.startsWith('Q3'))
    return { label: 'Very Compact', detail: '3-bit', isRecommended: false }
  if (q.startsWith('Q2'))
    return { label: 'Smallest', detail: '2-bit', isRecommended: false }
  if (q.startsWith('IQ')) {
    const bits = q.match(/IQ(\d)/)?.[1]
    return {
      label: bits ? `Smallest (${bits}-bit)` : 'Smallest',
      detail: 'Compressed',
      isRecommended: false,
    }
  }
  if (q === 'Q6_K')
    return { label: 'Very High Quality', detail: '6-bit', isRecommended: false }
  if (q.startsWith('Q8'))
    return { label: 'Near Lossless', detail: '8-bit', isRecommended: false }
  if (q.startsWith('F16') || q.startsWith('BF16'))
    return { label: 'Full Precision', detail: '16-bit', isRecommended: false }
  if (q.startsWith('F32'))
    return { label: 'Full Precision', detail: '32-bit', isRecommended: false }
  return { label: quant, detail: '', isRecommended: false }
}

function bestFile(files: GgufFile[]): GgufFile | undefined {
  return (
    files.find((f) => f.quantization === 'Q4_K_M') ??
    files.find((f) => f.quantization === 'Q4_K_S') ??
    files.find((f) => f.quantization === 'Q5_K_M') ??
    files[0]
  )
}

const AUTHOR_COLORS = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#eab308', '#84cc16', '#22c55e', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6',
]

function authorColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length]
}

function authorInitials(name: string): string {
  if (!name) return '?'
  const parts = name.split(/[-_\s]/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/* ─── Author Avatar ───────────────────────────────────── */

const AuthorAvatar = memo(({ author, size = 24 }: { author: string; size?: number }) => {
  const color = authorColor(author)
  const initials = authorInitials(author)
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${color}18`,
        border: `1.5px solid ${color}30`,
        color,
        fontSize: Math.max(9, Math.round(size * 0.36)),
        fontWeight: 700,
        letterSpacing: '-0.02em',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
})
AuthorAvatar.displayName = 'AuthorAvatar'

/* ─── Main View ───────────────────────────────────────── */

export const ModelHubView = () => {
  const { setActiveView } = useUiStore()
  const {
    query,
    setQuery,
    search,
    searchResults,
    searching,
    downloadedModels,
    activeDownload,
    tab,
    setTab,
    featured,
    startDownload,
    pauseActiveDownload,
    resumeActiveDownload,
    cancelActiveDownload,
    removeModel,
    loadDownloaded,
    loadFeatured,
    initEventListeners,
    error,
  } = useModelHubStore()

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    loadDownloaded()
    loadFeatured()
    initEventListeners()
  }, [loadDownloaded, loadFeatured, initEventListeners])

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
      searchTimeout.current = setTimeout(() => search(value), 400)
    },
    [setQuery, search]
  )

  const isSearching = query.trim().length > 0

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex items-center justify-between border-b"
        style={{ height: '52px', padding: '0 24px', borderColor: 'var(--border-subtle)' }}
      >
        <h1 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Model Hub
        </h1>
        <button
          onClick={() => setActiveView('chat')}
          className="flex items-center justify-center btn-press"
          style={{ width: '32px', height: '32px', borderRadius: '6px', color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-overlay)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          aria-label="Close Model Hub"
        >
          <CloseCircle size={18} color="currentColor" />
        </button>
      </div>

      <div
        className="flex items-center border-b"
        style={{ padding: '0 24px', borderColor: 'var(--border-subtle)' }}
      >
        <TabButton active={tab === 'explore'} onClick={() => setTab('explore')} label="Explore" />
        <TabButton
          active={tab === 'downloaded'}
          onClick={() => setTab('downloaded')}
          label={`My Models${downloadedModels.length > 0 ? ` (${downloadedModels.length})` : ''}`}
        />
        <TabButton active={tab === 'usage'} onClick={() => setTab('usage')} label="Usage" />
      </div>

      {tab === 'explore' && (
        <ExploreTab
          query={query}
          onQueryChange={handleQueryChange}
          searchResults={searchResults}
          searching={searching}
          isSearchActive={isSearching}
          featured={featured}
          activeDownload={activeDownload}
          onDownload={startDownload}
          onPause={pauseActiveDownload}
          onResume={resumeActiveDownload}
          onCancelDownload={cancelActiveDownload}
          error={error}
        />
      )}
      {tab === 'downloaded' && (
        <DownloadedTab models={downloadedModels} onDelete={removeModel} />
      )}
      {tab === 'usage' && <UsageTab />}
    </div>
  )
}

/* ─── Tab Button ──────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className="btn-press"
      style={{
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      }}
    >
      {label}
    </button>
  )
}

/* ─── Explore Tab ─────────────────────────────────────── */

function ExploreTab({
  query,
  onQueryChange,
  searchResults,
  searching,
  isSearchActive,
  featured,
  activeDownload,
  onDownload,
  onPause,
  onResume,
  onCancelDownload,
  error,
}: {
  query: string
  onQueryChange: (q: string) => void
  searchResults: HfModelResult[]
  searching: boolean
  isSearchActive: boolean
  featured: FeaturedCategory[]
  activeDownload: {
    repoId: string
    filename: string
    progress: { downloaded: number; total: number; speedBps: number } | null
    isPaused: boolean
    verifying: { processed: number; total: number } | null
  } | null
  onDownload: (repoId: string, filename: string) => void
  onPause: () => void
  onResume: () => void
  onCancelDownload: () => void
  error: string | null
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div style={{ padding: '16px 24px 0' }}>
        <div
          className="search-input-wrapper flex items-center"
          style={{
            height: '40px',
            gap: '8px',
            padding: '0 14px',
            borderRadius: '10px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            transition: 'border-color 150ms var(--ease-out)',
          }}
        >
          <SearchNormal1 size={16} color="var(--text-muted)" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search models..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: '13px', color: 'var(--text-primary)' }}
          />
          {searching && <Spinner />}
          {isSearchActive && (
            <button
              onClick={() => onQueryChange('')}
              style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              aria-label="Clear search"
            >
              <CloseCircle size={16} color="currentColor" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            margin: '12px 24px 0',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            background: 'color-mix(in srgb, var(--status-error), transparent 90%)',
            color: 'var(--status-error)',
          }}
        >
          {error}
        </div>
      )}

      {activeDownload && (
        <DownloadBanner
          download={activeDownload}
          onPause={onPause}
          onResume={onResume}
          onCancel={onCancelDownload}
        />
      )}

      {isSearchActive ? (
        <SearchResults
          results={searchResults}
          searching={searching}
          query={query}
          onDownload={onDownload}
          activeDownload={activeDownload}
        />
      ) : (
        <BrowseGrid
          featured={featured}
          onDownload={onDownload}
          activeDownload={activeDownload}
        />
      )}
    </div>
  )
}

/* ─── Browse Grid ─────────────────────────────────────── */

function BrowseGrid({
  featured,
  onDownload,
  activeDownload,
}: {
  featured: FeaturedCategory[]
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
}) {
  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '20px 0 32px' }}>
      {featured.map((cat) => (
        <CategorySection
          key={cat.id}
          category={cat}
          onDownload={onDownload}
          activeDownload={activeDownload}
        />
      ))}
    </div>
  )
}

function CategorySection({
  category,
  onDownload,
  activeDownload,
}: {
  category: FeaturedCategory
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (category.results.length === 0 && !category.loading) return null

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 290, behavior: 'smooth' })
  }

  return (
    <div style={{ marginBottom: '32px' }}>
      <div
        className="flex items-center justify-between"
        style={{ padding: '0 24px', marginBottom: '14px' }}
      >
        <div>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              lineHeight: '20px',
            }}
          >
            {category.label}
          </h2>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '1px',
              lineHeight: '16px',
            }}
          >
            {category.description}
          </p>
        </div>
        <div className="flex items-center" style={{ gap: '4px' }}>
          <ScrollButton direction="left" onClick={() => scrollBy(-1)} />
          <ScrollButton direction="right" onClick={() => scrollBy(1)} />
        </div>
      </div>

      {category.loading && (
        <div className="flex" style={{ gap: '10px', paddingLeft: '24px', overflow: 'hidden' }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                width: '272px',
                height: '192px',
                borderRadius: '14px',
                background: 'var(--bg-elevated)',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {!category.loading && category.results.length > 0 && (
        <div
          ref={scrollRef}
          className="hide-scrollbar flex"
          style={{ gap: '10px', overflowX: 'auto', scrollSnapType: 'x mandatory' }}
        >
          <div style={{ minWidth: '24px', flexShrink: 0 }} />
          {category.results.map((model) => (
            <BrowseModelCard
              key={model.id}
              model={model}
              onDownload={onDownload}
              activeDownload={activeDownload}
            />
          ))}
          <div style={{ minWidth: '12px', flexShrink: 0 }} />
        </div>
      )}
    </div>
  )
}

function ScrollButton({
  direction,
  onClick,
}: {
  direction: 'left' | 'right'
  onClick: () => void
}) {
  const Icon = direction === 'left' ? ArrowLeft2 : ArrowRight2
  return (
    <button
      onClick={onClick}
      aria-label={`Scroll ${direction}`}
      className="flex items-center justify-center btn-press"
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '6px',
        color: 'var(--text-muted)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-overlay)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
    >
      <Icon size={14} color="currentColor" />
    </button>
  )
}

/* ─── Browse Model Card ───────────────────────────────── */

function BrowseModelCard({
  model,
  onDownload,
  activeDownload,
}: {
  model: HfModelResult
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
}) {
  const [showFiles, setShowFiles] = useState(false)
  const isDownloadingFromThis = activeDownload?.repoId === model.id
  const recommended = bestFile(model.files)
  const cleanName = cleanModelName(model.id)
  const paramCount = extractParamCount(cleanName)
  const sortedFiles = [...model.files].sort((a, b) => (a.size || 0) - (b.size || 0))

  return (
    <div
      className="flex flex-col border"
      style={{
        width: '272px',
        flexShrink: 0,
        borderRadius: '14px',
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
        scrollSnapAlign: 'start',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 16px 14px' }}>
        <div className="flex items-start" style={{ gap: '10px', marginBottom: '12px' }}>
          <AuthorAvatar author={model.author ?? ''} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: '18px',
              }}
              title={cleanName}
            >
              {cleanName}
            </p>
            <div
              className="flex items-center"
              style={{ gap: '5px', marginTop: '3px' }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {model.author}
              </span>
              {paramCount && (
                <span
                  style={{
                    padding: '0 5px',
                    height: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: 'var(--bg-overlay)',
                    color: 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {paramCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex items-center"
          style={{ gap: '10px', fontSize: '11px', color: 'var(--text-muted)' }}
        >
          <span className="flex items-center" style={{ gap: '3px' }}>
            <ArrowDown2 size={10} color="currentColor" />
            {formatNumber(model.downloads)}
          </span>
          {(model.likes ?? 0) > 0 && (
            <span className="flex items-center" style={{ gap: '3px' }}>
              <Heart size={10} color="currentColor" />
              {formatNumber(model.likes)}
            </span>
          )}
          <span style={{ marginLeft: 'auto' }}>
            {model.files.length} {model.files.length === 1 ? 'size' : 'sizes'}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

      {/* File section */}
      {!showFiles ? (
        <div style={{ padding: '12px 16px 14px' }}>
          {recommended && (
            <button
              onClick={() => onDownload(model.id, recommended.filename)}
              disabled={!!activeDownload}
              className="flex w-full items-center justify-center btn-press"
              style={{
                height: '34px',
                borderRadius: '9px',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 500,
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
                opacity: activeDownload ? 0.5 : 1,
                marginBottom: '8px',
              }}
            >
              <DocumentDownload size={13} color="currentColor" />
              Download
              {recommended.size > 0 && (
                <span
                  style={{
                    opacity: 0.7,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  · {formatBytes(recommended.size)}
                </span>
              )}
            </button>
          )}
          {model.files.length > 1 && (
            <button
              onClick={() => setShowFiles(true)}
              className="flex w-full items-center justify-center btn-press"
              style={{
                height: '28px',
                borderRadius: '7px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              All {model.files.length} sizes
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '10px 16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
          }}
        >
          {sortedFiles.map((f) => (
            <FileOption
              key={f.filename}
              file={f}
              repoId={model.id}
              onDownload={onDownload}
              isActive={isDownloadingFromThis && activeDownload?.filename === f.filename}
              disabled={!!activeDownload}
            />
          ))}
          <button
            onClick={() => setShowFiles(false)}
            className="flex w-full items-center justify-center btn-press"
            style={{
              height: '28px',
              borderRadius: '7px',
              marginTop: '4px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1px solid var(--border-subtle)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            Collapse
          </button>
        </div>
      )}
    </div>
  )
}

function FileOption({
  file,
  repoId,
  onDownload,
  isActive,
  disabled,
}: {
  file: GgufFile
  repoId: string
  onDownload: (repoId: string, filename: string) => void
  isActive: boolean
  disabled: boolean
}) {
  const info = quantLabel(file.quantization)
  return (
    <button
      onClick={() => onDownload(repoId, file.filename)}
      disabled={disabled}
      className="flex items-center btn-press"
      style={{
        width: '100%',
        padding: '8px 10px',
        borderRadius: '8px',
        gap: '8px',
        background: isActive ? 'var(--accent-muted)' : 'var(--bg-elevated)',
        border: `1px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
        opacity: disabled && !isActive ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: isActive ? 'var(--accent)' : 'var(--text-primary)',
            }}
          >
            {info.label}
          </span>
          {info.isRecommended && (
            <span
              style={{
                padding: '0 4px',
                height: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '3px',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                textTransform: 'uppercase',
              }}
            >
              Best
            </span>
          )}
        </div>
        {info.detail && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {info.detail}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {file.size > 0 && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {formatBytes(file.size)}
          </span>
        )}
        <DocumentDownload
          size={12}
          color={isActive ? 'var(--accent)' : 'var(--text-muted)'}
        />
      </div>
    </button>
  )
}

/* ─── Search Results ──────────────────────────────────── */

function SearchResults({
  results,
  searching,
  query,
  onDownload,
  activeDownload,
}: {
  results: HfModelResult[]
  searching: boolean
  query: string
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
}) {
  if (results.length === 0 && !searching && query) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ padding: '48px 0' }}
      >
        <SearchNormal1
          size={32}
          color="var(--text-muted)"
          style={{ opacity: 0.25, marginBottom: '12px' }}
        />
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          No models found for &ldquo;{query}&rdquo;
        </p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            opacity: 0.6,
            marginTop: '4px',
          }}
        >
          Try a different search term
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '16px 24px 24px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {results.map((model) => (
          <SearchModelCard
            key={model.id}
            model={model}
            onDownload={onDownload}
            activeDownload={activeDownload}
          />
        ))}
      </div>
    </div>
  )
}

function SearchModelCard({
  model,
  onDownload,
  activeDownload,
}: {
  model: HfModelResult
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
}) {
  const [showAll, setShowAll] = useState(false)
  const isDownloadingFromThis = activeDownload?.repoId === model.id
  const recommended = bestFile(model.files)
  const cleanName = cleanModelName(model.id)
  const paramCount = extractParamCount(cleanName)
  const sortedFiles = [...model.files].sort((a, b) => (a.size || 0) - (b.size || 0))
  const visibleFiles = showAll ? sortedFiles : sortedFiles.slice(0, 5)

  return (
    <div
      style={{
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '14px 16px 12px' }}>
        {/* Header row */}
        <div className="flex items-start" style={{ gap: '12px', marginBottom: '10px' }}>
          <AuthorAvatar author={model.author ?? ''} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {cleanName}
              </p>
              {paramCount && (
                <span
                  style={{
                    padding: '0 5px',
                    height: '16px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: 'var(--bg-overlay)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {paramCount}
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '3px',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span>{model.author}</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span className="flex items-center" style={{ gap: '3px' }}>
                <ArrowDown2 size={10} color="currentColor" />
                {formatNumber(model.downloads)}
              </span>
              {(model.likes ?? 0) > 0 && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span className="flex items-center" style={{ gap: '3px' }}>
                    <Heart size={10} color="currentColor" />
                    {formatNumber(model.likes)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Quick download */}
          {recommended && (
            <button
              onClick={() => onDownload(model.id, recommended.filename)}
              disabled={!!activeDownload}
              className="flex shrink-0 items-center btn-press"
              style={{
                height: '32px',
                gap: '5px',
                padding: '0 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
                opacity: activeDownload ? 0.5 : 1,
              }}
            >
              <DocumentDownload size={12} color="currentColor" />
              {recommended.size > 0 ? formatBytes(recommended.size) : 'Download'}
            </button>
          )}
        </div>

        {/* File chips */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {visibleFiles.map((f) => {
            const info = quantLabel(f.quantization)
            const isActive = isDownloadingFromThis && activeDownload?.filename === f.filename
            return (
              <button
                key={f.filename}
                onClick={() => onDownload(model.id, f.filename)}
                disabled={!!activeDownload}
                className="flex items-center btn-press"
                style={{
                  height: '26px',
                  padding: '0 8px',
                  borderRadius: '6px',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 500,
                  background: isActive ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                  border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  opacity: activeDownload && !isActive ? 0.5 : 1,
                }}
              >
                {info.label}
                {f.size > 0 && (
                  <span
                    style={{
                      opacity: 0.55,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                    }}
                  >
                    {formatBytes(f.size)}
                  </span>
                )}
              </button>
            )
          })}
          {!showAll && sortedFiles.length > 5 && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                fontSize: '11px',
                color: 'var(--accent)',
                background: 'none',
                border: 'none',
                padding: '0 4px',
                fontWeight: 500,
              }}
            >
              +{sortedFiles.length - 5} more
            </button>
          )}
          {showAll && sortedFiles.length > 5 && (
            <button
              onClick={() => setShowAll(false)}
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'none',
                border: 'none',
                padding: '0 4px',
              }}
            >
              Less
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Shared ──────────────────────────────────────────── */

function Spinner() {
  return (
    <div
      className="animate-spin"
      style={{
        width: '14px',
        height: '14px',
        border: '2px solid var(--border-default)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
        flexShrink: 0,
      }}
    />
  )
}

function DownloadBanner({
  download,
  onPause,
  onResume,
  onCancel,
}: {
  download: {
    repoId: string
    filename: string
    progress: { downloaded: number; total: number; speedBps: number } | null
    isPaused: boolean
    verifying: { processed: number; total: number } | null
  }
  onPause: () => void
  onResume: () => void
  onCancel: () => void
}) {
  const p = download.progress
  const v = download.verifying
  const isVerifying = v !== null
  const downloadPercent = p && p.total > 0 ? Math.round((p.downloaded / p.total) * 100) : 0
  const verifyPercent = v && v.total > 0 ? Math.round((v.processed / v.total) * 100) : 0
  const percent = isVerifying ? verifyPercent : downloadPercent

  // Extract a friendly label from the filename
  const fileQuant = download.filename.match(/\.(Q\d[^.]+|IQ\d[^.]+|F16|BF16|F32)\./i)?.[1]
  const fileLabel = fileQuant ? quantLabel(fileQuant.toUpperCase()).label : null
  const cleanName = cleanModelName(download.repoId)

  const statusLabel = isVerifying ? 'Verifying' : download.isPaused ? 'Paused' : 'Downloading'
  const barColor = download.isPaused ? 'var(--text-muted)' : 'var(--accent)'
  const borderColor = download.isPaused ? 'var(--border-default)' : 'var(--accent)'

  return (
    <div
      style={{
        margin: '12px 24px 0',
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'var(--bg-elevated)',
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="flex items-center" style={{ gap: '10px', marginBottom: '8px' }}>
        {isVerifying && <Spinner />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {statusLabel}: {cleanName}
            {fileLabel && (
              <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                {' · '}{fileLabel}
              </span>
            )}
          </p>
          {!isVerifying && p && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
              {formatBytes(p.downloaded)} / {formatBytes(p.total)}
              {!download.isPaused && <> · {formatSpeed(p.speedBps)}</>}
              {' · '}{downloadPercent}%
            </p>
          )}
          {isVerifying && v && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
              Checking integrity · {verifyPercent}%
            </p>
          )}
        </div>
        <div className="flex items-center" style={{ gap: '2px' }}>
          {!isVerifying &&
            (download.isPaused ? (
              <button
                onClick={onResume}
                className="flex items-center justify-center btn-press"
                style={{ width: '28px', height: '28px', borderRadius: '6px', color: 'var(--accent)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-overlay)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                aria-label="Resume download"
              >
                <Play size={15} color="currentColor" variant="Bold" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="flex items-center justify-center btn-press"
                style={{ width: '28px', height: '28px', borderRadius: '6px', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-overlay)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                aria-label="Pause download"
              >
                <Pause size={15} color="currentColor" variant="Bold" />
              </button>
            ))}
          <button
            onClick={onCancel}
            className="flex items-center justify-center btn-press"
            style={{ width: '28px', height: '28px', borderRadius: '6px', color: 'var(--text-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-overlay)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            aria-label={isVerifying ? 'Cancel verification' : 'Cancel download'}
          >
            <CloseCircle size={15} color="currentColor" />
          </button>
        </div>
      </div>

      <div
        style={{
          height: '3px',
          borderRadius: '2px',
          background: 'var(--bg-overlay)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percent}%`,
            borderRadius: '2px',
            background: barColor,
            transition: 'width 300ms var(--ease-out)',
          }}
        />
      </div>
    </div>
  )
}

/* ─── Downloaded Tab ──────────────────────────────────── */

function DownloadedTab({
  models,
  onDelete,
}: {
  models: StoredModel[]
  onDelete: (id: string) => void
}) {
  const { loadModelFromPath, loadedModel, loading } = useEngineStore()

  if (models.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center" style={{ gap: '8px' }}>
        <Cpu size={36} color="var(--text-muted)" style={{ opacity: 0.2 }} />
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>
          No models downloaded yet
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', opacity: 0.6 }}>
          Browse and download a model from the Explore tab
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '16px 24px 24px' }}>
      <div className="flex flex-col" style={{ gap: '8px' }}>
        {models.map((model) => {
          const isLoaded = loadedModel?.modelId === model.id
          const author = model.hfRepoId?.split('/')[0] ?? ''
          const displayName = cleanModelName(model.hfRepoId ?? model.name)
          return (
            <div
              key={model.id}
              className="flex items-center border"
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                gap: '12px',
                borderColor: isLoaded ? 'var(--accent)' : 'var(--border-subtle)',
                background: isLoaded ? 'var(--accent-subtle)' : 'var(--bg-surface)',
              }}
            >
              <AuthorAvatar author={author || model.name} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {displayName}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {formatBytes(model.fileSize)}
                  {author && <> · {author}</>}
                </p>
              </div>
              <div className="flex items-center" style={{ gap: '6px' }}>
                {isLoaded ? (
                  <span
                    style={{
                      padding: '0 12px',
                      height: '30px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '7px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--accent)',
                      background: 'var(--accent-muted)',
                    }}
                  >
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => loadModelFromPath(model.storagePath, model.id)}
                    disabled={loading}
                    className="flex items-center btn-press"
                    style={{
                      gap: '5px',
                      height: '30px',
                      padding: '0 14px',
                      borderRadius: '7px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: 'var(--accent)',
                      color: 'var(--text-inverse)',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    {loading ? 'Loading...' : 'Load'}
                  </button>
                )}
                <button
                  onClick={() => onDelete(model.id)}
                  className="flex items-center justify-center btn-press"
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '7px',
                    color: 'var(--text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--status-error)'
                    e.currentTarget.style.background = 'var(--bg-overlay)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                  aria-label="Delete model"
                >
                  <Trash size={15} color="currentColor" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Usage Tab ───────────────────────────────────────── */

const MAX_DATA_POINTS = 60

function Sparkline({
  data,
  maxVal,
  color,
  height = 48,
}: {
  data: number[]
  maxVal: number
  color: string
  height?: number
}) {
  const width = 200
  if (data.length < 2) {
    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <line
          x1={0}
          y1={height - 1}
          x2={width}
          y2={height - 1}
          stroke={`${color}30`}
          strokeWidth={1}
        />
      </svg>
    )
  }

  const safeMax = maxVal > 0 ? maxVal : 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (Math.min(v, safeMax) / safeMax) * (height - 4) - 2
    return { x, y }
  })

  const line = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const area = `0,${height} ${line} ${width},${height}`

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#grad-${color})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.length > 0 && (
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r={2.5}
          fill={color}
        />
      )}
    </svg>
  )
}

function UsageTab() {
  const [history, setHistory] = useState<ProcessStats[]>([])
  const [hardware, setHardware] = useState<HardwareInfo | null>(null)
  const { loadedModel } = useEngineStore()
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    getHardwareInfo().then((hw) => {
      if (hw) setHardware(hw)
    })
  }, [])

  useEffect(() => {
    const poll = async () => {
      const stats = await getProcessStats()
      if (stats) {
        setHistory((prev) => {
          const next = [...prev, stats]
          return next.length > MAX_DATA_POINTS
            ? next.slice(next.length - MAX_DATA_POINTS)
            : next
        })
      }
    }
    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  const latest = history[history.length - 1]
  const cpuData = history.map((s) => s.systemCpuPercent)
  const memData = history.map((s) => s.systemMemoryUsed)
  const appMemData = history.map((s) => s.appMemoryBytes)
  const appCpuData = history.map((s) => s.appCpuPercent)

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {hardware && (
          <div
            className="border"
            style={{
              padding: '16px 20px',
              borderRadius: '12px',
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-surface)',
              marginBottom: '16px',
            }}
          >
            <div
              className="flex items-center"
              style={{ gap: '8px', marginBottom: '8px' }}
            >
              <MonitorMobbile size={16} color="var(--accent)" />
              <span
                style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                System
              </span>
            </div>
            <div
              className="flex flex-wrap"
              style={{ gap: '12px', fontSize: '12px', color: 'var(--text-muted)' }}
            >
              <span>{hardware.cpuName || 'Unknown CPU'}</span>
              <span>{hardware.cpuCores} cores</span>
              <span>{formatBytes(hardware.totalRam)} RAM</span>
              <span>
                {hardware.os} {hardware.arch}
              </span>
              {hardware.metalSupport && (
                <span style={{ color: 'var(--accent)' }}>Metal</span>
              )}
              {hardware.cudaSupport && (
                <span style={{ color: 'var(--accent)' }}>CUDA</span>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <MetricCard
            label="System CPU"
            value={latest ? `${latest.systemCpuPercent.toFixed(1)}%` : '--'}
            data={cpuData}
            maxVal={100}
            color="#3b82f6"
          />
          <MetricCard
            label="System RAM"
            value={
              latest
                ? `${formatBytes(latest.systemMemoryUsed)} / ${formatBytes(latest.systemMemoryTotal)}`
                : '--'
            }
            data={memData}
            maxVal={hardware?.totalRam ?? 1}
            color="#8b5cf6"
          />
          <MetricCard
            label="App CPU"
            value={latest ? `${latest.appCpuPercent.toFixed(1)}%` : '--'}
            data={appCpuData}
            maxVal={Math.max(100, ...appCpuData)}
            color="#06b6d4"
          />
          <MetricCard
            label="App Memory"
            value={latest ? formatBytes(latest.appMemoryBytes) : '--'}
            data={appMemData}
            maxVal={Math.max(1, ...appMemData) * 1.2}
            color="#22c55e"
          />
        </div>

        <div
          className="border"
          style={{
            padding: '16px 20px',
            borderRadius: '12px',
            borderColor: 'var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <div className="flex items-center" style={{ gap: '8px', marginBottom: '12px' }}>
            <Cpu size={16} color="var(--accent)" />
            <span
              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
            >
              Loaded Model
            </span>
          </div>
          {loadedModel ? (
            <div style={{ fontSize: '12px' }}>
              <div
                className="flex items-center"
                style={{ gap: '8px', marginBottom: '4px' }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {cleanModelName(loadedModel.modelId)}
                </span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    background: 'var(--accent-muted)',
                    color: 'var(--accent)',
                  }}
                >
                  Active
                </span>
              </div>
              <span style={{ color: 'var(--text-muted)' }}>
                {formatBytes(loadedModel.size)} · Context:{' '}
                {loadedModel.contextLength.toLocaleString()} tokens
              </span>
            </div>
          ) : (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              No model loaded. Load a model from the My Models tab to see usage.
            </p>
          )}
        </div>

        {history.length < 3 && (
          <p
            style={{
              marginTop: '24px',
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--text-muted)',
              opacity: 0.5,
            }}
          >
            Collecting data... Updates every 2 seconds.
          </p>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  data,
  maxVal,
  color,
}: {
  label: string
  value: string
  data: number[]
  maxVal: number
  color: string
}) {
  return (
    <div
      className="border"
      style={{
        padding: '14px 16px',
        borderRadius: '12px',
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: '4px' }}
      >
        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' }}>
          {label}
        </span>
        <Activity size={12} color={color} />
      </div>
      <p
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '-0.02em',
          marginBottom: '8px',
          lineHeight: '24px',
        }}
      >
        {value}
      </p>
      <Sparkline data={data} maxVal={maxVal} color={color} />
    </div>
  )
}
