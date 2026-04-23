import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit'
import type { PayloadAction, EntityState } from '@reduxjs/toolkit'
import { getMessages, postMessages } from '@/api/generated'
import type { Message, CreateMessageRequest } from '@/api/generated'
import { MESSAGES_LIMIT } from '@/constants'

export interface UIMessage extends Message {
  status?: 'pending' | 'sent' | 'error'
}

export interface AsyncRequestState {
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

export const messagesAdapter = createEntityAdapter<UIMessage, string>({
  selectId: (message) => message._id,
  sortComparer: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
})

export interface MessagesState extends EntityState<UIMessage, string> {
  initialLoad: AsyncRequestState
  loadMore: AsyncRequestState
  send: AsyncRequestState
  hasMore: boolean
}

const createAsyncRequestState = (): AsyncRequestState => ({
  status: 'idle',
  error: null,
})

const initialState: MessagesState = messagesAdapter.getInitialState({
  initialLoad: createAsyncRequestState(),
  loadMore: createAsyncRequestState(),
  send: createAsyncRequestState(),
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
      state.initialLoad.status = 'loading'
      state.initialLoad.error = null
    })
    builder.addCase(
      fetchInitialMessages.fulfilled,
      (state, action: PayloadAction<UIMessage[] | undefined>) => {
        state.initialLoad.status = 'succeeded'
        state.initialLoad.error = null

        if (action.payload) {
          const sentMessages = action.payload.map((msg) => ({ ...msg, status: 'sent' as const }))
          const localTempMessages = Object.values(state.entities).filter(
            (message): message is UIMessage =>
              message !== undefined && message._id.startsWith('temp-'),
          )

          messagesAdapter.setAll(state, [...sentMessages, ...localTempMessages])
          state.hasMore = action.payload.length === MESSAGES_LIMIT
        }
      },
    )
    builder.addCase(fetchInitialMessages.rejected, (state, action) => {
      state.initialLoad.status = 'failed'
      state.initialLoad.error = action.payload as string
    })

    // Load older
    builder.addCase(loadOlderMessages.pending, (state) => {
      state.loadMore.status = 'loading'
      state.loadMore.error = null
    })
    builder.addCase(
      loadOlderMessages.fulfilled,
      (state, action: PayloadAction<UIMessage[] | undefined>) => {
        state.loadMore.status = 'succeeded'
        state.loadMore.error = null

        if (action.payload && action.payload.length > 0) {
          const sentMessages = action.payload.map((msg) => ({ ...msg, status: 'sent' as const }))
          messagesAdapter.upsertMany(state, sentMessages)
          state.hasMore = action.payload.length === MESSAGES_LIMIT
        } else {
          state.hasMore = false
        }
      },
    )
    builder.addCase(loadOlderMessages.rejected, (state, action) => {
      state.loadMore.status = 'failed'
      state.loadMore.error = action.payload as string
    })

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
      state.send.status = 'loading'
      state.send.error = null

      const optimisticMessage: UIMessage = {
        _id: `temp-${action.meta.requestId}`,
        message: action.meta.arg.message,
        author: action.meta.arg.author,
        createdAt: new Date().toISOString(),
        status: 'pending',
      }
      messagesAdapter.addOne(state, optimisticMessage)
    })
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.send.status = 'succeeded'
      state.send.error = null

      if (action.payload) {
        const tempId = `temp-${action.meta.requestId}`
        messagesAdapter.removeOne(state, tempId)
        messagesAdapter.upsertOne(state, { ...action.payload, status: 'sent' })
      }
    })
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.send.status = 'failed'
      state.send.error = action.payload as string

      const tempId = `temp-${action.meta.requestId}`
      messagesAdapter.updateOne(state, {
        id: tempId,
        changes: { status: 'error' },
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
