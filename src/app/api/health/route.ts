import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Health check endpoint for uptime monitoring and load balancers.
 * Returns 200 when the application and its database connection are healthy,
 * 503 otherwise. Intentionally public (allow-listed in middleware).
 */
export async function GET() {
  const startedAt = Date.now()

  try {
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}
