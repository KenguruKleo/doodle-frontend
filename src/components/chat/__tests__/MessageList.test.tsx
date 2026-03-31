import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MessageList } from '../MessageList'

describe('MessageList', () => {
  const mockMessages = [
    {
      _id: '1',
      message: 'Hello from A',
      author: 'User A',
      createdAt: '2024-03-15T12:00:00.000Z',
    },
    {
      _id: '2',
      message: 'Hi from Me',
      author: 'Current User',
      createdAt: '2024-03-15T12:01:00.000Z',
    },
  ]

  it('renders all messages', () => {
    render(<MessageList messages={mockMessages} currentUser="Current User" />)

    expect(screen.getByText('Hello from A')).toBeInTheDocument()
    expect(screen.getByText('User A')).toBeInTheDocument()

    expect(screen.getByText('Hi from Me')).toBeInTheDocument()
    // The "Current User" name is not displayed for own messages (isOwnMessage = true)
    // so we shouldn't try to find it in the document.
  })

  it('renders nothing when messages array is empty', () => {
    const { container } = render(<MessageList messages={[]} currentUser="Current User" />)

    // The wrapper div is rendered, but it contains no message items
    expect(container.querySelector('.space-y-4')?.children).toHaveLength(0)
  })
})
