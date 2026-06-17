import { buildAnalytics, shouldCreateSnapshot, type AnalyticsSupplier, type AnalyticsPlace } from '../analytics'
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

  describe('momentum (period-over-period velocity)', () => {
    const suppliers: AnalyticsSupplier[] = [
      supplier({ id: 's1', status: 'COMPLETED', completedAt: ago(2), createdAt: ago(2) }),
      supplier({ id: 's2', status: 'VALIDATED', completedAt: ago(4), createdAt: ago(3) }),
      supplier({ id: 's3', status: 'COMPLETED', completedAt: ago(10), createdAt: ago(20) })
    ]
    const r = buildAnalytics(suppliers, [], { now: NOW, periodDays: 7 })

    it('counts completions in the current vs previous window', () => {
      expect(r.momentum.completedThisPeriod).toBe(2) // s1, s2 within last 7d
      expect(r.momentum.completedPrevPeriod).toBe(1) // s3 within prior 7d
      expect(r.momentum.completedDeltaPct).toBe(100) // (2-1)/1
    })

    it('counts new suppliers in the current window', () => {
      expect(r.momentum.newThisPeriod).toBe(2) // s1, s2 created in last 7d
    })

    it('reports null delta when there is no prior baseline', () => {
      const fresh = buildAnalytics(
        [supplier({ status: 'COMPLETED', completedAt: ago(1), createdAt: ago(1) })],
        [],
        { now: NOW, periodDays: 7 }
      )
      expect(fresh.momentum.completedPrevPeriod).toBe(0)
      expect(fresh.momentum.completedDeltaPct).toBe(100)
    })
  })

  describe('shouldCreateSnapshot', () => {
    it('creates one when there is no prior snapshot', () => {
      expect(shouldCreateSnapshot(null, NOW)).toBe(true)
    })
    it('skips when the latest snapshot is from the same day', () => {
      expect(shouldCreateSnapshot(new Date('2026-06-17T01:00:00Z'), NOW)).toBe(false)
    })
    it('creates one when the latest snapshot is from a previous day', () => {
      expect(shouldCreateSnapshot(new Date('2026-06-16T23:00:00Z'), NOW)).toBe(true)
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
