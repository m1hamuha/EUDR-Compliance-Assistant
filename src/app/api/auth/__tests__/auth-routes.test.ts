/**
 * @jest-environment node
 */
import { POST as loginPOST } from '../login/route'
import { POST as registerPOST } from '../register/route'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

const cookieStore = { set: jest.fn(), delete: jest.fn(), get: jest.fn() }
jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => cookieStore)
}))

const mockPrisma = prisma as unknown as {
  client: { findUnique: jest.Mock; create: jest.Mock }
  loginAttempt: { count: jest.Mock; findFirst: jest.Mock; create: jest.Mock; deleteMany: jest.Mock }
  refreshToken: { create: jest.Mock }
  auditLog: { create: jest.Mock }
}

function jsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }) as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.refreshToken.create.mockResolvedValue({})
  mockPrisma.loginAttempt.count.mockResolvedValue(0)
  mockPrisma.loginAttempt.findFirst.mockResolvedValue(null)
  mockPrisma.loginAttempt.create.mockResolvedValue({})
  mockPrisma.loginAttempt.deleteMany.mockResolvedValue({})
  mockPrisma.auditLog.create.mockResolvedValue({})
})

describe('POST /api/auth/login', () => {
  it('authenticates a valid user and sets session cookies', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({
      id: 'c1', email: 'a@b.com', companyName: 'Acme', plan: 'TRIAL', passwordHash: 'hash'
    })

    const res = await loginPOST(jsonRequest({ email: 'a@b.com', password: 'whatever' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.user.email).toBe('a@b.com')
    expect(cookieStore.set).toHaveBeenCalledWith('auth-token', expect.any(String), expect.any(Object))
    expect(cookieStore.set).toHaveBeenCalledWith('refresh-token', expect.any(String), expect.any(Object))
  })

  it('returns 401 for an unknown user and records the failed attempt', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null)

    const res = await loginPOST(jsonRequest({ email: 'nobody@b.com', password: 'whatever' }))
    expect(res.status).toBe(401)
    expect(mockPrisma.loginAttempt.create).toHaveBeenCalled()
  })

  it('returns 429 when rate limited', async () => {
    mockPrisma.loginAttempt.count.mockResolvedValue(5)
    mockPrisma.loginAttempt.findFirst.mockResolvedValue({ createdAt: new Date(), locked: true })

    const res = await loginPOST(jsonRequest({ email: 'a@b.com', password: 'whatever' }))
    expect(res.status).toBe(429)
  })

  it('returns 400 for malformed input', async () => {
    const res = await loginPOST(jsonRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/register', () => {
  it('creates a new client, audit log, and session', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null)
    mockPrisma.client.create.mockResolvedValue({
      id: 'c2', email: 'new@b.com', companyName: 'NewCo', plan: 'TRIAL'
    })

    const res = await registerPOST(jsonRequest({
      companyName: 'NewCo', email: 'new@b.com', password: 'SecureP@ss123!', country: 'DE'
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data.user.email).toBe('new@b.com')
    expect(mockPrisma.auditLog.create).toHaveBeenCalled()
    expect(cookieStore.set).toHaveBeenCalledWith('auth-token', expect.any(String), expect.any(Object))
  })

  it('returns 409 when the email already exists', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: 'existing' })

    const res = await registerPOST(jsonRequest({
      companyName: 'NewCo', email: 'dupe@b.com', password: 'SecureP@ss123!', country: 'DE'
    }))
    expect(res.status).toBe(409)
  })

  it('rejects a password that fails the security policy', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null)

    // 12+ chars (passes the zod min) but no uppercase/number/special.
    const res = await registerPOST(jsonRequest({
      companyName: 'NewCo', email: 'weak@b.com', password: 'alllowercase', country: 'DE'
    }))
    expect(res.status).toBe(400)
  })
})
