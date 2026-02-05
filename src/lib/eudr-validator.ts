import * as turf from '@turf/turf'

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  code: string
  message: string
  featureId?: string
  featureName?: string
}

export interface ValidationWarning {
  code: string
  message: string
  featureId?: string
  featureName?: string
}

export const VALIDATION_CODES = {
  INVALID_GEOJSON: 'INVALID_GEOJSON',
  INVALID_GEOMETRY: 'INVALID_GEOMETRY',
  COORDINATE_OUT_OF_BOUNDS: 'COORDINATE_OUT_OF_BOUNDS',
  PRECISION_TOO_LOW: 'PRECISION_TOO_LOW',
  POLYGON_NOT_CLOSED: 'POLYGON_NOT_CLOSED',
  POLYGON_TOO_FEW_VERTICES: 'POLYGON_TOO_FEW_VERTICES',
  SELF_INTERSECTION: 'SELF_INTERSECTION',
  POLYGON_HAS_HOLES: 'POLYGON_HAS_HOLES',
  LINESTRING_NOT_ALLOWED: 'LINESTRING_NOT_ALLOWED',
  LARGE_PLOT_NEEDS_POLYGON: 'LARGE_PLOT_NEEDS_POLYGON',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  MISSING_PROPERTIES: 'MISSING_PROPERTIES'
} as const

interface GeoJSONFeature {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: {
    type: string
    coordinates: unknown
  }
}

interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export function validateGeoJSON(
  geojson: GeoJSONFeatureCollection,
  options: { maxFileSize?: number } = {}
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!geojson || geojson.type !== 'FeatureCollection') {
    errors.push({
      code: VALIDATION_CODES.INVALID_GEOJSON,
      message: 'Invalid GeoJSON: must be a FeatureCollection'
    })
    return { valid: false, errors, warnings }
  }

  geojson.features.forEach((feature, index) => {
    const featureName = feature.properties?.ProductionPlace?.toString()
    const featureId = `feature-${index}`

    if (!feature.geometry) {
      errors.push({
        code: VALIDATION_CODES.INVALID_GEOMETRY,
        message: 'Feature missing geometry',
        featureId,
        featureName
      })
      return
    }

    const { errors: geometryErrors, warnings: geometryWarnings } = validateGeometry(feature.geometry, feature.properties)
    errors.push(...geometryErrors.map(e => ({ ...e, featureId, featureName })))
    warnings.push(...geometryWarnings.map(w => ({ ...w, featureId, featureName })))
  })

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

function validateGeometry(
  geometry: { type: string; coordinates: unknown },
  properties: Record<string, unknown> = {}
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  const allowedTypes = ['Point', 'MultiPoint', 'Polygon', 'MultiPolygon']
  if (!allowedTypes.includes(geometry.type)) {
    errors.push({
      code: VALIDATION_CODES.LINESTRING_NOT_ALLOWED,
      message: `Geometry type "${geometry.type}" is not allowed. Use Point or Polygon.`
    })
    return { errors, warnings }
  }

  const coordinates = getAllCoordinates(geometry)

  coordinates.forEach((coord, index) => {
    const [lng, lat] = coord

    if (lat < -90 || lat > 90) {
      errors.push({
        code: VALIDATION_CODES.COORDINATE_OUT_OF_BOUNDS,
        message: `Latitude ${lat} is outside valid range (-90 to 90)`
      })
    }

    if (lng < -180 || lng > 180) {
      errors.push({
        code: VALIDATION_CODES.COORDINATE_OUT_OF_BOUNDS,
        message: `Longitude ${lng} is outside valid range (-180 to 180)`
      })
    }

    const latPrecision = countDecimalPlaces(lat)
    const lngPrecision = countDecimalPlaces(lng)

    if (latPrecision < 6 || lngPrecision < 6) {
      warnings.push({
        code: VALIDATION_CODES.PRECISION_TOO_LOW,
        message: `Coordinates have less than 6 decimal places (found ${latPrecision}/${lngPrecision})`
      })
    }
  })

  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
    const polygonErrors = validatePolygon(geometry, properties)
    errors.push(...polygonErrors)
  }

  if (geometry.type === 'Point' && properties.Area && (properties.Area as number) > 4) {
    errors.push({
      code: VALIDATION_CODES.LARGE_PLOT_NEEDS_POLYGON,
      message: 'Plots larger than 4 hectares require polygon geometry, not a point'
    })
  }

  return { errors, warnings }
}

function validatePolygon(
  polygon: { type: string; coordinates: unknown },
  properties: Record<string, unknown> = {}
): ValidationError[] {
  const errors: ValidationError[] = []
  const area = properties.Area as number | undefined

  const isMulti = polygon.type === 'MultiPolygon'
  const polygonList = isMulti
    ? (polygon.coordinates as number[][][][])
    : [polygon.coordinates as number[][][]]

  polygonList.forEach((polyCoords, polyIndex) => {
    const rings = isMulti ? polyCoords : polyCoords
    rings.forEach((ring, ringIndex) => {
      const first = ring[0]
      const last = ring[ring.length - 1]
      const isClosed = first[0] === last[0] && first[1] === last[1]
      if (!isClosed) {
        errors.push({
          code: VALIDATION_CODES.POLYGON_NOT_CLOSED,
          message: 'Polygon must be closed (first and last coordinates must match)'
        })
      }

      if (ring.length < 4) {
        errors.push({
          code: VALIDATION_CODES.POLYGON_TOO_FEW_VERTICES,
          message: 'Polygon requires at least 4 vertices (including closure)'
        })
      }

      if (ringIndex > 0) {
        errors.push({
          code: VALIDATION_CODES.POLYGON_HAS_HOLES,
          message: 'Polygons with holes are not allowed'
        })
      }
    })
  })

  return errors
}

