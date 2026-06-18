import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** Downloads the stored snapshot of a recorded Due Diligence Statement. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params

    const record = await prisma.dDSRecord.findFirst({
      where: { id, clientId: session.sub },
      select: { referenceNumber: true, snapshot: true }
    })

    if (!record) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 })
    }

    return new NextResponse(JSON.stringify(record.snapshot, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${record.referenceNumber}.json"`
      }
    })
  } catch (error) {
    console.error('Error downloading DDS record:', error)
    return NextResponse.json({ error: 'Failed to download statement' }, { status: 500 })
  }
}
