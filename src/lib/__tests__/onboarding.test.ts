import { buildOnboarding } from '../onboarding'

describe('buildOnboarding', () => {
  it('marks no steps done for a brand-new account', () => {
    const s = buildOnboarding({ totalSuppliers: 0, totalPlaces: 0, completedSuppliers: 0, hasExports: false })
    expect(s.completedCount).toBe(0)
    expect(s.progress).toBe(0)
    expect(s.allDone).toBe(false)
    expect(s.steps).toHaveLength(5)
  })

  it('completes the add-supplier step once a supplier exists', () => {
    const s = buildOnboarding({ totalSuppliers: 1, totalPlaces: 0, completedSuppliers: 0, hasExports: false })
    expect(s.steps.find((x) => x.key === 'add-supplier')?.done).toBe(true)
    expect(s.steps.find((x) => x.key === 'build-supply-chain')?.done).toBe(false)
    expect(s.completedCount).toBe(1)
  })

  it('requires 3 suppliers to complete the supply-chain step', () => {
    expect(buildOnboarding({ totalSuppliers: 2, totalPlaces: 0, completedSuppliers: 0, hasExports: false })
      .steps.find((x) => x.key === 'build-supply-chain')?.done).toBe(false)
    expect(buildOnboarding({ totalSuppliers: 3, totalPlaces: 0, completedSuppliers: 0, hasExports: false })
      .steps.find((x) => x.key === 'build-supply-chain')?.done).toBe(true)
  })

  it('completes the 50% step based on completion rate', () => {
    const below = buildOnboarding({ totalSuppliers: 4, totalPlaces: 2, completedSuppliers: 1, hasExports: false })
    expect(below.steps.find((x) => x.key === 'half-complete')?.done).toBe(false)
    const at = buildOnboarding({ totalSuppliers: 4, totalPlaces: 2, completedSuppliers: 2, hasExports: false })
    expect(at.steps.find((x) => x.key === 'half-complete')?.done).toBe(true)
  })

  it('reports allDone and 100% when every step is satisfied', () => {
    const s = buildOnboarding({ totalSuppliers: 5, totalPlaces: 4, completedSuppliers: 3, hasExports: true })
    expect(s.allDone).toBe(true)
    expect(s.progress).toBe(100)
    expect(s.completedCount).toBe(5)
  })
})
