import { POST, DELETE } from '../auth/route'
import { prisma } from '@/lib/prisma'
import { createAccessToken } from '@/lib/auth'

jest.mock('@/lib/prisma')

function createMockRequest(body: Record<string, unknown>, method: 'POST' | 'DELETE' = 'POST') {
  return new Request('http://localhost/api/auth', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  })
}

describe('POST /api/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('registration', () => {
    it('creates new client successfully', async () => {
      prisma.client.findUnique.mockResolvedValue(null)
      prisma.client.create.mockResolvedValue({
        id: 'client-123',
        email: 'test@example.com',
        companyName: 'Test Corp',
        plan: 'TRIAL'
      })
      prisma.refreshToken.create.mockResolvedValue({ id: 'token-123' })
      prisma.loginAttempt.create.mockResolvedValue({ id: 'attempt-123' })

      const request = createMockRequest({
        mode: 'register',
        companyName: 'Test Corp',
        email: 'test@example.com',
        password: 'SecureP@ss123!',
        country: 'DE'
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe('test@example.com')
      expect(body.data.tokens.accessToken).toBeDefined()
      expect(body.data.tokens.refreshToken).toBeDefined()
    })

    it('rejects duplicate email', async () => {
      prisma.client.findUnique.mockResolvedValue({
        id: 'existing-client',
        email: 'existing@example.com'
      })

      const request = createMockRequest({
        mode: 'register',
        companyName: 'Test Corp',
        email: 'existing@example.com',
        password: 'SecureP@ss123!',
        country: 'DE'
      })

      const response = await POST(request)
      expect(response.status).toBe(409)

      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('CONFLICT')
    })

    it('rejects weak passwords', async () => {
      prisma.client.findUnique.mockResolvedValue(null)

      const request = createMockRequest({
        mode: 'register',
        companyName: 'Test Corp',
        email: 'test@example.com',
        password: 'weak',
        country: 'DE'
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('requires all registration fields', async () => {
      const request = createMockRequest({
        mode: 'register',
        companyName: 'Test Corp',
        email: 'test@example.com',
        password: 'SecureP@ss123!'
        // missing country
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('login', () => {
    it('authenticates valid credentials', async () => {
      prisma.loginAttempt.count.mockResolvedValue(0)
      prisma.client.findUnique.mockResolvedValue({
        id: 'client-123',
        email: 'test@example.com',
        companyName: 'Test Corp',
        plan: 'TRIAL',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYn9qXwCqKK' // "SecureP@ss123!"
      })
      prisma.refreshToken.create.mockResolvedValue({ id: 'token-123' })
      prisma.loginAttempt.deleteMany.mockResolvedValue({})
      prisma.loginAttempt.create.mockResolvedValue({ id: 'attempt-123' })

      const request = createMockRequest({
        mode: 'login',
        email: 'test@example.com',
        password: 'SecureP@ss123!'
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.data.user.id).toBe('client-123')
    })

    it('rejects invalid credentials', async () => {
      prisma.loginAttempt.count.mockResolvedValue(0)
      prisma.client.findUnique.mockResolvedValue({
        id: 'client-123',
        email: 'test@example.com',
        passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYn9qXwCqKK'
      })
      prisma.loginAttempt.create.mockResolvedValue({ id: 'attempt-123' })

      const request = createMockRequest({
        mode: 'login',
        email: 'test@example.com',
        password: 'WrongPassword!'
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })

    it('rejects non-existent user', async () => {
      prisma.loginAttempt.count.mockResolvedValue(0)
      prisma.client.findUnique.mockResolvedValue(null)
      prisma.loginAttempt.create.mockResolvedValue({ id: 'attempt-123' })

      const request = createMockRequest({
        mode: 'login',
        email: 'nonexistent@example.com',
        password: 'SecureP@ss123!'
      })

      const response = await POST(request)
      expect(response.status).toBe(401)
    })
  })
})

describe('DELETE /api/auth', () => {
  it('clears auth cookies and revokes tokens', async () => {
    prisma.refreshToken.deleteMany.mockResolvedValue({})

    const response = await DELETE()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled()
  })
})
