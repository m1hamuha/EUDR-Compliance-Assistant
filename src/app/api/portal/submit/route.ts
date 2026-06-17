import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateGeoJSON, fixGeoJSON } from '@/lib/eudr-validator'

const submitSchema = z.object({
  supplierId: z.string(),
  name: z.string().min(1),
  areaHectares: z.number().min(0.01),
  country: z.string().length(2),
  coordinates: z.union([
    z.array(z.tuple([z.number(), z.number()])).min(4),
    z.tuple([z.number(), z.number()])
  ])
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, name, areaHectares, country, coordinates } = submitSchema.parse(body)

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const isPolygon = Array.isArray(coordinates[0])
    const geometryType = isPolygon ? 'POLYGON' : 'POINT'

    const rawGeometry = isPolygon
      ? { type: 'Polygon', coordinates: [coordinates as [number, number][]] }
      : { type: 'Point', coordinates: coordinates as [number, number] }

    // Normalise before validating: close polygon rings (map drawers emit an open
    // ring) and round coordinates to 6 decimals so legitimate submissions are not
    // rejected for an unclosed ring, and the persisted geometry is EUDR-compliant.
    const normalised = fixGeoJSON({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { ProductionPlace: name, Area: areaHectares },
        geometry: rawGeometry
      }]
    })
    const geometry = normalised.features[0].geometry

    // Validate the normalised submission against EUDR requirements so the
    // production place carries an accurate compliance status (and any issues).
    const validation = validateGeoJSON(normalised)
    const hasIssues = validation.errors.length > 0 || validation.warnings.length > 0

    const place = await prisma.productionPlace.create({
      data: {
        supplierId,
        name,
        areaHectares,
        country: country.toUpperCase(),
        geometryType,
        coordinates: JSON.parse(JSON.stringify(geometry)),
        validationStatus: validation.valid ? 'VALID' : 'INVALID',
        validationErrors: hasIssues
          ? JSON.parse(JSON.stringify({ errors: validation.errors, warnings: validation.warnings }))
          : undefined
      }
    })

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        status: 'IN_PROGRESS'
      }
    })

    return NextResponse.json({
      success: true,
      place,
      validation: {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
