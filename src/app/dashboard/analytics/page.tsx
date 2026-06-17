'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Send,
  FileText
} from 'lucide-react'
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
  atRisk: Array<{ id: string; name: string; country: string; commodity: string; daysWaiting: number; hasEmail: boolean }>
  weeklyCompletions: Array<{ weekStart: string; count: number }>
  momentum: {
    periodDays: number
    completedThisPeriod: number
    completedPrevPeriod: number
    completedDeltaPct: number | null
    newThisPeriod: number
    newPrevPeriod: number
  }
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <Badge variant="secondary">new</Badge>
  const up = delta >= 0
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${up ? 'text-green-600' : 'text-red-600'}`}>
      {up ? '▲' : '▼'} {Math.abs(delta)}%
    </span>
  )
}

function scoreColor(score: number): string {
  if (score >= 75) return '#16a34a'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = scoreColor(score)
  return (
    <div className="relative flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="14" />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-emerald-600" />
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  )
}

const FUNNEL_STAGES: Array<{ key: keyof Analytics['funnel']; label: string; color: string }> = [
  { key: 'invited', label: 'Invited', color: 'bg-gray-400' },
  { key: 'inProgress', label: 'In Progress', color: 'bg-amber-500' },
  { key: 'completed', label: 'Completed', color: 'bg-sky-500' },
  { key: 'validated', label: 'Validated', color: 'bg-green-600' }
]

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [reminding, setReminding] = useState(false)
  const [reminderMsg, setReminderMsg] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await apiFetch('/api/analytics')
      if (res.ok) {
        const json = await res.json()
        setData(json.analytics)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const handleRemindAll = async () => {
    if (!data) return
    const ids = data.atRisk.filter((s) => s.hasEmail).map((s) => s.id)
    if (ids.length === 0) return
    setReminding(true)
    setReminderMsg(null)
    try {
      const res = await apiFetch('/api/suppliers/remind-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierIds: ids })
      })
      const json = await res.json()
      if (res.ok) {
        setReminderMsg(`Reminders sent: ${json.sent}${json.failed ? `, failed: ${json.failed}` : ''}`)
        fetchAnalytics()
      } else {
        setReminderMsg(json.error || 'Failed to send reminders')
      }
    } catch {
      setReminderMsg('Failed to send reminders')
    } finally {
      setReminding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data || data.totalSuppliers === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Supply-chain compliance performance</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No data yet</h3>
            <p className="text-muted-foreground text-center">
              Invite suppliers and collect production data to see your compliance metrics.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const funnelMax = Math.max(1, ...FUNNEL_STAGES.map((s) => data.funnel[s.key]))
  const trendMax = Math.max(1, ...data.weeklyCompletions.map((w) => w.count))
  const remindableCount = data.atRisk.filter((s) => s.hasEmail).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Supply-chain compliance performance</p>
        </div>
        <Link href="/report">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Compliance report
          </Button>
        </Link>
      </div>

      {/* North-star score + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Compliance Readiness
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ScoreGauge score={data.complianceScore} />
            <p className="text-sm text-muted-foreground text-center mt-4">
              Weighted from completion rate (60%) and validation pass rate (40%).
            </p>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <KpiCard icon={Users} label="Response rate" value={`${data.responseRate}%`} sub="Suppliers that engaged" />
          <KpiCard icon={CheckCircle2} label="Completion rate" value={`${data.completionRate}%`} sub="Finished data collection" />
          <KpiCard
            icon={Clock}
            label="Avg time to compliance"
            value={data.avgTimeToCompleteDays !== null ? `${data.avgTimeToCompleteDays}d` : '—'}
            sub="Invitation → completion"
          />
          <KpiCard icon={ShieldCheck} label="Validation pass rate" value={`${data.validationPassRate}%`} sub={`${data.totalPlaces} production places`} />
        </div>
      </div>

      {/* Funnel + trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Collection funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {FUNNEL_STAGES.map((stage) => {
              const value = data.funnel[stage.key]
              return (
                <div key={stage.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{stage.label}</span>
                    <span className="font-medium">{value}</span>
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stage.color} rounded-full`}
                      style={{ width: `${(value / funnelMax) * 100}%`, transition: 'width 0.6s ease' }}
                    />
                  </div>
                </div>
              )
            })}
            {data.funnel.error > 0 && (
              <p className="text-xs text-red-600 pt-1">{data.funnel.error} supplier(s) in error state</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Completions per week</CardTitle>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">
                  {data.momentum.completedThisPeriod} this week
                </span>
                <DeltaBadge delta={data.momentum.completedDeltaPct} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-1 h-40">
              {data.weeklyCompletions.map((w) => (
                <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end gap-1">
                  <div
                    className="w-full bg-emerald-500 rounded-t"
                    style={{ height: `${(w.count / trendMax) * 100}%`, minHeight: w.count > 0 ? 4 : 0, transition: 'height 0.6s ease' }}
                    title={`${w.count} completed`}
                  />
                  <span className="text-[10px] text-muted-foreground">{w.weekStart.slice(5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-risk suppliers — the engagement lever */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              At-risk suppliers
              {data.atRisk.length > 0 && <Badge variant="warning">{data.atRisk.length}</Badge>}
            </CardTitle>
            {remindableCount > 0 && (
              <Button onClick={handleRemindAll} disabled={reminding}>
                {reminding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send {remindableCount} reminder{remindableCount > 1 ? 's' : ''}
              </Button>
            )}
          </div>
          {reminderMsg && <p className="text-sm text-green-700 mt-2">{reminderMsg}</p>}
        </CardHeader>
        <CardContent>
          {data.atRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stalled invitations — every supplier is engaged. 🎉</p>
          ) : (
            <div className="space-y-2">
              {data.atRisk.slice(0, 10).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.country} • {COMMODITY_LABELS[s.commodity] ?? s.commodity}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!s.hasEmail && <Badge variant="secondary">No email</Badge>}
                    <Badge variant="destructive">{s.daysWaiting}d waiting</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>By commodity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.byCommodity.map((c) => (
              <div key={c.commodity} className="flex items-center justify-between text-sm">
                <span>{COMMODITY_LABELS[c.commodity] ?? c.commodity}</span>
                <Badge variant="outline">{c.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Country coverage</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.coverageByCountry.map((c) => (
              <div key={c.country} className="flex items-center justify-between text-sm">
                <span>{c.country}</span>
                <Badge variant="outline">{c.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
