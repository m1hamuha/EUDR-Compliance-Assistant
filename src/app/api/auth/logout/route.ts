import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getServerSession, revokeAllClientTokens, revokeRefreshToken } from '@/lib/auth'

export async function POST() {
  try {
    const session = await getServerSession()
    if (session) {
      await revokeAllClientTokens(session.sub)
    }

    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh-token')?.value
    if (refreshToken) {
      await revokeRefreshToken(refreshToken)
    }

    cookieStore.delete('auth-token')
    cookieStore.delete('refresh-token')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    // Best-effort: still clear cookies so the client is logged out locally.
    const cookieStore = await cookies()
    cookieStore.delete('auth-token')
    cookieStore.delete('refresh-token')
    return NextResponse.json({ success: true })
  }
}
