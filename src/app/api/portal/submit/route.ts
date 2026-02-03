import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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

    const place = await prisma.productionPlace.create({
      data: {
        supplierId,
        name,
        areaHectares,
        country: country.toUpperCase(),
        geometryType,
        coordinates: isPolygon 
          ? { type: 'Polygon', coordinates: [coordinates as [number, number][]] }
          : { type: 'Point', coordinates: coordinates as [number, number] },
        validationStatus: 'VALID'
      }
    })

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        status: 'IN_PROGRESS'
      }
    })

    return NextResponse.json({ success: true, place })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Submit error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
