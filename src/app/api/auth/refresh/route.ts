import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { refreshAccessToken } from '@/lib/auth'

/**
 * Exchanges a valid refresh-token cookie for a freshly-minted access token,
 * rotating the refresh token in the process. Returns 401 if the refresh token
 * is missing, expired, or has been revoked.
 */
export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh-token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'No refresh token' } },
        { status: 401 }
      )
    }

    const tokens = await refreshAccessToken(refreshToken)

    if (!tokens) {
      cookieStore.delete('auth-token')
      cookieStore.delete('refresh-token')
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' } },
        { status: 401 }
      )
    }

    const isProd = process.env.NODE_ENV === 'production'
    cookieStore.set('auth-token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 15
    })
    cookieStore.set('refresh-token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to refresh session' } },
      { status: 500 }
    )
  }
}
