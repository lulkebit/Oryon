import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/types'
import { MessageBubble } from './MessageBubble'

interface MessageListProps {
  messages: Message[]
  loading?: boolean
}

export const MessageList = ({ messages, loading }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Loading messages...
        </p>
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Send a message to start the conversation.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: '0 24px' }}>
      <div style={{ maxWidth: '768px', margin: '0 auto' }}>
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            timestamp={message.createdAt}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
