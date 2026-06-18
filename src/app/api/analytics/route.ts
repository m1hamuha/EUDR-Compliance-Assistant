import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildAnalytics, shouldCreateSnapshot } from '@/lib/analytics'
import { assessPortfolio, type SupplierInput } from '@/lib/risk'

export async function GET() {
  try {
    const session = await requireSession()
    const clientId = session.sub

    const suppliers = await prisma.supplier.findMany({
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
        createdAt: true,
        productionPlaces: {
          select: {
            id: true,
            name: true,
            country: true,
            areaHectares: true,
            geometryType: true,
            validationStatus: true
          }
        }
      }
    })

    const places = suppliers.flatMap((s) =>
      s.productionPlaces.map((p) => ({ validationStatus: p.validationStatus }))
    )

    // Compute the portfolio risk index and fold it into the compliance score so
    // a complete-but-risky supply chain is not rated "ready" to file.
    const riskInput: SupplierInput[] = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      country: s.country,
      commodity: s.commodity,
      places: s.productionPlaces.map((p) => ({
        id: p.id,
        name: p.name,
        country: p.country,
        areaHectares: p.areaHectares,
        geometryType: p.geometryType,
        validationStatus: p.validationStatus
      }))
    }))
    const { riskIndex } = assessPortfolio(riskInput)

    const analytics = buildAnalytics(suppliers, places, { riskIndex })

    // Lazily record at most one compliance snapshot per day so the score trend
    // builds up over time without needing a scheduled job. Best-effort: never
    // let snapshotting break the analytics response.
    let scoreHistory: Array<{ date: string; score: number }> = []
    try {
      const latest = await prisma.complianceSnapshot.findFirst({
        where: { clientId },
        orderBy: { createdAt: 'desc' }
      })

      if (shouldCreateSnapshot(latest?.createdAt ?? null)) {
        await prisma.complianceSnapshot.create({
          data: {
            clientId,
            score: analytics.complianceScore,
            completionRate: analytics.completionRate,
            validationPassRate: analytics.validationPassRate,
            totalSuppliers: analytics.totalSuppliers,
            totalPlaces: analytics.totalPlaces
          }
        })
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const history = await prisma.complianceSnapshot.findMany({
        where: { clientId, createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'asc' },
        select: { score: true, createdAt: true }
      })
      scoreHistory = history.map((s) => ({ date: s.createdAt.toISOString().slice(0, 10), score: s.score }))
    } catch (snapshotError) {
      console.error('Snapshot/history error (non-fatal):', snapshotError)
    }

    return NextResponse.json({ analytics: { ...analytics, scoreHistory } })
  } catch (error) {
    console.error('Error building analytics:', error)
    return NextResponse.json(
      { error: 'Failed to build analytics' },
      { status: 500 }
    )
  }
}
