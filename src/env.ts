declare global {
  interface Window {
    _env_?: Record<string, string>
  }
}

export function getEnvVar(key: string, fallback: string): string {
  const caddyVal = window._env_?.[key]

  // 1. Local development (Vite): Caddy hasn't processed the template, so it contains the raw syntax
  if (caddyVal && caddyVal.startsWith('{{env "')) {
    return (import.meta.env[key] as string) || fallback
  }

  // 2. Docker environment (Caddy): template processed, it has a concrete value
  if (caddyVal) {
    return caddyVal
  }

  // 3. Fallback (if variable was empty in Caddy or doesn't exist)
  return (import.meta.env[key] as string) || fallback
}
