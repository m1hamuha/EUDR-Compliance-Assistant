import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { supplierCreateSchema, supplierUpdateSchema } from '@/schemas'
import { SupplierStatus } from '@prisma/client'
import type { SupplierCreate, SupplierUpdate } from '@/schemas'

export interface ServiceContext {
  clientId: string
  userEmail?: string
}

export class SupplierService {
  private context: ServiceContext

  constructor(context: ServiceContext) {
    this.context = context
  }

  async create(data: SupplierCreate) {
    const validated = supplierCreateSchema.parse(data)

    const token = randomBytes(32).toString('hex')

    const supplier = await prisma.supplier.create({
      data: {
        ...validated,
        clientId: this.context.clientId,
        status: SupplierStatus.INVITED,
        invitationToken: token,
        invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    await createAuditLog(
      'SUPPLIER_CREATE' as AuditAction,
      'Supplier',
      supplier.id,
      this.context,
      { name: supplier.name, commodity: supplier.commodity }
    )

    return supplier
  }

  async findAll(options: {
    page?: number
    limit?: number
    status?: SupplierStatus
    commodity?: string
  } = {}) {
    const { page = 1, limit = 20, status, commodity } = options

    const where: Record<string, unknown> = { clientId: this.context.clientId }
    if (status) where.status = status
    if (commodity) where.commodity = commodity

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
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

    return { suppliers, total }
  }

  async findById(id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, clientId: this.context.clientId }
    })

    return supplier
  }

  async update(id: string, data: SupplierUpdate) {
    const validated = supplierUpdateSchema.parse(data)

    const supplier = await prisma.supplier.update({
      where: { id, clientId: this.context.clientId },
      data: validated
    })

    await createAuditLog(
      'SUPPLIER_UPDATE' as AuditAction,
      'Supplier',
      id,
      this.context,
      validated
    )

    return supplier
  }

  async delete(id: string) {
    await prisma.supplier.delete({
      where: { id, clientId: this.context.clientId }
    })

    await createAuditLog(
      'SUPPLIER_DELETE' as AuditAction,
      'Supplier',
      id,
      this.context
    )
  }

  async getInvitationToken(id: string) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, clientId: this.context.clientId },
      select: { invitationToken: true, invitationExpiresAt: true }
    })

    return supplier
  }
}

export function createServiceContext(session: { sub: string; email?: string }): ServiceContext {
  return {
    clientId: session.sub,
    userEmail: session.email
  }
}
