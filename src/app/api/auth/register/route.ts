import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  hashPassword,
  validatePassword,
  createAuthTokens,
  setSessionCookies
} from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const registerSchema = z.object({
  companyName: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(12),
  country: z.string().length(2).toUpperCase()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    const { valid, errors } = validatePassword(data.password)
    if (!valid) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Password does not meet the security policy', details: errors } },
        { status: 400 }
      )
    }

    const existing = await prisma.client.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Email already registered' } },
        { status: 409 }
      )
    }

    const passwordHash = await hashPassword(data.password)

    const client = await prisma.client.create({
      data: {
        companyName: data.companyName,
        email: data.email,
        passwordHash,
        country: data.country,
        plan: 'TRIAL'
      }
    })

    await createAuditLog('USER_REGISTER', 'Client', client.id, {
      clientId: client.id,
      userEmail: client.email
    })

    const tokens = await createAuthTokens({
      sub: client.id,
      email: client.email,
      plan: client.plan
    })
    await setSessionCookies(tokens)

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: client.id,
            email: client.email,
            companyName: client.companyName,
            plan: client.plan
          }
        }
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Validation error', details: error.issues } },
        { status: 400 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } },
      { status: 500 }
    )
  }
}
