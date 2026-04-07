import { SearchNormal1, CloseCircle } from 'iconsax-react'
import { useUiStore } from '@/stores/uiStore'

export const ModelHubView = () => {
  const { setActiveView } = useUiStore()

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex h-[52px] items-center justify-between border-b px-[24px]"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <h1
          className="text-[14px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Model Hub
        </h1>
        <button
          onClick={() => setActiveView('chat')}
          className="flex h-[32px] w-[32px] items-center justify-center rounded-[6px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
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
      <div className="p-[24px] pb-0">
        <div
          className="flex h-[40px] items-center gap-[10px] rounded-[8px] border px-[12px]"
          style={{
            background: 'var(--bg-input)',
            borderColor: 'var(--border-default)',
          }}
        >
          <SearchNormal1 size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search models..."
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 items-center justify-center p-[24px]">
        <p
          className="text-[13px]"
          style={{ color: 'var(--text-muted)' }}
        >
          Download a model to get started
        </p>
      </div>
    </div>
  )
}
