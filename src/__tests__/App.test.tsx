import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import App from '@/App'
import messagesReducer, { messagesAdapter } from '@/store/slices/messagesSlice'
import serverReducer from '@/store/slices/serverSlice'
import { getMessages } from '@/api/generated/sdk.gen'

vi.mock('@/components/chat/MessageList', () => ({
  MessageList: () => <div data-testid="message-list" />,
}))

vi.mock('@/components/chat/MessageInput', () => ({
  MessageInput: () => <div data-testid="message-input" />,
}))

vi.mock('@/api/generated/sdk.gen', () => ({
  getMessages: vi.fn().mockResolvedValue({ data: [] }),
}))

const createTestStore = (initialMessagesState = {}) => {
  return configureStore({
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
}

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

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly through the real mount flow without act warnings', async () => {
    const deferredInitialMessages = createDeferred<any>()
    vi.mocked(getMessages).mockImplementationOnce(() => deferredInitialMessages.promise)

    const store = createTestStore()
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    try {
      render(
        <Provider store={store}>
          <App />
        </Provider>,
      )

      expect(screen.getByTestId('message-list')).toBeInTheDocument()
      expect(screen.getByTestId('message-input')).toBeInTheDocument()

      await waitFor(() => {
        expect(store.getState().messages.initialLoad.status).toBe('loading')
      })

      deferredInitialMessages.resolve(
        createGetMessagesResponse([
          {
            _id: '1',
            message: 'Hello',
            author: 'Michael',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        ]) as any,
      )

      await waitFor(() => {
        expect(store.getState().messages.initialLoad.status).toBe('succeeded')
      })

      expect(getMessages).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.objectContaining({
            before: expect.any(String),
            limit: 20,
          }),
          throwOnError: true,
        }),
      )

      const actWarnings = consoleErrorSpy.mock.calls.filter((call) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('not wrapped in act')),
      )
      expect(actWarnings).toHaveLength(0)
    } finally {
      consoleErrorSpy.mockRestore()
    }
  })
})
