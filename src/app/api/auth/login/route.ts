import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  verifyPassword,
  createAuthTokens,
  setSessionCookies,
  checkRateLimit,
  recordFailedAttempt,
  recordSuccessfulAttempt,
  clearLoginAttempts
} from '@/lib/auth'
import { logger, errorFields } from '@/lib/logger'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    const { allowed, lockedUntil } = await checkRateLimit(email)
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many login attempts. Please try again later.',
            lockedUntil: lockedUntil?.toISOString()
          }
        },
        { status: 429 }
      )
    }

    const client = await prisma.client.findUnique({ where: { email } })

    if (!client || !(await verifyPassword(password, client.passwordHash))) {
      await recordFailedAttempt(email)
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } },
        { status: 401 }
      )
    }

    await clearLoginAttempts(email)
    await recordSuccessfulAttempt(email)
    logger.info('login_succeeded', { clientId: client.id })

    const tokens = await createAuthTokens({
      sub: client.id,
      email: client.email,
      plan: client.plan
    })
    await setSessionCookies(tokens)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: client.id,
          email: client.email,
          companyName: client.companyName,
          plan: client.plan
        }
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation error', details: error.issues } },
        { status: 400 }
      )
    }
    logger.error('login_failed', { route: '/api/auth/login', ...errorFields(error) })
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Authentication failed' } },
      { status: 500 }
    )
  }
}
