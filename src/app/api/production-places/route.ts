import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'
import { validateGeoJSON, ValidationResult } from '@/lib/eudr-validator'

const pointCoordinatesSchema = z.array(z.number().min(-180).max(180)).length(2)

const polygonCoordinatesSchema = z.array(
  z.array(z.number().min(-180).max(180)).length(2)
).min(4)

const productionPlaceSchema = z.object({
  supplierId: z.string(),
  name: z.string().min(1).max(255),
  areaHectares: z.number().positive(),
  geometryType: z.enum(['POINT', 'POLYGON']),
  coordinates: z.union([pointCoordinatesSchema, polygonCoordinatesSchema]),
  country: z.string().length(2).toUpperCase()
})

const updateProductionPlaceSchema = productionPlaceSchema.partial().omit({ supplierId: true })

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const supplierId = searchParams.get('supplierId')
    const status = searchParams.get('status')
    const country = searchParams.get('country')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      supplier: { clientId: session.sub }
    }

    if (supplierId) where.supplierId = supplierId
    if (status) where.validationStatus = status
    if (country) where.country = country

    const [places, total] = await Promise.all([
      prisma.productionPlace.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true, commodity: true }
          }
        }
      }),
      prisma.productionPlace.count({ where })
    ])

    return NextResponse.json({
      data: places,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching production places:', error)
    return NextResponse.json(
      { error: 'Failed to fetch production places' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const validatedData = productionPlaceSchema.parse(body)

    const supplier = await prisma.supplier.findFirst({
      where: { id: validatedData.supplierId, clientId: session.sub }
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    let validationResult: ValidationResult | null = null

    if (validatedData.geometryType === 'POLYGON') {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          properties: {
            ProductionPlace: validatedData.name,
            Area: validatedData.areaHectares,
            ProducerCountry: validatedData.country
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [validatedData.coordinates as number[][]]
          }
        }]
      }

      validationResult = validateGeoJSON(geojson)
    } else if (validatedData.geometryType === 'POINT') {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          properties: {
            ProductionPlace: validatedData.name,
            Area: validatedData.areaHectares,
            ProducerCountry: validatedData.country
          },
          geometry: {
            type: 'Point' as const,
            coordinates: validatedData.coordinates
          }
        }]
      }

      validationResult = validateGeoJSON(geojson)
    }

    const place = await prisma.productionPlace.create({
      data: {
        supplierId: validatedData.supplierId,
        name: validatedData.name,
        areaHectares: validatedData.areaHectares,
        geometryType: validatedData.geometryType,
        coordinates: validatedData.coordinates,
        country: validatedData.country,
        validationStatus: validationResult?.valid ? 'VALID' : 'INVALID',
        validationErrors: validationResult?.errors || null
      }
    })

    if (supplier.status === 'INVITED') {
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { status: 'IN_PROGRESS' }
      })
    }

    return NextResponse.json(place, { status: 201 })
  } catch (error) {
    console.error('Error creating production place:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create production place' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Production place ID is required' },
        { status: 400 }
      )
    }

    const validatedData = updateProductionPlaceSchema.parse(updateData)

    const place = await prisma.productionPlace.findFirst({
      where: { id },
      include: { supplier: true }
    })

    if (!place || place.supplier.clientId !== session.sub) {
      return NextResponse.json(
        { error: 'Production place not found' },
        { status: 404 }
      )
    }

    let validationResult: ValidationResult | null = null

    if (validatedData.coordinates && validatedData.geometryType === 'POLYGON') {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          properties: {
            ProductionPlace: validatedData.name || place.name,
            Area: validatedData.areaHectares || place.areaHectares,
            ProducerCountry: validatedData.country || place.country
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [validatedData.coordinates as number[][]]
          }
        }]
      }

      validationResult = validateGeoJSON(geojson)
    }

    const updatedPlace = await prisma.productionPlace.update({
      where: { id },
      data: {
        ...validatedData,
        validationStatus: validationResult?.valid ? 'VALID' : validationResult ? 'INVALID' : undefined,
        validationErrors: validationResult?.errors || null
      }
    })

    return NextResponse.json(updatedPlace)
  } catch (error) {
    console.error('Error updating production place:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update production place' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Production place ID is required' },
        { status: 400 }
      )
    }

    const place = await prisma.productionPlace.findFirst({
      where: { id },
      include: { supplier: true }
    })

    if (!place || place.supplier.clientId !== session.sub) {
      return NextResponse.json(
        { error: 'Production place not found' },
        { status: 404 }
      )
    }

    await prisma.productionPlace.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting production place:', error)
    return NextResponse.json(
      { error: 'Failed to delete production place' },
      { status: 500 }
    )
  }
}