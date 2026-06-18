import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession, revokeAllClientTokens, clearSessionCookies } from '@/lib/auth'

/**
 * Permanently deletes the authenticated account and all of its data. Suppliers,
 * production places, exports, audit logs, and compliance snapshots are removed
 * by cascade; refresh tokens (no FK) are revoked explicitly, and the session
 * cookies are cleared.
 */
export async function DELETE() {
  try {
    const session = await requireSession()
    const clientId = session.sub

    await revokeAllClientTokens(clientId)
    await prisma.client.delete({ where: { id: clientId } })
    await clearSessionCookies()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
