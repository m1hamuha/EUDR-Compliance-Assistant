import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { loadDDS } from '@/lib/dds-load'

export async function GET(request: Request) {
  try {
    const session = await requireSession()
    const dds = await loadDDS(session.sub)

    if (!dds) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // `?download=1` returns the machine-readable statement as a file attachment,
    // mirroring the structured payload an operator submits to the EU Information
    // System (TRACES).
    const url = new URL(request.url)
    if (url.searchParams.get('download') === '1') {
      return new NextResponse(JSON.stringify(dds, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${dds.referenceNumber}.json"`
        }
      })
    }

    return NextResponse.json({ dds })
  } catch (error) {
    console.error('Error building DDS:', error)
    return NextResponse.json({ error: 'Failed to build due diligence statement' }, { status: 500 })
  }
}
