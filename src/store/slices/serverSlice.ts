import { createSlice, isAnyOf } from '@reduxjs/toolkit'
import {
  fetchInitialMessages,
  loadOlderMessages,
  fetchNewerMessages,
  sendMessage,
  pollLatestMessages,
} from './messagesSlice'

export type ServerStatus = 'checking' | 'online' | 'offline'

export interface ServerState {
  status: ServerStatus
}

const initialState: ServerState = {
  status: 'checking',
}

const serverSlice = createSlice({
  name: 'server',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Set online on any successful API call
    builder.addMatcher(
      isAnyOf(
        fetchInitialMessages.fulfilled,
        loadOlderMessages.fulfilled,
        fetchNewerMessages.fulfilled,
        sendMessage.fulfilled,
        pollLatestMessages.fulfilled,
      ),
      (state) => {
        state.status = 'online'
      },
    )
    // Set offline on any failed API call
    builder.addMatcher(
      isAnyOf(
        fetchInitialMessages.rejected,
        loadOlderMessages.rejected,
        fetchNewerMessages.rejected,
        sendMessage.rejected,
        pollLatestMessages.rejected,
      ),
      (state) => {
        state.status = 'offline'
      },
    )
    // If we are offline, and we start a new request, we can switch to 'checking'
    // so the UI knows we are trying to reconnect.
    builder.addMatcher(
      isAnyOf(
        fetchInitialMessages.pending,
        loadOlderMessages.pending,
        fetchNewerMessages.pending,
        sendMessage.pending,
        pollLatestMessages.pending,
      ),
      (state) => {
        if (state.status === 'offline') {
          state.status = 'checking'
        }
      },
    )
  },
})

export default serverSlice.reducer
