import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getAuditLogs } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'))
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const offset = (page - 1) * limit

    const { logs, total } = await getAuditLogs(session.sub, { limit, offset })

    return NextResponse.json({
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Error fetching audit log:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
