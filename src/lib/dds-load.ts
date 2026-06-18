import { prisma } from './prisma'
import { buildDDS, type DueDiligenceStatement } from './dds'
import type { SupplierInput } from './risk'

/**
 * Loads the authenticated client's operator details and supply chain, then
 * builds the current Due Diligence Statement. Shared by the live DDS view and
 * the "record statement" endpoint so both stay perfectly in sync.
 *
 * Returns null when the client cannot be found.
 */
export async function loadDDS(clientId: string): Promise<DueDiligenceStatement | null> {
  const [client, suppliers] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { companyName: true, country: true, email: true }
    }),
    prisma.supplier.findMany({
      where: { clientId },
      select: {
        id: true,
        name: true,
        country: true,
        commodity: true,
        productionPlaces: {
          select: {
            id: true,
            name: true,
            country: true,
            areaHectares: true,
            geometryType: true,
            validationStatus: true
          }
        }
      }
    })
  ])

  if (!client) return null

  const input: SupplierInput[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    country: s.country,
    commodity: s.commodity,
    places: s.productionPlaces.map((p) => ({
      id: p.id,
      name: p.name,
      country: p.country,
      areaHectares: p.areaHectares,
      geometryType: p.geometryType,
      validationStatus: p.validationStatus
    }))
  }))

  return buildDDS({
    clientId,
    operator: { companyName: client.companyName, country: client.country, email: client.email },
    suppliers: input
  })
}
