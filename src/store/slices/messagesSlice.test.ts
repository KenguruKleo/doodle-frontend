import { describe, it, expect, vi, beforeEach } from 'vitest'
import reducer, {
  fetchInitialMessages,
  loadOlderMessages,
  fetchNewerMessages,
  sendMessage,
  pollLatestMessages,
  selectAllMessages,
} from './messagesSlice'
import type { MessagesState } from './messagesSlice'
import { configureStore } from '@reduxjs/toolkit'
import { getMessages, postMessages } from '@/api/generated/sdk.gen'
import { messagesAdapter } from './messagesSlice'

// Mock the generated API SDK
vi.mock('@/api/generated/sdk.gen', () => ({
  getMessages: vi.fn(),
  postMessages: vi.fn(),
}))

describe('messagesSlice', () => {
  const initialState: MessagesState = messagesAdapter.getInitialState({
    initialLoad: {
      status: 'idle',
      error: null,
    },
    loadMore: {
      status: 'idle',
      error: null,
    },
    send: {
      status: 'idle',
      error: null,
    },
    hasMore: true,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  describe('fetchInitialMessages', () => {
    it('should handle pending state', () => {
      const state = reducer(initialState, fetchInitialMessages.pending(''))
      expect(state.initialLoad.status).toBe('loading')
      expect(state.initialLoad.error).toBeNull()
    })

    it('should handle fulfilled state', () => {
      const mockMessages = [{ _id: '1', message: 'Hello', author: 'User', createdAt: '2024-01-01' }]
      const state = reducer(initialState, fetchInitialMessages.fulfilled(mockMessages as any, ''))

      expect(state.initialLoad.status).toBe('succeeded')
      expect(selectAllMessages({ messages: state })).toEqual([
        { ...mockMessages[0], status: 'sent' },
      ])
      // Since it returned 1 message (< MESSAGES_LIMIT), hasMore should be false
      expect(state.hasMore).toBe(false)
    })

    it('should preserve local temp messages when initial fetch resolves', () => {
      const loadingState = messagesAdapter.addOne(initialState, {
        _id: 'temp-req-id-123',
        message: 'Pending',
        author: 'Tester',
        createdAt: '2024-01-02',
        status: 'pending',
      })

      const mockMessages = [{ _id: '1', message: 'Hello', author: 'User', createdAt: '2024-01-01' }]
      const state = reducer(loadingState, fetchInitialMessages.fulfilled(mockMessages as any, ''))

      expect(selectAllMessages({ messages: state })).toEqual([
        { ...mockMessages[0], status: 'sent' },
        {
          _id: 'temp-req-id-123',
          message: 'Pending',
          author: 'Tester',
          createdAt: '2024-01-02',
          status: 'pending',
        },
      ])
    })

    it('should handle rejected state', () => {
      const state = reducer(
        initialState,
        fetchInitialMessages.rejected(new Error('error'), '', undefined, 'Fetch failed'),
      )

      expect(state.initialLoad.status).toBe('failed')
      expect(state.initialLoad.error).toBe('Fetch failed')
    })
  })

  describe('loadOlderMessages', () => {
    it('should track a separate loading state for older messages', () => {
      const state = reducer(initialState, loadOlderMessages.pending('', 'before-date'))

      expect(state.loadMore.status).toBe('loading')
      expect(state.loadMore.error).toBeNull()
      expect(state.initialLoad.status).toBe('idle')
    })

    it('should prepend older messages to existing items', () => {
      const existingState = messagesAdapter.addOne(initialState, {
        _id: '2',
        message: 'Existing',
        author: 'User',
        createdAt: '2024-01-02',
        status: 'sent',
      })

      const mockOlderMessages = [
        { _id: '1', message: 'Older', author: 'User', createdAt: '2024-01-01' },
      ]
      const state = reducer(
        existingState,
        loadOlderMessages.fulfilled(mockOlderMessages as any, '', 'before-date'),
      )

      const items = selectAllMessages({ messages: state })
      expect(items).toHaveLength(2)
      expect(items[0]._id).toBe('1') // prepended because of sortComparer
      expect(items[1]._id).toBe('2') // existing
      expect(state.loadMore.status).toBe('succeeded')
      expect(state.loadMore.error).toBeNull()
    })

    it('should handle empty payload when loading older messages', () => {
      const state = reducer(
        {
          ...initialState,
          loadMore: {
            status: 'loading',
            error: null,
          },
        },
        loadOlderMessages.fulfilled([], '', 'before-date'),
      )
      expect(state.hasMore).toBe(false)
      expect(state.loadMore.status).toBe('succeeded')
    })

    it('should store a separate error when loading older messages fails', () => {
      const state = reducer(
        {
          ...initialState,
          loadMore: {
            status: 'loading',
            error: null,
          },
        },
        loadOlderMessages.rejected(new Error('error'), '', 'before-date', 'Load older failed'),
      )

      expect(state.loadMore.status).toBe('failed')
      expect(state.loadMore.error).toBe('Load older failed')
      expect(state.initialLoad.error).toBeNull()
    })
  })

  describe('fetchNewerMessages', () => {
    it('should append newer messages to existing items', () => {
      const existingState = messagesAdapter.addOne(initialState, {
        _id: '1',
        message: 'Existing',
        author: 'User',
        createdAt: '2024-01-01',
        status: 'sent',
      })

      const mockNewerMessages = [
        { _id: '2', message: 'Newer', author: 'User', createdAt: '2024-01-02' },
      ]
      const state = reducer(
        existingState,
        fetchNewerMessages.fulfilled(mockNewerMessages as any, '', 'after-date'),
      )

      const items = selectAllMessages({ messages: state })
      expect(items).toHaveLength(2)
      expect(items[0]._id).toBe('1') // existing
      expect(items[1]._id).toBe('2') // appended
    })
  })

  describe('sendMessage', () => {
    it('should add an optimistic message on pending', () => {
      const requestData = { message: 'Test message', author: 'Tester' }
      const state = reducer(initialState, sendMessage.pending('req-id-123', requestData))

      expect(state.send.status).toBe('loading')
      expect(state.send.error).toBeNull()
      const items = selectAllMessages({ messages: state })
      expect(items).toHaveLength(1)
      expect(items[0]._id).toBe('temp-req-id-123')
      expect(items[0].message).toBe('Test message')
      expect(items[0].status).toBe('pending')
    })

    it('should replace optimistic message with real message on fulfilled', () => {
      // Setup state with a temp message
      const pendingState = messagesAdapter.addOne(
        {
          ...initialState,
          send: {
            status: 'loading' as const,
            error: null,
          },
        },
        {
          _id: 'temp-req-id-123',
          message: 'Test message',
          author: 'Tester',
          createdAt: '2024-01-01',
          status: 'pending',
        },
      )

      const mockRealMessage = {
        _id: 'real-123',
        message: 'Test message',
        author: 'Tester',
        createdAt: '2024-01-01',
      }
      const state = reducer(
        pendingState,
        sendMessage.fulfilled(mockRealMessage as any, 'req-id-123', {
          message: 'Test message',
          author: 'Tester',
        }),
      )

      expect(state.send.status).toBe('succeeded')
      expect(state.send.error).toBeNull()
      const items = selectAllMessages({ messages: state })
      expect(items).toHaveLength(1)
      expect(items[0]._id).toBe('real-123')
      expect(items[0].status).toBe('sent')
    })

    it('should mark optimistic message as error on rejected', () => {
      const pendingState = messagesAdapter.addOne(
        {
          ...initialState,
          send: {
            status: 'loading' as const,
            error: null,
          },
        },
        {
          _id: 'temp-req-id-123',
          message: 'Test message',
          author: 'Tester',
          createdAt: '2024-01-01',
          status: 'pending',
        },
      )

      const state = reducer(
        pendingState,
        sendMessage.rejected(
          new Error('Failed'),
          'req-id-123',
          { message: 'Test message', author: 'Tester' },
          'Send failed',
        ),
      )

      expect(state.send.status).toBe('failed')
      expect(state.send.error).toBe('Send failed')
      const items = selectAllMessages({ messages: state })
      expect(items).toHaveLength(1)
      expect(items[0]._id).toBe('temp-req-id-123')
      expect(items[0].status).toBe('error')
    })

    it('should push real message to items if temp message is not found on fulfilled', () => {
      const mockRealMessage = {
        _id: 'real-123',
        message: 'Test message',
        author: 'Tester',
        createdAt: '2024-01-01',
      }
      const state = reducer(
        initialState,
        sendMessage.fulfilled(mockRealMessage as any, 'req-id-123', {
          message: 'Test message',
          author: 'Tester',
        }),
      )

      expect(state.send.status).toBe('succeeded')
      const items = selectAllMessages({ messages: state })
      expect(items).toHaveLength(1)
      expect(items[0]._id).toBe('real-123')
    })
  })

  describe('Thunks', () => {
    it('fetchInitialMessages handles success and error', async () => {
      const store = configureStore({ reducer: { messages: reducer } })

      // Success
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '1', message: 'A', author: 'U', createdAt: '1' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      } as any)
      await store.dispatch(fetchInitialMessages() as any)
      expect(selectAllMessages(store.getState())).toHaveLength(1)

      // Error
      vi.mocked(getMessages).mockRejectedValueOnce(new Error('Network Error'))
      await store.dispatch(fetchInitialMessages() as any)
      expect(store.getState().messages.initialLoad.status).toBe('failed')
      expect(store.getState().messages.initialLoad.error).toBe('Network Error')
    })

    it('fetchInitialMessages preserves local temp messages in the store', async () => {
      const preloadedState = messagesAdapter.addOne(initialState, {
        _id: 'temp-req-id-123',
        message: 'Pending',
        author: 'Tester',
        createdAt: '2024-01-02',
        status: 'pending',
      })

      const store = configureStore({
        reducer: { messages: reducer },
        preloadedState: { messages: preloadedState },
      })

      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '1', message: 'A', author: 'U', createdAt: '1' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      } as any)

      await store.dispatch(fetchInitialMessages() as any)

      expect(selectAllMessages(store.getState())).toEqual([
        { _id: '1', message: 'A', author: 'U', createdAt: '1', status: 'sent' },
        {
          _id: 'temp-req-id-123',
          message: 'Pending',
          author: 'Tester',
          createdAt: '2024-01-02',
          status: 'pending',
        },
      ])
    })

    it('loadOlderMessages handles success and error', async () => {
      const store = configureStore({ reducer: { messages: reducer } })

      // Success
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '1', message: 'A', author: 'U', createdAt: '1' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      } as any)
      await store.dispatch(loadOlderMessages('date') as any)
      expect(selectAllMessages(store.getState())).toHaveLength(1)
      expect(store.getState().messages.loadMore.status).toBe('succeeded')
      expect(store.getState().messages.loadMore.error).toBeNull()

      // Error
      vi.mocked(getMessages).mockRejectedValueOnce(new Error('Network Error'))
      const result = await store.dispatch(loadOlderMessages('date') as any)
      expect(result.payload).toBe('Network Error')
      expect(store.getState().messages.loadMore.status).toBe('failed')
      expect(store.getState().messages.loadMore.error).toBe('Network Error')
      expect(store.getState().messages.initialLoad.error).toBeNull()
    })

    it('fetchNewerMessages handles success and error', async () => {
      const store = configureStore({ reducer: { messages: reducer } })

      // Success
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '1', message: 'A', author: 'U', createdAt: '1' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      } as any)
      await store.dispatch(fetchNewerMessages('date') as any)
      expect(selectAllMessages(store.getState())).toHaveLength(1)

      // Error
      vi.mocked(getMessages).mockRejectedValueOnce(new Error('Network Error'))
      const result = await store.dispatch(fetchNewerMessages('date') as any)
      expect(result.payload).toBe('Network Error')
    })

    it('sendMessage handles success and error', async () => {
      const store = configureStore({ reducer: { messages: reducer } })

      // Success
      vi.mocked(postMessages).mockResolvedValueOnce({
        data: { _id: '1', message: 'A', author: 'U', createdAt: '1' },
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      } as any)
      await store.dispatch(sendMessage({ message: 'A', author: 'U' }) as any)
      expect(selectAllMessages(store.getState())[0]._id).toBe('1')
      expect(store.getState().messages.send.status).toBe('succeeded')

      // Error
      vi.mocked(postMessages).mockRejectedValueOnce(new Error('Network Error'))
      await store.dispatch(sendMessage({ message: 'A', author: 'U' }) as any)
      expect(store.getState().messages.send.status).toBe('failed')
      expect(store.getState().messages.send.error).toBe('Network Error')
    })

    it('pollLatestMessages handles logic with and without real messages, and errors', async () => {
      let store = configureStore({ reducer: { messages: reducer } })

      // Without real message -> calls fetchInitialMessages
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '1', message: 'A', author: 'U', createdAt: '1' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      } as any)
      await store.dispatch(pollLatestMessages() as any)
      expect(selectAllMessages(store.getState())).toHaveLength(1)

      // With real message -> calls fetchNewerMessages
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '2', message: 'B', author: 'U', createdAt: '2' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      } as any)
      await store.dispatch(pollLatestMessages() as any)
      expect(selectAllMessages(store.getState())).toHaveLength(2)

      // Error
      store = configureStore({ reducer: { messages: reducer } })
      vi.mocked(getMessages).mockRejectedValueOnce(new Error('Poll Error'))
      const result = await store.dispatch(pollLatestMessages() as any)
      expect(result.payload).toBe('Failed to poll messages')
    })
  })
})
