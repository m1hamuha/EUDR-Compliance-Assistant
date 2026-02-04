import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { z } from 'zod'
import { generateToken } from '@/lib/utils'

const supplierInviteSchema = z.object({
  name: z.string().min(1).max(255),
  country: z.string().length(2).toUpperCase(),
  commodity: z.enum(['CATTLE', 'COCOA', 'COFFEE', 'PALM_OIL', 'RUBBER', 'SOY', 'WOOD']),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional()
})

const updateSupplierSchema = supplierInviteSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const commodity = searchParams.get('commodity')
    const country = searchParams.get('country')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { clientId: session.sub }

    if (status) where.status = status
    if (commodity) where.commodity = commodity
    if (country) where.country = country
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { productionPlaces: true }
          }
        }
      }),
      prisma.supplier.count({ where })
    ])

    return NextResponse.json({
      data: suppliers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()

    const validatedData = supplierInviteSchema.parse(body)

    const client = await prisma.client.findUnique({
      where: { id: session.sub }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (client.plan === 'TRIAL') {
      const supplierCount = await prisma.supplier.count({
        where: { clientId: session.sub }
      })
      if (supplierCount >= 3) {
        return NextResponse.json(
          { error: 'Trial plan allows only 3 suppliers. Please upgrade to continue.' },
          { status: 403 }
        )
      }
    }

    const invitationToken = generateToken()

    const supplier = await prisma.supplier.create({
      data: {
        clientId: session.sub,
        name: validatedData.name,
        country: validatedData.country,
        commodity: validatedData.commodity,
        contactEmail: validatedData.contactEmail,
        contactPhone: validatedData.contactPhone,
        status: 'INVITED',
        invitationToken
      }
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('Error creating supplier:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create supplier' },
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
        { error: 'Supplier ID is required' },
        { status: 400 }
      )
    }

    const validatedData = updateSupplierSchema.parse(updateData)

    const supplier = await prisma.supplier.findFirst({
      where: { id, clientId: session.sub }
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    const updatedSupplier = await prisma.supplier.update({
      where: { id },
      data: validatedData
    })

    return NextResponse.json(updatedSupplier)
  } catch (error) {
    console.error('Error updating supplier:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update supplier' },
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
        { error: 'Supplier ID is required' },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id, clientId: session.sub }
    })

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      )
    }

    await prisma.supplier.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    )
  }
}