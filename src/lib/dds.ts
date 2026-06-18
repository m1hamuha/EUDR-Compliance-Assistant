import type { Commodity, GeometryType } from '@prisma/client'
import { assessPortfolio, type SupplierInput, type RiskLevel, type PortfolioConclusion } from './risk'

/**
 * Due Diligence Statement (DDS) builder.
 *
 * Under EUDR Art. 33 an operator that places a relevant product on the EU
 * market must submit a Due Diligence Statement to the Information System
 * (TRACES) before doing so, confirming that due diligence was carried out and
 * that the products present no more than a negligible risk. This module turns
 * the portfolio risk assessment into that structured statement.
 *
 * The statement is only fileable when every supplier reaches a negligible-risk
 * conclusion; otherwise it is generated as a clearly-marked DRAFT.
 */

/** Representative EUDR Annex I HS headings per commodity. */
export const HS_CODES: Record<Commodity, { code: string; description: string }> = {
  CATTLE: { code: '0102, 0201, 0202, 4101', description: 'Live cattle, bovine meat and raw hides' },
  COCOA: { code: '1801, 1804, 1805, 1806', description: 'Cocoa beans, butter, powder and chocolate' },
  COFFEE: { code: '0901', description: 'Coffee, whether or not roasted or decaffeinated' },
  PALM_OIL: { code: '1511, 1207.10', description: 'Palm oil and palm nuts/kernels' },
  RUBBER: { code: '4001, 4005, 4011', description: 'Natural rubber and articles thereof' },
  SOY: { code: '1201, 1208, 1507, 2304', description: 'Soya beans, flour, oil and oil-cake' },
  WOOD: { code: '4401, 4403, 4407, 4408', description: 'Fuel wood, wood in the rough, sawn wood and veneer' }
}

export interface DDSOperator {
  companyName: string
  country: string
  email: string
}

export interface DDSPlot {
  supplierName: string
  plotName: string
  country: string
  areaHectares: number
  geometryType: GeometryType
  riskLevel: RiskLevel
}

export interface DDSCommodity {
  commodity: Commodity
  hsCode: string
  description: string
  plotCount: number
  totalAreaHectares: number
  countries: string[]
}

export interface DueDiligenceStatement {
  referenceNumber: string
  generatedAt: string
  operator: DDSOperator
  /** This product targets operators placing products on the market. */
  activityType: 'OPERATOR_PLACING_ON_MARKET'
  commodities: DDSCommodity[]
  plots: DDSPlot[]
  totalPlots: number
  totalAreaHectares: number
  conclusion: PortfolioConclusion
  /** True only when the statement can be submitted (every plot negligible). */
  negligibleRisk: boolean
  riskIndex: number
  statement: string
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/** Deterministic, non-cryptographic short code derived from a string. */
function shortCode(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0
  }
  return h.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)
}

export function buildReferenceNumber(clientId: string, now: Date): string {
  const date = yyyymmdd(now)
  return `EUDR-DDS-${date}-${shortCode(clientId + date)}`
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function buildDDS(input: {
  clientId: string
  operator: DDSOperator
  suppliers: SupplierInput[]
  now?: Date
}): DueDiligenceStatement {
  const now = input.now ?? new Date()
  const portfolio = assessPortfolio(input.suppliers)

  const plots: DDSPlot[] = []
  const commodityMap = new Map<Commodity, DDSCommodity>()

  for (const supplier of portfolio.suppliers) {
    let entry = commodityMap.get(supplier.commodity)
    if (!entry) {
      const hs = HS_CODES[supplier.commodity]
      entry = {
        commodity: supplier.commodity,
        hsCode: hs.code,
        description: hs.description,
        plotCount: 0,
        totalAreaHectares: 0,
        countries: []
      }
      commodityMap.set(supplier.commodity, entry)
    }

    for (const place of supplier.places) {
      plots.push({
        supplierName: supplier.name,
        plotName: place.name,
        country: place.country,
        areaHectares: place.areaHectares,
        geometryType: place.areaHectares > 4 ? 'POLYGON' : 'POINT',
        riskLevel: place.level
      })
      entry.plotCount++
      entry.totalAreaHectares += place.areaHectares
      if (!entry.countries.includes(place.country)) entry.countries.push(place.country)
    }
  }

  const commodities = Array.from(commodityMap.values())
    .map((c) => ({ ...c, totalAreaHectares: round2(c.totalAreaHectares), countries: c.countries.sort() }))
    .sort((a, b) => b.plotCount - a.plotCount)

  const totalAreaHectares = round2(plots.reduce((sum, p) => sum + p.areaHectares, 0))
  const negligibleRisk = portfolio.conclusion === 'ready' && portfolio.totalPlaces > 0

  const statement = buildStatementText({
    operator: input.operator,
    negligibleRisk,
    conclusion: portfolio.conclusion,
    mitigationNeeded: portfolio.mitigationNeeded,
    totalPlots: portfolio.totalPlaces
  })

  return {
    referenceNumber: buildReferenceNumber(input.clientId, now),
    generatedAt: now.toISOString(),
    operator: input.operator,
    activityType: 'OPERATOR_PLACING_ON_MARKET',
    commodities,
    plots,
    totalPlots: portfolio.totalPlaces,
    totalAreaHectares,
    conclusion: portfolio.conclusion,
    negligibleRisk,
    riskIndex: portfolio.riskIndex,
    statement
  }
}

function buildStatementText(args: {
  operator: DDSOperator
  negligibleRisk: boolean
  conclusion: PortfolioConclusion
  mitigationNeeded: number
  totalPlots: number
}): string {
  const company = args.operator.companyName || 'The operator'

  if (args.totalPlots === 0) {
    return `DRAFT — no geolocation data has been collected yet. ${company} cannot complete due diligence or submit a statement until the geolocation of all plots of land has been collected and verified.`
  }

  if (args.negligibleRisk) {
    return (
      `Having exercised due diligence in accordance with Regulation (EU) 2023/1115, ${company} confirms ` +
      `that the relevant commodities and products covered by this statement present no more than a negligible ` +
      `risk of being associated with deforestation or forest degradation. The required information, including ` +
      `the geolocation of all plots of land, has been collected, assessed and verified against the geometry ` +
      `requirements of the Regulation.`
    )
  }

  if (args.conclusion === 'action_required') {
    return (
      `DRAFT — this statement cannot be submitted. ${company} has identified ${args.mitigationNeeded} plot(s) ` +
      `carrying a high risk of being associated with deforestation. Risk-mitigation measures must be completed ` +
      `and the plots must reach a negligible-risk conclusion before a Due Diligence Statement can be filed.`
    )
  }

  return (
    `DRAFT — due diligence is still in progress. ${company} must complete the standard due-diligence checks for ` +
    `all plots and reach a negligible-risk conclusion before this Due Diligence Statement can be submitted.`
  )
}
