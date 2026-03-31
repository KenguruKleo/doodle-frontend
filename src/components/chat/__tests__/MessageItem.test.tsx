import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MessageItem } from '@/components/chat/MessageItem'

describe('MessageItem', () => {
  const mockMessage = {
    _id: '1',
    message: 'Hello, World!',
    author: 'John Doe',
    // UTC time: 2024-03-15T12:00:00.000Z
    createdAt: '2024-03-15T12:00:00.000Z',
  }

  it('renders message text and author', () => {
    render(<MessageItem message={mockMessage} isOwnMessage={false} />)

    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('renders date in correct format', () => {
    render(<MessageItem message={mockMessage} isOwnMessage={false} />)

    // We'll search by regex to avoid timezone issues failing the test,
    // but typically it should look like "15 Mar 2024 HH:MM"
    const dateText = screen.getByText(/15 Mar 2024/i)
    expect(dateText).toBeInTheDocument()
  })

  it('applies correct classes for own message', () => {
    const { container } = render(<MessageItem message={mockMessage} isOwnMessage={true} />)

    // Should have justify-end wrapper
    expect(container.firstChild).toHaveClass('justify-end')
    // Message bubble should have 'bg-message-out'
    const bubble = screen.getByText('Hello, World!').parentElement
    expect(bubble).toHaveClass('bg-message-out')
  })

  it('applies correct classes for received message', () => {
    const { container } = render(<MessageItem message={mockMessage} isOwnMessage={false} />)

    // Should have justify-start wrapper
    expect(container.firstChild).toHaveClass('justify-start')
    // Message bubble should have 'bg-message-in'
    const bubble = screen.getByText('Hello, World!').parentElement
    expect(bubble).toHaveClass('bg-message-in')
  })
})
