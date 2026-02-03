import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supplier = await prisma.supplier.findUnique({
      where: { invitationToken: token },
      include: {
        productionPlaces: {
          select: {
            id: true,
            name: true,
            areaHectares: true,
            geometryType: true,
            createdAt: true
          }
        }
      }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    return NextResponse.json({
      supplier: {
        id: supplier.id,
        name: supplier.name,
        country: supplier.country,
        commodity: supplier.commodity,
        productionPlaces: supplier.productionPlaces
      }
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
