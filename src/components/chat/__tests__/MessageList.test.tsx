import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { MessageList } from '@/components/chat/MessageList'
import { CURRENT_USER } from '@/constants'

describe('MessageList', () => {
  beforeAll(() => {
    // Mock IntersectionObserver
    class MockIntersectionObserver {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {
        // do nothing
      }
      observe() {
        return null
      }
      unobserve() {
        return null
      }
      disconnect() {
        return null
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as any

    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  const mockMessages = [
    {
      _id: '1',
      message: 'Hello from A',
      author: 'User A',
      createdAt: '2024-03-15T12:00:00.000Z',
    },
    {
      _id: '2',
      message: `Hi from ${CURRENT_USER}`,
      author: CURRENT_USER,
      createdAt: '2024-03-15T12:01:00.000Z',
    },
  ]

  it('renders all messages', () => {
    render(
      <MessageList
        messages={mockMessages}
        currentUser="Current User"
        onLoadMore={() => {}}
        hasMore={true}
        isLoadingMore={false}
      />,
    )

    expect(screen.getByText('Hello from A')).toBeInTheDocument()
    expect(screen.getByText('User A')).toBeInTheDocument()

    expect(screen.getByText(`Hi from ${CURRENT_USER}`)).toBeInTheDocument()
    // The "Current User" name is not displayed for own messages (isOwnMessage = true)
    // so we shouldn't try to find it in the document.
  })

  it('renders nothing when messages array is empty', () => {
    const { container } = render(
      <MessageList
        messages={[]}
        currentUser="Current User"
        onLoadMore={() => {}}
        hasMore={true}
        isLoadingMore={false}
      />,
    )

    // The wrapper div is rendered, but it contains no message items (only the top observer and bottom ref divs)
    expect(container.querySelectorAll('.space-y-4 > div:not(.h-4):not(.h-1)')).toHaveLength(0)
  })
})