function getAllCoordinates(geometry: { type: string; coordinates: unknown }): [number, number][] {
  const coords: [number, number][] = []

  switch (geometry.type) {
    case 'Point':
      coords.push(geometry.coordinates as [number, number])
      break
    case 'MultiPoint':
      coords.push(...(geometry.coordinates as [number, number][]))
      break
    case 'Polygon':
      coords.push(...(geometry.coordinates as number[][][])[0].map(coord => [coord[0], coord[1]] as [number, number]))
      break
    case 'MultiPolygon':
      (geometry.coordinates as number[][][][]).forEach(polygon => {
        polygon[0].forEach(coord => coords.push([coord[0], coord[1]]))
      })
      break
  }

  return coords
}

function countDecimalPlaces(num: number): number {
  const str = num.toString()
  if (!str.includes('.')) return 0
  return str.split('.')[1].length
}

export function fixGeoJSON(geojson: GeoJSONFeatureCollection): GeoJSONFeatureCollection {
  const fixedFeatures = geojson.features.map(feature => {
    if (!feature.geometry) return feature

    const fixedGeometry = { ...feature.geometry }

    if (fixedGeometry.type === 'Polygon') {
      const rings = (fixedGeometry.coordinates as number[][][]).map(ring => {
        let fixedRing = ring.map(coord => [
          roundToPrecision(coord[0], 6),
          roundToPrecision(coord[1], 6)
        ])

        if (fixedRing.length > 0) {
          const first = fixedRing[0]
          const last = fixedRing[fixedRing.length - 1]
          if (first[0] !== last[0] || first[1] !== last[1]) {
            fixedRing.push([...first])
          }
        }

        return fixedRing
      })

      fixedGeometry.coordinates = rings as number[][][]
    }

    return {
      ...feature,
      geometry: fixedGeometry
    }
  })

  return {
    type: 'FeatureCollection',
    features: fixedFeatures
  }
}

function roundToPrecision(num: number, precision: number): number {
  const factor = Math.pow(10, precision)
  return Math.round(num * factor) / factor
}

export function polygonToPoint(
  polygon: { type: 'Polygon'; coordinates: number[][][] },
  options: { preferCentroid?: boolean } = { preferCentroid: true }
): GeoJSONFeature {
  if (options.preferCentroid) {
    const turfPolygon = turf.polygon(polygon.coordinates)
    const centroid = turf.centroid(turfPolygon)
    return centroid as unknown as GeoJSONFeature
  }

  const coords = polygon.coordinates[0]
  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity

  coords.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng)
    maxLng = Math.max(maxLng, lng)
    minLat = Math.min(minLat, lat)
    maxLat = Math.max(maxLat, lat)
  })

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Point',
      coordinates: [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
    }
  }
}

export function simplifyPolygon(
  polygon: { type: 'Polygon'; coordinates: number[][][] },
  tolerance: number = 0.0001
): { type: 'Polygon'; coordinates: number[][][] } {
  const turfPolygon = turf.polygon(polygon.coordinates)
  const simplified = turf.simplify(turfPolygon, { tolerance, highQuality: false })
  return simplified.geometry as unknown as { type: 'Polygon'; coordinates: number[][][] }
}

export function optimizeGeoJSONForExport(
  geojson: GeoJSONFeatureCollection,
  options: {
    convertSmallToPoints?: boolean
    simplifyTolerance?: number
    smallPlotThreshold?: number
  } = {}
): { geojson: GeoJSONFeatureCollection; changes: string[] } {
  const changes: string[] = []
  const { convertSmallToPoints = false, simplifyTolerance, smallPlotThreshold = 4 } = options

  const optimizedFeatures = geojson.features.map(feature => {
    if (!feature.geometry) return feature

    const area = feature.properties?.Area as number | undefined
    const isSmallPlot = area && area <= smallPlotThreshold
    const featureName = feature.properties?.ProductionPlace as string

    if (convertSmallToPoints && isSmallPlot && feature.geometry.type === 'Polygon') {
      const pointFeature = polygonToPoint(feature.geometry as { type: 'Polygon'; coordinates: number[][][] })
      changes.push(`Converted "${featureName}" from polygon to point`)
      return pointFeature
    }

    if (simplifyTolerance && feature.geometry.type === 'Polygon') {
      const simplified = simplifyPolygon(feature.geometry as { type: 'Polygon'; coordinates: number[][][] }, simplifyTolerance)
      changes.push(`Simplified polygon for "${featureName}"`)
      return {
        ...feature,
        geometry: simplified
      }
    }

    return feature
  })

  return {
    geojson: {
      type: 'FeatureCollection',
      features: optimizedFeatures
    },
    changes
  }
}
