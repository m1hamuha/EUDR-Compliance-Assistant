import type { Commodity, GeometryType, ValidationStatus } from '@prisma/client'

/**
 * EUDR deforestation-risk assessment.
 *
 * This is the heart of EUDR due diligence: beyond collecting and validating
 * geolocation, an operator must (a) take the country benchmark into account and
 * (b) assess the risk that a commodity is linked to deforestation, then conclude
 * whether that risk is *negligible* before placing the product on the EU market.
 *
 * The model here combines three faithful signals the app actually knows about:
 *   1. The EU country benchmark category (Art. 29) — drives the baseline and the
 *      depth of due diligence required (simplified for low-risk countries).
 *   2. Commodity deforestation pressure — cattle, palm oil and soy are the
 *      dominant global drivers of commodity-driven deforestation.
 *   3. Plot-level verifiability — geolocation that failed or has not passed EUDR
 *      validation, and large plots submitted as points, cannot be verified and
 *      therefore cannot support a negligible-risk conclusion.
 */

export type CountryRiskCategory = 'low' | 'standard' | 'high'

/** Per-plot due-diligence conclusion. */
export type RiskLevel = 'negligible' | 'standard' | 'high'

/** Portfolio-level verdict for the operator. */
export type PortfolioConclusion = 'ready' | 'due_diligence' | 'action_required'

export type FactorSeverity = 'info' | 'warning' | 'critical'

export interface RiskFactor {
  code: string
  severity: FactorSeverity
  /** A stable i18n key the UI can translate; falls back to `message`. */
  messageKey: string
  /** Human-readable English message (used in reports and as i18n fallback). */
  message: string
}

export interface PlaceInput {
  id: string
  name: string
  country: string
  areaHectares: number
  geometryType: GeometryType
  validationStatus: ValidationStatus
}

export interface SupplierInput {
  id: string
  name: string
  country: string
  commodity: Commodity
  places: PlaceInput[]
}

export interface PlaceRisk {
  id: string
  name: string
  country: string
  countryRisk: CountryRiskCategory
  areaHectares: number
  level: RiskLevel
  score: number
  factors: RiskFactor[]
}

export interface SupplierRisk {
  id: string
  name: string
  country: string
  commodity: Commodity
  countryRisk: CountryRiskCategory
  level: RiskLevel
  score: number
  placeCount: number
  places: PlaceRisk[]
}

export interface PortfolioRisk {
  totalSuppliers: number
  totalPlaces: number
  /** Distribution of plot-level conclusions. */
  distribution: Record<RiskLevel, number>
  /** Distribution of plots by EU country-benchmark category. */
  countryBenchmark: Record<CountryRiskCategory, number>
  /** Suppliers sorted by descending risk score — the work queue. */
  suppliers: SupplierRisk[]
  /** Plots that block a negligible-risk conclusion (require mitigation). */
  mitigationNeeded: number
  conclusion: PortfolioConclusion
  /** 0-100 portfolio risk index (mean of plot scores). */
  riskIndex: number
}

/**
 * EU country benchmark (Commission Implementing Regulation (EU) 2025/1093).
 * Only the high-risk and the explicit low-risk countries are listed; every
 * country not present here defaults to `standard` risk, exactly as the
 * regulation prescribes.
 */
const HIGH_RISK_COUNTRIES = new Set(['BY', 'KP', 'MM', 'RU'])

const LOW_RISK_COUNTRIES = new Set([
  // EU member states + EEA/low-risk origins relevant to the product's geography.
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU',
  'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES',
  'SE', 'IS', 'NO', 'CH', 'GB', 'US', 'CA', 'AU', 'NZ', 'JP', 'CN'
])

export function getCountryRisk(code: string): CountryRiskCategory {
  const c = code.trim().toUpperCase()
  if (HIGH_RISK_COUNTRIES.has(c)) return 'high'
  if (LOW_RISK_COUNTRIES.has(c)) return 'low'
  return 'standard'
}

const COUNTRY_BASELINE: Record<CountryRiskCategory, number> = {
  low: 10,
  standard: 40,
  high: 80
}

/**
 * Commodity deforestation pressure. Cattle, palm oil and soy are the dominant
 * drivers of commodity-driven tropical deforestation; the others carry a
 * meaningful but lower baseline.
 */
const COMMODITY_PRESSURE: Record<Commodity, number> = {
  CATTLE: 20,
  PALM_OIL: 20,
  SOY: 20,
  COCOA: 10,
  COFFEE: 10,
  RUBBER: 10,
  WOOD: 10
}

/** Plots larger than this (hectares) must be a polygon, not a point. */
const POINT_AREA_THRESHOLD_HA = 4

const HIGH_SCORE_THRESHOLD = 70
const STANDARD_SCORE_THRESHOLD = 35

function levelFromScore(score: number): RiskLevel {
  if (score >= HIGH_SCORE_THRESHOLD) return 'high'
  if (score >= STANDARD_SCORE_THRESHOLD) return 'standard'
  return 'negligible'
}

/** Numeric ordering so we can take the "worst" of a set of levels. */
const LEVEL_ORDER: Record<RiskLevel, number> = { negligible: 0, standard: 1, high: 2 }

function worstLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return LEVEL_ORDER[a] >= LEVEL_ORDER[b] ? a : b
}

