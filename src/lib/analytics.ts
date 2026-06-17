import { differenceInDays, differenceInHours, startOfWeek, subWeeks } from 'date-fns'
import type { SupplierStatus, Commodity, ValidationStatus } from '@prisma/client'

export interface AnalyticsSupplier {
  id: string
  name: string
  status: SupplierStatus
  commodity: Commodity
  country: string
  contactEmail: string | null
  invitationSentAt: Date | null
  completedAt: Date | null
  createdAt: Date
}

export interface AnalyticsPlace {
  validationStatus: ValidationStatus
}

export interface AtRiskSupplier {
  id: string
  name: string
  country: string
  commodity: Commodity
  daysWaiting: number
  hasEmail: boolean
}

export interface AnalyticsResult {
  totalSuppliers: number
  totalPlaces: number
  /** Single north-star metric (0-100): supply-chain readiness for EUDR filing. */
  complianceScore: number
  funnel: {
    invited: number
    inProgress: number
    completed: number
    validated: number
    error: number
  }
  /** % of suppliers that engaged (moved beyond INVITED). */
  responseRate: number
  /** % of suppliers that finished data collection (COMPLETED or VALIDATED). */
  completionRate: number
  /** % of production places that passed EUDR validation. */
  validationPassRate: number
  /** Mean days from invitation to completion across completed suppliers. */
  avgTimeToCompleteDays: number | null
  byCommodity: Array<{ commodity: Commodity; count: number }>
  coverageByCountry: Array<{ country: string; count: number }>
  /** Suppliers invited but stalled — the lever to lift completion via reminders. */
  atRisk: AtRiskSupplier[]
  /** Completed suppliers per ISO week for the trailing `weeks` window. */
  weeklyCompletions: Array<{ weekStart: string; count: number }>
}

const COMPLETED_STATUSES: SupplierStatus[] = ['COMPLETED', 'VALIDATED']
const SCORE_COMPLETION_WEIGHT = 0.6
const SCORE_VALIDATION_WEIGHT = 0.4

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

export function buildAnalytics(
  suppliers: AnalyticsSupplier[],
  places: AnalyticsPlace[],
  options: { now?: Date; atRiskAfterDays?: number; weeks?: number } = {}
): AnalyticsResult {
  const now = options.now ?? new Date()
  const atRiskAfterDays = options.atRiskAfterDays ?? 5
  const weeks = options.weeks ?? 8

  const totalSuppliers = suppliers.length
  const totalPlaces = places.length

  const funnel = {
    invited: 0,
    inProgress: 0,
    completed: 0,
    validated: 0,
    error: 0
  }
  for (const s of suppliers) {
    if (s.status === 'INVITED') funnel.invited++
    else if (s.status === 'IN_PROGRESS') funnel.inProgress++
    else if (s.status === 'COMPLETED') funnel.completed++
    else if (s.status === 'VALIDATED') funnel.validated++
    else if (s.status === 'ERROR') funnel.error++
  }

  const engaged = suppliers.filter((s) => s.status !== 'INVITED').length
  const completed = suppliers.filter((s) => COMPLETED_STATUSES.includes(s.status)).length
  const validPlaces = places.filter((p) => p.validationStatus === 'VALID').length

  const responseRate = pct(engaged, totalSuppliers)
  const completionRate = pct(completed, totalSuppliers)
  const validationPassRate = pct(validPlaces, totalPlaces)

  const complianceScore = Math.round(
    SCORE_COMPLETION_WEIGHT * completionRate + SCORE_VALIDATION_WEIGHT * validationPassRate
  )

  // Average time-to-compliance across suppliers that completed and have a
  // recorded invitation timestamp.
  const completionDurations = suppliers
    .filter((s) => s.completedAt && s.invitationSentAt)
    .map((s) => differenceInHours(s.completedAt as Date, s.invitationSentAt as Date) / 24)
    .filter((d) => d >= 0)
  const avgTimeToCompleteDays =
    completionDurations.length > 0
      ? Math.round((completionDurations.reduce((a, b) => a + b, 0) / completionDurations.length) * 10) / 10
      : null

  const byCommodity = aggregateCounts(suppliers.map((s) => s.commodity)).map(([commodity, count]) => ({
    commodity: commodity as Commodity,
    count
  }))

  const coverageByCountry = aggregateCounts(suppliers.map((s) => s.country)).map(([country, count]) => ({
    country,
    count
  }))

  const atRisk: AtRiskSupplier[] = suppliers
    .filter((s) => s.status === 'INVITED' && !s.completedAt)
    .map((s) => {
      const since = s.invitationSentAt ?? s.createdAt
      return {
        id: s.id,
        name: s.name,
        country: s.country,
        commodity: s.commodity,
        daysWaiting: Math.max(0, differenceInDays(now, since)),
        hasEmail: Boolean(s.contactEmail)
      }
    })
    .filter((s) => s.daysWaiting >= atRiskAfterDays)
    .sort((a, b) => b.daysWaiting - a.daysWaiting)

  const weeklyCompletions = buildWeeklyCompletions(suppliers, now, weeks)

  return {
    totalSuppliers,
    totalPlaces,
    complianceScore,
    funnel,
    responseRate,
    completionRate,
    validationPassRate,
    avgTimeToCompleteDays,
    byCommodity,
    coverageByCountry,
    atRisk,
    weeklyCompletions
  }
}

function aggregateCounts(values: string[]): Array<[string, number]> {
  const map = new Map<string, number>()
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1)
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
}

function buildWeeklyCompletions(
  suppliers: AnalyticsSupplier[],
  now: Date,
  weeks: number
): Array<{ weekStart: string; count: number }> {
  const buckets: Array<{ weekStart: string; start: Date; count: number }> = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 })
    buckets.push({ weekStart: start.toISOString().slice(0, 10), start, count: 0 })
  }

  for (const s of suppliers) {
    if (!s.completedAt) continue
    const completedWeek = startOfWeek(s.completedAt, { weekStartsOn: 1 }).getTime()
    const bucket = buckets.find((b) => b.start.getTime() === completedWeek)
    if (bucket) bucket.count++
  }

  return buckets.map(({ weekStart, count }) => ({ weekStart, count }))
}
