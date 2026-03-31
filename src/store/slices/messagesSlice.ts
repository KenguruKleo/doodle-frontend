import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { getMessages, postMessages } from '@/api/generated'
import type { Message, CreateMessageRequest } from '@/api/generated'
import { MESSAGES_LIMIT } from '@/constants'

export interface MessagesState {
  items: Message[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
  isSending: boolean
  sendingError: string | null
  hasMore: boolean
}

const initialState: MessagesState = {
  items: [],
  status: 'idle',
  error: null,
  isSending: false,
  sendingError: null,
  hasMore: true,
}

// Fetch initial messages (the latest ones)
export const fetchInitialMessages = createAsyncThunk(
  'messages/fetchInitialMessages',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getMessages({
        // To get the LATEST messages (since there is no reverse sort),
        // we ask for messages before the current time. The server will
        // return the 20 messages immediately preceding this time, in chronological order.
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
      const items = state.messages.items

      // Find the latest real (non-optimistic) message
      // Messages are sorted chronologically if appended at the end,
      // but let's safely find the latest by searching backwards.
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
      (state, action: PayloadAction<Message[] | undefined>) => {
        state.status = 'succeeded'
        if (action.payload) {
          state.items = action.payload
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
      (state, action: PayloadAction<Message[] | undefined>) => {
        if (action.payload && action.payload.length > 0) {
          // Prepend older messages
          state.items = [...action.payload, ...state.items]
          state.hasMore = action.payload.length === MESSAGES_LIMIT
        } else {
          state.hasMore = false
        }
      },
    )

    // Fetch newer
    builder.addCase(
      fetchNewerMessages.fulfilled,
      (state, action: PayloadAction<Message[] | undefined>) => {
        if (action.payload && action.payload.length > 0) {
          // Append newer messages
          state.items = [...state.items, ...action.payload]
        }
      },
    )

    // Send message (Optimistic update is handled manually before dispatching or we can add temporary ID)
    // Wait, the requirement: "і ми будемо використовувати оптимістик апдейт (але сервер не дозволяє передавати власний айді, о треба буде реалізувати відповідну логіку) і поки ми не отримали відповідь з сервера, думаю не варто давати користувачеві можливість відправляти нове повідомлення"
    builder.addCase(sendMessage.pending, (state, action) => {
      state.isSending = true
      state.sendingError = null

      // Optimistic update: Add fake message to the list
      const optimisticMessage: Message = {
        _id: 'temp-' + Date.now(),
        message: action.meta.arg.message,
        author: action.meta.arg.author,
        createdAt: new Date().toISOString(),
      }
      state.items.push(optimisticMessage)
    })
    builder.addCase(sendMessage.fulfilled, (state, action: PayloadAction<Message | undefined>) => {
      state.isSending = false
      if (action.payload) {
        // Replace optimistic message with the real one
        const tempIndex = state.items.findIndex((msg) => msg._id.startsWith('temp-'))
        if (tempIndex !== -1) {
          state.items[tempIndex] = action.payload
        } else {
          state.items.push(action.payload)
        }
      }
    })
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isSending = false
      state.sendingError = action.payload as string
      // Remove optimistic message on failure
      state.items = state.items.filter((msg) => !msg._id.startsWith('temp-'))
    })
  },
})

export default messagesSlice.reducer
