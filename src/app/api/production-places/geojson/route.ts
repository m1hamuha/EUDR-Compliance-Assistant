import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assessPlace } from '@/lib/risk'

/**
 * Returns all of the authenticated client's production places as a GeoJSON
 * FeatureCollection (geometry is already stored in [lng, lat] order), enriched
 * with supplier name, EUDR validation status and deforestation-risk level for
 * map rendering.
 */
export async function GET() {
  try {
    const session = await requireSession()

    const places = await prisma.productionPlace.findMany({
      where: { supplier: { clientId: session.sub } },
      select: {
        id: true,
        name: true,
        country: true,
        areaHectares: true,
        geometryType: true,
        validationStatus: true,
        coordinates: true,
        supplier: { select: { name: true, commodity: true } }
      }
    })

    const features = places
      .filter((p) => p.coordinates && typeof p.coordinates === 'object')
      .map((p) => {
        const risk = assessPlace(
          {
            id: p.id,
            name: p.name,
            country: p.country ?? '',
            areaHectares: p.areaHectares,
            geometryType: p.geometryType,
            validationStatus: p.validationStatus
          },
          { id: '', name: p.supplier.name, country: p.country ?? '', commodity: p.supplier.commodity, places: [] }
        )
        return {
          type: 'Feature' as const,
          geometry: p.coordinates,
          properties: {
            id: p.id,
            name: p.name,
            supplier: p.supplier.name,
            commodity: p.supplier.commodity,
            areaHectares: p.areaHectares,
            geometryType: p.geometryType,
            validationStatus: p.validationStatus,
            riskLevel: risk.level
          }
        }
      })

    return NextResponse.json({
      type: 'FeatureCollection',
      features
    })
  } catch (error) {
    console.error('Error building places GeoJSON:', error)
    return NextResponse.json({ error: 'Failed to load map data' }, { status: 500 })
  }
}
