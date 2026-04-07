import { MessageText1 } from 'iconsax-react'

export const ChatView = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8">
      <div className="flex flex-col items-center gap-5">
        <MessageText1
          size={52}
          color="var(--text-muted)"
          variant="Broken"
        />
        <div className="text-center">
          <h2
            className="text-[17px] font-semibold leading-6"
            style={{ color: 'var(--text-primary)' }}
          >
            Start a new chat
          </h2>
          <p
            className="mt-2 max-w-xs text-[13px] leading-5"
            style={{ color: 'var(--text-secondary)' }}
          >
            Select a workspace and create a new agent chat
            to get started.
          </p>
        </div>
        <button
          className="mt-1 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[13px] font-medium transition-colors"
          style={{
            background: 'var(--accent)',
            color: 'var(--text-inverse)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
          }}
        >
          + New Chat
        </button>
      </div>
    </div>
  )
}
