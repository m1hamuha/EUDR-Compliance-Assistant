import {
  successResponse,
  errorResponse,
  paginatedResponse,
  getCorrelationId
} from '../api-response'

const mockHeaderGet = jest.fn()

jest.mock('next/headers', () => ({
  headers: jest.fn(async () => ({ get: (k: string) => mockHeaderGet(k) }))
}))

describe('successResponse', () => {
  it('wraps data with success: true', () => {
    const res = successResponse({ id: '1' }, 'corr-1')
    expect(res).toEqual({ success: true, data: { id: '1' }, correlationId: 'corr-1' })
  })
})

describe('errorResponse', () => {
  it('wraps an error with success: false', () => {
    const res = errorResponse('NOT_FOUND', 'Missing', { id: '1' }, 'corr-2')
    expect(res.success).toBe(false)
    expect(res.error).toEqual({
      code: 'NOT_FOUND',
      message: 'Missing',
      details: { id: '1' },
      correlationId: 'corr-2'
    })
  })
})

describe('paginatedResponse', () => {
  it('computes totalPages correctly', () => {
    const res = paginatedResponse([1, 2, 3], 25, 1, 10)
    expect(res.success).toBe(true)
    expect(res.data?.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3
    })
  })

  it('returns 0 total pages when there is no data', () => {
    const res = paginatedResponse([], 0, 1, 10)
    expect(res.data?.pagination.totalPages).toBe(0)
  })
})

describe('getCorrelationId', () => {
  afterEach(() => mockHeaderGet.mockReset())

  it('returns the correlation id from the request headers when present', async () => {
    mockHeaderGet.mockReturnValue('header-corr-id')
    await expect(getCorrelationId()).resolves.toBe('header-corr-id')
  })

  it('generates a 32-character hex id when the header is absent', async () => {
    mockHeaderGet.mockReturnValue(null)
    const id = await getCorrelationId()
    expect(id).toMatch(/^[0-9a-f]{32}$/)
  })
})
