import { buildMitigationPlan, type MitigationSupplier } from '../mitigation'
import type { PlaceInput } from '../risk'

function place(overrides: Partial<PlaceInput> = {}): PlaceInput {
  return {
    id: 'p1',
    name: 'Plot 1',
    country: 'BR',
    areaHectares: 2,
    geometryType: 'POLYGON',
    validationStatus: 'VALID',
    ...overrides
  }
}

function supplier(overrides: Partial<MitigationSupplier> = {}): MitigationSupplier {
  return {
    id: 's1',
    name: 'Supplier 1',
    country: 'BR',
    commodity: 'COFFEE',
    hasEmail: true,
    places: [place()],
    ...overrides
  }
}

describe('buildMitigationPlan', () => {
  it('produces no tasks for a fully validated, negligible portfolio', () => {
    const plan = buildMitigationPlan([
      supplier({ country: 'DE', commodity: 'COFFEE', places: [place({ country: 'DE' })] })
    ])
    expect(plan.tasks).toHaveLength(0)
    expect(plan.highCount).toBe(0)
    expect(plan.remindableSupplierIds).toHaveLength(0)
  })

  it('creates a high-priority re-collection task for invalid geolocation', () => {
    const plan = buildMitigationPlan([
      supplier({ places: [place({ validationStatus: 'INVALID' })] })
    ])
    const task = plan.tasks.find((t) => t.code === 'GEO_INVALID')
    expect(task).toBeDefined()
    expect(task!.priority).toBe('high')
    expect(task!.action).toBe('remind')
    expect(task!.plotId).toBe('p1')
    expect(plan.remindableSupplierIds).toContain('s1')
  })

  it('creates a polygon-request task for a large plot submitted as a point', () => {
    const plan = buildMitigationPlan([
      supplier({ places: [place({ areaHectares: 12, geometryType: 'POINT' })] })
    ])
    expect(plan.tasks.some((t) => t.code === 'LARGE_POINT' && t.priority === 'high')).toBe(true)
  })

  it('creates a non-remindable high-risk evidence task for high-risk countries', () => {
    const plan = buildMitigationPlan([
      supplier({ country: 'RU', places: [place({ country: 'RU' })] })
    ])
    const task = plan.tasks.find((t) => t.code === 'COUNTRY_HIGH')
    expect(task).toBeDefined()
    expect(task!.action).toBe('view') // evidence gathering, not a supplier nudge
  })

  it('creates a collect-geolocation task for suppliers with no plots', () => {
    const plan = buildMitigationPlan([supplier({ places: [] })])
    const task = plan.tasks.find((t) => t.code === 'COLLECT_GEO')
    expect(task).toBeDefined()
    expect(task!.plotId).toBeNull()
    expect(task!.priority).toBe('high')
  })

  it('falls back to a view action when the supplier has no email', () => {
    const plan = buildMitigationPlan([
      supplier({ hasEmail: false, places: [place({ validationStatus: 'INVALID' })] })
    ])
    const task = plan.tasks.find((t) => t.code === 'GEO_INVALID')
    expect(task!.action).toBe('view')
    expect(plan.remindableSupplierIds).toHaveLength(0)
  })

  it('orders high-priority tasks before medium and is deterministic by supplier', () => {
    const plan = buildMitigationPlan([
      supplier({ id: 's2', name: 'Zeta', places: [place({ id: 'pz', areaHectares: 0 })] }), // AREA_MISSING (medium)
      supplier({ id: 's1', name: 'Alpha', places: [place({ id: 'pa', validationStatus: 'INVALID' })] }) // high
    ])
    expect(plan.tasks[0].priority).toBe('high')
    expect(plan.tasks[0].supplierName).toBe('Alpha')
    expect(plan.highCount).toBe(1)
    expect(plan.mediumCount).toBe(1)
  })
})
