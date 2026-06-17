import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSession } from '@/lib/auth'
import { sendSupplierInvitation } from '@/lib/email'
import { addDays } from 'date-fns'

/**
 * Re-sends the invitation email for a supplier and refreshes the sent/expiry
 * timestamps. Scoped to the authenticated client's own suppliers.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession()
    const { id } = await params

    const supplier = await prisma.supplier.findFirst({
      where: { id, clientId: session.sub },
      include: { client: { select: { companyName: true } } }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    if (!supplier.contactEmail) {
      return NextResponse.json(
        { error: 'Supplier has no contact email to send a reminder to' },
        { status: 400 }
      )
    }

    try {
      await sendSupplierInvitation({
        email: supplier.contactEmail,
        supplierName: supplier.name,
        invitationToken: supplier.invitationToken,
        companyName: supplier.client.companyName
      })
    } catch (emailError) {
      console.error('Failed to send reminder email:', emailError)
      return NextResponse.json({ error: 'Failed to send reminder email' }, { status: 502 })
    }

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        invitationSentAt: new Date(),
        invitationExpiresAt: addDays(new Date(), 7)
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
