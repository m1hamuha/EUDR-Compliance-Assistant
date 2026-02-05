import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { productionPlaceCreateSchema } from '@/schemas'
import { ValidationStatus } from '@prisma/client'
import type { ProductionPlaceCreate } from '@/schemas'

export interface ServiceContext {
  clientId: string
  userEmail?: string
}

export class ProductionPlaceService {
  private context: ServiceContext

  constructor(context: ServiceContext) {
    this.context = context
  }

  async create(data: ProductionPlaceCreate) {
    const validated = productionPlaceCreateSchema.parse(data)

    const supplier = await prisma.supplier.findFirst({
      where: { id: validated.supplierId, clientId: this.context.clientId }
    })

    if (!supplier) {
      throw new Error('Supplier not found')
    }

    const place = await prisma.productionPlace.create({
      data: {
        ...validated,
        coordinates: validated.coordinates as any,
        validationStatus: ValidationStatus.PENDING
      },
      include: {
        supplier: {
          select: { id: true, name: true }
        }
      }
    })

    await createAuditLog(
      'PRODUCTION_PLACE_CREATED' as AuditAction,
      'ProductionPlace',
      place.id,
      this.context,
      { name: place.name, areaHectares: place.areaHectares }
    )

    return place
  }

  async findAll(options: {
    page?: number
    limit?: number
    supplierId?: string
    country?: string
  } = {}) {
    const { page = 1, limit = 20, supplierId, country } = options

    const where: Record<string, unknown> = {
      supplier: { clientId: this.context.clientId }
    }

    if (supplierId) where.supplierId = supplierId
    if (country) where.country = country

    const [places, total] = await Promise.all([
      prisma.productionPlace.findMany({
        where,
        skip: (page - 1) * limit,
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

    return { places, total }
  }

  async findById(id: string) {
    const place = await prisma.productionPlace.findFirst({
      where: {
        id,
        supplier: { clientId: this.context.clientId }
      },
      include: {
        supplier: {
          select: { id: true, name: true, commodity: true }
        }
      }
    })

    return place
  }

  async update(id: string, data: Partial<ProductionPlaceCreate>) {
    const place = await prisma.productionPlace.update({
      where: {
        id,
        supplier: { clientId: this.context.clientId }
      },
      data: {
        ...data,
        coordinates: data.coordinates as any
      },
      include: {
        supplier: {
          select: { id: true, name: true }
        }
      }
    })

    await createAuditLog(
      'PRODUCTION_PLACE_UPDATED' as AuditAction,
      'ProductionPlace',
      id,
      this.context,
      data
    )

    return place
  }

  async delete(id: string) {
    await prisma.productionPlace.delete({
      where: {
        id,
        supplier: { clientId: this.context.clientId }
      }
    })

    await createAuditLog(
      'PRODUCTION_PLACE_DELETED' as AuditAction,
      'ProductionPlace',
      id,
      this.context
    )
  }

  async getSummary() {
    const [byCountry, byCommodity, totalArea] = await Promise.all([
      prisma.productionPlace.groupBy({
        by: ['country'],
        where: { supplier: { clientId: this.context.clientId } },
        _count: true
      }),
      prisma.productionPlace.groupBy({
        by: ['supplierId'],
        where: { supplier: { clientId: this.context.clientId } },
        _sum: { areaHectares: true }
      }),
      prisma.productionPlace.aggregate({
        where: { supplier: { clientId: this.context.clientId } },
        _sum: { areaHectares: true }
      })
    ])

    return {
      byCountry: byCountry.map(item => ({ country: item.country, count: item._count })),
      totalSuppliersWithPlaces: byCommodity.length,
      totalArea: totalArea._sum.areaHectares || 0
    }
  }
}

export function createServiceContext(session: { sub: string; email?: string }): ServiceContext {
  return {
    clientId: session.sub,
    userEmail: session.email
  }
}
