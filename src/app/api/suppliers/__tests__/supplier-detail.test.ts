/**
 * @jest-environment node
 */
import { GET } from '../[id]/route'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockPrisma = prisma as unknown as {
  supplier: { findFirst: jest.Mock }
}

const req = () => new Request('http://localhost/api/suppliers/s1') as unknown as NextRequest

beforeEach(() => jest.clearAllMocks())

describe('GET /api/suppliers/[id]', () => {
  it('returns the supplier with its production places', async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue({
      id: 's1', name: 'A', productionPlaces: [{ id: 'p1', validationStatus: 'VALID' }]
    })
    const res = await GET(req(), { params: Promise.resolve({ id: 's1' }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.supplier.id).toBe('s1')
    expect(json.supplier.productionPlaces).toHaveLength(1)
    // scoped to the authenticated client
    expect(mockPrisma.supplier.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1', clientId: 'client-1' } })
    )
  })

  it('returns 404 when the supplier is not owned/found', async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null)
    const res = await GET(req(), { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})
