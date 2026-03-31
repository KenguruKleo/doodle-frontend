import { getEnvVar } from '@/env'

// Server status polling interval in milliseconds
// We use polling as a workaround because the server does not support WebSockets or SSE (Server-Sent Events)
export const MIN_POLL_INTERVAL = 2000
export const MAX_POLL_INTERVAL = 15000

// Messages pagination limit
export const MESSAGES_LIMIT = 20

// Current user config
export const CURRENT_USER = getEnvVar('VITE_CURRENT_USER', 'Michael')
