import { useEffect } from 'react'
import { MessageText1 } from 'iconsax-react'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useChatStore } from '@/stores/chatStore'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'

export const ChatView = () => {
  const { activeChatId, chats } = useWorkspaceStore()
  const { messages, loading, loadMessages, sendMessage, clearMessages } =
    useChatStore()

  const activeChat = chats.find((c) => c.id === activeChatId)

  useEffect(() => {
    if (activeChatId) {
      loadMessages(activeChatId)
    } else {
      clearMessages()
    }
  }, [activeChatId, loadMessages, clearMessages])

  if (!activeChatId || !activeChat) {
    return <EmptyState />
  }

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div
        className="flex items-center border-b"
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
          {activeChat.title}
        </h1>
      </div>

      <MessageList messages={messages} loading={loading} />

      <ChatInput onSend={(content) => sendMessage(activeChatId, content)} />
    </div>
  )
}

const EmptyState = () => (
  <div
    className="flex h-full flex-col items-center justify-center"
    style={{ padding: '40px' }}
  >
    <div className="flex flex-col items-center" style={{ gap: '24px' }}>
      <MessageText1 size={48} color="var(--text-muted)" variant="Broken" />
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
          Open a workspace and create a new chat to get started.
        </p>
      </div>
    </div>
  </div>
)
