import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { pollLatestMessages } from '@/store/slices/messagesSlice'
import type { AppDispatch } from '@/store/store'
import { MIN_POLL_INTERVAL, MAX_POLL_INTERVAL } from '@/constants'

/**
 * A custom hook to monitor server health status and fetch new messages.
 * It polls the server periodically since there are no WebSockets or SSE available.
 * Every successful or failed API call automatically updates the server status
 * (see extraReducers in serverSlice.ts).
 *
 * Implements an exponential backoff strategy: increases interval on failure
 * up to MAX_POLL_INTERVAL, and resets to MIN_POLL_INTERVAL on success.
 */
export function useServerStatus() {
  const dispatch = useDispatch<AppDispatch>()
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    let isMounted = true
    let currentInterval = MIN_POLL_INTERVAL

    const poll = async () => {
      try {
        await dispatch(pollLatestMessages()).unwrap()
        currentInterval = MIN_POLL_INTERVAL
      } catch {
        currentInterval = Math.min(currentInterval * 2, MAX_POLL_INTERVAL)
      }

      if (isMounted) {
        timeoutRef.current = window.setTimeout(poll, currentInterval)
      }
    }

    // Initial fetch
    poll()

    return () => {
      isMounted = false
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [dispatch])
}
