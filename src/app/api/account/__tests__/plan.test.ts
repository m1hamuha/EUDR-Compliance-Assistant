/**
 * @jest-environment node
 */
import { POST as planPOST } from '../plan/route'
import { GET as usageGET } from '../usage/route'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'TRIAL' })
}))

const mockPrisma = prisma as unknown as {
  client: { findUnique: jest.Mock; update: jest.Mock }
  supplier: { count: jest.Mock }
  geoJSONExport: { count: jest.Mock }
  auditLog: { create: jest.Mock }
}

function req(body: unknown): NextRequest {
  return new Request('http://localhost/api/account/plan', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  }) as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.auditLog.create.mockResolvedValue({})
})

describe('POST /api/account/plan', () => {
  it('changes the plan and writes a PLAN_UPGRADE audit log', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ plan: 'TRIAL', email: 'c@co.com' })
    mockPrisma.client.update.mockResolvedValue({ id: 'client-1', plan: 'PROFESSIONAL' })

    const res = await planPOST(req({ plan: 'PROFESSIONAL' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.plan).toBe('PROFESSIONAL')
    expect(json.previousPlan).toBe('TRIAL')
    expect(mockPrisma.auditLog.create).toHaveBeenCalled()
  })

  it('rejects an invalid plan', async () => {
    const res = await planPOST(req({ plan: 'GOLD' }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/account/usage', () => {
  it('reports usage and remaining allowance for the plan', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ plan: 'TRIAL' })
    mockPrisma.supplier.count.mockResolvedValue(2)
    mockPrisma.geoJSONExport.count.mockResolvedValue(1)

    const res = await usageGET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.plan).toBe('TRIAL')
    expect(json.usage).toEqual({ suppliers: 2, exportsThisMonth: 1 })
    expect(json.remaining.suppliers).toBe(1) // 3 - 2
    expect(json.remaining.exports).toBe(2) // 3 - 1
  })
})
