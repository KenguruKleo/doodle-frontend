// Server status polling interval in milliseconds
// We use polling as a workaround because the server does not support WebSockets or SSE (Server-Sent Events)
export const MIN_POLL_INTERVAL = 1000
export const MAX_POLL_INTERVAL = 5000

// Messages pagination limit
export const MESSAGES_LIMIT = 20

// Current user config
export const CURRENT_USER = import.meta.env.VITE_CURRENT_USER || 'Michael'
