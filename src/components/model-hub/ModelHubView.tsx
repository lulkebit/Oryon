import { SearchNormal1, CloseCircle } from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'

export const ModelHubView = () => {
  const { setActiveView } = useUiStore()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h1
          className="text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Model Hub
        </h1>
        <button
          onClick={() => setActiveView('chat')}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-overlay)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
          aria-label="Close Model Hub"
        >
          <CloseCircle size={16} color="currentColor" />
        </button>
      </div>

      {/* Search */}
      <div className="px-6 pt-4">
        <div
          className="flex items-center gap-2 rounded-md border px-3 py-2.5"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-default)',
          }}
        >
          <SearchNormal1 size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search models..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Download a model to get started
        </p>
      </div>
    </div>
  )
}
