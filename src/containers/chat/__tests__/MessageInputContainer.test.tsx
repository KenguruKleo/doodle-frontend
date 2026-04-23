import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { CURRENT_USER } from '@/constants'
import { MessageInputContainer } from '@/containers/chat/MessageInputContainer'
import messagesReducer, { messagesAdapter } from '@/store/slices/messagesSlice'
import serverReducer from '@/store/slices/serverSlice'
import { postMessages } from '@/api/generated/sdk.gen'

vi.mock('@/components/chat/MessageInput', () => ({
  MessageInput: ({
    onSend,
    isSendingMessage,
  }: {
    onSend: (text: string) => void
    isSendingMessage: boolean
  }) => (
    <div data-testid="message-input">
      <button onClick={() => onSend('test message')} disabled={isSendingMessage}>
        Send
      </button>
      <span data-testid="sending-status">{isSendingMessage ? 'sending' : 'idle'}</span>
    </div>
  ),
}))

vi.mock('@/api/generated/sdk.gen', () => ({
  postMessages: vi.fn().mockResolvedValue({
    data: { _id: 'new', message: 'test message', author: CURRENT_USER, createdAt: '2024' },
  }),
}))

const createTestStore = (initialMessagesState = {}) =>
  configureStore({
    reducer: {
      messages: messagesReducer,
      server: serverReducer,
    },
    preloadedState: {
      messages: messagesAdapter.getInitialState({
        initialLoad: {
          status: 'idle' as const,
          error: null,
        },
        loadMore: {
          status: 'idle' as const,
          error: null,
        },
        send: {
          status: 'idle' as const,
          error: null,
        },
        hasMore: true,
        ...initialMessagesState,
      }),
      server: {
        status: 'online' as const,
      },
    },
  })

const createPostMessagesResponse = (data: unknown) => ({
  data,
  error: undefined,
  request: new Request('http://localhost'),
  response: new Response(),
})

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })

  return { promise, resolve }
}

describe('MessageInputContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps send state to MessageInput props', () => {
    const store = createTestStore({
      send: {
        status: 'loading' as const,
        error: null,
      },
    })

    render(
      <Provider store={store}>
        <MessageInputContainer />
      </Provider>,
    )

    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByTestId('sending-status')).toHaveTextContent('sending')
  })

  it('dispatches sendMessage when child requests send', async () => {
    const deferredPostMessage = createDeferred<any>()
    vi.mocked(postMessages).mockImplementationOnce(() => deferredPostMessage.promise)

    const user = userEvent.setup()
    const store = createTestStore()

    render(
      <Provider store={store}>
        <MessageInputContainer />
      </Provider>,
    )

    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(screen.getByTestId('sending-status')).toHaveTextContent('sending')
    })

    expect(postMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          message: 'test message',
          author: CURRENT_USER,
        },
      }),
    )

    deferredPostMessage.resolve(
      createPostMessagesResponse({
        _id: 'new',
        message: 'test message',
        author: CURRENT_USER,
        createdAt: '2024',
      }) as any,
    )

    await waitFor(() => {
      expect(screen.getByTestId('sending-status')).toHaveTextContent('idle')
    })
  })
})
