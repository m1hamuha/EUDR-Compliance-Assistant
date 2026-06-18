'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  FileText,
  MapPin,
  Square,
  Send,
  ListChecks,
  ExternalLink
} from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { COMMODITY_LABELS } from '@/lib/utils'
import type { PortfolioRisk, RiskLevel, CountryRiskCategory } from '@/lib/risk'
import type { MitigationPlan, TaskPriority } from '@/lib/mitigation'

type BadgeVariant = 'success' | 'warning' | 'destructive'

const LEVEL_VARIANT: Record<RiskLevel, BadgeVariant> = {
  negligible: 'success',
  standard: 'warning',
  high: 'destructive'
}

const LEVEL_BAR: Record<RiskLevel, string> = {
  negligible: 'bg-emerald-500',
  standard: 'bg-amber-500',
  high: 'bg-red-500'
}

const BENCHMARK_VARIANT: Record<CountryRiskCategory, BadgeVariant> = {
  low: 'success',
  standard: 'warning',
  high: 'destructive'
}

const CONCLUSION_STYLE: Record<
  PortfolioRisk['conclusion'],
  { wrap: string; icon: React.ElementType; iconColor: string }
> = {
  ready: { wrap: 'border-emerald-200 bg-emerald-50', icon: ShieldCheck, iconColor: 'text-emerald-600' },
  due_diligence: { wrap: 'border-amber-200 bg-amber-50', icon: ShieldAlert, iconColor: 'text-amber-600' },
  action_required: { wrap: 'border-red-200 bg-red-50', icon: AlertTriangle, iconColor: 'text-red-600' }
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'text-red-600',
  warning: 'text-amber-600',
  info: 'text-muted-foreground'
}

const PRIORITY_VARIANT: Record<TaskPriority, BadgeVariant> = {
  high: 'destructive',
  medium: 'warning'
}

function riskIndexColor(index: number): string {
  if (index >= 70) return '#dc2626'
  if (index >= 35) return '#d97706'
  return '#16a34a'
}

