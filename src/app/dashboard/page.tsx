'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  Loader2,
  Circle,
  ListChecks,
  FileCheck,
  FileWarning
} from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { buildOnboarding } from '@/lib/onboarding'
import type { MitigationPlan, TaskPriority } from '@/lib/mitigation'

const PRIORITY_VARIANT: Record<TaskPriority, 'destructive' | 'warning'> = {
  high: 'destructive',
  medium: 'warning'
}

interface DashboardStats {
  totalSuppliers: number
  completedSuppliers: number
  inProgressSuppliers: number
  totalPlaces: number
  validationErrors: number
  recentExports: Array<{
    id: string
    createdAt: string
    fileSizeBytes: number
    supplierCount: number
  }>
}

export default function DashboardPage() {
  const { t } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [plan, setPlan] = useState<MitigationPlan | null>(null)
  const [dds, setDds] = useState<{ negligibleRisk: boolean; totalPlots: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiFetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
    setLoading(false)
  }, [])

  const fetchActions = useCallback(async () => {
    try {
      const [planRes, ddsRes] = await Promise.all([apiFetch('/api/mitigation'), apiFetch('/api/dds')])
      if (planRes.ok) setPlan((await planRes.json()).plan)
      if (ddsRes.ok) {
        const d = (await ddsRes.json()).dds
        setDds({ negligibleRisk: d.negligibleRisk, totalPlots: d.totalPlots })
      }
    } catch (error) {
      console.error('Failed to fetch next actions:', error)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchActions()
  }, [fetchStats, fetchActions])

  const handleLoadSampleData = async () => {
    setSeeding(true)
    try {
      const response = await apiFetch('/api/demo/seed', { method: 'POST' })
      if (response.ok) {
        setLoading(true)
        await fetchStats()
      }
    } catch (error) {
      console.error('Failed to load sample data:', error)
    } finally {
      setSeeding(false)
    }
  }

  const completionRate = stats && stats.totalSuppliers > 0
    ? Math.round((stats.completedSuppliers / stats.totalSuppliers) * 100)
    : 0

  const onboarding = stats
    ? buildOnboarding({
        totalSuppliers: stats.totalSuppliers,
        totalPlaces: stats.totalPlaces,
        completedSuppliers: stats.completedSuppliers,
        hasExports: stats.recentExports.length > 0
      })
    : null
  const nextStep = onboarding?.steps.find((s) => !s.done)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dash.title')}</h1>
          <p className="text-muted-foreground">{t('dash.subtitle')}</p>
        </div>
        <Link href="/dashboard/suppliers">
          <Button>
            {t('dash.manageSuppliers')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dash.totalSuppliers')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.totalSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">{t('dash.invitedSuppliers')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dash.completed')}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.completedSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">{t('dash.dataSubmitted')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dash.inProgress')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.inProgressSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">{t('dash.awaitingData')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dash.productionPlaces')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.totalPlaces || 0}</div>
            <p className="text-xs text-muted-foreground">{t('dash.totalPlots')}</p>
          </CardContent>
        </Card>
      </div>

      {stats && stats.totalSuppliers > 0 && plan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                {t('dash.nba.title')}
              </CardTitle>
              <Link href="/dashboard/risk">
                <Button variant="outline" size="sm">
                  {plan.tasks.length > 0 ? t('dash.nba.viewAll', { n: plan.tasks.length }) : t('nav.risk')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* DDS readiness */}
            {dds && dds.totalPlots > 0 && (
              <Link
                href="/dashboard/dds"
                className={`flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-gray-50 ${
                  dds.negligibleRisk ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {dds.negligibleRisk ? (
                    <FileCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                  ) : (
                    <FileWarning className="h-5 w-5 text-amber-600 shrink-0" />
                  )}
                  <span className="text-sm font-medium">
                    {dds.negligibleRisk ? t('dash.nba.ready') : t('dash.nba.draft')}
                  </span>
                </div>
                <span className="text-sm text-emerald-700 font-medium whitespace-nowrap">{t('dash.nba.viewStatement')}</span>
              </Link>
            )}

            {/* Top mitigation tasks */}
            {plan.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dash.nba.allClear')}</p>
            ) : (
              <div className="space-y-2">
                {plan.tasks.slice(0, 3).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Badge variant={PRIORITY_VARIANT[task.priority]}>{t(`mit.priority.${task.priority}`)}</Badge>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{t(task.titleKey)}</div>
                      <div className="text-xs text-muted-foreground truncate">{task.supplierName}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {stats && stats.totalSuppliers > 0 && onboarding && !onboarding.allDone && (
        <Card className="border-emerald-200">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle>{t('dash.onboarding.title')}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('dash.onboarding.steps', { done: onboarding.completedCount, total: onboarding.totalCount })}
                </p>
              </div>
              {nextStep && (
                <Link href={nextStep.href}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    {nextStep.cta}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
            <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all"
                style={{ width: `${onboarding.progress}%` }}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {onboarding.steps.map((step) => (
                <li key={step.key} className="flex items-start gap-3">
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className={step.done ? 'font-medium line-through text-muted-foreground' : 'font-medium'}>
                      {step.label}
                    </div>
                    {!step.done && (
                      <div className="text-sm text-muted-foreground">{step.description}</div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {stats && stats.totalSuppliers > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dash.progress.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>{t('dash.progress.overall')}</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-600 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-medium">{stats.completedSuppliers}</div>
                  <div className="text-muted-foreground">{t('dash.completed')}</div>
                </div>
                <div>
                  <div className="font-medium">{stats.inProgressSuppliers}</div>
                  <div className="text-muted-foreground">{t('dash.inProgress')}</div>
                </div>
                <div>
                  <div className="font-medium">{stats.totalSuppliers - stats.completedSuppliers - stats.inProgressSuppliers}</div>
                  <div className="text-muted-foreground">{t('dash.progress.notStarted')}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats && stats.recentExports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('dash.recentExports')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentExports.slice(0, 5).map((exportItem) => (
                <div 
                  key={exportItem.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{t('exp.item')}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(exportItem.createdAt).toLocaleDateString()} • {t('exp.suppliers', { n: exportItem.supplierCount })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{formatBytes(exportItem.fileSizeBytes)}</Badge>
                    <Button variant="outline" size="sm">
                      {t('exp.download')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/exports">
              <Button variant="outline" className="w-full mt-4">
                {t('dash.viewAllExports')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!stats && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('dash.empty.title')}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t('dash.empty.sub')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/dashboard/suppliers">
                <Button>{t('dash.empty.add')}</Button>
              </Link>
              <Button variant="outline" onClick={handleLoadSampleData} disabled={seeding}>
                {seeding && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('dash.empty.sample')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
