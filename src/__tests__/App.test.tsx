import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import App from '@/App'
import messagesReducer from '@/store/slices/messagesSlice'
import serverReducer from '@/store/slices/serverSlice'
import { getMessages, postMessages } from '@/api/generated/sdk.gen'

// Mock the components to isolate App testing
vi.mock('@/components/chat/MessageList', () => ({
  MessageList: ({
    messages,
    currentUser,
    onLoadMore,
    hasMore,
    isLoadingMore,
  }: {
    messages: any[]
    currentUser: string
    onLoadMore: () => void
    hasMore: boolean
    isLoadingMore: boolean
  }) => (
    <div data-testid="message-list">
      {messages.length} messages for {currentUser}
      <button onClick={onLoadMore} data-testid="load-more-btn">
        Load More
      </button>
      <span data-testid="has-more-status">{hasMore ? 'hasMore' : 'noMore'}</span>
      <span data-testid="loading-more-status">{isLoadingMore ? 'loading' : 'idle'}</span>
    </div>
  ),
}))

vi.mock('@/components/chat/MessageInput', () => ({
  MessageInput: ({ onSend, isSending }: { onSend: (text: string) => void; isSending: boolean }) => (
    <div data-testid="message-input">
      <button onClick={() => onSend('test message')} disabled={isSending}>
        Send
      </button>
      {isSending ? 'Sending...' : 'Idle'}
    </div>
  ),
}))

// Mock the hook to prevent polling
vi.mock('@/hooks/useMessagePolling', () => ({
  useMessagePolling: vi.fn(),
}))

// Mock the API client
vi.mock('@/api/generated/sdk.gen', () => ({
  getMessages: vi.fn().mockResolvedValue({ data: [] }),
  postMessages: vi.fn().mockResolvedValue({
    data: { _id: 'new', message: 'test message', author: 'Michael', createdAt: '2024' },
  }),
}))

const createTestStore = (initialMessagesState = {}) => {
  return configureStore({
    reducer: {
      messages: messagesReducer,
      server: serverReducer,
    },
    preloadedState: {
      messages: {
        items: [],
        status: 'idle' as const,
        error: null,
        isSending: false,
        sendingError: null,
        hasMore: true,
        ...initialMessagesState,
      },
      server: {
        status: 'online' as const,
      },
    },
  })
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly and calls getMessages on mount', async () => {
    const store = createTestStore()

    render(
      <Provider store={store}>
        <App />
      </Provider>,
    )

    // Should render the mocked components
    expect(screen.getByTestId('message-list')).toBeInTheDocument()
    expect(screen.getByTestId('message-input')).toBeInTheDocument()

    // Should have called getMessages API via fetchInitialMessages
    expect(getMessages).toHaveBeenCalled()
  })

  it('calls postMessages when input triggers onSend', async () => {
    const user = userEvent.setup()
    const store = createTestStore()

    render(
      <Provider store={store}>
        <App />
      </Provider>,
    )

    // Click the mock send button
    const sendButton = screen.getByText('Send')
    await user.click(sendButton)

    // Should have called postMessages API via sendMessage
    expect(postMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        body: {
          message: 'test message',
          author: expect.any(String), // The CURRENT_USER
        },
      }),
    )
  })

  it('calls loadOlderMessages when handleLoadMore is triggered', async () => {
    const user = userEvent.setup()
    const store = createTestStore({
      items: [{ _id: '1', message: 'test', author: 'user', createdAt: '123' }],
      status: 'idle' as const,
    })

    render(
      <Provider store={store}>
        <App />
      </Provider>,
    )

    // Initially fetch is called (even though we seeded state, fetchInitialMessages is called if length is 0, but here length is 1, so it shouldn't be called)
    expect(getMessages).not.toHaveBeenCalled()

    // Click load more button
    const loadMoreBtn = screen.getByTestId('load-more-btn')
    await user.click(loadMoreBtn)

    // Should call getMessages with before param via loadOlderMessages thunk
    expect(getMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        query: { before: '123', limit: 20 },
      }),
    )
  })
})
