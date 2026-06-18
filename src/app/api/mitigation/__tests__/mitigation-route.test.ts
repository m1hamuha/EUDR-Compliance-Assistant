/**
 * @jest-environment node
 */
import { GET } from '../route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockPrisma = prisma as unknown as {
  supplier: { findMany: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/mitigation', () => {
  it('returns a prioritized mitigation plan scoped to the client', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Farm A',
        country: 'BR',
        commodity: 'CATTLE',
        contactEmail: 'a@x.com',
        productionPlaces: [
          { id: 'p1', name: 'Plot 1', country: 'BR', areaHectares: 10, geometryType: 'POINT', validationStatus: 'INVALID' }
        ]
      }
    ])

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.plan.tasks.length).toBeGreaterThan(0)
    expect(json.plan.highCount).toBeGreaterThan(0)
    expect(json.plan.remindableSupplierIds).toContain('s1')
    expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-1' } })
    )
  })

  it('returns 500 when the query fails', async () => {
    mockPrisma.supplier.findMany.mockRejectedValue(new Error('db down'))
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
