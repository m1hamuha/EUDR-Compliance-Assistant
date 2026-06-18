/**
 * @jest-environment node
 */
import { POST as createSupplier } from '../route'
import { POST as remindSupplier } from '../[id]/remind/route'
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
  client: { findUnique: jest.Mock }
  supplier: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock }
}

function jsonRequest(body: unknown): NextRequest {
  return new Request('http://localhost/api/suppliers', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }) as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.client.findUnique.mockResolvedValue({ id: 'client-1', companyName: 'Coffee Co', plan: 'PROFESSIONAL' })
  mockPrisma.supplier.count.mockResolvedValue(0)
  mockPrisma.supplier.create.mockImplementation(async ({ data }) => ({ id: 'sup-1', ...data }))
  mockPrisma.supplier.update.mockResolvedValue({})
})

describe('POST /api/suppliers (invitation)', () => {
  it('sends an invitation email and records timestamps when a contact email is given', async () => {
    const res = await createSupplier(jsonRequest({
      name: 'Farm A', country: 'br', commodity: 'COFFEE', contactEmail: 'farm@a.com'
    }))
    expect(res.status).toBe(201)
    expect(mockEmail).toHaveBeenCalledWith(expect.objectContaining({
      email: 'farm@a.com', supplierName: 'Farm A', companyName: 'Coffee Co'
    }))
    const createArg = mockPrisma.supplier.create.mock.calls[0][0]
    expect(createArg.data.invitationSentAt).toBeInstanceOf(Date)
    expect(createArg.data.invitationExpiresAt).toBeInstanceOf(Date)
  })

  it('does not send an email when no contact email is provided', async () => {
    const res = await createSupplier(jsonRequest({
      name: 'Farm B', country: 'BR', commodity: 'COCOA'
    }))
    expect(res.status).toBe(201)
    expect(mockEmail).not.toHaveBeenCalled()
  })

  it('still creates the supplier when the email send fails', async () => {
    mockEmail.mockRejectedValueOnce(new Error('smtp down'))
    const res = await createSupplier(jsonRequest({
      name: 'Farm C', country: 'BR', commodity: 'WOOD', contactEmail: 'farm@c.com'
    }))
    expect(res.status).toBe(201)
  })

  it('rejects creation with 403 when the plan supplier limit is reached', async () => {
    mockPrisma.client.findUnique.mockResolvedValue({ id: 'client-1', companyName: 'Coffee Co', plan: 'TRIAL' })
    mockPrisma.supplier.count.mockResolvedValue(3) // TRIAL cap is 3

    const res = await createSupplier(jsonRequest({
      name: 'Farm D', country: 'BR', commodity: 'COFFEE'
    }))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error.code).toBe('PLAN_LIMIT_REACHED')
  })
})

describe('POST /api/suppliers/[id]/remind', () => {
  const remindReq = () => new Request('http://localhost/api/suppliers/sup-1/remind', { method: 'POST' }) as unknown as NextRequest
  const params = Promise.resolve({ id: 'sup-1' })

  it('re-sends the invitation and refreshes timestamps', async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1', name: 'Farm A', invitationToken: 'tok', contactEmail: 'farm@a.com',
      client: { companyName: 'Coffee Co' }
    })

    const res = await remindSupplier(remindReq(), { params })
    expect(res.status).toBe(200)
    expect(mockEmail).toHaveBeenCalled()
    expect(mockPrisma.supplier.update).toHaveBeenCalled()
  })

  it('returns 404 for an unknown supplier', async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null)
    const res = await remindSupplier(remindReq(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 400 when the supplier has no contact email', async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue({
      id: 'sup-1', name: 'Farm A', invitationToken: 'tok', contactEmail: null,
      client: { companyName: 'Coffee Co' }
    })
    const res = await remindSupplier(remindReq(), { params })
    expect(res.status).toBe(400)
    expect(mockEmail).not.toHaveBeenCalled()
  })
})
