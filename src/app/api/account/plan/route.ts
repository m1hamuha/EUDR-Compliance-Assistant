import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

const schema = z.object({
  plan: z.enum(['TRIAL', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
})

/**
 * Switches the account's subscription plan. In production this would be gated
 * behind a payment provider (Stripe) webhook; here it performs the plan change
 * directly so the upgrade flow is demonstrable end-to-end.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSession()
    const body = await request.json()
    const { plan } = schema.parse(body)

    const client = await prisma.client.findUnique({
      where: { id: session.sub },
      select: { plan: true, email: true }
    })
    if (!client) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const previousPlan = client.plan
    const updated = await prisma.client.update({
      where: { id: session.sub },
      data: { plan },
      select: { id: true, plan: true }
    })

    await createAuditLog('PLAN_UPGRADE', 'Client', session.sub, {
      clientId: session.sub,
      userEmail: client.email
    }, { from: previousPlan, to: plan })

    return NextResponse.json({ success: true, plan: updated.plan, previousPlan })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid plan', details: error.issues }, { status: 400 })
    }
    console.error('Plan change error:', error)
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 })
  }
}

