/**
 * @jest-environment node
 */
import { POST } from '../remind-bulk/route'
import { prisma } from '@/lib/prisma'
import { sendSupplierInvitation } from '@/lib/email'
import type { NextRequest } from 'next/server'

jest.mock('@/lib/email', () => ({
  sendSupplierInvitation: jest.fn().mockResolvedValue(undefined)
}))
jest.mock('@/lib/auth', () => ({
  requireSession: jest.fn().mockResolvedValue({ sub: 'client-1', email: 'c@co.com', plan: 'PROFESSIONAL' })
}))

const mockEmail = sendSupplierInvitation as jest.Mock
const mockPrisma = prisma as unknown as {
  supplier: { findMany: jest.Mock; update: jest.Mock }
}

function req(body: unknown): NextRequest {
  return new Request('http://localhost/api/suppliers/remind-bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }) as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.supplier.update.mockResolvedValue({})
})

describe('POST /api/suppliers/remind-bulk', () => {
  it('sends reminders to suppliers with an email and skips those without', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([
      { id: 'a', name: 'A', invitationToken: 't1', contactEmail: 'a@x.com', client: { companyName: 'Co' } },
      { id: 'b', name: 'B', invitationToken: 't2', contactEmail: null, client: { companyName: 'Co' } }
    ])

    const res = await POST(req({ supplierIds: ['a', 'b'] }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.sent).toBe(1)
    expect(json.skipped).toBe(1)
    expect(mockEmail).toHaveBeenCalledTimes(1)
    expect(mockPrisma.supplier.update).toHaveBeenCalledTimes(1)
  })

  it('counts failures without aborting the batch', async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([
      { id: 'a', name: 'A', invitationToken: 't1', contactEmail: 'a@x.com', client: { companyName: 'Co' } },
      { id: 'b', name: 'B', invitationToken: 't2', contactEmail: 'b@x.com', client: { companyName: 'Co' } }
    ])
    mockEmail.mockRejectedValueOnce(new Error('smtp')).mockResolvedValueOnce(undefined)

    const res = await POST(req({ supplierIds: ['a', 'b'] }))
    const json = await res.json()

    expect(json.sent).toBe(1)
    expect(json.failed).toBe(1)
  })

  it('rejects an empty supplierIds array', async () => {
    const res = await POST(req({ supplierIds: [] }))
    expect(res.status).toBe(400)
  })
})
