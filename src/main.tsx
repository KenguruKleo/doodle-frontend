import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store/store'
import { client } from '@/api/generated/client.gen'
import './index.css'
import App from '@/App.tsx'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
const API_TOKEN = import.meta.env.VITE_API_TOKEN || 'super-secret-doodle-token'

// Configure global API client
client.setConfig({
  baseUrl: API_BASE_URL,
  headers: {
    Authorization: `Bearer ${API_TOKEN}`,
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
