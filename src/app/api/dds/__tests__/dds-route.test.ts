/**
 * @jest-environment node
 */
import { GET } from '../route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockPrisma = prisma as unknown as {
  client: { findUnique: jest.Mock }
  supplier: { findMany: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.client.findUnique.mockResolvedValue({
    companyName: 'Acme GmbH',
    country: 'DE',
    email: 'ops@acme.test'
  })
})

describe('GET /api/dds', () => {
  it('returns a fileable statement for a negligible-risk portfolio', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([
      {
        id: 's1',
        name: 'Farm A',
        country: 'DE',
        commodity: 'COFFEE',
        productionPlaces: [
          { id: 'p1', name: 'Plot 1', country: 'DE', areaHectares: 2, geometryType: 'POLYGON', validationStatus: 'VALID' }
        ]
      }
    ])

    const res = await GET(new Request('http://localhost/api/dds'))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.dds.negligibleRisk).toBe(true)
    expect(json.dds.referenceNumber).toMatch(/^EUDR-DDS-\d{8}-[0-9A-Z]{6}$/)
    expect(json.dds.totalPlots).toBe(1)
    expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-1' } })
    )
  })

  it('returns a downloadable attachment when ?download=1', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([])
    const res = await GET(new Request('http://localhost/api/dds?download=1'))
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="EUDR-DDS-')
    expect(res.headers.get('Content-Type')).toBe('application/json')
  })

  it('returns 404 when the client is missing', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null)
    mockPrisma.supplier.findMany.mockResolvedValue([])
    const res = await GET(new Request('http://localhost/api/dds'))
    expect(res.status).toBe(404)
  })

  it('returns 500 when the query fails', async () => {
    mockPrisma.supplier.findMany.mockRejectedValue(new Error('db down'))
    const res = await GET(new Request('http://localhost/api/dds'))
    expect(res.status).toBe(500)
  })
})