export function assessPlace(place: PlaceInput, supplier: SupplierInput): PlaceRisk {
  const countryRisk = getCountryRisk(place.country)
  const factors: RiskFactor[] = []
  let score = COUNTRY_BASELINE[countryRisk] + COMMODITY_PRESSURE[supplier.commodity]

  if (countryRisk === 'high') {
    factors.push({
      code: 'COUNTRY_HIGH',
      severity: 'critical',
      messageKey: 'risk.factor.countryHigh',
      message: 'Sourced from a country benchmarked as high-risk under the EUDR'
    })
  } else if (countryRisk === 'standard') {
    factors.push({
      code: 'COUNTRY_STANDARD',
      severity: 'info',
      messageKey: 'risk.factor.countryStandard',
      message: 'Standard-risk country under the EU benchmark — full due diligence applies'
    })
  } else {
    factors.push({
      code: 'COUNTRY_LOW',
      severity: 'info',
      messageKey: 'risk.factor.countryLow',
      message: 'Low-risk country under the EU benchmark — simplified due diligence available'
    })
  }

  if (COMMODITY_PRESSURE[supplier.commodity] >= 20) {
    factors.push({
      code: 'COMMODITY_PRESSURE',
      severity: 'warning',
      messageKey: 'risk.factor.commodityPressure',
      message: 'High deforestation-pressure commodity'
    })
  }

  if (place.validationStatus === 'INVALID') {
    score += 30
    factors.push({
      code: 'GEO_INVALID',
      severity: 'critical',
      messageKey: 'risk.factor.geoInvalid',
      message: 'Geolocation failed EUDR validation — the plot cannot be verified'
    })
  } else if (place.validationStatus === 'PENDING') {
    score += 15
    factors.push({
      code: 'GEO_PENDING',
      severity: 'warning',
      messageKey: 'risk.factor.geoPending',
      message: 'Geolocation has not yet passed EUDR validation'
    })
  } else {
    factors.push({
      code: 'GEO_VALID',
      severity: 'info',
      messageKey: 'risk.factor.geoValid',
      message: 'Geolocation passed EUDR validation'
    })
  }

  if (place.areaHectares > POINT_AREA_THRESHOLD_HA && place.geometryType === 'POINT') {
    score += 20
    factors.push({
      code: 'LARGE_POINT',
      severity: 'critical',
      messageKey: 'risk.factor.largePoint',
      message: 'Plot over 4 ha submitted as a point — geolocation is not precise enough'
    })
  }

  if (!(place.areaHectares > 0)) {
    score += 10
    factors.push({
      code: 'AREA_MISSING',
      severity: 'warning',
      messageKey: 'risk.factor.areaMissing',
      message: 'Plot area is missing'
    })
  }

  score = Math.min(100, Math.round(score))
  let level = levelFromScore(score)

  // A plot whose geolocation failed validation can never support a negligible
  // conclusion, regardless of country/commodity baseline.
  if (place.validationStatus === 'INVALID') {
    level = worstLevel(level, 'standard')
  }

  return {
    id: place.id,
    name: place.name,
    country: place.country,
    countryRisk,
    areaHectares: place.areaHectares,
    level,
    score,
    factors
  }
}

export function assessSupplier(supplier: SupplierInput): SupplierRisk {
  const countryRisk = getCountryRisk(supplier.country)
  const places = supplier.places.map((p) => assessPlace(p, supplier))

  let level: RiskLevel
  let score: number

  if (places.length === 0) {
    // No geolocation submitted yet: fall back to inherent country + commodity
    // risk, and floor to at least `standard` since nothing can be verified.
    score = Math.min(100, COUNTRY_BASELINE[countryRisk] + COMMODITY_PRESSURE[supplier.commodity])
    level = worstLevel(levelFromScore(score), 'standard')
  } else {
    score = Math.max(...places.map((p) => p.score))
    level = places.reduce<RiskLevel>((acc, p) => worstLevel(acc, p.level), 'negligible')
  }

  return {
    id: supplier.id,
    name: supplier.name,
    country: supplier.country,
    commodity: supplier.commodity,
    countryRisk,
    level,
    score,
    placeCount: places.length,
    places
  }
}

export function assessPortfolio(suppliers: SupplierInput[]): PortfolioRisk {
  const supplierRisks = suppliers.map(assessSupplier).sort((a, b) => b.score - a.score)
  const allPlaces = supplierRisks.flatMap((s) => s.places)

  const distribution: Record<RiskLevel, number> = { negligible: 0, standard: 0, high: 0 }
  const countryBenchmark: Record<CountryRiskCategory, number> = { low: 0, standard: 0, high: 0 }
  for (const p of allPlaces) {
    distribution[p.level]++
    countryBenchmark[p.countryRisk]++
  }

  const mitigationNeeded = distribution.high
  const riskIndex =
    allPlaces.length > 0
      ? Math.round(allPlaces.reduce((sum, p) => sum + p.score, 0) / allPlaces.length)
      : 0

  let conclusion: PortfolioConclusion
  if (supplierRisks.some((s) => s.level === 'high')) {
    conclusion = 'action_required'
  } else if (supplierRisks.some((s) => s.level === 'standard')) {
    conclusion = 'due_diligence'
  } else {
    conclusion = 'ready'
  }

  return {
    totalSuppliers: supplierRisks.length,
    totalPlaces: allPlaces.length,
    distribution,
    countryBenchmark,
    suppliers: supplierRisks,
    mitigationNeeded,
    conclusion,
    riskIndex
  }
}
