import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { generateToken } from '@/lib/utils'
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

    for (let i = 0; i < suppliers.length; i++) {
      const supplier = suppliers[i]
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
