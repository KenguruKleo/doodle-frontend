import { MessageItem } from '@/components/chat/MessageItem'
import type { Message } from '@/api/generated'
import { useChatScroll } from '@/hooks/useChatScroll'

interface MessageListProps {
  messages: Message[]
  currentUser: string
  onLoadMore: () => void
  hasMore: boolean
  isLoadingMore: boolean
}

export const MessageList = ({
  messages,
  currentUser,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: MessageListProps) => {
  const { containerRef, topObserverTarget, bottomRef } = useChatScroll({
    messages,
    onLoadMore,
    hasMore,
    isLoadingMore,
  })

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center">
      <div className="w-full max-w-screen-sm space-y-4">
        {/* Intersection target for loading older messages */}
        <div ref={topObserverTarget} className="h-4 w-full flex justify-center items-center">
          {isLoadingMore && (
            <span className="text-sm text-text-muted">Loading older messages...</span>
          )}
        </div>

        {messages.map((msg) => (
          <MessageItem key={msg._id} message={msg} isOwnMessage={msg.author === currentUser} />
        ))}

        {/* Target to scroll to bottom */}
        <div ref={bottomRef} className="h-1" />
      </div>
    </div>
  )
}
