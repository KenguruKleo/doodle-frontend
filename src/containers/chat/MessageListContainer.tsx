import { useCallback } from 'react'
import { MessageList } from '@/components/chat/MessageList'
import { CURRENT_USER } from '@/constants'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadOlderMessages, selectAllMessages } from '@/store/slices/messagesSlice'

export const MessageListContainer = () => {
  const dispatch = useAppDispatch()
  const messages = useAppSelector(selectAllMessages)
  const { hasMore, initialLoad, loadMore } = useAppSelector((state) => state.messages)
  const oldestMessageCreatedAt = messages[0]?.createdAt

  const handleLoadMore = useCallback(() => {
    if (
      !oldestMessageCreatedAt ||
      !hasMore ||
      initialLoad.status === 'loading' ||
      loadMore.status === 'loading'
    ) {
      return
    }

    dispatch(loadOlderMessages(oldestMessageCreatedAt))
  }, [dispatch, hasMore, initialLoad.status, loadMore.status, oldestMessageCreatedAt])

  return (
    <MessageList
      messages={messages}
      currentUser={CURRENT_USER}
      onLoadMore={handleLoadMore}
      hasMore={hasMore}
      isLoadingOlderMessages={loadMore.status === 'loading'}
    />
  )
}
