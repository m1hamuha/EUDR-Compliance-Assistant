import {
  getCountryRisk,
  assessPlace,
  assessSupplier,
  assessPortfolio,
  type SupplierInput,
  type PlaceInput
} from '../risk'

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

function supplier(overrides: Partial<SupplierInput> = {}): SupplierInput {
  return {
    id: 's1',
    name: 'Supplier 1',
    country: 'BR',
    commodity: 'COFFEE',
    places: [],
    ...overrides
  }
}

describe('getCountryRisk', () => {
  it('classifies EU benchmark high-risk countries', () => {
    expect(getCountryRisk('RU')).toBe('high')
    expect(getCountryRisk('BY')).toBe('high')
    expect(getCountryRisk('MM')).toBe('high')
    expect(getCountryRisk('KP')).toBe('high')
  })

  it('classifies explicit low-risk countries', () => {
    expect(getCountryRisk('DE')).toBe('low')
    expect(getCountryRisk('US')).toBe('low')
    expect(getCountryRisk('nl')).toBe('low') // case-insensitive
  })

  it('defaults unknown / tropical-origin countries to standard', () => {
    expect(getCountryRisk('BR')).toBe('standard')
    expect(getCountryRisk('ID')).toBe('standard')
    expect(getCountryRisk('CI')).toBe('standard')
    expect(getCountryRisk('ZZ')).toBe('standard')
  })
})

describe('assessPlace', () => {
  it('rates a validated, low-risk-country, low-pressure plot as negligible', () => {
    const r = assessPlace(place({ country: 'DE' }), supplier({ country: 'DE', commodity: 'COFFEE' }))
    expect(r.level).toBe('negligible')
    expect(r.score).toBe(20) // 10 country + 10 commodity
    expect(r.factors.some((f) => f.code === 'COUNTRY_LOW')).toBe(true)
    expect(r.factors.some((f) => f.code === 'GEO_VALID')).toBe(true)
  })

  it('rates a validated standard-country coffee plot as standard', () => {
    const r = assessPlace(place(), supplier())
    expect(r.score).toBe(50) // 40 + 10
    expect(r.level).toBe('standard')
  })

  it('escalates to high when geolocation is invalid on a high-pressure commodity', () => {
    const r = assessPlace(
      place({ validationStatus: 'INVALID' }),
      supplier({ commodity: 'CATTLE' })
    )
    expect(r.score).toBe(90) // 40 + 20 + 30
    expect(r.level).toBe('high')
    expect(r.factors.some((f) => f.code === 'GEO_INVALID' && f.severity === 'critical')).toBe(true)
    expect(r.factors.some((f) => f.code === 'COMMODITY_PRESSURE')).toBe(true)
  })

  it('flags a large plot submitted as a point', () => {
    const r = assessPlace(
      place({ areaHectares: 12, geometryType: 'POINT' }),
      supplier()
    )
    expect(r.factors.some((f) => f.code === 'LARGE_POINT' && f.severity === 'critical')).toBe(true)
    expect(r.score).toBe(70) // 40 + 10 + 20
  })

  it('never lets an invalid plot be negligible even in a low-risk country', () => {
    const r = assessPlace(
      place({ country: 'DE', validationStatus: 'INVALID' }),
      supplier({ country: 'DE', commodity: 'COFFEE' })
    )
    // 10 + 10 + 30 = 50 -> standard anyway, but assert the floor holds
    expect(r.level).not.toBe('negligible')
  })

  it('always rates high-risk countries as high', () => {
    const r = assessPlace(place({ country: 'RU' }), supplier({ country: 'RU' }))
    expect(r.countryRisk).toBe('high')
    expect(r.level).toBe('high')
    expect(r.factors.some((f) => f.code === 'COUNTRY_HIGH')).toBe(true)
  })

  it('flags a missing plot area', () => {
    const r = assessPlace(place({ areaHectares: 0 }), supplier())
    expect(r.factors.some((f) => f.code === 'AREA_MISSING')).toBe(true)
  })

  it('caps the score at 100', () => {
    const r = assessPlace(
      place({ country: 'RU', areaHectares: 50, geometryType: 'POINT', validationStatus: 'INVALID' }),
      supplier({ country: 'RU', commodity: 'CATTLE' })
    )
    expect(r.score).toBe(100)
  })
})

describe('assessSupplier', () => {
  it('takes the worst level across plots', () => {
    const s = assessSupplier(
      supplier({
        places: [
          place({ id: 'a', validationStatus: 'VALID' }),
          place({ id: 'b', validationStatus: 'INVALID', country: 'BR' })
        ]
      })
    )
    expect(s.placeCount).toBe(2)
    expect(s.level).toBe(assessPlace(place({ id: 'b', validationStatus: 'INVALID' }), supplier()).level)
    expect(s.score).toBe(80) // worst of 50 and 80
  })

  it('floors a supplier with no submitted plots to at least standard', () => {
    const s = assessSupplier(supplier({ country: 'DE', commodity: 'COFFEE', places: [] }))
    expect(s.placeCount).toBe(0)
    expect(s.level).toBe('standard') // would be negligible by score, floored up
  })
})

describe('assessPortfolio', () => {
  it('summarizes distribution, benchmark and conclusion', () => {
    const portfolio = assessPortfolio([
      supplier({
        id: 's1',
        country: 'DE',
        commodity: 'COFFEE',
        places: [place({ id: 'p1', country: 'DE' })] // negligible
      }),
      supplier({
        id: 's2',
        country: 'BR',
        commodity: 'CATTLE',
        places: [place({ id: 'p2', country: 'BR', validationStatus: 'INVALID' })] // high
      })
    ])

    expect(portfolio.totalSuppliers).toBe(2)
    expect(portfolio.totalPlaces).toBe(2)
    expect(portfolio.distribution.negligible).toBe(1)
    expect(portfolio.distribution.high).toBe(1)
    expect(portfolio.countryBenchmark.low).toBe(1)
    expect(portfolio.countryBenchmark.standard).toBe(1)
    expect(portfolio.mitigationNeeded).toBe(1)
    expect(portfolio.conclusion).toBe('action_required')
    // highest-risk supplier first
    expect(portfolio.suppliers[0].id).toBe('s2')
  })

  it('concludes ready when every supplier is negligible', () => {
    const portfolio = assessPortfolio([
      supplier({ country: 'DE', commodity: 'COFFEE', places: [place({ country: 'DE' })] })
    ])
    expect(portfolio.conclusion).toBe('ready')
    expect(portfolio.mitigationNeeded).toBe(0)
  })

  it('concludes due_diligence when standard but no high', () => {
    const portfolio = assessPortfolio([
      supplier({ country: 'BR', commodity: 'COFFEE', places: [place({ country: 'BR' })] }) // standard
    ])
    expect(portfolio.conclusion).toBe('due_diligence')
  })

  it('handles an empty portfolio', () => {
    const portfolio = assessPortfolio([])
    expect(portfolio.totalSuppliers).toBe(0)
    expect(portfolio.riskIndex).toBe(0)
    expect(portfolio.conclusion).toBe('ready')
  })
})
