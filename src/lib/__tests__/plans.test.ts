import {
  PLANS,
  PLAN_ORDER,
  getPlan,
  suppliersRemaining,
  canAddSuppliers,
  exportsRemaining,
  canExport
} from '../plans'

describe('plans', () => {
  it('defines all four subscription tiers in order', () => {
    expect(PLAN_ORDER).toEqual(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
    for (const p of PLAN_ORDER) expect(PLANS[p]).toBeDefined()
  })

  it('getPlan falls back to TRIAL for unknown plans', () => {
    expect(getPlan('NOPE' as never).plan).toBe('TRIAL')
  })

  describe('supplier limits', () => {
    it('enforces the TRIAL cap of 3', () => {
      expect(canAddSuppliers('TRIAL', 2)).toBe(true)
      expect(canAddSuppliers('TRIAL', 3)).toBe(false)
      expect(suppliersRemaining('TRIAL', 1)).toBe(2)
      expect(suppliersRemaining('TRIAL', 5)).toBe(0)
    })

    it('checks batched additions', () => {
      expect(canAddSuppliers('STARTER', 23, 2)).toBe(true)
      expect(canAddSuppliers('STARTER', 24, 2)).toBe(false)
    })

    it('treats ENTERPRISE as unlimited', () => {
      expect(canAddSuppliers('ENTERPRISE', 10_000)).toBe(true)
      expect(suppliersRemaining('ENTERPRISE', 10_000)).toBeNull()
    })
  })

  describe('export limits', () => {
    it('enforces the TRIAL monthly export cap', () => {
      expect(canExport('TRIAL', 2)).toBe(true)
      expect(canExport('TRIAL', 3)).toBe(false)
      expect(exportsRemaining('TRIAL', 1)).toBe(2)
    })

    it('treats PROFESSIONAL exports as unlimited', () => {
      expect(canExport('PROFESSIONAL', 9999)).toBe(true)
      expect(exportsRemaining('PROFESSIONAL', 9999)).toBeNull()
    })
  })
})
