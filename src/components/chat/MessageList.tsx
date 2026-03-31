import { useCallback, useRef } from 'react'
import { Virtuoso } from 'react-virtuoso'
import type { VirtuosoHandle } from 'react-virtuoso'
import { MessageItem } from '@/components/chat/MessageItem'
import type { UIMessage } from '@/store/slices/messagesSlice'

interface MessageListProps {
  messages: UIMessage[]
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
  const virtuosoRef = useRef<VirtuosoHandle>(null)

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      onLoadMore()
    }
  }, [hasMore, isLoadingMore, onLoadMore])

  return (
    <div className="flex-1 w-full" aria-live="polite" aria-atomic="false" role="log">
      <Virtuoso
        ref={virtuosoRef}
        data={messages}
        className="h-full w-full"
        initialTopMostItemIndex={messages.length - 1}
        firstItemIndex={1000000 - messages.length} // A trick to keep scroll stable when prepending items
        startReached={loadMore}
        alignToBottom={true}
        followOutput="smooth"
        components={{
          Header: () => (
            <div className="h-8 w-full flex justify-center items-center py-2">
              {isLoadingMore && (
                <span className="text-sm text-text-muted">Loading older messages...</span>
              )}
            </div>
          ),
        }}
        itemContent={(_index, msg) => (
          <div className="w-full py-2 flex justify-center">
            <div className="w-full max-w-screen-sm px-6">
              <MessageItem message={msg} isOwnMessage={msg.author === currentUser} />
            </div>
          </div>
        )}
      />
    </div>
  )
}
