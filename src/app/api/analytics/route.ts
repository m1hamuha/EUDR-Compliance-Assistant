import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildAnalytics } from '@/lib/analytics'

export async function GET() {
  try {
    const session = await requireSession()
    const clientId = session.sub

    const [suppliers, places] = await Promise.all([
      prisma.supplier.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          status: true,
          commodity: true,
          country: true,
          contactEmail: true,
          invitationSentAt: true,
          completedAt: true,
          createdAt: true
        }
      }),
      prisma.productionPlace.findMany({
        where: { supplier: { clientId } },
        select: { validationStatus: true }
      })
    ])

    const analytics = buildAnalytics(suppliers, places)

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error('Error building analytics:', error)
    return NextResponse.json(
      { error: 'Failed to build analytics' },
      { status: 500 }
    )
  }
}
