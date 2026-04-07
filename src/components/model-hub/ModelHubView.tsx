import { useEffect, useRef, useCallback } from 'react'
import {
  SearchNormal1,
  CloseCircle,
  DocumentDownload,
  Trash,
  Cpu,
  ArrowDown2,
  ArrowRight2,
} from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'
import { useModelHubStore } from '@/stores/modelHubStore'
import type { FeaturedCategory } from '@/stores/modelHubStore'
import { useEngineStore } from '@/stores/engineStore'
import type { HfModelResult, GgufFile, StoredModel } from '@/lib/ipc/hub'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
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
    cancelActiveDownload,
    removeModel,
    loadDownloaded,
    loadFeatured,
    initEventListeners,
    error,
  } = useModelHubStore()

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  const listenersInit = useRef(false)

  useEffect(() => {
    loadDownloaded()
    loadFeatured()
  }, [loadDownloaded, loadFeatured])

  useEffect(() => {
    if (listenersInit.current) return
    listenersInit.current = true

    let cleanup: (() => void) | undefined
    initEventListeners().then((fn) => {
      cleanup = fn
    })
    return () => {
      cleanup?.()
      listenersInit.current = false
    }
  }, [initEventListeners])

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
      searchTimeout.current = setTimeout(() => {
        search(value)
      }, 400)
    },
    [setQuery, search]
  )

  const isSearching = query.trim().length > 0

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b"
        style={{
          height: '52px',
          padding: '0 24px',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <h1
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Model Hub
        </h1>
        <button
          onClick={() => setActiveView('chat')}
          className="flex items-center justify-center transition-colors"
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-overlay)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Close Model Hub"
        >
          <CloseCircle size={18} color="currentColor" />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center border-b"
        style={{
          padding: '0 24px',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <TabButton
          active={tab === 'explore'}
          onClick={() => setTab('explore')}
          label="Explore"
        />
        <TabButton
          active={tab === 'downloaded'}
          onClick={() => setTab('downloaded')}
          label={`Downloaded (${downloadedModels.length})`}
        />
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
          onCancelDownload={cancelActiveDownload}
          error={error}
        />
      )}

      {tab === 'downloaded' && (
        <DownloadedTab models={downloadedModels} onDelete={removeModel} />
      )}
    </div>
  )
}

/* ─── Tabs ─────────────────────────────────────────── */

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
      className="transition-colors"
      style={{
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--text-primary)' : 'var(--text-muted)',
        borderBottom: active
          ? '2px solid var(--text-primary)'
          : '2px solid transparent',
      }}
    >
      {label}
    </button>
  )
}

/* ─── Explore (Browse + Search) ────────────────────── */

function ExploreTab({
  query,
  onQueryChange,
  searchResults,
  searching,
  isSearchActive,
  featured,
  activeDownload,
  onDownload,
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
    progress: {
      downloaded: number
      total: number
      speedBps: number
    } | null
  } | null
  onDownload: (repoId: string, filename: string) => void
  onCancelDownload: () => void
  error: string | null
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search bar */}
      <div style={{ padding: '16px 24px 0' }}>
        <div
          className="flex items-center border"
          style={{
            height: '40px',
            gap: '10px',
            padding: '0 14px',
            borderRadius: '8px',
            background: 'var(--bg-input)',
            borderColor: 'var(--border-default)',
          }}
        >
          <SearchNormal1 size={18} color="var(--text-muted)" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search GGUF models on Hugging Face..."
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: '13px', color: 'var(--text-primary)' }}
          />
          {searching && <Spinner />}
          {isSearchActive && (
            <button
              onClick={() => onQueryChange('')}
              className="flex items-center justify-center"
              style={{ color: 'var(--text-muted)' }}
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
            borderRadius: '6px',
            fontSize: '12px',
            background: 'var(--status-error-bg, rgba(239,68,68,0.1))',
            color: 'var(--status-error)',
          }}
        >
          {error}
        </div>
      )}

      {activeDownload && (
        <DownloadBanner
          download={activeDownload}
          onCancel={onCancelDownload}
        />
      )}

      {/* Search results overlay */}
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

