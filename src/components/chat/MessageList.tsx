import { useEffect, useRef, useLayoutEffect } from 'react'
import { MessageItem } from '@/components/chat/MessageItem'
import type { Message } from '@/api/generated'

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
  const containerRef = useRef<HTMLDivElement>(null)
  const topObserverTarget = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Ref to preserve scroll position when loading older messages
  const previousScrollHeight = useRef<number>(0)
  // Ref to track the previous number of messages to detect *new* messages
  const prevMessagesLength = useRef<number>(messages.length)

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const target = topObserverTarget.current
    if (!target || !hasMore || isLoadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Save current scroll height before loading more
          if (containerRef.current) {
            previousScrollHeight.current = containerRef.current.scrollHeight
          }
          onLoadMore()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, onLoadMore])

  // Layout effect to handle scrolling
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const isNewMessageAddedAtBottom =
      messages.length > prevMessagesLength.current && previousScrollHeight.current === 0
    const isFirstLoad = prevMessagesLength.current === 0 && messages.length > 0

    if (previousScrollHeight.current > 0) {
      // 1. We loaded older messages (prepended) -> Restore scroll position
      const newScrollHeight = container.scrollHeight
      const heightDifference = newScrollHeight - previousScrollHeight.current

      if (heightDifference > 0) {
        container.scrollTop += heightDifference
      }
      // Reset after adjusting
      previousScrollHeight.current = 0
    } else if (isNewMessageAddedAtBottom || isFirstLoad) {
      // 2. A new message was added at the bottom OR it's the initial load -> Scroll to bottom
      bottomRef.current?.scrollIntoView({ behavior: isFirstLoad ? 'auto' : 'smooth' })
    }

    prevMessagesLength.current = messages.length
  }, [messages])

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
