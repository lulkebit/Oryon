import { Box } from 'lucide-react'

export const ChatView = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Box
          size={48}
          strokeWidth={1}
          style={{ color: 'var(--text-muted)' }}
        />
        <div className="text-center">
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Start a new chat
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            Select a workspace and create a new agent chat to get started.
          </p>
        </div>
        <button
          className="mt-2 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
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
