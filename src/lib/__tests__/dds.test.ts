import { buildDDS, buildReferenceNumber, HS_CODES } from '../dds'
import type { SupplierInput, PlaceInput } from '../risk'

function place(overrides: Partial<PlaceInput> = {}): PlaceInput {
  return {
    id: 'p1',
    name: 'Plot 1',
    country: 'DE',
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
    country: 'DE',
    commodity: 'COFFEE',
    places: [],
    ...overrides
  }
}

const operator = { companyName: 'Acme Foods GmbH', country: 'DE', email: 'ops@acme.test' }
const now = new Date('2026-06-18T10:00:00Z')

describe('buildReferenceNumber', () => {
  it('is deterministic for the same client and day', () => {
    expect(buildReferenceNumber('client-1', now)).toBe(buildReferenceNumber('client-1', now))
  })

  it('encodes the date and differs by client', () => {
    const ref = buildReferenceNumber('client-1', now)
    expect(ref).toMatch(/^EUDR-DDS-20260618-[0-9A-Z]{6}$/)
    expect(buildReferenceNumber('client-2', now)).not.toBe(ref)
  })
})

describe('buildDDS', () => {
  it('produces a fileable statement when every plot is negligible', () => {
    const dds = buildDDS({
      clientId: 'client-1',
      operator,
      suppliers: [
        supplier({ country: 'DE', commodity: 'COFFEE', places: [place({ country: 'DE' })] })
      ],
      now
    })

    expect(dds.negligibleRisk).toBe(true)
    expect(dds.conclusion).toBe('ready')
    expect(dds.totalPlots).toBe(1)
    expect(dds.statement).toContain('negligible')
    expect(dds.statement).not.toContain('DRAFT')
    expect(dds.operator.companyName).toBe('Acme Foods GmbH')
  })

  it('marks the statement as DRAFT and not fileable when a plot is high-risk', () => {
    const dds = buildDDS({
      clientId: 'client-1',
      operator,
      suppliers: [
        supplier({
          country: 'BR',
          commodity: 'CATTLE',
          places: [place({ country: 'BR', validationStatus: 'INVALID' })]
        })
      ],
      now
    })

    expect(dds.negligibleRisk).toBe(false)
    expect(dds.conclusion).toBe('action_required')
    expect(dds.statement).toContain('DRAFT')
    expect(dds.statement).toContain('high risk')
  })

  it('aggregates commodities with HS codes, plot counts, area and countries', () => {
    const dds = buildDDS({
      clientId: 'client-1',
      operator,
      suppliers: [
        supplier({
          id: 's1',
          commodity: 'COFFEE',
          places: [
            place({ id: 'a', country: 'BR', areaHectares: 3 }),
            place({ id: 'b', country: 'CO', areaHectares: 1.5 })
          ]
        }),
        supplier({ id: 's2', commodity: 'COCOA', places: [place({ id: 'c', country: 'GH', areaHectares: 2 })] })
      ],
      now
    })

    const coffee = dds.commodities.find((c) => c.commodity === 'COFFEE')!
    expect(coffee.hsCode).toBe(HS_CODES.COFFEE.code)
    expect(coffee.plotCount).toBe(2)
    expect(coffee.totalAreaHectares).toBe(4.5)
    expect(coffee.countries).toEqual(['BR', 'CO'])

    expect(dds.totalPlots).toBe(3)
    expect(dds.totalAreaHectares).toBe(6.5)
    // commodities sorted by descending plot count
    expect(dds.commodities[0].commodity).toBe('COFFEE')
  })

  it('handles an operator with no geolocation data as a DRAFT', () => {
    const dds = buildDDS({ clientId: 'client-1', operator, suppliers: [], now })
    expect(dds.totalPlots).toBe(0)
    expect(dds.negligibleRisk).toBe(false)
    expect(dds.statement).toContain('DRAFT')
    expect(dds.statement).toContain('no geolocation')
  })
})
