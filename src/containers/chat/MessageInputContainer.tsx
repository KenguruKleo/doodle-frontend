import { MessageInput } from '@/components/chat/MessageInput'
import { CURRENT_USER } from '@/constants'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { sendMessage } from '@/store/slices/messagesSlice'

export const MessageInputContainer = () => {
  const dispatch = useAppDispatch()
  const sendStatus = useAppSelector((state) => state.messages.send.status)

  const handleSendMessage = (text: string) => {
    dispatch(sendMessage({ message: text, author: CURRENT_USER }))
  }

  return <MessageInput onSend={handleSendMessage} isSendingMessage={sendStatus === 'loading'} />
}
