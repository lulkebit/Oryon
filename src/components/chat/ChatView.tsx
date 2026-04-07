import { MessageText1 } from 'iconsax-react'

export const ChatView = () => {
  return (
    <div
      className="flex h-full flex-col items-center justify-center"
      style={{ padding: '40px' }}
    >
      <div
        className="flex flex-col items-center"
        style={{ gap: '24px' }}
      >
        <MessageText1
          size={48}
          color="var(--text-muted)"
          variant="Broken"
        />
        <div className="text-center">
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '24px',
              color: 'var(--text-primary)',
            }}
          >
            Start a new chat
          </h2>
          <p
            style={{
              marginTop: '8px',
              maxWidth: '300px',
              fontSize: '13px',
              lineHeight: '20px',
              color: 'var(--text-secondary)',
            }}
          >
            Select a workspace and create a new agent chat
            to get started.
          </p>
        </div>
        <button
          className="inline-flex items-center transition-colors"
          style={{
            height: '40px',
            gap: '8px',
            padding: '0 24px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
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
