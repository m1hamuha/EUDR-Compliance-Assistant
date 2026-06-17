import { apiFetch } from '../api-client'

function response(status: number): Response {
  return { status, ok: status >= 200 && status < 300 } as Response
}

const mockFetch = jest.fn()

beforeEach(() => {
  mockFetch.mockReset()
  global.fetch = mockFetch as unknown as typeof fetch
})

describe('apiFetch', () => {
  it('returns the response directly on success (no refresh)', async () => {
    mockFetch.mockResolvedValueOnce(response(200))
    const res = await apiFetch('/api/x')
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('refreshes and retries once on 401, returning the retried response', async () => {
    mockFetch
      .mockResolvedValueOnce(response(401)) // original
      .mockResolvedValueOnce(response(200)) // POST /api/auth/refresh
      .mockResolvedValueOnce(response(200)) // retry
    const res = await apiFetch('/api/x')
    expect(res.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', { method: 'POST' })
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })

  it('returns the original 401 when the refresh fails', async () => {
    mockFetch
      .mockResolvedValueOnce(response(401)) // original
      .mockResolvedValueOnce(response(401)) // refresh fails
    const res = await apiFetch('/api/x')
    expect(res.status).toBe(401)
    expect(mockFetch).toHaveBeenCalledTimes(2) // no retry
  })

  it('de-duplicates concurrent refreshes into a single refresh call', async () => {
    // Both initial requests 401, share one refresh, then each retries.
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/auth/refresh') return Promise.resolve(response(200))
      return Promise.resolve(response(401))
    })

    // First call: 401 -> refresh -> retry (still 401 from the impl above).
    const [a, b] = await Promise.all([apiFetch('/api/a'), apiFetch('/api/b')])
    expect(a.status).toBe(401)
    expect(b.status).toBe(401)

    const refreshCalls = mockFetch.mock.calls.filter(c => c[0] === '/api/auth/refresh')
    expect(refreshCalls.length).toBe(1)
  })
})
