import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('react-virtuoso', () => ({
  Virtuoso: ({ data, itemContent }: any) => (
    <div data-testid="virtuoso-mock">
      {data.map((item: any, index: number) => (
        <div key={item._id || index}>{itemContent(index, item)}</div>
      ))}
    </div>
  ),
}))
import { MessageList } from '@/components/chat/MessageList'
import { CURRENT_USER } from '@/constants'

describe('MessageList', () => {
  beforeAll(() => {
    class MockIntersectionObserver {
      constructor() {
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
        currentUser={CURRENT_USER}
        onLoadMore={() => {}}
        hasMore={true}
        isLoadingOlderMessages={false}
      />,
    )

    expect(screen.getByText('Hello from A')).toBeInTheDocument()
    expect(screen.getByText('User A')).toBeInTheDocument()
    expect(screen.getByText(`Hi from ${CURRENT_USER}`)).toBeInTheDocument()
  })

  it('renders nothing when messages array is empty', () => {
    const { container } = render(
      <MessageList
        messages={[]}
        currentUser="Current User"
        onLoadMore={() => {}}
        hasMore={true}
        isLoadingOlderMessages={false}
      />,
    )

    expect(screen.getByTestId('virtuoso-mock')).toBeEmptyDOMElement()
    expect(container).not.toHaveTextContent('Hello from A')
  })
})
