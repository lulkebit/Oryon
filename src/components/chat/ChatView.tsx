import { MessageText1 } from 'iconsax-react'

export const ChatView = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center p-[32px]">
      <div className="flex flex-col items-center gap-[20px]">
        <MessageText1
          size={48}
          color="var(--text-muted)"
          variant="Broken"
        />
        <div className="text-center">
          <h2
            className="text-[16px] font-semibold leading-[24px]"
            style={{ color: 'var(--text-primary)' }}
          >
            Start a new chat
          </h2>
          <p
            className="mt-[8px] max-w-[280px] text-[13px] leading-[20px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Select a workspace and create a new agent chat
            to get started.
          </p>
        </div>
        <button
          className="inline-flex h-[40px] items-center gap-[8px] rounded-[8px] px-[20px] text-[13px] font-medium transition-colors"
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
