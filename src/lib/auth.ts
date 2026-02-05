import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import type { SubscriptionPlan } from '@prisma/client'
import { addDays, addMinutes } from 'date-fns'

const JWT_SECRET = (() => {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET environment variable is required and must be at least 32 characters. ' +
      'Generate one using: openssl rand -base64 32'
    )
  }
  return new TextEncoder().encode(secret)
})()

const REFRESH_TOKEN_SECRET = (() => {
  const secret = process.env.REFRESH_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'REFRESH_SECRET environment variable is required and must be at least 32 characters. ' +
      'Generate one using: openssl rand -base64 32'
    )
  }
  return new TextEncoder().encode(secret)
})()

const TOKEN_EXPIRY = {
  ACCESS: '15m',
  REFRESH: '7d'
}

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MINUTES = 15

export interface JWTPayload {
  sub: string
  email: string
  plan: SubscriptionPlan
  type: 'access' | 'refresh'
  iat: number
  exp: number
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return { valid: errors.length === 0, errors }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY.ACCESS)
    .sign(JWT_SECRET)
}

export async function createRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): Promise<string> {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY.REFRESH)
    .sign(REFRESH_TOKEN_SECRET)
}

export async function createAuthTokens(payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): Promise<AuthTokens> {
  const accessToken = await createAccessToken(payload)
  const refreshToken = await createRefreshTokenWithStorage(payload)
  return { accessToken, refreshToken }
}

async function createRefreshTokenWithStorage(payload: Omit<JWTPayload, 'iat' | 'exp' | 'type'>): Promise<string> {
  const token = crypto.randomUUID()
  await prisma.refreshToken.create({
    data: {
      token,
      clientId: payload.sub,
      expiresAt: addDays(new Date(), 7)
    }
  })
  return token
}

export async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET)
  return payload as unknown as JWTPayload
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, REFRESH_TOKEN_SECRET)
  return payload as unknown as JWTPayload
}

export async function refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const payload = await verifyRefreshToken(refreshToken)

    if (payload.type !== 'refresh') {
      return null
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    })

    if (!stored || stored.expiresAt < new Date()) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
      return null
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } })

    const client = await prisma.client.findUnique({ where: { id: payload.sub } })
    if (!client) return null

    return createAuthTokens({
      sub: client.id,
      email: client.email,
      plan: client.plan
    })
  } catch {
    return null
  }
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } })
}

export async function revokeAllClientTokens(clientId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { clientId } })
}

export async function cleanExpiredTokens(): Promise<void> {
  await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })
}

export async function checkRateLimit(email: string): Promise<{ allowed: boolean; remaining: number; lockedUntil?: Date }> {
  const windowStart = new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000)

  const attempts = await prisma.loginAttempt.count({
    where: {
      email,
      createdAt: { gte: windowStart }
    }
  })

  const latestLock = await prisma.loginAttempt.findFirst({
    where: {
      email,
      locked: true
    },
    orderBy: { createdAt: 'desc' }
  })

  if (latestLock) {
    const lockedUntil = new Date(latestLock.createdAt.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000)
    if (new Date() < lockedUntil) {
      return { allowed: false, remaining: 0, lockedUntil }
    }
  }

  const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - attempts)
  return { allowed: true, remaining }
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const attempts = await prisma.loginAttempt.count({
    where: {
      email,
      createdAt: { gte: new Date(Date.now() - LOCKOUT_DURATION_MINUTES * 60 * 1000) }
    }
  })

  await prisma.loginAttempt.create({
    data: {
      email,
      success: false,
      locked: attempts >= MAX_LOGIN_ATTEMPTS - 1
    }
  })
}

export async function recordSuccessfulAttempt(email: string): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email, success: true }
  })
}

export async function clearLoginAttempts(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email } })
}

export async function getServerSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value

  if (!token) return null

  try {
    return await verifyToken(token)
  } catch {
    return null
  }
}

export async function requireSession(): Promise<JWTPayload> {
  const session = await getServerSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function getClientBySession(session: JWTPayload) {
  const client = await prisma.client.findUnique({
    where: { id: session.sub }
  })
  return client
}
