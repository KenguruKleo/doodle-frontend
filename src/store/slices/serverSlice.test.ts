import { describe, it, expect, vi, beforeEach } from 'vitest'
import reducer, { checkServerStatus } from './serverSlice'
import type { ServerState } from './serverSlice'

// Mock the generated API SDK
vi.mock('../../api/generated/sdk.gen', () => ({
  getMessages: vi.fn(),
}))

describe('serverSlice', () => {
  const initialState: ServerState = {
    status: 'checking',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  describe('checkServerStatus', () => {
    it('should handle pending state', () => {
      const state = reducer(initialState, checkServerStatus.pending(''))
      expect(state.status).toBe('checking')
    })

    it('should handle fulfilled state', () => {
      const state = reducer(initialState, checkServerStatus.fulfilled('online', ''))
      expect(state.status).toBe('online')
    })

    it('should handle rejected state', () => {
      const state = reducer(
        initialState,
        checkServerStatus.rejected(new Error('offline'), '', undefined, 'offline'),
      )
      expect(state.status).toBe('offline')
    })
  })
})
