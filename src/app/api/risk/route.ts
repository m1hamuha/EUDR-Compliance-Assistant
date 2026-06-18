import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

    const risk = assessPortfolio(input)

    return NextResponse.json({ risk })
  } catch (error) {
    console.error('Error building risk assessment:', error)
    return NextResponse.json({ error: 'Failed to build risk assessment' }, { status: 500 })
  }
}
