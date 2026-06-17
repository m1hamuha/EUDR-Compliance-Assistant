/**
 * @jest-environment node
 */
import { GET } from '../export/route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockPrisma = prisma as unknown as {
  client: { findUnique: jest.Mock }
  supplier: { findMany: jest.Mock }
  geoJSONExport: { findMany: jest.Mock }
  auditLog: { findMany: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/account/export', () => {
  it('returns a JSON attachment with the account data and counts', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: 'client-1', companyName: 'Co', email: 'c@co.com', country: 'DE', plan: 'TRIAL', createdAt: new Date() })
    mockPrisma.supplier.findMany.mockResolvedValue([
      { id: 's1', name: 'A', productionPlaces: [{ id: 'p1' }, { id: 'p2' }] }
    ])
    mockPrisma.geoJSONExport.findMany.mockResolvedValue([{ id: 'e1' }])
    mockPrisma.auditLog.findMany.mockResolvedValue([{ id: 'a1' }])

    const res = await GET()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/json')
    expect(res.headers.get('content-disposition')).toContain('attachment')

    const body = JSON.parse(await res.text())
    expect(body.account.id).toBe('client-1')
    expect(body.counts).toEqual({ suppliers: 1, productionPlaces: 2, exports: 1, auditLogEntries: 1 })
    expect(body.suppliers).toHaveLength(1)
  })

  it('returns 404 when the account is missing', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null)
    mockPrisma.supplier.findMany.mockResolvedValue([])
    mockPrisma.geoJSONExport.findMany.mockResolvedValue([])
    mockPrisma.auditLog.findMany.mockResolvedValue([])

    const res = await GET()
    expect(res.status).toBe(404)
  })
})
