import type { SubscriptionPlan } from '@prisma/client'

export interface PlanDefinition {
  plan: SubscriptionPlan
  name: string
  priceMonthly: number
  /** null means unlimited. */
  maxSuppliers: number | null
  /** null means unlimited. */
  maxExportsPerMonth: number | null
  highlight?: boolean
  features: string[]
}

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  TRIAL: {
    plan: 'TRIAL',
    name: 'Trial',
    priceMonthly: 0,
    maxSuppliers: 3,
    maxExportsPerMonth: 3,
    features: ['Up to 3 suppliers', 'EUDR validation', 'GeoJSON exports', 'Compliance analytics']
  },
  STARTER: {
    plan: 'STARTER',
    name: 'Starter',
    priceMonthly: 49,
    maxSuppliers: 25,
    maxExportsPerMonth: 25,
    features: ['Up to 25 suppliers', 'CSV bulk import', 'Bulk reminders', 'Email support']
  },
  PROFESSIONAL: {
    plan: 'PROFESSIONAL',
    name: 'Professional',
    priceMonthly: 199,
    maxSuppliers: 200,
    maxExportsPerMonth: null,
    highlight: true,
    features: ['Up to 200 suppliers', 'Unlimited exports', 'Supply-chain map', 'Priority support']
  },
  ENTERPRISE: {
    plan: 'ENTERPRISE',
    name: 'Enterprise',
    priceMonthly: 0,
    maxSuppliers: null,
    maxExportsPerMonth: null,
    features: ['Unlimited suppliers', 'Unlimited exports', 'SSO & custom roles', 'Dedicated support']
  }
}

export const PLAN_ORDER: SubscriptionPlan[] = ['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']

export function getPlan(plan: SubscriptionPlan): PlanDefinition {
  return PLANS[plan] ?? PLANS.TRIAL
}

/** How many more suppliers can be added; null means unlimited. */
export function suppliersRemaining(plan: SubscriptionPlan, currentCount: number): number | null {
  const max = getPlan(plan).maxSuppliers
  if (max === null) return null
  return Math.max(0, max - currentCount)
}

/** Whether `adding` more suppliers stays within the plan limit. */
export function canAddSuppliers(plan: SubscriptionPlan, currentCount: number, adding = 1): boolean {
  const max = getPlan(plan).maxSuppliers
  if (max === null) return true
  return currentCount + adding <= max
}

/** How many more exports are allowed this month; null means unlimited. */
export function exportsRemaining(plan: SubscriptionPlan, usedThisMonth: number): number | null {
  const max = getPlan(plan).maxExportsPerMonth
  if (max === null) return null
  return Math.max(0, max - usedThisMonth)
}

export function canExport(plan: SubscriptionPlan, usedThisMonth: number): boolean {
  const max = getPlan(plan).maxExportsPerMonth
  if (max === null) return true
  return usedThisMonth < max
}
