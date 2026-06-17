/**
 * Client-side fetch wrapper for authenticated dashboard requests.
 *
 * The access-token cookie expires after 15 minutes. When a request comes back
 * 401, this transparently calls POST /api/auth/refresh (which rotates the
 * 15-minute access token using the 7-day refresh-token cookie) and retries the
 * original request once. Concurrent 401s share a single in-flight refresh so a
 * page that fires several requests on mount only refreshes once.
 */
let refreshing: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', { method: 'POST' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init)
  if (res.status !== 401) return res

  const refreshed = await refreshSession()
  if (!refreshed) return res

  return fetch(input, init)
}
