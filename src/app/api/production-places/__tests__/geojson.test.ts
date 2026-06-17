/**
 * @jest-environment node
 */
import { GET } from '../geojson/route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockPrisma = prisma as unknown as {
  productionPlace: { findMany: jest.Mock }
}

beforeEach(() => jest.clearAllMocks())

describe('GET /api/production-places/geojson', () => {
  it('returns a FeatureCollection enriched with supplier and validation status', async () => {
    mockPrisma.productionPlace.findMany.mockResolvedValue([
      {
        id: 'p1', name: 'Plot A', areaHectares: 5, geometryType: 'POINT',
        validationStatus: 'VALID', coordinates: { type: 'Point', coordinates: [-60, -10] },
        supplier: { name: 'Farm A', commodity: 'COFFEE' }
      }
    ])

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.type).toBe('FeatureCollection')
    expect(json.features).toHaveLength(1)
    expect(json.features[0].geometry).toEqual({ type: 'Point', coordinates: [-60, -10] })
    expect(json.features[0].properties).toMatchObject({ name: 'Plot A', supplier: 'Farm A', validationStatus: 'VALID' })
  })

  it('skips places without stored coordinates', async () => {
    mockPrisma.productionPlace.findMany.mockResolvedValue([
      { id: 'p1', name: 'X', areaHectares: 1, geometryType: 'POINT', validationStatus: 'PENDING', coordinates: null, supplier: { name: 'S', commodity: 'COCOA' } }
    ])
    const res = await GET()
    const json = await res.json()
    expect(json.features).toHaveLength(0)
  })
})
