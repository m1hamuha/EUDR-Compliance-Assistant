'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, FileCheck, FileWarning, Printer, Download, History, Save } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { COMMODITY_LABELS, formatDate } from '@/lib/utils'
import type { DueDiligenceStatement } from '@/lib/dds'

interface DDSRecord {
  id: string
  referenceNumber: string
  conclusion: 'ready' | 'due_diligence' | 'action_required'
  negligibleRisk: boolean
  riskIndex: number
  totalPlots: number
  totalAreaHectares: number
  commodities: string[]
  createdAt: string
}

export default function DDSPage() {
  const { t } = useI18n()
  const [dds, setDds] = useState<DueDiligenceStatement | null>(null)
  const [records, setRecords] = useState<DDSRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordMsg, setRecordMsg] = useState<string | null>(null)

  const loadRecords = useCallback(async () => {
    try {
      const res = await apiFetch('/api/dds/records')
      if (res.ok) setRecords((await res.json()).records ?? [])
    } catch (error) {
      console.error('Failed to load DDS records:', error)
    }
  }, [])

  const load = useCallback(async () => {
    try {
      const res = await apiFetch('/api/dds')
      if (res.ok) setDds((await res.json()).dds)
      await loadRecords()
    } catch (error) {
      console.error('Failed to load DDS:', error)
    } finally {
      setLoading(false)
    }
  }, [loadRecords])

  useEffect(() => {
    load()
  }, [load])

  const handleRecord = async () => {
    setRecording(true)
    setRecordMsg(null)
    try {
      const res = await apiFetch('/api/dds/records', { method: 'POST' })
      if (res.ok) {
        setRecordMsg(t('dds.recorded'))
        await loadRecords()
      } else {
        setRecordMsg(t('dds.recordFail'))
      }
    } catch {
      setRecordMsg(t('dds.recordFail'))
    } finally {
      setRecording(false)
    }
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await apiFetch('/api/dds?download=1')
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${dds?.referenceNumber ?? 'eudr-dds'}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download statement:', error)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!dds || dds.totalPlots === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('dds.title')}</h1>
          <p className="text-muted-foreground">{t('dds.subtitle')}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileWarning className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('dds.empty.title')}</h3>
            <p className="text-muted-foreground text-center">{t('dds.empty.sub')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ready = dds.negligibleRisk

  return (
    <div className="space-y-6">
      {/* Toolbar — hidden when printing */}
      <div className="flex items-start justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-3xl font-bold">{t('dds.title')}</h1>
          <p className="text-muted-foreground">{t('dds.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecord} disabled={recording}>
            {recording ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {t('dds.record')}
          </Button>
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {t('dds.download')}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            {t('dds.print')}
          </Button>
        </div>
      </div>

      {recordMsg && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 print:hidden">
          {recordMsg}
        </div>
      )}

      {/* Readiness banner */}
      <div
        className={`flex items-start gap-3 rounded-lg border p-4 ${
          ready ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
        }`}
      >
        {ready ? (
          <FileCheck className="h-6 w-6 shrink-0 text-emerald-600" />
        ) : (
          <FileWarning className="h-6 w-6 shrink-0 text-amber-600" />
        )}
        <div>
          <div className="font-semibold">{ready ? t('dds.ready.title') : t('dds.draft.title')}</div>
          <div className="text-sm text-muted-foreground">{ready ? t('dds.ready.sub') : t('dds.draft.sub')}</div>
        </div>
      </div>

      {/* The statement document */}
      <Card className="print:border-0 print:shadow-none">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              <FileCheck className="h-8 w-8 text-emerald-600" />
              <div>
                <h2 className="text-xl font-bold">{t('dds.title')}</h2>
                <p className="text-sm text-muted-foreground">Regulation (EU) 2023/1115</p>
              </div>
            </div>
            {!ready && <Badge variant="warning">DRAFT</Badge>}
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('dds.refNumber')}</dt>
              <dd className="font-mono font-medium">{dds.referenceNumber}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('dds.generated')}</dt>
              <dd className="font-medium">{formatDate(dds.generatedAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('dds.operator')}</dt>
              <dd className="font-medium">{dds.operator.companyName} · {dds.operator.country}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('dds.activity')}</dt>
              <dd className="font-medium">{t('dds.activity.value')}</dd>
            </div>
          </dl>

          {/* Commodities */}
          <div>
            <h3 className="font-semibold mb-2">{t('dds.commodities')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 font-medium">{t('dds.col.commodity')}</th>
                    <th className="py-2 font-medium">{t('dds.col.hsCode')}</th>
                    <th className="py-2 font-medium text-right">{t('dds.col.plots')}</th>
                    <th className="py-2 font-medium text-right">{t('dds.col.area')}</th>
                    <th className="py-2 font-medium">{t('dds.col.countries')}</th>
                  </tr>
                </thead>
                <tbody>
                  {dds.commodities.map((c) => (
                    <tr key={c.commodity} className="border-b align-top">
                      <td className="py-2 font-medium">{COMMODITY_LABELS[c.commodity] ?? c.commodity}</td>
                      <td className="py-2 font-mono text-xs">{c.hsCode}</td>
                      <td className="py-2 text-right">{c.plotCount}</td>
                      <td className="py-2 text-right">{c.totalAreaHectares}</td>
                      <td className="py-2">{c.countries.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="border rounded-lg p-3">
              <div className="text-2xl font-bold">{dds.totalPlots}</div>
              <div className="text-xs text-muted-foreground">{t('dds.totalPlots')}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-2xl font-bold">{dds.totalAreaHectares}</div>
              <div className="text-xs text-muted-foreground">{t('dds.totalArea')}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-sm font-semibold mt-1">
                <Badge variant={ready ? 'success' : 'warning'}>
                  {t(`risk.conclusion.${dds.conclusion}.title`)}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{t('dds.riskConclusion')}</div>
            </div>
          </div>

          {/* Statement text */}
          <div>
            <h3 className="font-semibold mb-2">{t('dds.statement')}</h3>
            <p className="text-sm leading-relaxed">{dds.statement}</p>
          </div>

          <div className="border-t pt-4 text-xs text-muted-foreground">{t('dds.legal')}</div>
        </CardContent>
      </Card>

      {/* Statement history — the audit trail of recorded statements */}
      <Card className="print:hidden">
        <CardContent className="p-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            {t('dds.history')}
          </h3>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dds.history.empty')}</p>
          ) : (
            <div className="space-y-2">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{r.referenceNumber}</span>
                      <Badge variant={r.negligibleRisk ? 'success' : 'warning'}>
                        {t(`risk.conclusion.${r.conclusion}.title`)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDate(r.createdAt)} · {t('dds.col.plots')}: {r.totalPlots} · {r.totalAreaHectares} ha
                    </div>
                  </div>
                  <a href={`/api/dds/records/${r.id}`} className="shrink-0">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      {t('exp.download')}
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
