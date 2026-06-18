import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { generateToken } from '@/lib/utils'
import { suppliersRemaining, getPlan } from '@/lib/plans'
import { z } from 'zod'

const bulkImportSchema = z.object({
  suppliers: z.array(z.object({
    name: z.string().min(1),
    country: z.string().length(2),
    commodity: z.enum(['CATTLE', 'COCOA', 'COFFEE', 'PALM_OIL', 'RUBBER', 'SOY', 'WOOD']),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional()
  }))
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { suppliers } = bulkImportSchema.parse(body)

    const created: Array<{ id: string; name: string }> = []
    const errors: Array<{ row: number; name?: string; error: string }> = []

    // Enforce the plan's supplier limit: import up to the remaining allowance
    // and report the rest as plan-limit errors rather than silently dropping.
    const client = await prisma.client.findUnique({
      where: { id: session.sub },
      select: { plan: true }
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    const planDef = getPlan(client.plan)
    const currentCount = await prisma.supplier.count({ where: { clientId: session.sub } })
    const remaining = suppliersRemaining(client.plan, currentCount)
    const allowed = remaining === null ? suppliers.length : remaining

    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i]
      if (i >= allowed) {
        errors.push({
          row: i + 1,
          name: supplier.name,
          error: `Plan limit reached (${planDef.name}: ${planDef.maxSuppliers} suppliers). Upgrade to import the rest.`
        })
        continue
      }
      try {
        const createdSupplier = await prisma.supplier.create({
          data: {
            ...supplier,
            country: supplier.country.toUpperCase(),
            clientId: session.sub,
            invitationToken: generateToken()
          },
          select: { id: true, name: true }
        })
        created.push(createdSupplier)
      } catch (error) {
        errors.push({
          row: i + 1,
          name: supplier.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      errors,
      suppliers: created
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Bulk import error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
