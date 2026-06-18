'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, Printer, ArrowLeft, ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { COMMODITY_LABELS } from '@/lib/utils'

interface Analytics {
  totalSuppliers: number
  totalPlaces: number
  complianceScore: number
  funnel: { invited: number; inProgress: number; completed: number; validated: number; error: number }
  responseRate: number
  completionRate: number
  validationPassRate: number
  avgTimeToCompleteDays: number | null
  byCommodity: Array<{ commodity: string; count: number }>
  coverageByCountry: Array<{ country: string; count: number }>
}

interface User {
  companyName: string
  email: string
  country: string
  plan: string
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  )
}

export default function ComplianceReportPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, uRes] = await Promise.all([
          apiFetch('/api/analytics'),
          apiFetch('/api/auth/me')
        ])
        if (aRes.ok) setAnalytics((await aRes.json()).analytics)
        if (uRes.ok) setUser((await uRes.json()).user)
      } catch (error) {
        console.error('Failed to load report:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const generatedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-gray-100 py-8 print:bg-white print:py-0">
      {/* Toolbar (hidden when printing) */}
      <div className="max-w-3xl mx-auto px-4 mb-4 flex justify-between print:hidden">
        <Button variant="ghost" onClick={() => router.push('/dashboard/analytics')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to analytics
        </Button>
        <Button onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      {/* The one-pager */}
      <div className="max-w-3xl mx-auto bg-white shadow-sm print:shadow-none rounded-lg print:rounded-none p-10">
        <div className="flex items-center justify-between border-b pb-6 mb-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-9 w-9 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-bold">EUDR Compliance Report</h1>
              <p className="text-sm text-muted-foreground">EU Deforestation Regulation — supply-chain readiness</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-medium">{user?.companyName ?? '—'}</div>
            <div className="text-muted-foreground">{generatedAt}</div>
          </div>
        </div>

        {!analytics || analytics.totalSuppliers === 0 ? (
          <p className="text-muted-foreground">No supplier data available to report yet.</p>
        ) : (
          <>
            <div className="flex items-center gap-6 mb-8">
              <div className="text-center">
                <div className="text-5xl font-bold text-emerald-600">{analytics.complianceScore}</div>
                <div className="text-xs text-muted-foreground">Readiness / 100</div>
              </div>
              <p className="text-sm text-muted-foreground">
                This risk-adjusted score summarises how ready {user?.companyName ?? 'this organisation'}&apos;s supply
                chain is for EUDR filing, blending data readiness (supplier completion and geolocation validation) with
                the portfolio deforestation-risk index.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Metric label="Suppliers" value={String(analytics.totalSuppliers)} />
              <Metric label="Completion rate" value={`${analytics.completionRate}%`} />
              <Metric label="Validation pass rate" value={`${analytics.validationPassRate}%`} />
              <Metric label="Avg time to compliance" value={analytics.avgTimeToCompleteDays !== null ? `${analytics.avgTimeToCompleteDays}d` : '—'} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="font-semibold mb-2">Collection status</h2>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="py-1">Invited</td><td className="text-right">{analytics.funnel.invited}</td></tr>
                    <tr className="border-b"><td className="py-1">In progress</td><td className="text-right">{analytics.funnel.inProgress}</td></tr>
                    <tr className="border-b"><td className="py-1">Completed</td><td className="text-right">{analytics.funnel.completed}</td></tr>
                    <tr className="border-b"><td className="py-1">Validated</td><td className="text-right">{analytics.funnel.validated}</td></tr>
                    <tr><td className="py-1">Production places</td><td className="text-right">{analytics.totalPlaces}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <h2 className="font-semibold mb-2">Commodity coverage</h2>
                <table className="w-full text-sm">
                  <tbody>
                    {analytics.byCommodity.map((c) => (
                      <tr key={c.commodity} className="border-b">
                        <td className="py-1">{COMMODITY_LABELS[c.commodity] ?? c.commodity}</td>
                        <td className="text-right">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="font-semibold mb-2">Sourcing countries</h2>
              <p className="text-sm text-muted-foreground">
                {analytics.coverageByCountry.map((c) => `${c.country} (${c.count})`).join(' · ')}
              </p>
            </div>
          </>
        )}

        <div className="border-t pt-4 text-xs text-muted-foreground">
          Generated by EUDR Compliance Assistant. This document summarises self-reported supplier
          geolocation data and its validation status against EUDR geometry requirements. It is intended
          to support, not replace, formal due-diligence filing in the EU Information System.
        </div>
      </div>
    </div>
  )
}
