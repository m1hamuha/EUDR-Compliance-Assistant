import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

const publicPaths = ['/login', '/signup', '/api/auth', '/supplier/']

export function generateCorrelationId(): string {
  return crypto.randomUUID()
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/api/health' || pathname === '/_next') {
    return NextResponse.next()
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (publicPaths.some(path => pathname.startsWith(path))) {
    const response = NextResponse.next()

    const correlationId = generateCorrelationId()
    response.headers.set('x-correlation-id', correlationId)

    return response
  }

  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const payload = await verifyToken(token)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-client-id', payload.sub)
    requestHeaders.set('x-client-plan', payload.plan)
    requestHeaders.set('x-correlation-id', generateCorrelationId())

    const response = NextResponse.next({
      request: { headers: requestHeaders }
    })

    response.headers.set('x-correlation-id', requestHeaders.get('x-correlation-id') || '')

    return response
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid token' } },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'
  ]
}
