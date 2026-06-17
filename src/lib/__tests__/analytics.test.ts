import { buildAnalytics, type AnalyticsSupplier, type AnalyticsPlace } from '../analytics'
import type { SupplierStatus, Commodity } from '@prisma/client'

const NOW = new Date('2026-06-17T12:00:00Z')
const day = 24 * 60 * 60 * 1000
const ago = (days: number) => new Date(NOW.getTime() - days * day)

function supplier(overrides: Partial<AnalyticsSupplier>): AnalyticsSupplier {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Supplier',
    status: 'INVITED' as SupplierStatus,
    commodity: 'COFFEE' as Commodity,
    country: 'BR',
    contactEmail: 'x@y.com',
    invitationSentAt: ago(1),
    completedAt: null,
    createdAt: ago(1),
    ...overrides
  }
}

describe('buildAnalytics', () => {
  it('handles an empty dataset without dividing by zero', () => {
    const r = buildAnalytics([], [], { now: NOW })
    expect(r.totalSuppliers).toBe(0)
    expect(r.complianceScore).toBe(0)
    expect(r.responseRate).toBe(0)
    expect(r.completionRate).toBe(0)
    expect(r.validationPassRate).toBe(0)
    expect(r.avgTimeToCompleteDays).toBeNull()
    expect(r.atRisk).toEqual([])
    expect(r.weeklyCompletions).toHaveLength(8)
  })

  describe('with a mixed supply chain', () => {
    const suppliers: AnalyticsSupplier[] = [
      supplier({ id: 'A', status: 'VALIDATED', commodity: 'COFFEE', country: 'BR', invitationSentAt: ago(10), completedAt: ago(7) }),
      supplier({ id: 'B', status: 'COMPLETED', commodity: 'COCOA', country: 'BR', invitationSentAt: ago(20), completedAt: ago(15) }),
      supplier({ id: 'C', status: 'INVITED', commodity: 'WOOD', country: 'ET', invitationSentAt: ago(10), contactEmail: 'c@x.com' }),
      supplier({ id: 'D', status: 'INVITED', commodity: 'COFFEE', country: 'CO', invitationSentAt: ago(1), contactEmail: null }),
      supplier({ id: 'E', status: 'IN_PROGRESS', commodity: 'COFFEE', country: 'BR', invitationSentAt: ago(3) })
    ]
    const places: AnalyticsPlace[] = [
      { validationStatus: 'VALID' },
      { validationStatus: 'VALID' },
      { validationStatus: 'INVALID' }
    ]
    const r = buildAnalytics(suppliers, places, { now: NOW })

    it('computes the funnel', () => {
      expect(r.funnel).toEqual({ invited: 2, inProgress: 1, completed: 1, validated: 1, error: 0 })
    })

    it('computes response and completion rates', () => {
      expect(r.responseRate).toBe(60) // A,B,E engaged of 5
      expect(r.completionRate).toBe(40) // A,B completed of 5
    })

    it('computes the validation pass rate', () => {
      expect(r.validationPassRate).toBeCloseTo(66.7, 1)
    })

    it('computes the weighted compliance score', () => {
      // round(0.6*40 + 0.4*66.7) = round(50.68) = 51
      expect(r.complianceScore).toBe(51)
    })

    it('computes average time-to-compliance in days', () => {
      // A: 3 days, B: 5 days -> 4.0
      expect(r.avgTimeToCompleteDays).toBe(4)
    })

    it('flags only stalled invitations past the threshold', () => {
      expect(r.atRisk.map((s) => s.id)).toEqual(['C']) // D is only 1 day old
      expect(r.atRisk[0].daysWaiting).toBe(10)
      expect(r.atRisk[0].hasEmail).toBe(true)
    })

    it('breaks down by commodity and country', () => {
      expect(r.byCommodity.find((c) => c.commodity === 'COFFEE')?.count).toBe(3)
      expect(r.coverageByCountry.find((c) => c.country === 'BR')?.count).toBe(3)
    })

    it('buckets completions into trailing weeks', () => {
      const total = r.weeklyCompletions.reduce((a, b) => a + b.count, 0)
      expect(total).toBe(2) // A (7d ago) and B (15d ago) both within 8 weeks
      expect(r.weeklyCompletions).toHaveLength(8)
    })
  })

  it('ignores negative durations from clock skew', () => {
    const r = buildAnalytics(
      [supplier({ id: 'X', status: 'COMPLETED', invitationSentAt: ago(1), completedAt: ago(5) })],
      [],
      { now: NOW }
    )
    // completedAt before invitationSentAt -> excluded -> no valid durations
    expect(r.avgTimeToCompleteDays).toBeNull()
  })
})
