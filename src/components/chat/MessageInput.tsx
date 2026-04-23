import { useState, useRef, useEffect } from 'react'

interface MessageInputProps {
  onSend: (text: string) => void
  isSendingMessage: boolean
}

export const MessageInput = ({ onSend, isSendingMessage }: MessageInputProps) => {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isSendingMessage) {
      inputRef.current?.focus()
    }
  }, [isSendingMessage])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedText = text.trim()
    if (trimmedText && !isSendingMessage) {
      onSend(trimmedText)
      setText('')
    }
  }

  return (
    <div className="shrink-0 bg-input-bg flex flex-col items-center">
      <form onSubmit={handleSubmit} className="w-full p-2 border-t-0 flex justify-center">
        <div className="flex w-full max-w-screen-sm gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSendingMessage}
            maxLength={500}
            aria-label="Message text"
            className="flex-1 rounded-sm border-2 border-input-border bg-white px-3 py-2 text-text-main outline-none focus:border-input-border placeholder:text-text-muted disabled:opacity-70"
            placeholder="Message"
          />
          <button
            type="submit"
            disabled={!text.trim() || isSendingMessage}
            aria-label="Send message"
            className="flex shrink-0 items-center justify-center rounded-sm bg-send-button px-6 py-2 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingMessage ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  )
}
