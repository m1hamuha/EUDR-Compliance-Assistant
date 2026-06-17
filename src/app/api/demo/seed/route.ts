import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/utils'
import { buildDemoSuppliers } from '@/lib/demo-data'
import { addDays, subDays } from 'date-fns'

/**
 * Populates a fresh account with a realistic sample supply chain so the
 * dashboard and analytics are demo-ready in one click. Refuses to run if the
 * account already has suppliers, so it never pollutes real data.
 */
export async function POST() {
  try {
    const session = await requireSession()
    const clientId = session.sub

    const existing = await prisma.supplier.count({ where: { clientId } })
    if (existing > 0) {
      return NextResponse.json(
        { error: 'Sample data can only be loaded into an empty account.' },
        { status: 409 }
      )
    }

    const now = new Date()
    const demo = buildDemoSuppliers()
    let suppliersCreated = 0
    let placesCreated = 0

    for (const s of demo) {
      const invitationSentAt = subDays(now, s.invitationDaysAgo)
      const completedAt = s.completedDaysAgo !== null ? subDays(now, s.completedDaysAgo) : null

      await prisma.supplier.create({
        data: {
          clientId,
          name: s.name,
          country: s.country,
          commodity: s.commodity,
          contactEmail: s.contactEmail,
          status: s.status,
          invitationToken: generateToken(),
          invitationSentAt,
          invitationExpiresAt: addDays(invitationSentAt, 7),
          completedAt,
          productionPlaces: {
            create: s.places.map((p) => ({
              name: p.name,
              areaHectares: p.areaHectares,
              geometryType: p.geometryType,
              coordinates: JSON.parse(JSON.stringify(p.coordinates)),
              country: p.country,
              validationStatus: p.validationStatus
            }))
          }
        }
      })
      suppliersCreated++
      placesCreated += s.places.length
    }

    return NextResponse.json({ success: true, suppliersCreated, placesCreated })
  } catch (error) {
    console.error('Demo seed error:', error)
    return NextResponse.json({ error: 'Failed to load sample data' }, { status: 500 })
  }
}
