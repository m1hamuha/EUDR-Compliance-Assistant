import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const completeSchema = z.object({
  supplierId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId } = completeSchema.parse(body)

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Complete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
