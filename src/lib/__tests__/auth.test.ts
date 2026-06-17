import {
  validatePassword,
  hashPassword,
  verifyPassword,
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  clearLoginAttempts,
  cleanExpiredTokens,
  revokeRefreshToken,
  revokeAllClientTokens,
  refreshAccessToken,
  createAuthTokens,
  getServerSession,
  requireSession,
  getClientBySession
} from '../auth'
import { prisma } from '../prisma'
import { jwtVerify } from 'jose'

const mockJwtVerify = jwtVerify as unknown as jest.Mock

const mockCookieGet = jest.fn()
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({ get: (k: string) => mockCookieGet(k) }))
}))

// Typed access to the mocked prisma client (mocked in jest.setup.ts)
const mockPrisma = prisma as unknown as {
  loginAttempt: { count: jest.Mock; findFirst: jest.Mock; create: jest.Mock; deleteMany: jest.Mock }
  refreshToken: { create: jest.Mock; findUnique: jest.Mock; delete: jest.Mock; deleteMany: jest.Mock }
  client: { findUnique: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('Password Validation', () => {
  it('accepts valid passwords', () => {
    const result = validatePassword('SecureP@ss123!')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects passwords shorter than 12 characters', () => {
    const result = validatePassword('Short1!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must be at least 12 characters')
  })

  it('rejects passwords without uppercase', () => {
    const result = validatePassword('lowercase123!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one uppercase letter')
  })

  it('rejects passwords without lowercase', () => {
    const result = validatePassword('UPPERCASE123!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one lowercase letter')
  })

  it('rejects passwords without numbers', () => {
    const result = validatePassword('NoNumbers!!!')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one number')
  })

  it('rejects passwords without special characters', () => {
    const result = validatePassword('NoSpecial123')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one special character')
  })

  it('collects multiple errors', () => {
    const result = validatePassword('weak')
    expect(result.errors.length).toBeGreaterThanOrEqual(4)
  })

  it('accepts edge case: exactly 12 characters with all requirements', () => {
    const result = validatePassword('Aa1!Aa1!Aa1!')
    expect(result.valid).toBe(true)
  })
})

describe('password hashing', () => {
  it('hashes a password (bcrypt mocked)', async () => {
    await expect(hashPassword('SecureP@ss123!')).resolves.toBe('hashed-password')
  })

  it('verifies a password (bcrypt mocked)', async () => {
    await expect(verifyPassword('SecureP@ss123!', 'hashed-password')).resolves.toBe(true)
  })
})

describe('checkRateLimit', () => {
  it('allows when under the attempt limit and not locked', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(2)
    mockPrisma.loginAttempt.findFirst.mockResolvedValue(null)

    const result = await checkRateLimit('user@example.com')
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(3)
  })

  it('blocks when a recent lock is still active', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(5)
    mockPrisma.loginAttempt.findFirst.mockResolvedValue({
      createdAt: new Date(),
      locked: true
    })

    const result = await checkRateLimit('user@example.com')
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.lockedUntil).toBeInstanceOf(Date)
  })

  it('allows again after the lock window expires', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(0)
    mockPrisma.loginAttempt.findFirst.mockResolvedValue({
      createdAt: new Date(Date.now() - 60 * 60 * 1000),
      locked: true
    })

    const result = await checkRateLimit('user@example.com')
    expect(result.allowed).toBe(true)
  })
})

describe('login attempt recording', () => {
  it('records a failed attempt and locks at the threshold', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(4)
    await recordFailedAttempt('user@example.com')
    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
      data: { email: 'user@example.com', success: false, locked: true }
    })
  })

  it('records a successful attempt', async () => {
    await recordSuccessfulAttempt('user@example.com')
    expect(mockPrisma.loginAttempt.create).toHaveBeenCalledWith({
      data: { email: 'user@example.com', success: true }
    })
  })

  it('clears login attempts for an email', async () => {
    await clearLoginAttempts('user@example.com')
    expect(mockPrisma.loginAttempt.deleteMany).toHaveBeenCalledWith({
      where: { email: 'user@example.com' }
    })
  })
})

describe('token revocation', () => {
  it('cleans expired refresh tokens', async () => {
    await cleanExpiredTokens()
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalled()
  })

  it('revokes a single refresh token', async () => {
    await revokeRefreshToken('token-123')
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { token: 'token-123' }
    })
  })

  it('revokes all tokens for a client', async () => {
    await revokeAllClientTokens('client-123')
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { clientId: 'client-123' }
    })
  })
})

describe('createAuthTokens', () => {
  it('issues an access token and stores a refresh token', async () => {
    mockPrisma.refreshToken.create.mockResolvedValue({})
    const tokens = await createAuthTokens({ sub: 'c1', email: 'a@b.com', plan: 'TRIAL' })
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()
    expect(mockPrisma.refreshToken.create).toHaveBeenCalled()
  })
})

describe('refreshAccessToken', () => {
  beforeEach(() => {
    mockJwtVerify.mockResolvedValue({
      payload: { sub: 'c1', email: 'a@b.com', plan: 'TRIAL', type: 'refresh' }
    })
  })

  afterAll(() => {
    // Restore the default access-token payload for other suites.
    mockJwtVerify.mockResolvedValue({
      payload: { sub: 'test-user', email: 'test@example.com', plan: 'TRIAL', type: 'access' }
    })
  })

  it('rotates tokens for a valid, stored, unexpired refresh token', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      token: 'valid',
      clientId: 'c1',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60)
    })
    mockPrisma.refreshToken.delete.mockResolvedValue({})
    mockPrisma.refreshToken.create.mockResolvedValue({})
    mockPrisma.client.findUnique.mockResolvedValue({ id: 'c1', email: 'a@b.com', plan: 'TRIAL' })

    const tokens = await refreshAccessToken('valid')
    expect(tokens).not.toBeNull()
    expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 'rt1' } })
  })

  it('returns null when the refresh token is not stored', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null)
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({})
    const tokens = await refreshAccessToken('missing')
    expect(tokens).toBeNull()
  })

  it('returns null and purges an expired refresh token', async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt2',
      token: 'expired',
      clientId: 'c1',
      expiresAt: new Date(Date.now() - 1000)
    })
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({})
    const tokens = await refreshAccessToken('expired')
    expect(tokens).toBeNull()
  })

  it('rejects a non-refresh token type', async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { sub: 'c1', email: 'a@b.com', plan: 'TRIAL', type: 'access' }
    })
    const tokens = await refreshAccessToken('access-token')
    expect(tokens).toBeNull()
  })
})

describe('session helpers', () => {
  it('returns null when no auth cookie is present', async () => {
    mockCookieGet.mockReturnValue(undefined)
    await expect(getServerSession()).resolves.toBeNull()
  })

  it('returns the decoded payload when a token is present (jose mocked)', async () => {
    mockCookieGet.mockReturnValue({ value: 'a-token' })
    const session = await getServerSession()
    expect(session?.email).toBe('test@example.com')
  })

  it('requireSession throws when unauthenticated', async () => {
    mockCookieGet.mockReturnValue(undefined)
    await expect(requireSession()).rejects.toThrow('Unauthorized')
  })

  it('getClientBySession looks the client up by id', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: 'client-1', email: 'a@b.com' })
    const client = await getClientBySession({
      sub: 'client-1',
      email: 'a@b.com',
      plan: 'TRIAL',
      type: 'access',
      iat: 0,
      exp: 0
    })
    expect(client?.id).toBe('client-1')
    expect(mockPrisma.client.findUnique).toHaveBeenCalledWith({ where: { id: 'client-1' } })
  })
})
