import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GDPR-style "export all my data" endpoint. Returns a single JSON document with
 * the authenticated client's account profile, suppliers (with production
 * places), generated exports, and audit trail — as a file download.
 */
export async function GET() {
  try {
    const session = await requireSession()
    const clientId = session.sub

    const [account, suppliers, exports, auditLogs] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, companyName: true, email: true, country: true, plan: true, createdAt: true }
      }),
      prisma.supplier.findMany({
        where: { clientId },
        include: { productionPlaces: true },
        orderBy: { createdAt: 'asc' }
      }),
      prisma.geoJSONExport.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 1000
      })
    ])

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      account,
      counts: {
        suppliers: suppliers.length,
        productionPlaces: suppliers.reduce((n, s) => n + s.productionPlaces.length, 0),
        exports: exports.length,
        auditLogEntries: auditLogs.length
      },
      suppliers,
      exports,
      auditLogs
    }

    const body = JSON.stringify(payload, null, 2)
    const filename = `eudr-data-export-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Account export error:', error)
    return NextResponse.json({ error: 'Failed to export account data' }, { status: 500 })
  }
}
