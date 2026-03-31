import { MessageItem } from './MessageItem'
import type { Message } from '../../api/generated'

interface MessageListProps {
  messages: Message[]
  currentUser: string
}

export const MessageList = ({ messages, currentUser }: MessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col items-center">
      <div className="w-full max-w-screen-sm space-y-4">
        {messages.map((msg) => (
          <MessageItem key={msg._id} message={msg} isOwnMessage={msg.author === currentUser} />
        ))}
      </div>
    </div>
  )
}
