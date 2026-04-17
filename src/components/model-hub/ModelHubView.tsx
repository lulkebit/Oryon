import { useEffect, useRef, useCallback, useState, memo, useMemo } from 'react'
import {
  SearchNormal1,
  CloseCircle,
  DocumentDownload,
  Trash,
  Cpu,
  ArrowDown2,
  Heart,
  Pause,
  Play,
  Activity,
  MonitorMobbile,
  Code,
  MessageText1,
  Lamp,
  Flash,
  Star1,
  TickCircle,
  InfoCircle,
  ArrowRight,
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
    .replace(/-Instruct/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractParamCount(name: string): number | null {
  const m = name.match(/\b(\d+(?:\.\d+)?)\s*[Bb]\b/)
  if (m) return parseFloat(m[1])
  return null
}

/** Friendly size tier based on parameter count + file size */
function sizeTier(model: HfModelResult): 'Tiny' | 'Small' | 'Medium' | 'Large' {
  const paramB = extractParamCount(model.id) ?? 0
  const smallest = Math.min(...model.files.map((f) => f.size || Infinity))
  const sizeGb = smallest === Infinity ? 0 : smallest / 1_000_000_000

  if (paramB > 0) {
    if (paramB < 3) return 'Tiny'
    if (paramB < 8) return 'Small'
    if (paramB < 20) return 'Medium'
    return 'Large'
  }
  if (sizeGb < 2) return 'Tiny'
  if (sizeGb < 5) return 'Small'
  if (sizeGb < 12) return 'Medium'
  return 'Large'
}

function tierDescription(t: ReturnType<typeof sizeTier>): string {
  switch (t) {
    case 'Tiny':
      return 'Runs anywhere'
    case 'Small':
      return 'Fast & capable'
    case 'Medium':
      return 'Balanced power'
    case 'Large':
      return 'Heavy lifting'
  }
}

type Capability = 'Code' | 'Chat' | 'Reasoning' | 'Vision' | 'Fast'

function detectCapabilities(model: HfModelResult): Capability[] {
  const text = `${model.id} ${model.tags.join(' ')}`.toLowerCase()
  const caps = new Set<Capability>()
  if (/coder|code|codestral|starcoder|deepseek-?coder/.test(text)) caps.add('Code')
  if (/reasoning|think|r1|o1|reason|math/.test(text)) caps.add('Reasoning')
  if (/vision|vl|image|multimodal/.test(text)) caps.add('Vision')
  if (/instruct|chat|it\b|assistant/.test(text)) caps.add('Chat')
  const tier = sizeTier(model)
  if (tier === 'Tiny' || tier === 'Small') caps.add('Fast')
  if (caps.size === 0) caps.add('Chat')
  return Array.from(caps)
}

/** Deterministic hash for a string */
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return Math.abs(h)
}

/** Detect a known model family → gives consistent palette */
interface Family {
  key: string
  palette: [string, string, string, string]
  emblem: string
}

const FAMILIES: { match: RegExp; family: Family }[] = [
  {
    match: /qwen/i,
    family: {
      key: 'qwen',
      palette: ['#7c3aed', '#a855f7', '#ec4899', '#6366f1'],
      emblem: 'Q',
    },
  },
  {
    match: /deepseek/i,
    family: {
      key: 'deepseek',
      palette: ['#1d4ed8', '#0ea5e9', '#06b6d4', '#3b82f6'],
      emblem: 'D',
    },
  },
  {
    match: /llama|meta/i,
    family: {
      key: 'llama',
      palette: ['#ea580c', '#f97316', '#fb7185', '#f59e0b'],
      emblem: 'L',
    },
  },
  {
    match: /mistral|mixtral|codestral/i,
    family: {
      key: 'mistral',
      palette: ['#dc2626', '#f97316', '#fbbf24', '#ef4444'],
      emblem: 'M',
    },
  },
  {
    match: /phi/i,
    family: {
      key: 'phi',
      palette: ['#0891b2', '#14b8a6', '#22d3ee', '#06b6d4'],
      emblem: 'Φ',
    },
  },
  {
    match: /gemma|google/i,
    family: {
      key: 'gemma',
      palette: ['#059669', '#10b981', '#84cc16', '#22c55e'],
      emblem: 'G',
    },
  },
  {
    match: /yi-/i,
    family: {
      key: 'yi',
      palette: ['#ca8a04', '#eab308', '#f59e0b', '#d97706'],
      emblem: 'Y',
    },
  },
  {
    match: /starcoder|code/i,
    family: {
      key: 'starcoder',
      palette: ['#4338ca', '#6366f1', '#8b5cf6', '#3b82f6'],
      emblem: '{ }',
    },
  },
]

function detectFamily(id: string): Family {
  for (const f of FAMILIES) {
    if (f.match.test(id)) return f.family
  }
  // Generate a stable palette from hash
  const h = hashString(id)
  const hue = h % 360
  return {
    key: 'generic',
    palette: [
      `hsl(${hue}, 60%, 42%)`,
      `hsl(${(hue + 30) % 360}, 65%, 52%)`,
      `hsl(${(hue + 60) % 360}, 70%, 60%)`,
      `hsl(${(hue + 90) % 360}, 55%, 48%)`,
    ],
    emblem: (id.split('/').pop()?.[0] ?? '?').toUpperCase(),
  }
}

/** Pick the friendliest-default file (Q4_K_M usually). */
function bestFile(files: GgufFile[]): GgufFile | undefined {
  return (
    files.find((f) => f.quantization === 'Q4_K_M') ??
    files.find((f) => f.quantization === 'Q4_K_S') ??
    files.find((f) => f.quantization === 'Q5_K_M') ??
    files[0]
  )
}

interface QuantInfo {
  label: string
  hint: string
}

function quantLabel(quant: string | null | undefined): QuantInfo {
  if (!quant) return { label: 'Standard', hint: '' }
  const q = quant.toUpperCase()
  if (q === 'Q4_K_M') return { label: 'Balanced', hint: 'Recommended' }
  if (q === 'Q5_K_M') return { label: 'Higher quality', hint: 'A bit larger' }
  if (q === 'Q4_K_S') return { label: 'Compact', hint: 'Smaller file' }
  if (q === 'Q4_0' || q === 'Q4_1') return { label: 'Compact', hint: '' }
  if (q.startsWith('Q3')) return { label: 'Very small', hint: 'Lower quality' }
  if (q.startsWith('Q2')) return { label: 'Smallest', hint: 'Lowest quality' }
  if (q.startsWith('IQ')) return { label: 'Compressed', hint: '' }
  if (q === 'Q6_K') return { label: 'High quality', hint: '' }
  if (q.startsWith('Q8')) return { label: 'Near perfect', hint: 'Very large' }
  if (q.startsWith('F16') || q.startsWith('BF16'))
    return { label: 'Full precision', hint: 'Huge file' }
  return { label: quant, hint: '' }
}

/* ─── Poster (unique gradient art per model) ──────────── */

interface PosterProps {
  modelId: string
  className?: string
  radius?: number
  height?: number | string
  showEmblem?: boolean
  emblemSize?: number
}

const ModelPoster = memo(
  ({
    modelId,
    className,
    radius = 14,
    height = '100%',
    showEmblem = true,
    emblemSize = 64,
  }: PosterProps) => {
    const family = detectFamily(modelId)
    const h = hashString(modelId)
    const [c0, c1, c2, c3] = family.palette

    const blob1 = {
      size: 70 + (h % 35),
      top: -15 + ((h >> 2) % 35),
      left: -15 + ((h >> 4) % 30),
    }
    const blob2 = {
      size: 55 + ((h >> 3) % 30),
      bottom: -20 + ((h >> 6) % 30),
      right: -10 + ((h >> 5) % 25),
    }
    const angle = (h >> 1) % 180

    return (
      <div
        className={className}
        style={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: radius,
          overflow: 'hidden',
          background: `linear-gradient(${angle}deg, ${c0} 0%, ${c1} 100%)`,
          isolation: 'isolate',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: `${blob1.size}%`,
            height: `${blob1.size}%`,
            top: `${blob1.top}%`,
            left: `${blob1.left}%`,
            background: `radial-gradient(circle at 50% 50%, ${c2} 0%, transparent 65%)`,
            opacity: 0.7,
            filter: 'blur(18px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: `${blob2.size}%`,
            height: `${blob2.size}%`,
            bottom: `${blob2.bottom}%`,
            right: `${blob2.right}%`,
            background: `radial-gradient(circle at 50% 50%, ${c3} 0%, transparent 60%)`,
            opacity: 0.55,
            filter: 'blur(14px)',
          }}
        />
        {/* subtle grain */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4' /></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.5'/></svg>\")",
            mixBlendMode: 'overlay',
            opacity: 0.35,
          }}
        />
        {/* inner highlight */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        />
        {showEmblem && (
          <div
            style={{
              position: 'absolute',
              right: Math.max(8, emblemSize * 0.12),
              bottom: Math.max(-8, -emblemSize * 0.2),
              fontSize: emblemSize,
              fontWeight: 900,
              color: 'rgba(255,255,255,0.2)',
              lineHeight: 1,
              fontFamily: 'var(--font-mono, ui-monospace, monospace)',
              letterSpacing: '-0.05em',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          >
            {family.emblem}
          </div>
        )}
      </div>
    )
  }
)
ModelPoster.displayName = 'ModelPoster'

/* ─── Capability chip ─────────────────────────────────── */

function CapabilityIcon({ cap, size = 12 }: { cap: Capability; size?: number }) {
  const color = 'currentColor'
  switch (cap) {
    case 'Code':
      return <Code size={size} color={color} variant="Bold" />
    case 'Chat':
      return <MessageText1 size={size} color={color} variant="Bold" />
    case 'Reasoning':
      return <Lamp size={size} color={color} variant="Bold" />
    case 'Vision':
      return <Star1 size={size} color={color} variant="Bold" />
    case 'Fast':
      return <Flash size={size} color={color} variant="Bold" />
  }
}

function CapabilityChip({ cap }: { cap: Capability }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        gap: '4px',
        height: '20px',
        padding: '0 7px',
        borderRadius: '999px',
        fontSize: '10.5px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        background: 'rgba(255,255,255,0.14)',
        backdropFilter: 'blur(8px)',
        color: '#ffffff',
        border: '1px solid rgba(255,255,255,0.18)',
      }}
    >
      <CapabilityIcon cap={cap} size={10} />
      {cap}
    </span>
  )
}

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
      {/* Header */}
      <div
        className="flex items-center justify-between border-b"
        style={{
          height: '52px',
          padding: '0 24px',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center" style={{ gap: '10px' }}>
          <h1
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            Model Hub
          </h1>
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            Pick an AI to run on your machine
          </span>
        </div>
        <button
          onClick={() => setActiveView('chat')}
          className="flex items-center justify-center btn-press"
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
        style={{ padding: '0 24px', borderColor: 'var(--border-subtle)' }}
      >
        <TabButton
          active={tab === 'explore'}
          onClick={() => setTab('explore')}
          label="Discover"
        />
        <TabButton
          active={tab === 'downloaded'}
          onClick={() => setTab('downloaded')}
          label={`My Models${downloadedModels.length > 0 ? ` · ${downloadedModels.length}` : ''}`}
        />
        <TabButton
          active={tab === 'usage'}
          onClick={() => setTab('usage')}
          label="Activity"
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
        borderBottom: active
          ? '2px solid var(--accent)'
          : '2px solid transparent',
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
  const [capFilter, setCapFilter] = useState<Capability | null>(null)

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search */}
      <div style={{ padding: '16px 24px 0' }}>
        <div
          className="flex items-center"
          style={{
            height: '44px',
            gap: '10px',
            padding: '0 16px',
            borderRadius: '12px',
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
            placeholder="Search by name, topic, or capability…"
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}
          />
          {searching && <Spinner />}
          {isSearchActive && (
            <button
              onClick={() => onQueryChange('')}
              style={{
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
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
            background:
              'color-mix(in srgb, var(--status-error), transparent 90%)',
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
        <DiscoverBody
          featured={featured}
          onDownload={onDownload}
          activeDownload={activeDownload}
          capFilter={capFilter}
          onCapFilter={setCapFilter}
        />
      )}
    </div>
  )
}

/* ─── Discover Body ───────────────────────────────────── */

function DiscoverBody({
  featured,
  onDownload,
  activeDownload,
  capFilter,
  onCapFilter,
}: {
  featured: FeaturedCategory[]
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
  capFilter: Capability | null
  onCapFilter: (c: Capability | null) => void
}) {
  // Pick hero from the first populated category
  const hero = useMemo(() => {
    for (const cat of featured) {
      if (cat.results.length > 0) return cat.results[0]
    }
    return null
  }, [featured])

  // Collect all models across categories (for capability filter)
  const allModels = useMemo(() => {
    const seen = new Set<string>()
    const out: HfModelResult[] = []
    for (const cat of featured) {
      for (const m of cat.results) {
        if (!seen.has(m.id)) {
          seen.add(m.id)
          out.push(m)
        }
      }
    }
    return out
  }, [featured])

  const filtered = useMemo(() => {
    if (!capFilter) return []
    return allModels.filter((m) => detectCapabilities(m).includes(capFilter))
  }, [allModels, capFilter])

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: '20px 24px 40px' }}
    >
      {/* Hero */}
      {hero && !capFilter && (
        <HeroFeature
          model={hero}
          onDownload={onDownload}
          activeDownload={activeDownload}
        />
      )}

      {/* Capability filter row */}
      <div
        className="flex items-center"
        style={{
          gap: '8px',
          marginTop: hero ? '28px' : '4px',
          marginBottom: '18px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: '11.5px',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginRight: '6px',
          }}
        >
          Browse by
        </span>
        {(['Code', 'Chat', 'Reasoning', 'Fast', 'Vision'] as Capability[]).map(
          (c) => (
            <CapabilityFilterTile
              key={c}
              cap={c}
              active={capFilter === c}
              onClick={() => onCapFilter(capFilter === c ? null : c)}
            />
          )
        )}
      </div>

      {/* Filtered grid */}
      {capFilter && (
        <div>
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: '14px' }}
          >
            <h2
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {capFilter} models
            </h2>
            <button
              onClick={() => onCapFilter(null)}
              className="btn-press"
              style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                padding: '4px 8px',
              }}
            >
              Show everything
            </button>
          </div>
          {filtered.length === 0 ? (
            <div
              style={{
                padding: '48px 0',
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}
            >
              No models in this category yet. Try another filter.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                gap: '14px',
              }}
            >
              {filtered.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  onDownload={onDownload}
                  activeDownload={activeDownload}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category sections */}
      {!capFilter &&
        featured.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            onDownload={onDownload}
            activeDownload={activeDownload}
            skipFirst={hero && cat.results[0]?.id === hero.id}
          />
        ))}
    </div>
  )
}

