import { useServerStatus } from './hooks/useServerStatus'
import { MessageList } from './components/chat/MessageList'
import { MessageInput } from './components/chat/MessageInput'
import type { Message } from './api/generated'

// Temporary mock data for UI visual testing before we hook it up to Redux state
const MOCK_MESSAGES: Message[] = [
  {
    _id: '1',
    message: 'Hello! Welcome to the technical challenge.',
    author: 'Doodle Staff',
    createdAt: new Date().toISOString(),
  },
  {
    _id: '2',
    message: "Hi, nice to meet you! I'm setting up the layout now.",
    author: 'Me',
    createdAt: new Date().toISOString(),
  },
]

function App() {
  useServerStatus()

  const handleSendMessage = (text: string) => {
    console.log('Sending message:', text)
    // TODO: implement Redux action dispatch
  }

  return (
    <main className="flex h-full w-full justify-center bg-transparent py-4 px-4 sm:px-6">
      {/* 
        Chat Container: 
        - max-w-screen-md matches 768px for the outer chat wrapper
        - flex flex-col to allow message list to scroll and input to stick at bottom
        - chat-bg applies the specific background image
      */}
      <div className="chat-bg flex h-full w-full max-w-screen-md flex-col overflow-hidden shadow-lg">
        <MessageList messages={MOCK_MESSAGES} currentUser="Me" />
        <MessageInput onSend={handleSendMessage} isSending={false} />
      </div>
    </main>
  )
}

export default App
