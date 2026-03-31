import { memo } from 'react'
import type { Message } from '../../api/generated'

interface MessageItemProps {
  message: Message
  isOwnMessage: boolean
}

export const MessageItem = memo(({ message, isOwnMessage }: MessageItemProps) => {
  const dateObj = new Date(message.createdAt)

  // Format based on image: "10 Mar 2018 10:22"
  const formattedDate = dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const formattedTime = dateObj.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const timeString = `${formattedDate} ${formattedTime}`

  return (
    <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[240px] p-4 shadow-sm sm:max-w-[420px] rounded-sm border border-border text-text-message ${
          isOwnMessage ? 'bg-message-out' : 'bg-message-in'
        }`}
      >
        {!isOwnMessage && (
          <p className="text-sm font-medium text-text-muted mb-2">{message.author}</p>
        )}
        <p className={`break-words text-[1.1rem] leading-snug`}>{message.message}</p>
        <span
          className={`text-sm text-text-muted mt-3 block ${isOwnMessage ? 'text-right' : 'text-left'}`}
        >
          {timeString}
        </span>
      </div>
    </div>
  )
})

MessageItem.displayName = 'MessageItem'
