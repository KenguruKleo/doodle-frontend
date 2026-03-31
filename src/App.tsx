import { useEffect, useCallback } from 'react'
import { useMessagePolling } from '@/hooks/useMessagePolling'
import { MessageList } from '@/components/chat/MessageList'
import { MessageInput } from '@/components/chat/MessageInput'
import { CURRENT_USER } from '@/constants'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  fetchInitialMessages,
  sendMessage,
  loadOlderMessages,
  selectAllMessages,
} from '@/store/slices/messagesSlice'

function App() {
  useMessagePolling()
  const dispatch = useAppDispatch()
  const { isSending, status, hasMore } = useAppSelector((state) => state.messages)
  const messages = useAppSelector(selectAllMessages)
  const serverStatus = useAppSelector((state) => state.server.status)

  useEffect(() => {
    if (status === 'idle' && messages.length === 0) {
      dispatch(fetchInitialMessages())
    }
  }, [dispatch, status, messages.length])

  const handleSendMessage = (text: string) => {
    dispatch(sendMessage({ message: text, author: CURRENT_USER }))
  }

  const handleLoadMore = useCallback(() => {
    if (messages.length > 0 && status !== 'loading') {
      dispatch(loadOlderMessages(messages[0].createdAt))
    }
  }, [dispatch, messages, status])

  return (
    <main className="flex h-full w-full justify-center bg-transparent py-4 px-4 sm:px-6">
      {/* 
        Chat Container: 
        - max-w-screen-md matches 768px for the outer chat wrapper
        - flex flex-col to allow message list to scroll and input to stick at bottom
        - chat-bg applies the specific background image
      */}
      <div className="chat-bg relative flex h-full w-full max-w-screen-md flex-col overflow-hidden shadow-lg">
        {/* Global error banner */}
        {serverStatus === 'offline' && (
          <div className="absolute top-0 left-0 right-0 z-10 bg-red-500/90 px-4 py-2 text-center text-sm font-medium text-white shadow-md">
            Lost connection to the server. Retrying...
          </div>
        )}

        <MessageList
          messages={messages}
          currentUser={CURRENT_USER}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          isLoadingMore={status === 'loading'}
        />
        <MessageInput onSend={handleSendMessage} isSending={isSending} />
      </div>
    </main>
  )
}

export default App
