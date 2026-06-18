import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildMitigationPlan, type MitigationSupplier } from '@/lib/mitigation'

export async function GET() {
  try {
    const session = await requireSession()
    const clientId = session.sub

    const suppliers = await prisma.supplier.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        country: true,
        commodity: true,
        contactEmail: true,
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

    const input: MitigationSupplier[] = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      country: s.country,
      commodity: s.commodity,
      hasEmail: Boolean(s.contactEmail),
      places: s.productionPlaces.map((p) => ({
        id: p.id,
        name: p.name,
        country: p.country,
        areaHectares: p.areaHectares,
        geometryType: p.geometryType,
        validationStatus: p.validationStatus
      }))
    }))

    const plan = buildMitigationPlan(input)

    return NextResponse.json({ plan })
  } catch (error) {
    console.error('Error building mitigation plan:', error)
    return NextResponse.json({ error: 'Failed to build mitigation plan' }, { status: 500 })
  }
}
