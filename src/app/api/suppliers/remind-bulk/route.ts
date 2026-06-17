import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { sendSupplierInvitation } from '@/lib/email'
import { addDays } from 'date-fns'

const schema = z.object({
  supplierIds: z.array(z.string()).min(1).max(200)
})

/**
 * Re-sends invitations to a batch of the authenticated client's suppliers.
 * This is the engagement lever behind the analytics "at-risk" list: it lifts
 * supplier response/completion rates by re-prompting stalled invitations.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { supplierIds } = schema.parse(body)

    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds }, clientId: session.sub },
      include: { client: { select: { companyName: true } } }
    })

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const supplier of suppliers) {
      if (!supplier.contactEmail) {
        skipped++
        continue
      }
      try {
        await sendSupplierInvitation({
          email: supplier.contactEmail,
          supplierName: supplier.name,
          invitationToken: supplier.invitationToken,
          companyName: supplier.client.companyName
        })
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: { invitationSentAt: new Date(), invitationExpiresAt: addDays(new Date(), 7) }
        })
        sent++
      } catch (emailError) {
        console.error(`Failed to remind supplier ${supplier.id}:`, emailError)
        failed++
      }
    }

    return NextResponse.json({ success: true, sent, skipped, failed })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 })
    }
    console.error('Bulk reminder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
