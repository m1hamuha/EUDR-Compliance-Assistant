import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { loadDDS } from '@/lib/dds-load'

/** Lists the client's recorded Due Diligence Statements, most recent first. */
export async function GET() {
  try {
    const session = await requireSession()
    const records = await prisma.dDSRecord.findMany({
      where: { clientId: session.sub },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceNumber: true,
        conclusion: true,
        negligibleRisk: true,
        riskIndex: true,
        totalPlots: true,
        totalAreaHectares: true,
        commodities: true,
        createdAt: true
      }
    })
    return NextResponse.json({ records })
  } catch (error) {
    console.error('Error listing DDS records:', error)
    return NextResponse.json({ error: 'Failed to list statements' }, { status: 500 })
  }
}

/**
 * Snapshots the client's current Due Diligence Statement into a permanent
 * record — the audit trail of what was assessed and (when ready) filed.
 */
export async function POST() {
  try {
    const session = await requireSession()
    const dds = await loadDDS(session.sub)

    if (!dds) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    if (dds.totalPlots === 0) {
      return NextResponse.json({ error: 'Nothing to record yet' }, { status: 400 })
    }

    const record = await prisma.dDSRecord.create({
      data: {
        clientId: session.sub,
        referenceNumber: dds.referenceNumber,
        conclusion: dds.conclusion,
        negligibleRisk: dds.negligibleRisk,
        riskIndex: dds.riskIndex,
        totalPlots: dds.totalPlots,
        totalAreaHectares: dds.totalAreaHectares,
        commodities: dds.commodities.map((c) => c.commodity),
        snapshot: dds as unknown as object
      },
      select: {
        id: true,
        referenceNumber: true,
        conclusion: true,
        negligibleRisk: true,
        riskIndex: true,
        totalPlots: true,
        totalAreaHectares: true,
        commodities: true,
        createdAt: true
      }
    })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    console.error('Error recording DDS:', error)
    return NextResponse.json({ error: 'Failed to record statement' }, { status: 500 })
  }
}
