import type {
  Client,
  Supplier,
  ProductionPlace,
  GeoJSONExport,
  Commodity,
  SupplierStatus,
  GeometryType,
  ValidationStatus,
  SubscriptionPlan
} from '@prisma/client'

export type { Client, Supplier, ProductionPlace, GeoJSONExport }

export interface ClientWithRelations extends Client {
  suppliers: Supplier[]
  exports: GeoJSONExport[]
}

export interface SupplierWithPlaces extends Supplier {
  productionPlaces: ProductionPlace[]
}

export interface ProductionPlaceWithSupplier extends ProductionPlace {
  supplier: Supplier
}

export interface GeoJSONFeature {
  type: 'Feature'
  properties: {
    ProductionPlace: string
    Area: number
    ProducerCountry: string
  }
  geometry: {
    type: 'Point' | 'Polygon'
    coordinates: number[][][] | [number, number]
  }
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export interface SupplierInvite {
  name: string
  country: string
  commodity: Commodity
  contactEmail?: string
  contactPhone?: string
}

export interface BulkInviteResult {
  created: number
  errors: Array<{ row: number; error: string }>
}

export interface DashboardStats {
  totalSuppliers: number
  completedSuppliers: number
  inProgressSuppliers: number
  totalPlaces: number
  validationErrors: number
  recentExports: Array<{
    id: string
    createdAt: Date
    fileSizeBytes: number
    supplierCount: number
  }>
}

export interface MapCoordinates {
  lat: number
  lng: number
}

export interface PolygonCoordinates {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface PointCoordinates {
  type: 'Point'
  coordinates: [number, number]
}

export type GeometryCoordinates = PolygonCoordinates | PointCoordinates

export interface ValidationError {
  code: string
  message: string
  placeId?: string
  placeName?: string
}

export interface ValidationResponse {
  valid: boolean
  errors: ValidationError[]
}

export interface ExportOptions {
  supplierIds?: string[]
  commodity?: Commodity
  convertSmallToPoints?: boolean
  simplifyTolerance?: number
  includeAuditLog?: boolean
}

export interface Language {
  code: 'en' | 'de'
  name: string
  label: string
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', label: 'English' },
  { code: 'de', name: 'Deutsch', label: 'Deutsch' }
]
