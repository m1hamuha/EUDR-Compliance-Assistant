import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, createToken } from '@/lib/auth'
import { z } from 'zod'

const registerSchema = z.object({
  companyName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  country: z.string().length(2)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyName, email, password, country } = registerSchema.parse(body)

    const existingClient = await prisma.client.findUnique({
      where: { email }
    })

    if (existingClient) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    const client = await prisma.client.create({
      data: {
        companyName,
        email,
        passwordHash,
        country: country.toUpperCase(),
        plan: 'TRIAL'
      }
    })

    const token = await createToken({
      sub: client.id,
      email: client.email,
      plan: client.plan
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: client.id,
        companyName: client.companyName,
        email: client.email,
        plan: client.plan
      }
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
