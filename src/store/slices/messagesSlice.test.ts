import { describe, it, expect, vi, beforeEach } from 'vitest'
import reducer, { fetchInitialMessages, loadOlderMessages, sendMessage } from './messagesSlice'
import type { MessagesState } from './messagesSlice'

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
  })
})
