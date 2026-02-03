import prisma from './prisma'

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

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId,
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        metadata: entry.metadata || {},
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function getAuditLogs(
  userId: string,
  options: {
    action?: AuditAction
    resourceType?: string
    startDate?: Date
    endDate?: Date
    limit?: number
    offset?: number
  } = {}
) {
  const where: Record<string, unknown> = { userId }

  if (options.action) where.action = options.action
  if (options.resourceType) where.resourceType = options.resourceType
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

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  USER_LOGIN: 'User logged in',
  USER_LOGOUT: 'User logged out',
  USER_REGISTER: 'User registered',
  SUPPLIER_CREATE: 'Supplier created',
  SUPPLIER_UPDATE: 'Supplier updated',
  SUPPLIER_DELETE: 'Supplier deleted',
  SUPPLIER_INVITE: 'Supplier invitation sent',
  PRODUCTION_PLACE_CREATE: 'Production place created',
  PRODUCTION_PLACE_UPDATE: 'Production place updated',
  PRODUCTION_PLACE_DELETE: 'Production place deleted',
  EXPORT_GENERATE: 'Export generated',
  EXPORT_DOWNLOAD: 'Export downloaded',
  SETTINGS_UPDATE: 'Settings updated',
  PASSWORD_CHANGE: 'Password changed',
  PLAN_UPGRADE: 'Plan upgraded'
}

export default { createAuditLog, getAuditLogs, AUDIT_ACTION_LABELS }