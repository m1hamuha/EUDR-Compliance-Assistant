/**
 * @jest-environment node
 */
import { GET } from '../route'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockPrisma = prisma as unknown as {
  auditLog: { findMany: jest.Mock; count: jest.Mock }
}

const req = (qs = '') => new Request(`http://localhost/api/audit${qs}`) as unknown as NextRequest

beforeEach(() => jest.clearAllMocks())

describe('GET /api/audit', () => {
  it('returns the client-scoped audit log with pagination', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([
      { id: 'a1', action: 'SUPPLIER_CREATE', resourceType: 'Supplier', createdAt: new Date() }
    ])
    mockPrisma.auditLog.count.mockResolvedValue(1)

    const res = await GET(req('?limit=50'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.logs).toHaveLength(1)
    expect(json.pagination.total).toBe(1)
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientId: 'client-1' }) })
    )
  })
})
