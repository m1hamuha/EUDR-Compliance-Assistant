/**
 * @jest-environment node
 */
import { POST as submitPOST } from '../submit/route'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

const mockPrisma = prisma as unknown as {
  supplier: { findUnique: jest.Mock; update: jest.Mock }
  productionPlace: { create: jest.Mock }
}

function jsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/portal/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }) as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.supplier.findUnique.mockResolvedValue({ id: 's1', status: 'INVITED' })
  mockPrisma.supplier.update.mockResolvedValue({})
  mockPrisma.productionPlace.create.mockImplementation(async ({ data }) => ({ id: 'p1', ...data }))
})

describe('POST /api/portal/submit', () => {
  it('stores a compliant point submission as VALID', async () => {
    const res = await submitPOST(jsonRequest({
      supplierId: 's1',
      name: 'Plot A',
      areaHectares: 2,
      country: 'BR',
      coordinates: [-60.123456, -10.654321]
    }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.validation.valid).toBe(true)
    expect(mockPrisma.productionPlace.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ validationStatus: 'VALID' }) })
    )
    expect(mockPrisma.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'IN_PROGRESS' } })
    )
  })

  it('closes an open polygon ring and stores it as VALID', async () => {
    // An open 4-vertex ring as emitted by the map drawer (first !== last).
    const res = await submitPOST(jsonRequest({
      supplierId: 's1',
      name: 'Plot B',
      areaHectares: 12,
      country: 'BR',
      coordinates: [
        [-60.123456, -10.123456],
        [-60.654321, -10.123456],
        [-60.654321, -10.654321],
        [-60.123456, -10.654321]
      ]
    }))
    const json = await res.json()

    expect(json.validation.valid).toBe(true)
    const createArg = mockPrisma.productionPlace.create.mock.calls[0][0]
    const ring = createArg.data.coordinates.coordinates[0]
    expect(ring[0]).toEqual(ring[ring.length - 1]) // ring closed
    expect(createArg.data.validationStatus).toBe('VALID')
  })

  it('flags an out-of-bounds coordinate as INVALID and records errors', async () => {
    const res = await submitPOST(jsonRequest({
      supplierId: 's1',
      name: 'Bad Plot',
      areaHectares: 2,
      country: 'BR',
      coordinates: [-60.123456, 95.123456] // latitude out of range
    }))
    const json = await res.json()

    expect(json.validation.valid).toBe(false)
    const createArg = mockPrisma.productionPlace.create.mock.calls[0][0]
    expect(createArg.data.validationStatus).toBe('INVALID')
    expect(createArg.data.validationErrors.errors.length).toBeGreaterThan(0)
  })

  it('returns 404 when the supplier does not exist', async () => {
    mockPrisma.supplier.findUnique.mockResolvedValue(null)
    const res = await submitPOST(jsonRequest({
      supplierId: 'missing',
      name: 'Plot',
      areaHectares: 2,
      country: 'BR',
      coordinates: [-60.123456, -10.654321]
    }))
    expect(res.status).toBe(404)
  })

  it('returns 400 for malformed input', async () => {
    const res = await submitPOST(jsonRequest({ supplierId: 's1', name: 'X' }))
    expect(res.status).toBe(400)
  })
})
