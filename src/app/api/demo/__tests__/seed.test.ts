/**
 * @jest-environment node
 */
import { POST } from '../seed/route'
import { prisma } from '@/lib/prisma'
import { buildDemoSuppliers } from '@/lib/demo-data'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockPrisma = prisma as unknown as {
  supplier: { count: jest.Mock; create: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.supplier.create.mockResolvedValue({})
})

describe('POST /api/demo/seed', () => {
  it('seeds the full sample supply chain into an empty account', async () => {
    mockPrisma.supplier.count.mockResolvedValue(0)
    const res = await POST()
    const json = await res.json()

    const expected = buildDemoSuppliers()
    expect(res.status).toBe(200)
    expect(json.suppliersCreated).toBe(expected.length)
    expect(json.placesCreated).toBe(expected.reduce((n, s) => n + s.places.length, 0))
    expect(mockPrisma.supplier.create).toHaveBeenCalledTimes(expected.length)
  })

  it('refuses to seed when the account already has suppliers', async () => {
    mockPrisma.supplier.count.mockResolvedValue(3)
    const res = await POST()
    expect(res.status).toBe(409)
    expect(mockPrisma.supplier.create).not.toHaveBeenCalled()
  })
})

describe('buildDemoSuppliers', () => {
  it('produces a varied, demo-friendly supply chain', () => {
    const demo = buildDemoSuppliers()
    expect(demo.length).toBeGreaterThanOrEqual(6)
    // Spans multiple statuses so the funnel and at-risk views populate.
    const statuses = new Set(demo.map((s) => s.status))
    expect(statuses.has('VALIDATED')).toBe(true)
    expect(statuses.has('INVITED')).toBe(true)
    // GeoJSON coordinates are [lng, lat] order.
    const withPlace = demo.find((s) => s.places.length > 0)!
    const geom = withPlace.places[0].coordinates as { coordinates: number[] | number[][][] }
    expect(geom).toBeTruthy()
  })
})
