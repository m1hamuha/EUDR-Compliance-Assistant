/**
 * @jest-environment node
 */
import { GET, POST } from '../route'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockPrisma = prisma as unknown as {
  client: { findUnique: jest.Mock }
  supplier: { findMany: jest.Mock }
  dDSRecord: { findMany: jest.Mock; create: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.client.findUnique.mockResolvedValue({
    companyName: 'Acme GmbH',
    country: 'DE',
    email: 'ops@acme.test'
  })
})

describe('GET /api/dds/records', () => {
  it('lists the client records most recent first', async () => {
    mockPrisma.dDSRecord.findMany.mockResolvedValue([
      { id: 'r1', referenceNumber: 'EUDR-DDS-20260618-ABCDEF', conclusion: 'ready', negligibleRisk: true, riskIndex: 20, totalPlots: 1, totalAreaHectares: 2, commodities: ['COFFEE'], createdAt: new Date() }
    ])
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.records).toHaveLength(1)
    expect(mockPrisma.dDSRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-1' }, orderBy: { createdAt: 'desc' } })
    )
  })

  it('returns 500 when listing fails', async () => {
    mockPrisma.dDSRecord.findMany.mockRejectedValue(new Error('db down'))
    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('POST /api/dds/records', () => {
  it('records the current statement and returns 201', async () => {
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
    mockPrisma.dDSRecord.create.mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
      id: 'r1',
      referenceNumber: data.referenceNumber,
      conclusion: data.conclusion,
      negligibleRisk: data.negligibleRisk,
      riskIndex: data.riskIndex,
      totalPlots: data.totalPlots,
      totalAreaHectares: data.totalAreaHectares,
      commodities: data.commodities,
      createdAt: new Date()
    }))

    const res = await POST()
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.record.negligibleRisk).toBe(true)
    expect(json.record.totalPlots).toBe(1)
    const createArg = mockPrisma.dDSRecord.create.mock.calls[0][0]
    expect(createArg.data.clientId).toBe('client-1')
    expect(createArg.data.commodities).toEqual(['COFFEE'])
    expect(createArg.data.snapshot).toMatchObject({ referenceNumber: expect.any(String) })
  })

  it('returns 400 when there is nothing to record', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([])
    const res = await POST()
    expect(res.status).toBe(400)
    expect(mockPrisma.dDSRecord.create).not.toHaveBeenCalled()
  })

  it('returns 404 when the client is missing', async () => {
    mockPrisma.client.findUnique.mockResolvedValue(null)
    mockPrisma.supplier.findMany.mockResolvedValue([])
    const res = await POST()
    expect(res.status).toBe(404)
  })
})
