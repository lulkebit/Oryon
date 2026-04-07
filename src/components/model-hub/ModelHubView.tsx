import { SearchNormal1, CloseCircle } from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'

export const ModelHubView = () => {
  const { setActiveView } = useUiStore()

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

      {/* Search */}
      <div style={{ padding: '24px 24px 0' }}>
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
            placeholder="Search models..."
            className="flex-1 bg-transparent outline-none"
            style={{
              fontSize: '13px',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      {/* Empty state */}
      <div
        className="flex flex-1 items-center justify-center"
        style={{ padding: '24px' }}
      >
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          Download a model to get started
        </p>
      </div>
    </div>
  )
}
