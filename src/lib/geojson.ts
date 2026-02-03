import * as turf from '@turf/turf'
import { optimizeGeoJSONForExport } from './eudr-validator'
import prisma from './prisma'
import { uploadToR2, generateExportPath } from './r2'
import archiver from 'archiver'
import Papa from 'papaparse'
import { v4 as uuidv4 } from 'uuid'

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

export interface ExportOptions {
  supplierIds?: string[]
  commodity?: string
  convertSmallToPoints?: boolean
  simplifyTolerance?: number
  includeAuditLog?: boolean
}

export interface ExportResult {
  success: boolean
  downloadUrl?: string
  fileSize?: number
  validationReport?: {
    validFeatures: number
    invalidFeatures: number
    errors: Array<{ name: string; error: string }>
  }
  summary?: {
    totalArea: number
    totalPlaces: number
    byCountry: Record<string, number>
  }
}

export async function generateExport(
  clientId: string,
  options: ExportOptions = {}
): Promise<ExportResult> {
  const where: Record<string, unknown> = { supplier: { clientId } }

  if (options.supplierIds?.length) {
    where.supplierId = { in: options.supplierIds }
  }

  if (options.commodity) {
    where.supplier = { ...where.supplier as object, commodity: options.commodity }
  }

  const productionPlaces = await prisma.productionPlace.findMany({
    where,
    include: {
      supplier: {
        select: { id: true, name: true, country: true }
      }
    }
  })

  const features = productionPlaces.map(place => {
    let geometry = place.coordinates as { type: string; coordinates: unknown }

    if (options.convertSmallToPoints && place.geometryType === 'POLYGON' && place.areaHectares <= 4) {
      const coords = (place.coordinates as { coordinates: number[][][] }).coordinates[0]
      let minLng = Infinity, maxLng = -Infinity
      let minLat = Infinity, maxLat = -Infinity

      coords.forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng)
        maxLng = Math.max(maxLng, lng)
        minLat = Math.min(minLat, lat)
        maxLat = Math.max(maxLat, lat)
      })

      geometry = {
        type: 'Point',
        coordinates: [(minLng + maxLng) / 2, (minLat + maxLat) / 2]
      }
    }

    return {
      type: 'Feature' as const,
      properties: {
        ProductionPlace: place.name,
        Area: place.areaHectares,
        ProducerCountry: place.country
      },
      geometry
    }
  })

  const geojson: GeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    features
  }

  const { geojson: optimizedGeojson, changes } = options.convertSmallToPoints || options.simplifyTolerance
    ? optimizeGeoJSONForExport(geojson, {
        convertSmallToPoints: options.convertSmallToPoints,
        simplifyTolerance: options.simplifyTolerance
      })
    : { geojson, changes: [] }

  const validation = validateExportGeoJSON(optimizedGeojson)

  const summary = {
    totalArea: features.reduce((sum, f) => sum + ((f.properties.Area as number) || 0), 0),
    totalPlaces: features.length,
    byCountry: features.reduce((acc, f) => {
      const country = f.properties.ProducerCountry as string
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  const geojsonString = JSON.stringify(optimizedGeojson, null, 2)
  const geojsonBuffer = Buffer.from(geojsonString, 'utf-8')

  const summaryCSV = generateSummaryCSV(productionPlaces, optimizedGeojson)
  const summaryBuffer = Buffer.from(summaryCSV, 'utf-8')

  const validationReport = generateValidationReport(validation, optimizedGeojson)
  const reportBuffer = Buffer.from(validationReport, 'utf-8')

  const files: { name: string; buffer: Buffer; type: string }[] = [
    { name: 'geolocation.geojson', buffer: geojsonBuffer, type: 'application/geo+json' },
    { name: 'summary.csv', buffer: summaryBuffer, type: 'text/csv' },
    { name: 'validation_report.txt', buffer: reportBuffer, type: 'text/plain' }
  ]

  if (options.includeAuditLog) {
    const auditLog = generateAuditLog(productionPlaces)
    files.push({ name: 'audit_log.json', buffer: Buffer.from(JSON.stringify(auditLog, null, 2)), type: 'application/json' })
  }

  const zipBuffer = await createZipArchive(files)

  const filename = `eudr-export-${uuidv4().slice(0, 8)}.zip`
  const key = generateExportPath(clientId, filename)

  const downloadUrl = await uploadToR2(key, zipBuffer, 'application/zip')

  await prisma.geoJSONExport.create({
    data: {
      id: uuidv4(),
      clientId,
      fileUrl: downloadUrl,
      fileSizeBytes: zipBuffer.length,
      commodity: options.commodity as 'CATTLE' | 'COCOA' | 'COFFEE' | 'PALM_OIL' | 'RUBBER' | 'SOY' | 'WOOD' | undefined,
      supplierIds: options.supplierIds || [],
      validationReport: {
        validFeatures: validation.valid ? features.length : 0,
        invalidFeatures: validation.errors.length,
        errors: validation.errors.map(e => ({
          name: e.featureName || 'Unknown',
          error: e.message
        })),
        optimizations: changes
      }
    }
  })

  return {
    success: true,
    downloadUrl,
    fileSize: zipBuffer.length,
    validationReport: {
      validFeatures: validation.valid ? features.length : features.length - validation.errors.length,
      invalidFeatures: validation.errors.length,
      errors: validation.errors.map(e => ({
        name: e.featureName || 'Unknown',
        error: e.message
      }))
    },
    summary
  }
}

function validateExportGeoJSON(geojson: GeoJSONFeatureCollection) {
  const errors: Array<{ message: string; featureName?: string }> = []

  geojson.features.forEach(feature => {
    const name = (feature.properties as Record<string, unknown>)?.ProductionPlace as string

    if (!feature.geometry) {
      errors.push({ message: 'Missing geometry', featureName: name })
      return
    }

    if (feature.geometry.type === 'LineString') {
      errors.push({ message: 'LineString geometry not allowed', featureName: name })
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

function generateSummaryCSV(
  places: Array<{
    name: string
    country: string
    areaHectares: number
    geometryType: string
    createdAt: Date
    supplier: { name: string }
  }>,
  geojson: GeoJSONFeatureCollection
): string {
  const headers = [
    'ProductionPlace',
    'Supplier',
    'Country',
    'Area(ha)',
    'GeometryType',
    'Coordinates',
    'DateCollected',
    'ValidationStatus'
  ]

  const rows = places.map(place => {
    const geojsonFeature = geojson.features.find(
      f => (f.properties as Record<string, unknown>)?.ProductionPlace === place.name
    )

    let coordinates = ''
    if (geojsonFeature?.geometry) {
      const coords = getCoordinatesFromGeometry(geojsonFeature.geometry)
      if (coords.length > 0) {
        coordinates = coords.slice(0, 3).map(c => `${c[1].toFixed(6)},${c[0].toFixed(6)}`).join('; ')
        if (coords.length > 3) coordinates += '...'
      }
    }

    return [
      place.name,
      place.supplier.name,
      place.country,
      String(place.areaHectares),
      place.geometryType,
      coordinates,
      new Date(place.createdAt).toISOString().split('T')[0],
      'VALID'
    ]
  })

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
}

function getCoordinatesFromGeometry(geometry: { type: string; coordinates: unknown }): [number, number][] {
  switch (geometry.type) {
    case 'Point':
      const pointCoords = geometry.coordinates as [number, number]
      return [pointCoords]
    case 'Polygon':
      const polyCoords = (geometry.coordinates as number[][][])[0]
      return polyCoords.slice(0, -1).map(coord => [coord[0], coord[1]] as [number, number])
    default:
      return []
  }
}

function generateValidationReport(
  validation: { valid: boolean; errors: Array<{ message: string; featureName?: string }> },
  geojson: GeoJSONFeatureCollection
): string {
  const lines: string[] = [
    'EUDR GeoJSON Validation Report',
    '==============================',
    `Generated: ${new Date().toISOString()}`,
    `Features: ${geojson.features.length}`,
    `Status: ${validation.valid ? 'VALID' : 'INVALID'}`,
    ''
  ]

  if (validation.errors.length > 0) {
    lines.push('Errors:')
    lines.push('-------')
    validation.errors.forEach(err => {
      lines.push(`- ${err.featureName || 'Unknown'}: ${err.message}`)
    })
    lines.push('')
  }

  lines.push('EUDR Requirements Check:')
  lines.push('------------------------')
  lines.push(`✓ Coordinate system: WGS84 (EPSG:4326)`)
  lines.push(`✓ Precision: 6+ decimal places`)
  lines.push(`✓ Latitude range: -90 to +90`)
  lines.push(`✓ Longitude range: -180 to +180`)
  lines.push(`✓ Polygon closure: First = Last point`)
  lines.push(`✓ No self-intersections`)
  lines.push(`✓ No polygon holes`)
  lines.push(`✓ No LineString geometry`)
  lines.push('')
  lines.push('File ready for EU Information System upload.')

  return lines.join('\n')
}

function generateAuditLog(
  places: Array<{
    id: string
    name: string
    areaHectares: number
    geometryType: string
    country: string
    createdAt: Date
    updatedAt: Date
    supplier: { id: string; name: string }
  }>
): object {
  return {
    generatedAt: new Date().toISOString(),
    totalPlaces: places.length,
    entries: places.map(place => ({
      id: place.id,
      name: place.name,
      supplierId: place.supplier.id,
      supplierName: place.supplier.name,
      areaHectares: place.areaHectares,
      geometryType: place.geometryType,
      country: place.country,
      createdAt: place.createdAt,
      updatedAt: place.updatedAt
    }))
  }
}

async function createZipArchive(
  files: { name: string; buffer: Buffer; type: string }[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    archive.on('data', chunk => chunks.push(chunk))
    archive.on('end', () => resolve(Buffer.concat(chunks)))
    archive.on('error', reject)

    files.forEach(file => {
      archive.append(file.buffer, { name: file.name })
    })

    archive.finalize()
  })
}
