import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { getMessages } from '../../api/generated'

export type ServerStatus = 'checking' | 'online' | 'offline'

export interface ServerState {
  status: ServerStatus
}

const initialState: ServerState = {
  status: 'checking',
}

// Ping server to check status.
// Note: The challenge documentation mentions a GET `/health` endpoint for this,
// but since it is missing from the provided OpenAPI schema, we are using a minimal
// GET `/messages` request (limit: 1) as a workaround to ping the server.
export const checkServerStatus = createAsyncThunk(
  'server/checkServerStatus',
  async (_, { rejectWithValue }) => {
    try {
      // Just fetching 1 message to see if server responds
      await getMessages({ query: { limit: 1 }, throwOnError: true })
      return 'online'
    } catch {
      return rejectWithValue('offline')
    }
  },
)

const serverSlice = createSlice({
  name: 'server',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(checkServerStatus.pending, (state) => {
      state.status = 'checking'
    })
    builder.addCase(checkServerStatus.fulfilled, (state) => {
      state.status = 'online'
    })
    builder.addCase(checkServerStatus.rejected, (state) => {
      state.status = 'offline'
    })
  },
})

export default serverSlice.reducer
