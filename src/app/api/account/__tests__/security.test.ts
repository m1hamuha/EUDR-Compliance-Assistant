/**
 * @jest-environment node
 */
import { POST as passwordPOST } from '../password/route'
import { DELETE as accountDELETE } from '../route'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import type { NextRequest } from 'next/server'

const cookieStore = { get: jest.fn(() => ({ value: 'tok' })), set: jest.fn(), delete: jest.fn() }
jest.mock('next/headers', () => ({ cookies: jest.fn(async () => cookieStore) }))

const mockPrisma = prisma as unknown as {
  client: { findUnique: jest.Mock; update: jest.Mock; delete: jest.Mock }
  refreshToken: { deleteMany: jest.Mock }
  auditLog: { create: jest.Mock }
}
const mockCompare = bcrypt.compare as unknown as jest.Mock

function pwReq(body: unknown): NextRequest {
  return new Request('http://localhost/api/account/password', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  }) as unknown as NextRequest
}

beforeEach(() => {
  jest.clearAllMocks()
  mockCompare.mockResolvedValue(true)
  mockPrisma.client.findUnique.mockResolvedValue({ id: 'test-user', email: 't@e.com', passwordHash: 'hash' })
  mockPrisma.client.update.mockResolvedValue({})
  mockPrisma.client.delete.mockResolvedValue({})
  mockPrisma.refreshToken.deleteMany.mockResolvedValue({})
  mockPrisma.auditLog.create.mockResolvedValue({})
})

describe('POST /api/account/password', () => {
  it('changes the password, revokes tokens, and audits', async () => {
    const res = await passwordPOST(pwReq({ currentPassword: 'oldpass', newPassword: 'NewSecureP@ss1' }))
    expect(res.status).toBe(200)
    expect(mockPrisma.client.update).toHaveBeenCalled()
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { clientId: 'test-user' } })
    expect(mockPrisma.auditLog.create).toHaveBeenCalled()
  })

  it('rejects an incorrect current password', async () => {
    mockCompare.mockResolvedValueOnce(false)
    const res = await passwordPOST(pwReq({ currentPassword: 'wrong', newPassword: 'NewSecureP@ss1' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error.code).toBe('INVALID_CURRENT_PASSWORD')
    expect(mockPrisma.client.update).not.toHaveBeenCalled()
  })

  it('rejects a new password that fails the policy', async () => {
    const res = await passwordPOST(pwReq({ currentPassword: 'oldpass', newPassword: 'alllowercaseX' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error.code).toBe('WEAK_PASSWORD')
  })
})

describe('DELETE /api/account', () => {
  it('deletes the account, revokes tokens, and clears cookies', async () => {
    const res = await accountDELETE()
    expect(res.status).toBe(200)
    expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { clientId: 'test-user' } })
    expect(mockPrisma.client.delete).toHaveBeenCalledWith({ where: { id: 'test-user' } })
    expect(cookieStore.delete).toHaveBeenCalledWith('auth-token')
    expect(cookieStore.delete).toHaveBeenCalledWith('refresh-token')
  })
})
