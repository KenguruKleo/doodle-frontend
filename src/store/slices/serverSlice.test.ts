import { describe, it, expect } from 'vitest'
import reducer from './serverSlice'
import type { ServerState } from './serverSlice'
import { fetchInitialMessages, sendMessage } from './messagesSlice'

describe('serverSlice', () => {
  const initialState: ServerState = {
    status: 'checking',
  }

  it('should return the initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initialState)
  })

  it('should set status to online on fulfilled message actions', () => {
    let state = reducer(initialState, fetchInitialMessages.fulfilled([], '', undefined))
    expect(state.status).toBe('online')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    state = reducer({ status: 'offline' }, sendMessage.fulfilled({} as any, '', {} as any))
    expect(state.status).toBe('online')
  })

  it('should set status to offline on rejected message actions', () => {
    const state = reducer(
      initialState,
      fetchInitialMessages.rejected(new Error('error'), '', undefined),
    )
    expect(state.status).toBe('offline')
  })

  it('should set status to checking on pending if currently offline', () => {
    // If online, it stays online
    let state = reducer({ status: 'online' }, fetchInitialMessages.pending('', undefined))
    expect(state.status).toBe('online')

    // If offline, it changes to checking
    state = reducer({ status: 'offline' }, fetchInitialMessages.pending('', undefined))
    expect(state.status).toBe('checking')
  })
})
