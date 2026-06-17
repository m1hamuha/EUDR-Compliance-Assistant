import type { Commodity, SupplierStatus, GeometryType, ValidationStatus } from '@prisma/client'

export interface DemoPlace {
  name: string
  areaHectares: number
  geometryType: GeometryType
  coordinates: unknown // GeoJSON geometry ([lng, lat] order)
  country: string
  validationStatus: ValidationStatus
}

export interface DemoSupplier {
  name: string
  country: string
  commodity: Commodity
  contactEmail: string
  status: SupplierStatus
  invitationDaysAgo: number
  completedDaysAgo: number | null
  places: DemoPlace[]
}

function point(lng: number, lat: number): { type: 'Point'; coordinates: [number, number] } {
  return { type: 'Point', coordinates: [lng, lat] }
}

function squareKm(lng: number, lat: number): { type: 'Polygon'; coordinates: number[][][] } {
  const d = 0.01
  return {
    type: 'Polygon',
    coordinates: [[
      [lng, lat],
      [lng + d, lat],
      [lng + d, lat + d],
      [lng, lat + d],
      [lng, lat]
    ]]
  }
}

/**
 * A realistic sample supply chain used to populate fresh demo accounts so the
 * dashboard and analytics light up immediately. Dates are expressed relative to
 * "now" so the funnel, trend, momentum, and at-risk views all look alive.
 */
export function buildDemoSuppliers(): DemoSupplier[] {
  return [
    {
      name: 'Fazenda Santa Clara', country: 'BR', commodity: 'COFFEE', contactEmail: 'demo+santaclara@example.com',
      status: 'VALIDATED', invitationDaysAgo: 24, completedDaysAgo: 20,
      places: [
        { name: 'Plot A', areaHectares: 12.4, geometryType: 'POLYGON', coordinates: squareKm(-46.12, -21.34), country: 'BR', validationStatus: 'VALID' },
        { name: 'Plot B', areaHectares: 3.1, geometryType: 'POINT', coordinates: point(-46.10, -21.30), country: 'BR', validationStatus: 'VALID' }
      ]
    },
    {
      name: 'Coopérative Cacao Ivoire', country: 'CI', commodity: 'COCOA', contactEmail: 'demo+cacao@example.com',
      status: 'VALIDATED', invitationDaysAgo: 18, completedDaysAgo: 11,
      places: [
        { name: 'Bloc Nord', areaHectares: 8.7, geometryType: 'POLYGON', coordinates: squareKm(-5.55, 7.12), country: 'CI', validationStatus: 'VALID' }
      ]
    },
    {
      name: 'Highland Coffee Estates', country: 'CO', commodity: 'COFFEE', contactEmail: 'demo+highland@example.com',
      status: 'COMPLETED', invitationDaysAgo: 9, completedDaysAgo: 3,
      places: [
        { name: 'Finca 1', areaHectares: 5.2, geometryType: 'POLYGON', coordinates: squareKm(-75.51, 4.81), country: 'CO', validationStatus: 'VALID' },
        { name: 'Finca 2', areaHectares: 2.0, geometryType: 'POINT', coordinates: point(-75.49, 4.83), country: 'CO', validationStatus: 'INVALID' }
      ]
    },
    {
      name: 'Borneo Timber Co', country: 'ID', commodity: 'WOOD', contactEmail: 'demo+borneo@example.com',
      status: 'COMPLETED', invitationDaysAgo: 12, completedDaysAgo: 5,
      places: [
        { name: 'Concession 7', areaHectares: 41.0, geometryType: 'POLYGON', coordinates: squareKm(114.21, -0.52), country: 'ID', validationStatus: 'VALID' }
      ]
    },
    {
      name: 'Mekong Rubber Collective', country: 'VN', commodity: 'RUBBER', contactEmail: 'demo+mekong@example.com',
      status: 'IN_PROGRESS', invitationDaysAgo: 4, completedDaysAgo: null,
      places: [
        { name: 'Estate East', areaHectares: 15.5, geometryType: 'POLYGON', coordinates: squareKm(106.66, 10.78), country: 'VN', validationStatus: 'PENDING' }
      ]
    },
    {
      name: 'Selangor Palm Holdings', country: 'MY', commodity: 'PALM_OIL', contactEmail: 'demo+selangor@example.com',
      status: 'INVITED', invitationDaysAgo: 12, completedDaysAgo: null, places: []
    },
    {
      name: 'Pampas Soy Growers', country: 'AR', commodity: 'SOY', contactEmail: 'demo+pampas@example.com',
      status: 'INVITED', invitationDaysAgo: 8, completedDaysAgo: null, places: []
    },
    {
      name: 'Cerrado Cattle Ranch', country: 'BR', commodity: 'CATTLE', contactEmail: 'demo+cerrado@example.com',
      status: 'INVITED', invitationDaysAgo: 2, completedDaysAgo: null, places: []
    }
  ]
}
