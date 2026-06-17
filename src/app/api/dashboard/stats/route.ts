import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await requireSession()
    const clientId = session.sub

    const [
      totalSuppliers,
      completedSuppliers,
      inProgressSuppliers,
      totalPlaces,
      validationErrors,
      recentExports
    ] = await Promise.all([
      prisma.supplier.count({ where: { clientId } }),
      prisma.supplier.count({ where: { clientId, status: { in: ['COMPLETED', 'VALIDATED'] } } }),
      prisma.supplier.count({ where: { clientId, status: 'IN_PROGRESS' } }),
      prisma.productionPlace.count({ where: { supplier: { clientId } } }),
      prisma.productionPlace.count({
        where: { supplier: { clientId }, validationStatus: 'INVALID' }
      }),
      prisma.geoJSONExport.findMany({
        where: { clientId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          fileSizeBytes: true,
          supplierIds: true
        }
      })
    ])

    return NextResponse.json({
      stats: {
        totalSuppliers,
        completedSuppliers,
        inProgressSuppliers,
        totalPlaces,
        validationErrors,
        recentExports: recentExports.map((e) => ({
          id: e.id,
          createdAt: e.createdAt,
          fileSizeBytes: e.fileSizeBytes,
          supplierCount: e.supplierIds.length
        }))
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
