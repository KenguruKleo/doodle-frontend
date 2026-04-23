import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { CURRENT_USER } from '@/constants'
import { MessageListContainer } from '@/containers/chat/MessageListContainer'
import messagesReducer, { messagesAdapter } from '@/store/slices/messagesSlice'
import serverReducer from '@/store/slices/serverSlice'
import { getMessages } from '@/api/generated/sdk.gen'

vi.mock('@/components/chat/MessageList', () => ({
  MessageList: ({
    messages,
    currentUser,
    onLoadMore,
    hasMore,
    isLoadingOlderMessages,
  }: {
    messages: any[]
    currentUser: string
    onLoadMore: () => void
    hasMore: boolean
    isLoadingOlderMessages: boolean
  }) => (
    <div data-testid="message-list">
      <span data-testid="message-count">{messages.length}</span>
      <span data-testid="current-user">{currentUser}</span>
      <span data-testid="has-more-status">{hasMore ? 'hasMore' : 'noMore'}</span>
      <span data-testid="loading-more-status">{isLoadingOlderMessages ? 'loading' : 'idle'}</span>
      <button onClick={onLoadMore} data-testid="load-more-btn">
        Load More
      </button>
    </div>
  ),
}))

vi.mock('@/api/generated/sdk.gen', () => ({
  getMessages: vi.fn().mockResolvedValue({ data: [] }),
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

const createGetMessagesResponse = (data: unknown[]) => ({
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

describe('MessageListContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseMessageState = {
    ids: ['1'],
    entities: {
      '1': { _id: '1', message: 'test', author: 'user', createdAt: '123' },
    },
  }

  it('maps store state to MessageList props', () => {
    const store = createTestStore({
      ...baseMessageState,
      hasMore: false,
      loadMore: {
        status: 'loading' as const,
        error: null,
      },
    })

    render(
      <Provider store={store}>
        <MessageListContainer />
      </Provider>,
    )

    expect(screen.getByTestId('message-count')).toHaveTextContent('1')
    expect(screen.getByTestId('current-user')).toHaveTextContent(CURRENT_USER)
    expect(screen.getByTestId('has-more-status')).toHaveTextContent('noMore')
    expect(screen.getByTestId('loading-more-status')).toHaveTextContent('loading')
  })

  it.each([
    {
      scenario: 'there are no messages yet',
      state: {},
    },
    {
      scenario: 'pagination is already exhausted',
      state: {
        ...baseMessageState,
        hasMore: false,
      },
    },
    {
      scenario: 'initial load is still in progress',
      state: {
        ...baseMessageState,
        initialLoad: {
          status: 'loading' as const,
          error: null,
        },
      },
    },
    {
      scenario: 'older messages are already loading',
      state: {
        ...baseMessageState,
        loadMore: {
          status: 'loading' as const,
          error: null,
        },
      },
    },
  ])('does not request older messages when $scenario', async ({ state }) => {
    const user = userEvent.setup()
    const store = createTestStore(state)

    render(
      <Provider store={store}>
        <MessageListContainer />
      </Provider>,
    )

    await user.click(screen.getByTestId('load-more-btn'))

    expect(getMessages).not.toHaveBeenCalled()
  })

  it('dispatches loadOlderMessages when load more is triggered', async () => {
    const deferredOlderMessages = createDeferred<any>()
    vi.mocked(getMessages).mockImplementationOnce(() => deferredOlderMessages.promise)

    const user = userEvent.setup()
    const store = createTestStore({
      ...baseMessageState,
    })

    render(
      <Provider store={store}>
        <MessageListContainer />
      </Provider>,
    )

    await user.click(screen.getByTestId('load-more-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('loading-more-status')).toHaveTextContent('loading')
    })

    expect(getMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { before: '123', limit: 20 },
        throwOnError: true,
      }),
    )

    deferredOlderMessages.resolve(createGetMessagesResponse([]) as any)

    await waitFor(() => {
      expect(screen.getByTestId('loading-more-status')).toHaveTextContent('idle')
    })
  })
})
