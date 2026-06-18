import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildDDS } from '@/lib/dds'
import type { SupplierInput } from '@/lib/risk'

export async function GET(request: Request) {
  try {
    const session = await requireSession()
    const clientId = session.sub

    const [client, suppliers] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: { companyName: true, country: true, email: true }
      }),
      prisma.supplier.findMany({
        where: { clientId },
        select: {
          id: true,
          name: true,
          country: true,
          commodity: true,
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
    ])

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const input: SupplierInput[] = suppliers.map((s) => ({
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

    const dds = buildDDS({
      clientId,
      operator: { companyName: client.companyName, country: client.country, email: client.email },
      suppliers: input
    })

    // `?download=1` returns the machine-readable statement as a file attachment,
    // mirroring the structured payload an operator submits to the EU Information
    // System (TRACES).
    const url = new URL(request.url)
    if (url.searchParams.get('download') === '1') {
      return new NextResponse(JSON.stringify(dds, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${dds.referenceNumber}.json"`
        }
      })
    }

    return NextResponse.json({ dds })
  } catch (error) {
    console.error('Error building DDS:', error)
    return NextResponse.json({ error: 'Failed to build due diligence statement' }, { status: 500 })
  }
}
