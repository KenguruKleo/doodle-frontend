import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit'
import type { PayloadAction, EntityState } from '@reduxjs/toolkit'
import { getMessages, postMessages } from '@/api/generated'
import type { Message, CreateMessageRequest } from '@/api/generated'
import { MESSAGES_LIMIT } from '@/constants'

export interface UIMessage extends Message {
  status?: 'pending' | 'sent' | 'error'
}

export const messagesAdapter = createEntityAdapter<UIMessage, string>({
  selectId: (message) => message._id,
  sortComparer: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
})

export interface MessagesState extends EntityState<UIMessage, string> {
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  isSending: boolean
  sendingError: string | null
  hasMore: boolean
}

const initialState: MessagesState = messagesAdapter.getInitialState({
  status: 'idle',
  error: null,
  isSending: false,
  sendingError: null,
  hasMore: true,
})

// Fetch initial messages (the latest ones)
export const fetchInitialMessages = createAsyncThunk(
  'messages/fetchInitialMessages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMessages({
        query: {
          limit: MESSAGES_LIMIT,
          before: new Date().toISOString(),
        },
        throwOnError: true,
      })
      return response.data
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch messages'
      return rejectWithValue(msg)
    }
  },
)

// Load older messages for infinite scroll
export const loadOlderMessages = createAsyncThunk(
  'messages/loadOlderMessages',
  async (before: string, { rejectWithValue }) => {
    try {
      const response = await getMessages({
        query: { limit: MESSAGES_LIMIT, before },
        throwOnError: true,
      })
      return response.data
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load older messages'
      return rejectWithValue(msg)
    }
  },
)

// Poll or fetch newer messages
export const fetchNewerMessages = createAsyncThunk(
  'messages/fetchNewerMessages',
  async (after: string, { rejectWithValue }) => {
    try {
      const response = await getMessages({
        query: { limit: MESSAGES_LIMIT, after },
        throwOnError: true,
      })
      return response.data
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch newer messages'
      return rejectWithValue(msg)
    }
  },
)

// Send a new message
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (messageData: CreateMessageRequest, { rejectWithValue }) => {
    try {
      const response = await postMessages({
        body: messageData,
        throwOnError: true,
      })
      return response.data
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to send message'
      return rejectWithValue(msg)
    }
  },
)

// Poll for newer messages
export const pollLatestMessages = createAsyncThunk(
  'messages/pollLatestMessages',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState() as { messages: MessagesState }
      const items = messagesAdapter.getSelectors().selectAll(state.messages)

      const lastRealMessage = [...items].reverse().find((msg) => !msg._id.startsWith('temp-'))

      if (lastRealMessage) {
        await dispatch(fetchNewerMessages(lastRealMessage.createdAt)).unwrap()
      } else {
        await dispatch(fetchInitialMessages()).unwrap()
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to poll messages'
      return rejectWithValue(msg)
    }
  },
)

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Initial fetch
    builder.addCase(fetchInitialMessages.pending, (state) => {
      state.status = 'loading'
      state.error = null
    })
    builder.addCase(
      fetchInitialMessages.fulfilled,
      (state, action: PayloadAction<UIMessage[] | undefined>) => {
        state.status = 'succeeded'
        if (action.payload) {
          const sentMessages = action.payload.map((msg) => ({ ...msg, status: 'sent' as const }))
          messagesAdapter.setAll(state, sentMessages)
          state.hasMore = action.payload.length === MESSAGES_LIMIT
        }
      },
    )
    builder.addCase(fetchInitialMessages.rejected, (state, action) => {
      state.status = 'failed'
      state.error = action.payload as string
    })

    // Load older
    builder.addCase(
      loadOlderMessages.fulfilled,
      (state, action: PayloadAction<UIMessage[] | undefined>) => {
        if (action.payload && action.payload.length > 0) {
          const sentMessages = action.payload.map((msg) => ({ ...msg, status: 'sent' as const }))
          messagesAdapter.upsertMany(state, sentMessages)
          state.hasMore = action.payload.length === MESSAGES_LIMIT
        } else {
          state.hasMore = false
        }
      },
    )

    // Fetch newer
    builder.addCase(
      fetchNewerMessages.fulfilled,
      (state, action: PayloadAction<UIMessage[] | undefined>) => {
        if (action.payload && action.payload.length > 0) {
          const sentMessages = action.payload.map((msg) => ({ ...msg, status: 'sent' as const }))
          messagesAdapter.upsertMany(state, sentMessages)
        }
      },
    )

    // Send message
    builder.addCase(sendMessage.pending, (state, action) => {
      state.isSending = true
      state.sendingError = null

      const optimisticMessage: UIMessage = {
        _id: 'temp-' + Date.now(),
        message: action.meta.arg.message,
        author: action.meta.arg.author,
        createdAt: new Date().toISOString(),
        status: 'pending',
      }
      messagesAdapter.addOne(state, optimisticMessage)
    })
    builder.addCase(
      sendMessage.fulfilled,
      (state, action: PayloadAction<UIMessage | undefined>) => {
        state.isSending = false
        if (action.payload) {
          // Find the temporary message and remove it, then add the real one
          const tempId = state.ids.find((id) => String(id).startsWith('temp-')) as
            | string
            | undefined
          if (tempId) {
            messagesAdapter.removeOne(state, tempId)
          }
          messagesAdapter.upsertOne(state, { ...action.payload, status: 'sent' })
        }
      },
    )
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isSending = false
      state.sendingError = action.payload as string

      // Mark temporary messages as error
      const tempIds = state.ids.filter((id) => String(id).startsWith('temp-')) as string[]
      tempIds.forEach((id) => {
        messagesAdapter.updateOne(state, {
          id,
          changes: { status: 'error' },
        })
      })
    })
  },
})

// Export selectors
export const {
  selectAll: selectAllMessages,
  selectById: selectMessageById,
  selectIds: selectMessageIds,
} = messagesAdapter.getSelectors<{ messages: MessagesState }>((state) => state.messages)

export default messagesSlice.reducer
