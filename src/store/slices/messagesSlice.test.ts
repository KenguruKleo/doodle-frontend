import { describe, it, expect, vi, beforeEach } from 'vitest'
import reducer, {
  fetchInitialMessages,
  loadOlderMessages,
  fetchNewerMessages,
  sendMessage,
  pollLatestMessages,
} from './messagesSlice'
import type { MessagesState } from './messagesSlice'
import { configureStore } from '@reduxjs/toolkit'
import { getMessages, postMessages } from '../../api/generated/sdk.gen'

// Mock the generated API SDK
vi.mock('../../api/generated/sdk.gen', () => ({
  getMessages: vi.fn(),
  postMessages: vi.fn(),
}))

describe('messagesSlice', () => {
  const initialState: MessagesState = {
    items: [],
    status: 'idle',
    error: null,
    isSending: false,
    sendingError: null,
    hasMore: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  describe('fetchInitialMessages', () => {
    it('should handle pending state', () => {
      const state = reducer(initialState, fetchInitialMessages.pending(''))
      expect(state.status).toBe('loading')
      expect(state.error).toBeNull()
    })

    it('should handle fulfilled state', () => {
      const mockMessages = [{ _id: '1', message: 'Hello', author: 'User', createdAt: '2024-01-01' }]
      const state = reducer(initialState, fetchInitialMessages.fulfilled(mockMessages, ''))

      expect(state.status).toBe('idle')
      expect(state.items).toEqual(mockMessages)
      // Since it returned 1 message (< MESSAGES_LIMIT), hasMore should be false
      expect(state.hasMore).toBe(false)
    })

    it('should handle rejected state', () => {
      const state = reducer(
        initialState,
        fetchInitialMessages.rejected(new Error('error'), '', undefined, 'Fetch failed'),
      )

      expect(state.status).toBe('failed')
      expect(state.error).toBe('Fetch failed')
    })
  })

  describe('loadOlderMessages', () => {
    it('should prepend older messages to existing items', () => {
      const existingState: MessagesState = {
        ...initialState,
        items: [{ _id: '2', message: 'Existing', author: 'User', createdAt: '2024-01-02' }],
      }

      const mockOlderMessages = [
        { _id: '1', message: 'Older', author: 'User', createdAt: '2024-01-01' },
      ]
      const state = reducer(
        existingState,
        loadOlderMessages.fulfilled(mockOlderMessages, '', 'before-date'),
      )

      expect(state.items).toHaveLength(2)
      expect(state.items[0]._id).toBe('1') // prepended
      expect(state.items[1]._id).toBe('2') // existing
    })
    it('should handle empty payload when loading older messages', () => {
      const state = reducer(initialState, loadOlderMessages.fulfilled([], '', 'before-date'))
      expect(state.hasMore).toBe(false)
    })
  })

  describe('fetchNewerMessages', () => {
    it('should append newer messages to existing items', () => {
      const existingState: MessagesState = {
        ...initialState,
        items: [{ _id: '1', message: 'Existing', author: 'User', createdAt: '2024-01-01' }],
      }

      const mockNewerMessages = [
        { _id: '2', message: 'Newer', author: 'User', createdAt: '2024-01-02' },
      ]
      const state = reducer(
        existingState,
        fetchNewerMessages.fulfilled(mockNewerMessages, '', 'after-date'),
      )

      expect(state.items).toHaveLength(2)
      expect(state.items[0]._id).toBe('1') // existing
      expect(state.items[1]._id).toBe('2') // appended
    })
  })

  describe('sendMessage', () => {
    it('should add an optimistic message on pending', () => {
      const requestData = { message: 'Test message', author: 'Tester' }
      const state = reducer(initialState, sendMessage.pending('', requestData))

      expect(state.isSending).toBe(true)
      expect(state.items).toHaveLength(1)
      expect(state.items[0]._id).toMatch(/^temp-/)
      expect(state.items[0].message).toBe('Test message')
    })

    it('should replace optimistic message with real message on fulfilled', () => {
      // Setup state with a temp message
      const pendingState: MessagesState = {
        ...initialState,
        isSending: true,
        items: [
          { _id: 'temp-123', message: 'Test message', author: 'Tester', createdAt: '2024-01-01' },
        ],
      }

      const mockRealMessage = {
        _id: 'real-123',
        message: 'Test message',
        author: 'Tester',
        createdAt: '2024-01-01',
      }
      const state = reducer(
        pendingState,
        sendMessage.fulfilled(mockRealMessage, '', { message: 'Test message', author: 'Tester' }),
      )

      expect(state.isSending).toBe(false)
      expect(state.items).toHaveLength(1)
      expect(state.items[0]._id).toBe('real-123')
    })

    it('should remove optimistic message on rejected', () => {
      const pendingState: MessagesState = {
        ...initialState,
        isSending: true,
        items: [
          { _id: 'temp-123', message: 'Test message', author: 'Tester', createdAt: '2024-01-01' },
        ],
      }

      const state = reducer(
        pendingState,
        sendMessage.rejected(
          new Error('Failed'),
          '',
          { message: 'Test message', author: 'Tester' },
          'Send failed',
        ),
      )

      expect(state.isSending).toBe(false)
      expect(state.sendingError).toBe('Send failed')
      expect(state.items).toHaveLength(0) // Should remove the temp message
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
        sendMessage.fulfilled(mockRealMessage, '', { message: 'Test message', author: 'Tester' }),
      )

      expect(state.isSending).toBe(false)
      expect(state.items).toHaveLength(1)
      expect(state.items[0]._id).toBe('real-123')
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
      })
      await store.dispatch(fetchInitialMessages() as any)
      expect(store.getState().messages.items).toHaveLength(1)

      // Error
      vi.mocked(getMessages).mockRejectedValueOnce(new Error('Network Error'))
      await store.dispatch(fetchInitialMessages() as any)
      expect(store.getState().messages.status).toBe('failed')
      expect(store.getState().messages.error).toBe('Network Error')
    })

    it('loadOlderMessages handles success and error', async () => {
      const store = configureStore({ reducer: { messages: reducer } })

      // Success
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '1', message: 'A', author: 'U', createdAt: '1' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      })
      await store.dispatch(loadOlderMessages('date') as any)
      expect(store.getState().messages.items).toHaveLength(1)

      // Error
      vi.mocked(getMessages).mockRejectedValueOnce(new Error('Network Error'))
      const result = await store.dispatch(loadOlderMessages('date') as any)
      expect(result.payload).toBe('Network Error')
    })

    it('fetchNewerMessages handles success and error', async () => {
      const store = configureStore({ reducer: { messages: reducer } })

      // Success
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '1', message: 'A', author: 'U', createdAt: '1' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      })
      await store.dispatch(fetchNewerMessages('date') as any)
      expect(store.getState().messages.items).toHaveLength(1)

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
      })
      await store.dispatch(sendMessage({ message: 'A', author: 'U' }) as any)
      expect(store.getState().messages.items[0]._id).toBe('1')

      // Error
      vi.mocked(postMessages).mockRejectedValueOnce(new Error('Network Error'))
      await store.dispatch(sendMessage({ message: 'A', author: 'U' }) as any)
      expect(store.getState().messages.sendingError).toBe('Network Error')
    })

    it('pollLatestMessages handles logic with and without real messages, and errors', async () => {
      let store = configureStore({ reducer: { messages: reducer } })

      // Without real message -> calls fetchInitialMessages
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '1', message: 'A', author: 'U', createdAt: '1' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      })
      await store.dispatch(pollLatestMessages() as any)
      expect(store.getState().messages.items).toHaveLength(1)

      // With real message -> calls fetchNewerMessages
      vi.mocked(getMessages).mockResolvedValueOnce({
        data: [{ _id: '2', message: 'B', author: 'U', createdAt: '2' }],
        error: undefined,
        request: new Request('http://localhost'),
        response: new Response(),
      })
      await store.dispatch(pollLatestMessages() as any)
      expect(store.getState().messages.items).toHaveLength(2)

      // Error
      store = configureStore({ reducer: { messages: reducer } })
      vi.mocked(getMessages).mockRejectedValueOnce(new Error('Poll Error'))
      const result = await store.dispatch(pollLatestMessages() as any)
      expect(result.payload).toBe('Failed to poll messages')
    })
  })
})
