import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import {
  verifyPassword,
  createAuthTokens,
  checkRateLimit,
  recordFailedAttempt,
  clearLoginAttempts,
  validatePassword
} from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

const registerSchema = z.object({
  companyName: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(12),
  country: z.string().length(2).toUpperCase()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, companyName, country, mode } = body

    if (mode === 'register') {
      const validatedData = registerSchema.parse({ companyName, email, password, country })

      const existingClient = await prisma.client.findUnique({
        where: { email: validatedData.email }
      })

      if (existingClient) {
        return NextResponse.json(
          { error: 'Email already registered' },
          { status: 409 }
        )
      }

      const { valid, errors } = validatePassword(validatedData.password)
      if (!valid) {
        return NextResponse.json(
          { error: 'Password validation failed', details: errors },
          { status: 400 }
        )
      }

      const { hashPassword } = await import('@/lib/auth')
      const passwordHash = await hashPassword(validatedData.password)

      const client = await prisma.client.create({
        data: {
          companyName: validatedData.companyName,
          email: validatedData.email,
          passwordHash,
          country: validatedData.country,
          plan: 'TRIAL'
        }
      })

      const tokens = await createAuthTokens({
        sub: client.id,
        email: client.email,
        plan: client.plan
      })

      const cookieStore = await cookies()
      cookieStore.set('auth-token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 15
      })
      cookieStore.set('refresh-token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      })

      return NextResponse.json({
        user: {
          id: client.id,
          email: client.email,
          companyName: client.companyName,
          plan: client.plan
        },
        tokens
      })
    } else {
      const validatedData = loginSchema.parse({ email, password })

      const { allowed, lockedUntil } = await checkRateLimit(validatedData.email)
      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Too many login attempts. Please try again later.',
            lockedUntil: lockedUntil?.toISOString()
          },
          { status: 429 }
        )
      }

      const client = await prisma.client.findUnique({
        where: { email: validatedData.email }
      })

      if (!client) {
        recordFailedAttempt(validatedData.email)
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      const isValid = await verifyPassword(validatedData.password, client.passwordHash)

      if (!isValid) {
        recordFailedAttempt(validatedData.email)
        return NextResponse.json(
          { error: 'Invalid email or password' },
          { status: 401 }
        )
      }

      clearLoginAttempts(validatedData.email)

      const tokens = await createAuthTokens({
        sub: client.id,
        email: client.email,
        plan: client.plan
      })

      const cookieStore = await cookies()
      cookieStore.set('auth-token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 15
      })
      cookieStore.set('refresh-token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7
      })

      return NextResponse.json({
        user: {
          id: client.id,
          email: client.email,
          companyName: client.companyName,
          plan: client.plan
        },
        tokens
      })
    }
  } catch (error) {
    console.error('Auth error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('auth-token')
    cookieStore.delete('refresh-token')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    )
  }
}