/* ─── Browse Grid (categories) ─────────────────────── */

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
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: '20px 0 24px' }}
    >
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

  return (
    <div style={{ marginBottom: '24px' }}>
      {/* Section header */}
      <div
        className="flex items-center justify-between"
        style={{ padding: '0 24px', marginBottom: '4px' }}
      >
        <div>
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            {category.label}
          </h2>
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginTop: '2px',
            }}
          >
            {category.description}
          </p>
        </div>
        <ArrowRight2
          size={16}
          color="var(--text-muted)"
          style={{ flexShrink: 0 }}
        />
      </div>

      {/* Loading skeleton */}
      {category.loading && (
        <div
          className="flex"
          style={{ gap: '12px', padding: '12px 24px', overflow: 'hidden' }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                width: '280px',
                height: '120px',
                borderRadius: '12px',
                background: 'var(--bg-elevated)',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Horizontal scroll of model cards */}
      {!category.loading && category.results.length > 0 && (
        <div
          ref={scrollRef}
          className="hide-scrollbar flex"
          style={{
            gap: '12px',
            padding: '12px 24px',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
          }}
        >
          {category.results.map((model) => (
            <BrowseModelCard
              key={model.id}
              model={model}
              onDownload={onDownload}
              activeDownload={activeDownload}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BrowseModelCard({
  model,
  onDownload,
  activeDownload,
}: {
  model: HfModelResult
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
}) {
  const isDownloadingFromThis = activeDownload?.repoId === model.id
  const recommendedFile =
    model.files.find(
      (f) =>
        f.quantization === 'Q4_K_M' ||
        f.quantization === 'Q4_K_S' ||
        f.quantization === 'Q5_K_M'
    ) ?? model.files[0]

  return (
    <div
      className="border"
      style={{
        width: '300px',
        flexShrink: 0,
        padding: '14px 16px',
        borderRadius: '12px',
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {/* Model info */}
      <div>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={model.id}
        >
          {model.id.split('/').pop()}
        </p>
        <div
          className="flex items-center"
          style={{
            gap: '8px',
            marginTop: '4px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
        >
          {model.author && (
            <span style={{ opacity: 0.8 }}>{model.author}</span>
          )}
          <span className="flex items-center" style={{ gap: '2px' }}>
            <ArrowDown2 size={10} color="currentColor" />
            {formatNumber(model.downloads)}
          </span>
        </div>
      </div>

      {/* File chips — top 3 */}
      <div className="flex flex-wrap" style={{ gap: '6px' }}>
        {model.files.slice(0, 4).map((file) => (
          <FileChip
            key={file.filename}
            file={file}
            repoId={model.id}
            onDownload={onDownload}
            isDownloading={
              isDownloadingFromThis &&
              activeDownload?.filename === file.filename
            }
            disabled={!!activeDownload}
            compact
          />
        ))}
        {model.files.length > 4 && (
          <span
            style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              padding: '3px 6px',
              alignSelf: 'center',
            }}
          >
            +{model.files.length - 4}
          </span>
        )}
      </div>

      {/* Quick-download recommended quant */}
      {recommendedFile && (
        <button
          onClick={() => onDownload(model.id, recommendedFile.filename)}
          disabled={!!activeDownload}
          className="flex items-center justify-center transition-colors"
          style={{
            height: '32px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            gap: '6px',
            background: 'var(--accent)',
            color: 'var(--text-inverse)',
            opacity: activeDownload ? 0.5 : 1,
          }}
        >
          <DocumentDownload size={14} color="currentColor" />
          Download {recommendedFile.quantization ?? 'GGUF'}
          {recommendedFile.size > 0 &&
            ` (${formatBytes(recommendedFile.size)})`}
        </button>
      )}
    </div>
  )
}

/* ─── Search Results ───────────────────────────────── */

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
  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: '16px 24px 24px' }}
    >
      {results.length === 0 && !searching && query && (
        <p
          className="py-8 text-center"
          style={{ fontSize: '13px', color: 'var(--text-muted)' }}
        >
          No GGUF models found for &ldquo;{query}&rdquo;
        </p>
      )}

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
  const isDownloadingFromThis = activeDownload?.repoId === model.id

  return (
    <div
      className="border"
      style={{
        padding: '16px',
        borderRadius: '10px',
        borderColor: 'var(--border-subtle)',
        background: 'var(--bg-surface)',
      }}
    >
      <div
        className="flex items-start justify-between"
        style={{ marginBottom: '8px' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {model.id}
          </p>
          <div
            className="flex items-center"
            style={{
              gap: '12px',
              marginTop: '4px',
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            {model.author && <span>{model.author}</span>}
            <span className="flex items-center" style={{ gap: '2px' }}>
              <ArrowDown2 size={12} color="currentColor" />
              {formatNumber(model.downloads)}
            </span>
            <span>{model.files.length} files</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginTop: '10px',
        }}
      >
        {model.files.slice(0, 8).map((file) => (
          <FileChip
            key={file.filename}
            file={file}
            repoId={model.id}
            onDownload={onDownload}
            isDownloading={
              isDownloadingFromThis &&
              activeDownload?.filename === file.filename
            }
            disabled={!!activeDownload}
          />
        ))}
        {model.files.length > 8 && (
          <span
            style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              padding: '4px 8px',
            }}
          >
            +{model.files.length - 8} more
          </span>
        )}
      </div>
    </div>
  )
}

/* ─── Shared Components ────────────────────────────── */

function FileChip({
  file,
  repoId,
  onDownload,
  isDownloading,
  disabled,
  compact,
}: {
  file: GgufFile
  repoId: string
  onDownload: (repoId: string, filename: string) => void
  isDownloading: boolean
  disabled: boolean
  compact?: boolean
}) {
  return (
    <button
      onClick={() => onDownload(repoId, file.filename)}
      disabled={disabled}
      className="flex items-center border transition-colors"
      style={{
        gap: compact ? '4px' : '6px',
        padding: compact ? '3px 8px' : '4px 10px',
        borderRadius: '6px',
        fontSize: compact ? '10px' : '11px',
        borderColor: isDownloading
          ? 'var(--accent)'
          : 'var(--border-default)',
        background: isDownloading
          ? 'var(--accent-muted)'
          : 'var(--bg-elevated)',
        color: 'var(--text-secondary)',
        opacity: disabled && !isDownloading ? 0.5 : 1,
      }}
    >
      <DocumentDownload size={compact ? 10 : 12} color="currentColor" />
      <span style={{ fontWeight: 500 }}>
        {file.quantization ?? file.filename.split('.')[0].slice(-8)}
      </span>
      {!compact && file.size > 0 && (
        <span style={{ opacity: 0.6 }}>{formatBytes(file.size)}</span>
      )}
    </button>
  )
}

function Spinner() {
  return (
    <div
      className="animate-spin"
      style={{
        width: '14px',
        height: '14px',
        border: '2px solid var(--border-default)',
        borderTopColor: 'var(--text-primary)',
        borderRadius: '50%',
      }}
    />
  )
}

function DownloadBanner({
  download,
  onCancel,
}: {
  download: {
    repoId: string
    filename: string
    progress: {
      downloaded: number
      total: number
      speedBps: number
    } | null
  }
  onCancel: () => void
}) {
  const p = download.progress
  const percent =
    p && p.total > 0 ? Math.round((p.downloaded / p.total) * 100) : 0

  return (
    <div
      style={{
        margin: '12px 24px 0',
        padding: '12px 16px',
        borderRadius: '10px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: '8px' }}
      >
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
            Downloading {download.filename}
          </p>
          {p && (
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '2px',
              }}
            >
              {formatBytes(p.downloaded)} / {formatBytes(p.total)} ·{' '}
              {formatSpeed(p.speedBps)} · {percent}%
            </p>
          )}
        </div>
        <button
          onClick={onCancel}
          className="flex items-center justify-center transition-colors"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-overlay)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Cancel download"
        >
          <CloseCircle size={16} color="currentColor" />
        </button>
      </div>
      <div
        style={{
          height: '4px',
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
            background: 'var(--accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

/* ─── Downloaded ───────────────────────────────────── */

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
      <div className="flex flex-1 flex-col items-center justify-center">
        <Cpu
          size={40}
          color="var(--text-muted)"
          style={{ opacity: 0.3, marginBottom: '12px' }}
        />
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          No downloaded models yet
        </p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            opacity: 0.6,
            marginTop: '4px',
          }}
        >
          Browse and download a model to get started
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: '16px 24px 24px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {models.map((model) => {
          const isLoaded = loadedModel?.modelId === model.id
          return (
            <div
              key={model.id}
              className="flex items-center border"
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                gap: '12px',
                borderColor: isLoaded
                  ? 'var(--accent)'
                  : 'var(--border-subtle)',
                background: isLoaded
                  ? 'var(--accent-muted)'
                  : 'var(--bg-surface)',
              }}
            >
              <Cpu
                size={20}
                color={
                  isLoaded ? 'var(--accent)' : 'var(--text-muted)'
                }
              />
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
                  {model.name}
                </p>
                <p
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  {formatBytes(model.fileSize)}
                  {model.hfRepoId && ` · ${model.hfRepoId}`}
                </p>
              </div>
              <div className="flex items-center" style={{ gap: '6px' }}>
                {!isLoaded && (
                  <button
                    onClick={() =>
                      loadModelFromPath(model.storagePath, model.id)
                    }
                    disabled={loading}
                    className="flex items-center border transition-colors"
                    style={{
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: 'var(--accent)',
                      color: 'var(--text-inverse)',
                      borderColor: 'transparent',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    {loading ? 'Loading...' : 'Load'}
                  </button>
                )}
                {isLoaded && (
                  <span
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--accent)',
                    }}
                  >
                    Active
                  </span>
                )}
                <button
                  onClick={() => onDelete(model.id)}
                  className="flex items-center justify-center transition-colors"
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
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
                  <Trash size={16} color="currentColor" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
