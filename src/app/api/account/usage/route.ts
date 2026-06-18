import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPlan, suppliersRemaining, exportsRemaining } from '@/lib/plans'

export async function GET() {
  try {
    const session = await requireSession()
    const clientId = session.sub

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { plan: true }
    })
    if (!client) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const startOfMonth = new Date()
    startOfMonth.setUTCDate(1)
    startOfMonth.setUTCHours(0, 0, 0, 0)

    const [suppliers, exportsThisMonth] = await Promise.all([
      prisma.supplier.count({ where: { clientId } }),
      prisma.geoJSONExport.count({ where: { clientId, createdAt: { gte: startOfMonth } } })
    ])

    return NextResponse.json({
      plan: client.plan,
      definition: getPlan(client.plan),
      usage: { suppliers, exportsThisMonth },
      remaining: {
        suppliers: suppliersRemaining(client.plan, suppliers),
        exports: exportsRemaining(client.plan, exportsThisMonth)
      }
    })
  } catch (error) {
    console.error('Error fetching usage:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
