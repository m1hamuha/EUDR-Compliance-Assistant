import { prisma } from './prisma'
import { v4 as uuidv4 } from 'uuid'

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_REGISTER'
  | 'SUPPLIER_CREATE'
  | 'SUPPLIER_UPDATE'
  | 'SUPPLIER_DELETE'
  | 'SUPPLIER_INVITE'
  | 'PRODUCTION_PLACE_CREATE'
  | 'PRODUCTION_PLACE_UPDATE'
  | 'PRODUCTION_PLACE_DELETE'
  | 'EXPORT_GENERATE'
  | 'EXPORT_DOWNLOAD'
  | 'SETTINGS_UPDATE'
  | 'PASSWORD_CHANGE'
  | 'PLAN_UPGRADE'

export interface AuditContext {
  clientId: string
  userEmail?: string
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(
  action: AuditAction,
  entityType: string,
  entityId: string,
  context: AuditContext,
  metadata?: Record<string, unknown>
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      id: uuidv4(),
      action,
      resourceType: entityType,
      resourceId: entityId,
      clientId: context.clientId,
      userEmail: context.userEmail,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      createdAt: new Date()
    }
  })
}

export async function getAuditLogs(
  clientId: string,
  options: {
    entityType?: string
    entityId?: string
    action?: AuditAction
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  } = {}
) {
  const where: Record<string, unknown> = { clientId }

  if (options.entityType) where.resourceType = options.entityType
  if (options.entityId) where.resourceId = options.entityId
  if (options.action) where.action = options.action

  if (options.startDate || options.endDate) {
    where.createdAt = {}
    if (options.startDate) (where.createdAt as Record<string, Date>).gte = options.startDate
    if (options.endDate) (where.createdAt as Record<string, Date>).lte = options.endDate
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 50,
      skip: options.offset || 0
    }),
    prisma.auditLog.count({ where })
  ])

  return { logs, total }
}

export function generateAuditLogForExport(
  places: Array<{
    id: string
    name: string
    areaHectares: number
    geometryType: string
    country: string
    createdAt: Date
    updatedAt: Date
    supplier: { id: string; name: string }
  }>
) {
  return {
    generatedAt: new Date().toISOString(),
    totalPlaces: places.length,
    entries: places.map(place => ({
      id: place.id,
      name: place.name,
      supplierId: place.supplier.id,
      supplierName: place.supplier.name,
      areaHectares: place.areaHectares,
      geometryType: place.geometryType,
      country: place.country,
      createdAt: place.createdAt,
      updatedAt: place.updatedAt
    }))
  }
}
