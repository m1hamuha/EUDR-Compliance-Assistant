import {
  validateGeoJSON,
  fixGeoJSON,
  VALIDATION_CODES
} from '../eudr-validator'

function createFeature(geometry: { type: string; coordinates: unknown }, properties: Record<string, unknown> = {}) {
  return {
    type: 'Feature' as const,
    properties,
    geometry
  }
}

function createPolygon(coords: number[][], area: number = 0) {
  return createFeature(
    { type: 'Polygon', coordinates: [coords] },
    { ProductionPlace: 'Test', Area: area }
  )
}

describe('validateGeoJSON', () => {
  describe('GeoJSON structure validation', () => {
    it('rejects null input', () => {
      const result = validateGeoJSON(null as unknown as Parameters<typeof validateGeoJSON>[0])
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe(VALIDATION_CODES.INVALID_GEOJSON)
    })

    it('rejects invalid type', () => {
      const result = validateGeoJSON({ type: 'Invalid', features: [] } as unknown as Parameters<typeof validateGeoJSON>[0])
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe(VALIDATION_CODES.INVALID_GEOJSON)
    })

    it('accepts valid FeatureCollection', () => {
      const result = validateGeoJSON({
        type: 'FeatureCollection',
        features: []
      })
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('coordinate validation', () => {
    it('accepts valid coordinates', () => {
      const feature = createFeature({ type: 'Point', coordinates: [-60.123456, -10.654321] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(true)
    })

    it('rejects latitude outside -90 to 90', () => {
      const feature = createFeature({ type: 'Point', coordinates: [-60, 95] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.COORDINATE_OUT_OF_BOUNDS)).toBe(true)
    })

    it('rejects longitude outside -180 to 180', () => {
      const feature = createFeature({ type: 'Point', coordinates: [-200, -10] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.COORDINATE_OUT_OF_BOUNDS)).toBe(true)
    })

    it('rejects coordinates with less than 6 decimal places', () => {
      const feature = createFeature({ type: 'Point', coordinates: [-60.1, -10.123] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(true)
      expect(result.warnings.some(e => e.code === VALIDATION_CODES.PRECISION_TOO_LOW)).toBe(true)
    })

    it('accepts exactly 6 decimal places', () => {
      const feature = createFeature({ type: 'Point', coordinates: [-60.123456, -10.654321] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(true)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.PRECISION_TOO_LOW)).toBe(false)
    })
  })

  describe('geometry type validation', () => {
    it('accepts Point geometry', () => {
      const feature = createFeature({ type: 'Point', coordinates: [-60.123456, -10.654321] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(true)
    })

    it('accepts MultiPoint geometry', () => {
      const feature = createFeature({ type: 'MultiPoint', coordinates: [[-60.123456, -10.654321], [-61.123456, -11.654321]] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(true)
    })

    it('accepts Polygon geometry', () => {
      const feature = createPolygon([[0.000000, 0.000000], [1.000000, 0.000000], [1.000000, 1.000000], [0.000000, 1.000000], [0.000000, 0.000000]])
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(true)
    })

    it('accepts MultiPolygon geometry', () => {
      const feature = createFeature({
        type: 'MultiPolygon',
        coordinates: [[[[0.000000, 0.000000], [1.000000, 0.000000], [1.000000, 1.000000], [0.000000, 1.000000], [0.000000, 0.000000]]]]
      })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(true)
    })

    it('rejects LineString geometry', () => {
      const feature = createFeature({ type: 'LineString', coordinates: [[0, 0], [1, 1]] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.LINESTRING_NOT_ALLOWED)).toBe(true)
    })
  })

  describe('polygon validation', () => {
    it('rejects unclosed polygons', () => {
      const feature = createPolygon([[0.000000, 0.000000], [1.000000, 0.000000], [1.000000, 1.000000], [0.000000, 1.000000]])
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.errors.some(e => e.code === VALIDATION_CODES.POLYGON_NOT_CLOSED)).toBe(true)
    })

    it('rejects polygons with less than 4 vertices', () => {
      const feature = createFeature({ type: 'Polygon', coordinates: [[[0.000000, 0.000000], [1.000000, 0.000000], [1.000000, 1.000000], [0.500000, 0.500000]]] })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.errors.some(e => e.code === VALIDATION_CODES.POLYGON_NOT_CLOSED)).toBe(true)
    })

    it('rejects polygons with holes', () => {
      const feature = createFeature({
        type: 'Polygon',
        coordinates: [
          [[0.000000, 0.000000], [2.000000, 0.000000], [2.000000, 2.000000], [0.000000, 2.000000], [0.000000, 0.000000]],
          [[0.500000, 0.500000], [0.500000, 1.000000], [1.000000, 1.000000], [1.000000, 0.500000], [0.500000, 0.500000]]
        ]
      })
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.errors.some(e => e.code === VALIDATION_CODES.POLYGON_HAS_HOLES)).toBe(true)
    })

    it('accepts valid closed polygon with 4+ vertices', () => {
      const feature = createPolygon([[0.000000, 0.000000], [1.000000, 0.000000], [1.000000, 1.000000], [0.000000, 1.000000], [0.000000, 0.000000]])
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.valid).toBe(true)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.POLYGON_NOT_CLOSED)).toBe(false)
    })
  })

  describe('large plot validation', () => {
    it('rejects large plots (>4ha) with point geometry', () => {
      const feature = createFeature(
        { type: 'Point', coordinates: [-60.123456, -10.654321] },
        { ProductionPlace: 'Test', Area: 10 }
      )
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.errors.some(e => e.code === VALIDATION_CODES.LARGE_PLOT_NEEDS_POLYGON)).toBe(true)
    })

    it('accepts large plots with polygon geometry', () => {
      const feature = createPolygon([[0.000000, 0.000000], [1.000000, 0.000000], [1.000000, 1.000000], [0.000000, 1.000000], [0.000000, 0.000000]], 10)
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.errors.some(e => e.code === VALIDATION_CODES.LARGE_PLOT_NEEDS_POLYGON)).toBe(false)
    })

    it('accepts small plots with point geometry', () => {
      const feature = createFeature(
        { type: 'Point', coordinates: [-60.123456, -10.654321] },
        { ProductionPlace: 'Test', Area: 2 }
      )
      const result = validateGeoJSON({ type: 'FeatureCollection', features: [feature] })
      expect(result.errors.some(e => e.code === VALIDATION_CODES.LARGE_PLOT_NEEDS_POLYGON)).toBe(false)
    })
  })
})

describe('fixGeoJSON', () => {
  it('closes unclosed polygons', () => {
    const unclosed = createPolygon([[0.000000, 0.000000], [1.000000, 0.000000], [1.000000, 1.000000], [0.000000, 1.000000]])
    const fixed = fixGeoJSON({ type: 'FeatureCollection', features: [unclosed] })
    const coords = (fixed.features[0].geometry.coordinates as number[][][])[0]
    expect(coords[0]).toEqual(coords[coords.length - 1])
  })

  it('rounds coordinates to 6 decimal places', () => {
    const imprecise = createFeature({
      type: 'Polygon',
      coordinates: [[[0.123456789, 0.123456789]]]
    }, { ProductionPlace: 'Test', Area: 0 })
    const fixed = fixGeoJSON({ type: 'FeatureCollection', features: [imprecise] })
    const coord = (fixed.features[0].geometry.coordinates as number[][][])[0][0]
    expect(coord[0]).toBeCloseTo(0.123457, 5)
    expect(coord[1]).toBeCloseTo(0.123457, 5)
  })

  it('does not modify already valid polygons', () => {
    const valid = createPolygon([[0.000000, 0.000000], [1.000000, 0.000000], [1.000000, 1.000000], [0.000000, 1.000000], [0.000000, 0.000000]])
    const fixed = fixGeoJSON({ type: 'FeatureCollection', features: [valid] })
    expect(fixed).toEqual({ type: 'FeatureCollection', features: [valid] })
  })
})
