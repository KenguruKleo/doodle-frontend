import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { useMessagePolling } from '@/hooks/useMessagePolling'
import { pollLatestMessages } from '@/store/slices/messagesSlice'
import { MIN_POLL_INTERVAL } from '@/constants'

// Mock the action
vi.mock('../../store/slices/messagesSlice', () => ({
  pollLatestMessages: vi.fn(),
}))

const flushPromises = async () => {
  // Flush pending microtasks
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

describe('useMessagePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    // Default mock implementation (success)
    vi.mocked(pollLatestMessages).mockImplementation((() => {
      return () => ({
        unwrap: () => Promise.resolve(),
      })
    }) as any)
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('dispatches pollLatestMessages on mount and sets up interval', async () => {
    const store = configureStore({
      reducer: { test: (state = {}) => state },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    )

    // Initially should be called once on mount
    renderHook(() => useMessagePolling(), { wrapper })

    await flushPromises()
    expect(pollLatestMessages).toHaveBeenCalledTimes(1)

    // Advance time by the interval
    await vi.advanceTimersByTimeAsync(MIN_POLL_INTERVAL)
    expect(pollLatestMessages).toHaveBeenCalledTimes(2)

    // Advance time by the interval again
    await vi.advanceTimersByTimeAsync(MIN_POLL_INTERVAL)
    expect(pollLatestMessages).toHaveBeenCalledTimes(3)
  })

  it('increases interval on failure (exponential backoff)', async () => {
    const store = configureStore({
      reducer: { test: (state = {}) => state },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    )

    // Make the poll fail
    vi.mocked(pollLatestMessages).mockImplementation((() => {
      return () => ({
        unwrap: () => Promise.reject(new Error('Network Error')),
      })
    }) as any)

    renderHook(() => useMessagePolling(), { wrapper })

    await flushPromises()
    expect(pollLatestMessages).toHaveBeenCalledTimes(1)

    // After 1 fail, interval becomes 2000
    await vi.advanceTimersToNextTimerAsync()
    expect(pollLatestMessages).toHaveBeenCalledTimes(2)

    // After 2 fails, interval becomes 4000
    await vi.advanceTimersToNextTimerAsync()
    expect(pollLatestMessages).toHaveBeenCalledTimes(3)

    // After 3 fails, interval becomes min(8000, 5000) = 5000
    await vi.advanceTimersToNextTimerAsync()
    expect(pollLatestMessages).toHaveBeenCalledTimes(4)

    // After 4 fails, interval stays at max (5000)
    await vi.advanceTimersToNextTimerAsync()
    expect(pollLatestMessages).toHaveBeenCalledTimes(5)
  })

  it('resets interval on success', async () => {
    const store = configureStore({
      reducer: { test: (state = {}) => state },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    )

    // Make the poll fail initially
    let shouldFail = true
    vi.mocked(pollLatestMessages).mockImplementation((() => {
      return () => ({
        unwrap: () => (shouldFail ? Promise.reject(new Error('error')) : Promise.resolve()),
      })
    }) as any)

    renderHook(() => useMessagePolling(), { wrapper })

    await flushPromises()
    expect(pollLatestMessages).toHaveBeenCalledTimes(1)

    // Fails, next poll in 2000
    await vi.advanceTimersToNextTimerAsync()
    expect(pollLatestMessages).toHaveBeenCalledTimes(2)

    // This second call also fails, next poll in 4000.
    // Let's make it succeed this time
    shouldFail = false
    await vi.advanceTimersToNextTimerAsync()
    expect(pollLatestMessages).toHaveBeenCalledTimes(3)

    // It succeeded, so next poll should be reset to MIN_POLL_INTERVAL (1000)
    await vi.advanceTimersToNextTimerAsync()
    expect(pollLatestMessages).toHaveBeenCalledTimes(4)
  })

  it('clears interval on unmount', async () => {
    const store = configureStore({
      reducer: { test: (state = {}) => state },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    )

    const { unmount } = renderHook(() => useMessagePolling(), { wrapper })

    await flushPromises()
    expect(pollLatestMessages).toHaveBeenCalledTimes(1)

    // Unmount the component
    unmount()

    // Advance time
    await vi.advanceTimersByTimeAsync(MIN_POLL_INTERVAL * 2)

    // Should not have been called again after unmount
    expect(pollLatestMessages).toHaveBeenCalledTimes(1)
  })
})
