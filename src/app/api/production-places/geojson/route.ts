import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Returns all of the authenticated client's production places as a GeoJSON
 * FeatureCollection (geometry is already stored in [lng, lat] order), enriched
 * with supplier name and EUDR validation status for map rendering.
 */
export async function GET() {
  try {
    const session = await requireSession()

    const places = await prisma.productionPlace.findMany({
      where: { supplier: { clientId: session.sub } },
      select: {
        id: true,
        name: true,
        areaHectares: true,
        geometryType: true,
        validationStatus: true,
        coordinates: true,
        supplier: { select: { name: true, commodity: true } }
      }
    })

    const features = places
      .filter((p) => p.coordinates && typeof p.coordinates === 'object')
      .map((p) => ({
        type: 'Feature' as const,
        geometry: p.coordinates,
        properties: {
          id: p.id,
          name: p.name,
          supplier: p.supplier.name,
          commodity: p.supplier.commodity,
          areaHectares: p.areaHectares,
          geometryType: p.geometryType,
          validationStatus: p.validationStatus
        }
      }))

    return NextResponse.json({
      type: 'FeatureCollection',
      features
    })
  } catch (error) {
    console.error('Error building places GeoJSON:', error)
    return NextResponse.json({ error: 'Failed to load map data' }, { status: 500 })
  }
}
