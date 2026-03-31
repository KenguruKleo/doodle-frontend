import { memo } from 'react'
import type { UIMessage } from '@/store/slices/messagesSlice'

interface MessageItemProps {
  message: UIMessage
  isOwnMessage: boolean
}

// Determine locale at runtime
const locale = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'

const dateFormatter = new Intl.DateTimeFormat(locale, {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(locale, {
  hour: '2-digit',
  minute: '2-digit',
})

export const MessageItem = memo(({ message, isOwnMessage }: MessageItemProps) => {
  const dateObj = new Date(message.createdAt)

  // Format based on image: "10 Mar 2018 10:22" (but adapted to user's locale)
  const formattedDate = dateFormatter.format(dateObj)
  const formattedTime = timeFormatter.format(dateObj)
  const timeString = `${formattedDate} ${formattedTime}`

  return (
    <div className={`flex w-full ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[240px] p-4 shadow-sm sm:max-w-[420px] rounded-sm border text-text-message ${
          isOwnMessage ? 'bg-message-out' : 'bg-message-in'
        } ${message.status === 'error' ? 'border-red-400 border-2' : 'border-border'} ${
          message.status === 'pending' ? 'opacity-70' : ''
        }`}
      >
        {!isOwnMessage && (
          <p className="text-sm font-medium text-text-muted mb-2">{message.author}</p>
        )}
        <p className={`break-words text-[1.1rem] leading-snug`}>{message.message}</p>

        <div
          className={`flex items-center gap-2 mt-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
        >
          {message.status === 'error' && (
            <span className="text-xs text-red-500 font-medium" title="Message failed to send">
              ⚠️ Failed
            </span>
          )}
          {message.status === 'pending' && (
            <span className="text-xs text-text-muted italic">Sending...</span>
          )}
          <span className="text-sm text-text-muted block">{timeString}</span>
        </div>
      </div>
    </div>
  )
})

MessageItem.displayName = 'MessageItem'
