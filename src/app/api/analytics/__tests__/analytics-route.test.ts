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
  productionPlace: { findMany: jest.Mock }
  complianceSnapshot: { findFirst: jest.Mock; findMany: jest.Mock; create: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.complianceSnapshot.findFirst.mockResolvedValue(null)
  mockPrisma.complianceSnapshot.create.mockResolvedValue({})
  mockPrisma.complianceSnapshot.findMany.mockResolvedValue([])
})

describe('GET /api/analytics', () => {
  it('returns a computed analytics payload scoped to the client', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([
      { id: 'A', name: 'A', status: 'VALIDATED', commodity: 'COFFEE', country: 'BR', contactEmail: 'a@x.com', invitationSentAt: new Date(), completedAt: new Date(), createdAt: new Date() }
    ])
    mockPrisma.productionPlace.findMany.mockResolvedValue([{ validationStatus: 'VALID' }])

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.analytics.totalSuppliers).toBe(1)
    expect(json.analytics.funnel.validated).toBe(1)
    expect(json.analytics.validationPassRate).toBe(100)
    expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-1' } })
    )
  })

  it('returns 500 when the query fails', async () => {
    mockPrisma.supplier.findMany.mockRejectedValue(new Error('db down'))
    mockPrisma.productionPlace.findMany.mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(500)
  })
})
