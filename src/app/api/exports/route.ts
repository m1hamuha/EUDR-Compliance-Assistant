import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { generateExport } from '@/lib/geojson'
import { z } from 'zod'

const exportSchema = z.object({
  supplierIds: z.array(z.string()).optional(),
  commodity: z.enum(['CATTLE', 'COCOA', 'COFFEE', 'PALM_OIL', 'RUBBER', 'SOY', 'WOOD']).optional(),
  convertSmallToPoints: z.boolean().default(false),
  simplifyTolerance: z.number().min(0).max(0.001).optional(),
  includeAuditLog: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const { prisma } = await import('@/lib/prisma')
    const skip = (page - 1) * limit

    const [exports, total] = await Promise.all([
      prisma.geoJSONExport.findMany({
        where: { clientId: session.sub },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.geoJSONExport.count({ where: { clientId: session.sub } })
    ])

    return NextResponse.json({
      data: exports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching exports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exports' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const validatedData = exportSchema.parse(body)

    const result = await generateExport(session.sub, validatedData)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating export:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}