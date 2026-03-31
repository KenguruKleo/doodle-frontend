import { configureStore } from '@reduxjs/toolkit'
import messagesReducer from './slices/messagesSlice'
import serverReducer from './slices/serverSlice'

export const store = configureStore({
  reducer: {
    messages: messagesReducer,
    server: serverReducer,
  },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
