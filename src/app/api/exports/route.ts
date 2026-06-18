import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { generateExport } from '@/lib/geojson'
import { prisma } from '@/lib/prisma'
import { canExport, getPlan } from '@/lib/plans'
import { createAuditLog } from '@/lib/audit'
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
      exports,
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

    // Enforce the plan's monthly export allowance.
    const client = await prisma.client.findUnique({
      where: { id: session.sub },
      select: { plan: true }
    })
    if (client) {
      const startOfMonth = new Date()
      startOfMonth.setUTCDate(1)
      startOfMonth.setUTCHours(0, 0, 0, 0)
      const usedThisMonth = await prisma.geoJSONExport.count({
        where: { clientId: session.sub, createdAt: { gte: startOfMonth } }
      })
      if (!canExport(client.plan, usedThisMonth)) {
        const plan = getPlan(client.plan)
        return NextResponse.json(
          {
            error: {
              code: 'PLAN_LIMIT_REACHED',
              message: `Your ${plan.name} plan allows ${plan.maxExportsPerMonth} exports per month. Upgrade for more.`,
              plan: client.plan
            }
          },
          { status: 403 }
        )
      }
    }

    const result = await generateExport(session.sub, validatedData)

    await createAuditLog('EXPORT_GENERATE', 'GeoJSONExport', result.downloadUrl ?? 'export', {
      clientId: session.sub
    }, { fileSize: result.fileSize, commodity: validatedData.commodity })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating export:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}