export default function RiskPage() {
  const { t } = useI18n()
  const [data, setData] = useState<PortfolioRisk | null>(null)
  const [plan, setPlan] = useState<MitigationPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [reminding, setReminding] = useState<string | null>(null)
  const [reminderMsg, setReminderMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [riskRes, planRes] = await Promise.all([
        apiFetch('/api/risk'),
        apiFetch('/api/mitigation')
      ])
      if (riskRes.ok) setData((await riskRes.json()).risk)
      if (planRes.ok) setPlan((await planRes.json()).plan)
    } catch (error) {
      console.error('Failed to load risk assessment:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const remind = async (supplierIds: string[], key: string) => {
    if (supplierIds.length === 0) return
    setReminding(key)
    setReminderMsg(null)
    try {
      const res = await apiFetch('/api/suppliers/remind-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierIds })
      })
      const json = await res.json().catch(() => null)
      if (res.ok) {
        setReminderMsg(
          json?.failed
            ? t('mit.sentFailed', { sent: json.sent, failed: json.failed })
            : t('mit.sent', { sent: json?.sent ?? supplierIds.length })
        )
        await load()
      } else {
        setReminderMsg(t('mit.sendFail'))
      }
    } catch {
      setReminderMsg(t('mit.sendFail'))
    } finally {
      setReminding(null)
    }
  }

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
          <h1 className="text-3xl font-bold">{t('risk.title')}</h1>
          <p className="text-muted-foreground">{t('risk.subtitle')}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('risk.empty.title')}</h3>
            <p className="text-muted-foreground text-center">{t('risk.empty.sub')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const conclusion = CONCLUSION_STYLE[data.conclusion]
  const ConclusionIcon = conclusion.icon
  const totalPlots = data.totalPlaces || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t('risk.title')}</h1>
          <p className="text-muted-foreground">{t('risk.subtitle')}</p>
        </div>
        <Link href="/report">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            {t('an.report')}
          </Button>
        </Link>
      </div>

      {/* Operator conclusion banner */}
      <div className={`flex items-start gap-3 rounded-lg border p-4 ${conclusion.wrap}`}>
        <ConclusionIcon className={`h-6 w-6 shrink-0 ${conclusion.iconColor}`} />
        <div>
          <div className="font-semibold">{t(`risk.conclusion.${data.conclusion}.title`)}</div>
          <div className="text-sm text-muted-foreground">
            {t(`risk.conclusion.${data.conclusion}.sub`, { n: data.mitigationNeeded })}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t('risk.index')}</div>
            <div className="mt-2 text-3xl font-bold" style={{ color: riskIndexColor(data.riskIndex) }}>
              {data.riskIndex}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{t('risk.index.sub')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t('risk.mitigation')}</div>
            <div className={`mt-2 text-3xl font-bold ${data.mitigationNeeded > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {data.mitigationNeeded}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t('risk.plots')}</div>
            <div className="mt-2 text-3xl font-bold">{data.totalPlaces}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-sm text-muted-foreground">{t('risk.suppliersCount')}</div>
            <div className="mt-2 text-3xl font-bold">{data.totalSuppliers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution + country benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>{t('risk.distribution')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
              {(['negligible', 'standard', 'high'] as RiskLevel[]).map((lvl) =>
                data.distribution[lvl] > 0 ? (
                  <div
                    key={lvl}
                    className={LEVEL_BAR[lvl]}
                    style={{ width: `${(data.distribution[lvl] / totalPlots) * 100}%` }}
                  />
                ) : null
              )}
            </div>
            <div className="space-y-2">
              {(['negligible', 'standard', 'high'] as RiskLevel[]).map((lvl) => (
                <div key={lvl} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${LEVEL_BAR[lvl]}`} />
                    {t(`risk.level.${lvl}`)}
                  </span>
                  <span className="font-medium">{data.distribution[lvl]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('risk.benchmark')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(['low', 'standard', 'high'] as CountryRiskCategory[]).map((cat) => (
              <div key={cat} className="flex items-center justify-between text-sm">
                <Badge variant={BENCHMARK_VARIANT[cat]}>{t(`risk.benchmark.${cat}`)}</Badge>
                <span className="font-medium">{data.countryBenchmark[cat]}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">{t('risk.benchmark.note')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Mitigation action plan — the "what to do now" companion to the verdict */}
      {plan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                {t('mit.title')}
                {plan.tasks.length > 0 && <Badge variant="warning">{plan.tasks.length}</Badge>}
              </CardTitle>
              {plan.remindableSupplierIds.length > 0 && (
                <Button
                  onClick={() => remind(plan.remindableSupplierIds, 'all')}
                  disabled={reminding !== null}
                >
                  {reminding === 'all' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {t('mit.remindAll', { n: plan.remindableSupplierIds.length })}
                </Button>
              )}
            </div>
            {reminderMsg && <p className="text-sm text-green-700 mt-2">{reminderMsg}</p>}
          </CardHeader>
          <CardContent>
            {plan.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('mit.none')}</p>
            ) : (
              <div className="space-y-2">
                {plan.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={PRIORITY_VARIANT[task.priority]}>
                          {t(`mit.priority.${task.priority}`)}
                        </Badge>
                        <span className="font-medium text-sm">{t(task.titleKey)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {task.supplierName} · {task.country}
                        {' · '}
                        {task.plotName ?? t('mit.supplierLevel')}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {task.action === 'remind' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => remind([task.supplierId], task.id)}
                          disabled={reminding !== null}
                        >
                          {reminding === task.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          {t('mit.action.remind')}
                        </Button>
                      ) : (
                        <Link href={`/dashboard/suppliers/${task.supplierId}`}>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-1" />
                            {t('mit.action.view')}
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk by supplier */}
      <Card>
        <CardHeader><CardTitle>{t('risk.bySupplier')}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.suppliers.map((s) => {
            const isOpen = expanded.has(s.id)
            return (
              <div key={s.id} className="border rounded-lg">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.country} • {COMMODITY_LABELS[s.commodity] ?? s.commodity} •{' '}
                        {s.placeCount > 0 ? t('risk.col.plots', { n: s.placeCount }) : t('risk.noPlots')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={BENCHMARK_VARIANT[s.countryRisk]} className="hidden sm:inline-flex">
                      {t(`risk.benchmark.${s.countryRisk}`)}
                    </Badge>
                    <Badge variant={LEVEL_VARIANT[s.level]}>{t(`risk.level.${s.level}`)}</Badge>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t px-4 py-3 space-y-3 bg-gray-50/50">
                    {s.places.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('risk.noPlots')}</p>
                    ) : (
                      s.places.map((p) => (
                        <div key={p.id} className="rounded-md border bg-white p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {p.areaHectares > 4 ? (
                                <Square className="h-4 w-4 text-emerald-600 shrink-0" />
                              ) : (
                                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                              )}
                              <span className="font-medium truncate">{p.name}</span>
                            </div>
                            <Badge variant={LEVEL_VARIANT[p.level]}>{t(`risk.level.${p.level}`)}</Badge>
                          </div>
                          <ul className="mt-2 space-y-1">
                            {p.factors.map((f, i) => (
                              <li
                                key={i}
                                className={`text-xs flex items-start gap-1.5 ${SEVERITY_COLOR[f.severity] ?? ''}`}
                              >
                                <span className="mt-0.5">•</span>
                                <span>{t(f.messageKey)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