/* ─── Hero Feature ────────────────────────────────────── */

function HeroFeature({
  model,
  onDownload,
  activeDownload,
}: {
  model: HfModelResult
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
}) {
  const recommended = bestFile(model.files)
  const cleanName = cleanModelName(model.id)
  const caps = detectCapabilities(model)
  const tier = sizeTier(model)
  const isActive = activeDownload?.repoId === model.id

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: '18px',
        overflow: 'hidden',
        minHeight: '220px',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <ModelPoster
        modelId={model.id}
        radius={18}
        height="100%"
        showEmblem
        emblemSize={200}
      />
      {/* Dark overlay for text readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.65) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div className="flex items-center" style={{ gap: '6px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              background: 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.22)',
            }}
          >
            <Star1 size={11} color="currentColor" variant="Bold" />
            Featured
          </span>
        </div>

        <div>
          <div
            className="flex flex-wrap items-center"
            style={{ gap: '6px', marginBottom: '10px' }}
          >
            {caps.map((c) => (
              <CapabilityChip key={c} cap={c} />
            ))}
          </div>
          <h2
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: '#fff',
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              marginBottom: '6px',
              textShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          >
            {cleanName}
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.82)',
              marginBottom: '16px',
              maxWidth: '520px',
            }}
          >
            {tierDescription(tier)} ·{' '}
            {model.author ? `by ${model.author}` : 'Community model'} ·{' '}
            {formatNumber(model.downloads)} downloads
          </p>

          <div className="flex items-center" style={{ gap: '10px' }}>
            {recommended && (
              <button
                onClick={() => onDownload(model.id, recommended.filename)}
                disabled={!!activeDownload}
                className="flex items-center btn-press"
                style={{
                  height: '38px',
                  gap: '8px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  background: '#fff',
                  color: '#000',
                  opacity: activeDownload ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                }}
              >
                <DocumentDownload size={14} color="currentColor" variant="Bold" />
                {isActive ? 'Downloading…' : 'Install this model'}
                {recommended.size > 0 && (
                  <span
                    style={{
                      opacity: 0.6,
                      fontSize: '11.5px',
                      fontWeight: 500,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatBytes(recommended.size)}
                  </span>
                )}
              </button>
            )}
            <span
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <InfoCircle size={12} color="currentColor" />
              Runs entirely on your device
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Capability Filter Tile ──────────────────────────── */

function CapabilityFilterTile({
  cap,
  active,
  onClick,
}: {
  cap: Capability
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center btn-press"
      style={{
        gap: '6px',
        height: '32px',
        padding: '0 13px',
        borderRadius: '999px',
        fontSize: '12.5px',
        fontWeight: 500,
        background: active ? 'var(--accent)' : 'var(--bg-elevated)',
        color: active ? 'var(--text-inverse)' : 'var(--text-secondary)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
        transition: 'all 120ms var(--ease-out)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-overlay)'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'var(--bg-elevated)'
      }}
    >
      <CapabilityIcon cap={cap} size={12} />
      {cap}
    </button>
  )
}

/* ─── Category Section ────────────────────────────────── */

function CategorySection({
  category,
  onDownload,
  activeDownload,
  skipFirst,
}: {
  category: FeaturedCategory
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
  skipFirst?: boolean | null
}) {
  const results = skipFirst ? category.results.slice(1) : category.results
  if (results.length === 0 && !category.loading) return null

  return (
    <section style={{ marginTop: '32px' }}>
      <div
        className="flex items-end justify-between"
        style={{ marginBottom: '14px' }}
      >
        <div>
          <h2
            style={{
              fontSize: '15px',
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
              marginTop: '2px',
            }}
          >
            {category.description}
          </p>
        </div>
      </div>

      {category.loading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '14px',
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: '260px',
                borderRadius: '14px',
                background: 'var(--bg-elevated)',
              }}
            />
          ))}
        </div>
      )}

      {!category.loading && results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
            gap: '14px',
          }}
        >
          {results.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onDownload={onDownload}
              activeDownload={activeDownload}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ─── Model Card ──────────────────────────────────────── */

function ModelCard({
  model,
  onDownload,
  activeDownload,
}: {
  model: HfModelResult
  onDownload: (repoId: string, filename: string) => void
  activeDownload: { repoId: string; filename: string } | null
}) {
  const [showOptions, setShowOptions] = useState(false)
  const recommended = bestFile(model.files)
  const cleanName = cleanModelName(model.id)
  const caps = detectCapabilities(model)
  const tier = sizeTier(model)
  const isActive = activeDownload?.repoId === model.id
  const sortedFiles = useMemo(
    () => [...model.files].sort((a, b) => (a.size || 0) - (b.size || 0)),
    [model.files]
  )

  return (
    <div
      className="group flex flex-col"
      style={{
        borderRadius: '14px',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
        transition: 'transform 180ms var(--ease-out), border-color 180ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-default)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-subtle)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Poster */}
      <div style={{ position: 'relative', height: '128px' }}>
        <ModelPoster
          modelId={model.id}
          radius={0}
          height="100%"
          emblemSize={100}
        />
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap',
            maxWidth: 'calc(100% - 20px)',
          }}
        >
          {caps.slice(0, 3).map((c) => (
            <CapabilityChip key={c} cap={c} />
          ))}
        </div>
        <span
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '3px 8px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {tier}
        </span>
      </div>

      {/* Body */}
      <div
        style={{
          padding: '14px 14px 12px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
        }}
      >
        <h3
          style={{
            fontSize: '13.5px',
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
        </h3>
        <p
          style={{
            fontSize: '11.5px',
            color: 'var(--text-muted)',
            marginTop: '2px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {model.author ?? 'Community'} · {tierDescription(tier)}
        </p>

        <div
          className="flex items-center"
          style={{
            gap: '10px',
            marginTop: '10px',
            marginBottom: '12px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}
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
        </div>

        <div style={{ flex: 1 }} />

        {/* Install button */}
        {recommended && !showOptions && (
          <>
            <button
              onClick={() => onDownload(model.id, recommended.filename)}
              disabled={!!activeDownload}
              className="flex w-full items-center justify-center btn-press"
              style={{
                height: '36px',
                gap: '6px',
                borderRadius: '10px',
                fontSize: '12.5px',
                fontWeight: 600,
                background: 'var(--accent)',
                color: 'var(--text-inverse)',
                opacity: activeDownload ? 0.5 : 1,
              }}
            >
              {isActive ? (
                <>
                  <Spinner size={12} dark />
                  Downloading…
                </>
              ) : (
                <>
                  <DocumentDownload
                    size={13}
                    color="currentColor"
                    variant="Bold"
                  />
                  Install
                  {recommended.size > 0 && (
                    <span style={{ opacity: 0.7, fontWeight: 500 }}>
                      · {formatBytes(recommended.size)}
                    </span>
                  )}
                </>
              )}
            </button>
            {model.files.length > 1 && (
              <button
                onClick={() => setShowOptions(true)}
                style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  height: '22px',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                {model.files.length} size options
              </button>
            )}
          </>
        )}

        {showOptions && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {sortedFiles.map((f) => (
              <FileOption
                key={f.filename}
                file={f}
                repoId={model.id}
                onDownload={onDownload}
                isActive={
                  isActive && activeDownload?.filename === f.filename
                }
                disabled={!!activeDownload}
              />
            ))}
            <button
              onClick={() => setShowOptions(false)}
              className="btn-press"
              style={{
                height: '24px',
                marginTop: '2px',
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'transparent',
                border: 'none',
              }}
            >
              Hide options
            </button>
          </div>
        )}
      </div>
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
        <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {info.label}
        </div>
        {info.hint && (
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {info.hint}
          </div>
        )}
      </div>
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
          Nothing matches &ldquo;{query}&rdquo;
        </p>
        <p
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            opacity: 0.6,
            marginTop: '4px',
          }}
        >
          Try a different term or browse the categories
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: '20px 24px 32px' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
          gap: '14px',
        }}
      >
        {results.map((model) => (
          <ModelCard
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

/* ─── Shared ──────────────────────────────────────────── */

function Spinner({ size = 14, dark = false }: { size?: number; dark?: boolean }) {
  return (
    <div
      className="animate-spin"
      style={{
        width: size,
        height: size,
        border: `2px solid ${dark ? 'rgba(0,0,0,0.2)' : 'var(--border-default)'}`,
        borderTopColor: dark ? 'rgba(0,0,0,0.7)' : 'var(--accent)',
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
  const downloadPercent =
    p && p.total > 0 ? Math.round((p.downloaded / p.total) * 100) : 0
  const verifyPercent =
    v && v.total > 0 ? Math.round((v.processed / v.total) * 100) : 0
  const percent = isVerifying ? verifyPercent : downloadPercent

  const cleanName = cleanModelName(download.repoId)
  const statusLabel = isVerifying
    ? 'Checking it works'
    : download.isPaused
      ? 'Paused'
      : 'Getting your model'
  const barColor = download.isPaused ? 'var(--text-muted)' : 'var(--accent)'

  return (
    <div
      style={{
        margin: '12px 24px 0',
        padding: '12px 14px',
        borderRadius: '12px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex items-center"
        style={{ gap: '12px', marginBottom: '8px' }}
      >
        <div style={{ width: '40px', height: '40px', flexShrink: 0 }}>
          <ModelPoster
            modelId={download.repoId}
            radius={10}
            height="100%"
            emblemSize={28}
          />
        </div>
        {isVerifying && <Spinner />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {statusLabel}: {cleanName}
          </p>
          {!isVerifying && p && (
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '1px',
              }}
            >
              {formatBytes(p.downloaded)} of {formatBytes(p.total)}
              {!download.isPaused && <> · {formatSpeed(p.speedBps)}</>}
              {' · '}
              {downloadPercent}%
            </p>
          )}
          {isVerifying && v && (
            <p
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '1px',
              }}
            >
              Making sure everything arrived safely · {verifyPercent}%
            </p>
          )}
        </div>
        <div className="flex items-center" style={{ gap: '2px' }}>
          {!isVerifying &&
            (download.isPaused ? (
              <button
                onClick={onResume}
                className="flex items-center justify-center btn-press"
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  color: 'var(--accent)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-overlay)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
                aria-label="Resume download"
              >
                <Play size={15} color="currentColor" variant="Bold" />
              </button>
            ) : (
              <button
                onClick={onPause}
                className="flex items-center justify-center btn-press"
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
                aria-label="Pause download"
              >
                <Pause size={15} color="currentColor" variant="Bold" />
              </button>
            ))}
          <button
            onClick={onCancel}
            className="flex items-center justify-center btn-press"
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
            aria-label={isVerifying ? 'Cancel verification' : 'Cancel download'}
          >
            <CloseCircle size={15} color="currentColor" />
          </button>
        </div>
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
      <div
        className="flex flex-1 flex-col items-center justify-center"
        style={{ gap: '10px', padding: '48px 24px' }}
      >
        <div style={{ width: '96px', height: '96px', opacity: 0.5 }}>
          <ModelPoster
            modelId="empty-state"
            radius={20}
            height="100%"
            emblemSize={48}
          />
        </div>
        <p
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          Your shelf is empty
        </p>
        <p
          style={{
            fontSize: '12.5px',
            color: 'var(--text-muted)',
            textAlign: 'center',
            maxWidth: '320px',
          }}
        >
          Head to Discover and pick up your first model. Everything runs
          locally — no accounts, no uploads.
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: '20px 24px 32px' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '14px',
        }}
      >
        {models.map((model) => {
          const isLoaded = loadedModel?.modelId === model.id
          const author = model.hfRepoId?.split('/')[0] ?? ''
          const displayName = cleanModelName(model.hfRepoId ?? model.name)
          const modelKey = model.hfRepoId ?? model.name

          return (
            <div
              key={model.id}
              className="flex flex-col"
              style={{
                borderRadius: '14px',
                border: `1px solid ${isLoaded ? 'var(--accent)' : 'var(--border-subtle)'}`,
                background: 'var(--bg-surface)',
                overflow: 'hidden',
                transition: 'border-color 180ms',
              }}
            >
              <div style={{ position: 'relative', height: '92px' }}>
                <ModelPoster
                  modelId={modelKey}
                  radius={0}
                  height="100%"
                  emblemSize={80}
                />
                {isLoaded && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '10.5px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      background: '#fff',
                      color: '#000',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    }}
                  >
                    <TickCircle size={11} color="currentColor" variant="Bold" />
                    In use
                  </span>
                )}
              </div>

              <div style={{ padding: '12px 14px 14px' }}>
                <p
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={displayName}
                >
                  {displayName}
                </p>
                <p
                  style={{
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    marginTop: '2px',
                  }}
                >
                  {formatBytes(model.fileSize)}
                  {author && <> · {author}</>}
                </p>

                <div
                  className="flex items-center"
                  style={{ gap: '6px', marginTop: '12px' }}
                >
                  {isLoaded ? (
                    <span
                      style={{
                        flex: 1,
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--accent)',
                        background: 'var(--accent-muted)',
                      }}
                    >
                      Active model
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        loadModelFromPath(model.storagePath, model.id)
                      }
                      disabled={loading}
                      className="flex flex-1 items-center justify-center btn-press"
                      style={{
                        gap: '6px',
                        height: '32px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: 'var(--accent)',
                        color: 'var(--text-inverse)',
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      {loading ? (
                        <>
                          <Spinner size={12} dark />
                          Loading…
                        </>
                      ) : (
                        <>
                          <ArrowRight size={12} color="currentColor" variant="Bold" />
                          Use this model
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(model.id)}
                    className="flex items-center justify-center btn-press"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--status-error)'
                      e.currentTarget.style.background = 'var(--bg-overlay)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                    aria-label="Remove model"
                  >
                    <Trash size={13} color="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Usage / Activity Tab ────────────────────────────── */

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
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Loaded model banner */}
        {loadedModel && (
          <div
            style={{
              position: 'relative',
              borderRadius: '14px',
              overflow: 'hidden',
              marginBottom: '16px',
              minHeight: '108px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <ModelPoster
              modelId={loadedModel.modelId}
              radius={14}
              height="100%"
              emblemSize={120}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 9px',
                  borderRadius: '999px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  width: 'fit-content',
                  marginBottom: '8px',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <TickCircle size={11} color="currentColor" variant="Bold" />
                Currently loaded
              </span>
              <h3
                style={{
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '-0.01em',
                  marginBottom: '3px',
                }}
              >
                {cleanModelName(loadedModel.modelId)}
              </h3>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                {formatBytes(loadedModel.size)} · Context{' '}
                {loadedModel.contextLength.toLocaleString()} tokens
              </p>
            </div>
          </div>
        )}

        {!loadedModel && (
          <div
            className="border"
            style={{
              padding: '18px 20px',
              borderRadius: '14px',
              borderColor: 'var(--border-subtle)',
              background: 'var(--bg-surface)',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}
            >
              No model loaded
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Load one from My Models to start a chat.
            </p>
          </div>
        )}

        {hardware && (
          <div
            className="border"
            style={{
              padding: '14px 18px',
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
              <MonitorMobbile size={14} color="var(--accent)" />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                Your machine
              </span>
            </div>
            <div
              className="flex flex-wrap"
              style={{
                gap: '10px',
                fontSize: '11.5px',
                color: 'var(--text-muted)',
              }}
            >
              <span>{hardware.cpuName || 'Unknown CPU'}</span>
              <span>·</span>
              <span>{hardware.cpuCores} cores</span>
              <span>·</span>
              <span>{formatBytes(hardware.totalRam)} RAM</span>
              <span>·</span>
              <span>
                {hardware.os} {hardware.arch}
              </span>
              {hardware.metalSupport && (
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  · Metal
                </span>
              )}
              {hardware.cudaSupport && (
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                  · CUDA
                </span>
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
            Collecting data…
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
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-muted)',
          }}
        >
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

/* Suppress unused warnings for imported icons only used in types */
void Cpu
