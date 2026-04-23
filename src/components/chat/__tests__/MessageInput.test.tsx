import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MessageInput } from '@/components/chat/MessageInput'

describe('MessageInput', () => {
  it('renders input and send button', () => {
    render(<MessageInput onSend={vi.fn()} isSendingMessage={false} />)

    expect(screen.getByPlaceholderText('Message')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument()
  })

  it('button is disabled when input is empty', () => {
    render(<MessageInput onSend={vi.fn()} isSendingMessage={false} />)

    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled()
  })

  it('button is enabled when input has text', () => {
    render(<MessageInput onSend={vi.fn()} isSendingMessage={false} />)

    const input = screen.getByPlaceholderText('Message')
    fireEvent.change(input, { target: { value: 'Hello' } })

    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled()
  })

  it('calls onSend and clears input when form is submitted', () => {
    const onSendMock = vi.fn()
    render(<MessageInput onSend={onSendMock} isSendingMessage={false} />)

    const input = screen.getByPlaceholderText('Message')
    fireEvent.change(input, { target: { value: 'Hello World' } })

    const button = screen.getByRole('button', { name: 'Send message' })
    fireEvent.click(button)

    expect(onSendMock).toHaveBeenCalledWith('Hello World')
    expect(input).toHaveValue('')
  })

  it('disables input and button when isSendingMessage is true', () => {
    render(<MessageInput onSend={vi.fn()} isSendingMessage={true} />)

    expect(screen.getByPlaceholderText('Message')).toBeDisabled()
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveTextContent('...')
  })

  it('does not call onSend if isSendingMessage is true', () => {
    const onSendMock = vi.fn()
    render(<MessageInput onSend={onSendMock} isSendingMessage={true} />)

    const input = screen.getByPlaceholderText('Message')
    // We force a change event just in case, though it's technically disabled
    fireEvent.change(input, { target: { value: 'Hello' } })

    const button = screen.getByRole('button')
    fireEvent.click(button)

    expect(onSendMock).not.toHaveBeenCalled()
  })

  it('trims whitespace before sending', () => {
    const onSendMock = vi.fn()
    render(<MessageInput onSend={onSendMock} isSendingMessage={false} />)

    const input = screen.getByPlaceholderText('Message')
    fireEvent.change(input, { target: { value: '  Spaces  ' } })

    const button = screen.getByRole('button', { name: 'Send message' })
    fireEvent.click(button)

    expect(onSendMock).toHaveBeenCalledWith('Spaces')
  })
})
