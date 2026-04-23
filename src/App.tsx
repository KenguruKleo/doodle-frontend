import { useMessagePolling } from '@/hooks/useMessagePolling'
import { MessageListContainer } from '@/containers/chat/MessageListContainer'
import { MessageInputContainer } from '@/containers/chat/MessageInputContainer'
import { useAppSelector } from '@/store/hooks'

function App() {
  useMessagePolling()
  const serverStatus = useAppSelector((state) => state.server.status)

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

        <MessageListContainer />
        <MessageInputContainer />
      </div>
    </main>
  )
}

export default App
