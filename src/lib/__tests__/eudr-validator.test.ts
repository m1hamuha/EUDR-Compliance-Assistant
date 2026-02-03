import {
  validateGeoJSON,
  fixGeoJSON,
  polygonToPoint,
  simplifyPolygon,
  optimizeGeoJSONForExport,
  VALIDATION_CODES
} from '../eudr-validator'

describe('EUD Validator', () => {
  describe('validateGeoJSON', () => {
    it('should reject invalid GeoJSON without type', () => {
      const result = validateGeoJSON({} as any)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe(VALIDATION_CODES.INVALID_GEOJSON)
    })

    it('should reject GeoJSON that is not a FeatureCollection', () => {
      const result = validateGeoJSON({ type: 'Feature' } as any)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe(VALIDATION_CODES.INVALID_GEOJSON)
    })

    it('should reject features without geometry', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: null }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(false)
      expect(result.errors[0].code).toBe(VALIDATION_CODES.INVALID_GEOMETRY)
    })

    it('should reject LineString geometry', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Test' },
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 1], [2, 2]]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.LINESTRING_NOT_ALLOWED)).toBe(true)
    })

    it('should validate Point geometry with correct coordinates', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Test Place' },
          geometry: {
            type: 'Point',
            coordinates: [-45.123456, -12.654321]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('should reject coordinates with low precision', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Test' },
          geometry: {
            type: 'Point',
            coordinates: [-45.1, -12.2]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.PRECISION_TOO_LOW)).toBe(true)
    })

    it('should reject out-of-bounds latitude', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Test' },
          geometry: {
            type: 'Point',
            coordinates: [0, 95]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.COORDINATE_OUT_OF_BOUNDS)).toBe(true)
    })

    it('should reject out-of-bounds longitude', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Test' },
          geometry: {
            type: 'Point',
            coordinates: [200, 0]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.COORDINATE_OUT_OF_BOUNDS)).toBe(true)
    })
  })

  describe('Polygon Validation', () => {
    it('should validate a correct polygon', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Farm A', Area: 10 },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-60.1, -10.1],
              [-60.0, -10.1],
              [-60.0, -10.0],
              [-60.1, -10.0],
              [-60.1, -10.1]
            ]]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(true)
    })

    it('should reject unclosed polygon', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Test' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-60.1, -10.1],
              [-60.0, -10.1],
              [-60.0, -10.0],
              [-60.1, -10.0]
            ]]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.POLYGON_NOT_CLOSED)).toBe(true)
    })

    it('should reject polygon with too few vertices', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Test' },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-60.1, -10.1],
              [-60.0, -10.1],
              [-60.1, -10.1]
            ]]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.POLYGON_TOO_FEW_VERTICES)).toBe(true)
    })

    it('should reject large plot with point geometry', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { ProductionPlace: 'Test', Area: 10 },
          geometry: {
            type: 'Point',
            coordinates: [0, 0]
          }
        }]
      }
      const result = validateGeoJSON(geojson as any)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === VALIDATION_CODES.LARGE_PLOT_NEEDS_POLYGON)).toBe(true)
    })
  })

  describe('fixGeoJSON', () => {
    it('should close unclosed polygon', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-60.123456, -10.123456],
              [-60.123457, -10.123456],
              [-60.123457, -10.123457]
            ]]
          }
        }]
      }
      const fixed = fixGeoJSON(geojson as any)
      const coords = fixed.features[0].geometry.coordinates[0]
      expect(coords[0]).toEqual(coords[coords.length - 1])
    })

    it('should round coordinates to 6 decimal places', () => {
      const geojson = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [-60.123456789, -10.123456789]
          }
        }]
      }
      const fixed = fixGeoJSON(geojson as any)
      expect(fixed.features[0].geometry.coordinates[0]).toBe(-60.123457)
      expect(fixed.features[0].geometry.coordinates[1]).toBe(-10.123457)
    })
  })

  describe('polygonToPoint', () => {
    it('should convert polygon to centroid point', () => {
      const polygon = {
        type: 'Polygon' as const,
        coordinates: [[
          [-60.0, -10.0],
          [-60.1, -10.0],
          [-60.1, -10.1],
          [-60.0, -10.1],
          [-60.0, -10.0]
        ]]
      }
      const point = polygonToPoint(polygon)
      expect(point.geometry.type).toBe('Point')
      expect(point.geometry.coordinates).toHaveLength(2)
    })
  })

  describe('optimizeGeoJSONForExport', () => {
    it('should convert small polygons to points when requested', () => {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          properties: { ProductionPlace: 'Small Farm', Area: 2 },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[[-60, -10], [-60.01, -10], [-60.01, -10.01], [-60, -10.01], [-60, -10]]]
          }
        }]
      }
      const result = optimizeGeoJSONForExport(geojson, { convertSmallToPoints: true, smallPlotThreshold: 4 })
      expect(result.changes.length).toBe(1)
      expect(result.geojson.features[0].geometry.type).toBe('Point')
    })

    it('should not convert large polygons to points', () => {
      const geojson = {
        type: 'FeatureCollection' as const,
        features: [{
          type: 'Feature' as const,
          properties: { ProductionPlace: 'Large Farm', Area: 10 },
          geometry: {
            type: 'Polygon' as const,
            coordinates: [[[-60, -10], [-60.1, -10], [-60.1, -10.1], [-60, -10.1], [-60, -10]]]
          }
        }]
      }
      const result = optimizeGeoJSONForExport(geojson, { convertSmallToPoints: true, smallPlotThreshold: 4 })
      expect(result.changes.length).toBe(0)
      expect(result.geojson.features[0].geometry.type).toBe('Polygon')
    })
  })
})