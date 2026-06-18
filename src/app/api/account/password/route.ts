import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  requireSession,
  verifyPassword,
  hashPassword,
  validatePassword,
  revokeAllClientTokens
} from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12)
})

/**
 * Changes the authenticated user's password after verifying the current one,
 * enforces the password policy, and revokes all refresh tokens so other
 * sessions are signed out.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { currentPassword, newPassword } = schema.parse(body)

    const client = await prisma.client.findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, passwordHash: true }
    })
    if (!client) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const ok = await verifyPassword(currentPassword, client.passwordHash)
    if (!ok) {
      return NextResponse.json(
        { error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect' } },
        { status: 400 }
      )
    }

    const { valid, errors } = validatePassword(newPassword)
    if (!valid) {
      return NextResponse.json(
        { error: { code: 'WEAK_PASSWORD', message: 'New password does not meet the policy', details: errors } },
        { status: 400 }
      )
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { passwordHash: await hashPassword(newPassword) }
    })

    // Sign out other sessions by revoking all refresh tokens.
    await revokeAllClientTokens(client.id)

    await createAuditLog('PASSWORD_CHANGE', 'Client', client.id, {
      clientId: client.id,
      userEmail: client.email
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Validation error', details: error.issues } }, { status: 400 })
    }
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
