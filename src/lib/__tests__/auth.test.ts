import {
  validatePassword,
  hashPassword,
  verifyPassword,
  createAccessToken,
  createRefreshToken,
  verifyToken,
  verifyRefreshToken,
  createAuthTokens
} from '../auth'

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

describe('Password Hashing', () => {
  it('hashes password correctly', async () => {
    const password = 'SecureP@ss123!'
    const hash = await hashPassword(password)

    expect(hash).not.toBe(password)
    expect(hash.length).toBeGreaterThan(50)
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/)
  })

  it('verifies correct password', async () => {
    const password = 'SecureP@ss123!'
    const hash = await hashPassword(password)
    const result = await verifyPassword(password, hash)

    expect(result).toBe(true)
  })

  it('rejects incorrect password', async () => {
    const password = 'SecureP@ss123!'
    const hash = await hashPassword(password)
    const result = await verifyPassword('WrongPassword!', hash)

    expect(result).toBe(false)
  })

  it('produces different hashes for same password', async () => {
    const password = 'SecureP@ss123!'
    const hash1 = await hashPassword(password)
    const hash2 = await hashPassword(password)

    expect(hash1).not.toBe(hash2)
    expect(await verifyPassword(password, hash1)).toBe(true)
    expect(await verifyPassword(password, hash2)).toBe(true)
  })
})

describe('Token Creation', () => {
  it('creates valid JWT structure', async () => {
    const token = await createAccessToken({
      sub: 'user-123',
      email: 'test@example.com',
      plan: 'TRIAL'
    })

    expect(token.split('.').length).toBe(3)
    const parts = token.split('.')
    const payload = JSON.parse(atob(parts[1]))

    expect(payload.sub).toBe('user-123')
    expect(payload.email).toBe('test@example.com')
    expect(payload.plan).toBe('TRIAL')
    expect(payload.type).toBe('access')
  })

  it('refresh token has correct type', async () => {
    const token = await createRefreshToken({
      sub: 'user-123',
      email: 'test@example.com',
      plan: 'TRIAL'
    })

    const parts = token.split('.')
    const payload = JSON.parse(atob(parts[1]))

    expect(payload.type).toBe('refresh')
  })

  it('creates both tokens with createAuthTokens', async () => {
    const tokens = await createAuthTokens({
      sub: 'user-123',
      email: 'test@example.com',
      plan: 'TRIAL'
    })

    expect(tokens.accessToken).toBeDefined()
    expect(tokens.refreshToken).toBeDefined()
    expect(tokens.accessToken.split('.')).toHaveLength(3)
    expect(tokens.refreshToken.split('.')).toHaveLength(3)
  })
})

describe('Token Verification', () => {
  it('verifies valid access token', async () => {
    const token = await createAccessToken({
      sub: 'user-123',
      email: 'test@example.com',
      plan: 'TRIAL'
    })

    const payload = await verifyToken(token)

    expect(payload.sub).toBe('user-123')
    expect(payload.email).toBe('test@example.com')
    expect(payload.type).toBe('access')
  })

  it('verifies valid refresh token', async () => {
    const token = await createRefreshToken({
      sub: 'user-123',
      email: 'test@example.com',
      plan: 'TRIAL'
    })

    const payload = await verifyRefreshToken(token)

    expect(payload.sub).toBe('user-123')
    expect(payload.type).toBe('refresh')
  })

  it('rejects tampered token', async () => {
    const token = await createAccessToken({
      sub: 'user-123',
      email: 'test@example.com',
      plan: 'TRIAL'
    })

    const tamperedToken = token.slice(0, -5) + 'xxxxx'

    await expect(verifyToken(tamperedToken)).rejects.toThrow()
  })

  it('rejects token with wrong secret', async () => {
    const parts = ['header', 'payload', 'signature']
    parts[1] = btoa(JSON.stringify({
      sub: 'user-123',
      email: 'test@example.com',
      plan: 'TRIAL',
      type: 'access'
    }))
    const fakeToken = parts.join('.')

    await expect(verifyToken(fakeToken)).rejects.toThrow()
  })
})
