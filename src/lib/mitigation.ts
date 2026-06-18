import type { Commodity } from '@prisma/client'
import { assessSupplier, type PlaceInput } from './risk'

/**
 * Risk-driven mitigation plan.
 *
 * The risk engine explains *why* a plot is risky; this turns those explanations
 * into the concrete remediation an operator must perform to move a plot — and
 * ultimately the whole Due Diligence Statement — to a negligible-risk, fileable
 * state. Each actionable risk factor maps to exactly one task; informational
 * factors (validated geolocation, low/standard country, commodity baseline)
 * produce no task, so a fully-ready portfolio yields an empty plan.
 */

export interface MitigationSupplier {
  id: string
  name: string
  country: string
  commodity: Commodity
  hasEmail: boolean
  places: PlaceInput[]
}

export type TaskPriority = 'high' | 'medium'
export type TaskAction = 'remind' | 'view'

export interface MitigationTask {
  id: string
  supplierId: string
  supplierName: string
  plotId: string | null
  plotName: string | null
  country: string
  code: string
  priority: TaskPriority
  action: TaskAction
  titleKey: string
  title: string
}

export interface MitigationPlan {
  tasks: MitigationTask[]
  highCount: number
  mediumCount: number
  /** Distinct suppliers with an email and at least one remind-able task. */
  remindableSupplierIds: string[]
}

interface TaskTemplate {
  priority: TaskPriority
  /** Whether re-prompting the supplier is the right remediation. */
  remindable: boolean
  titleKey: string
  title: string
}

/** Maps an actionable risk-factor code to its remediation task. */
const FACTOR_TASKS: Record<string, TaskTemplate> = {
  GEO_INVALID: {
    priority: 'high',
    remindable: true,
    titleKey: 'mit.task.recollectGeo',
    title: 'Re-collect valid geolocation — the plot failed EUDR validation'
  },
  LARGE_POINT: {
    priority: 'high',
    remindable: true,
    titleKey: 'mit.task.requestPolygon',
    title: 'Request polygon geometry — plot over 4 ha was submitted as a point'
  },
  COUNTRY_HIGH: {
    priority: 'high',
    remindable: false,
    titleKey: 'mit.task.highRiskEvidence',
    title: 'Obtain risk-mitigation evidence for a high-risk country of origin'
  },
  AREA_MISSING: {
    priority: 'medium',
    remindable: true,
    titleKey: 'mit.task.addArea',
    title: 'Add the missing plot area'
  },
  GEO_PENDING: {
    priority: 'medium',
    remindable: false,
    titleKey: 'mit.task.awaitValidation',
    title: 'Review pending geolocation that has not yet passed validation'
  }
}

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1 }

export function buildMitigationPlan(suppliers: MitigationSupplier[]): MitigationPlan {
  const tasks: MitigationTask[] = []

  for (const supplier of suppliers) {
    const assessment = assessSupplier({
      id: supplier.id,
      name: supplier.name,
      country: supplier.country,
      commodity: supplier.commodity,
      places: supplier.places
    })

    // A supplier that has not submitted any geolocation cannot be concluded.
    if (assessment.placeCount === 0) {
      tasks.push({
        id: `${supplier.id}:_:COLLECT_GEO`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        plotId: null,
        plotName: null,
        country: supplier.country,
        code: 'COLLECT_GEO',
        priority: 'high',
        action: supplier.hasEmail ? 'remind' : 'view',
        titleKey: 'mit.task.collectGeo',
        title: 'Collect geolocation — no production places submitted yet'
      })
      continue
    }

    for (const place of assessment.places) {
      for (const factor of place.factors) {
        const template = FACTOR_TASKS[factor.code]
        if (!template) continue
        tasks.push({
          id: `${supplier.id}:${place.id}:${factor.code}`,
          supplierId: supplier.id,
          supplierName: supplier.name,
          plotId: place.id,
          plotName: place.name,
          country: place.country,
          code: factor.code,
          priority: template.priority,
          action: template.remindable && supplier.hasEmail ? 'remind' : 'view',
          titleKey: template.titleKey,
          title: template.title
        })
      }
    }
  }

  tasks.sort((a, b) => {
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    }
    return a.supplierName.localeCompare(b.supplierName)
  })

  const highCount = tasks.filter((t) => t.priority === 'high').length
  const remindableSupplierIds = Array.from(
    new Set(tasks.filter((t) => t.action === 'remind').map((t) => t.supplierId))
  )

  return {
    tasks,
    highCount,
    mediumCount: tasks.length - highCount,
    remindableSupplierIds
  }
}
