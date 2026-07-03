'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  FileArchive, 
  Download, 
  Loader2, 
  Settings2,
  AlertTriangle
} from 'lucide-react'
import { formatDate, formatBytes, COMMODITY_LABELS } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import type { Commodity } from '@prisma/client'

interface Export {
  id: string
  createdAt: string
  fileSizeBytes: number
  commodity: Commodity | null
  supplierIds: string[]
  validationReport: {
    validFeatures: number
    invalidFeatures: number
    errors: Array<{ name: string; error: string }>
    optimizations?: string[]
  } | null
}

export default function ExportsPage() {
  const { t } = useI18n()
  const [exports, setExports] = useState<Export[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [exportOptions, setExportOptions] = useState({
    commodity: 'all' as string,
    convertSmallToPoints: false,
    includeAuditLog: true
  })

  const fetchExports = async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const response = await apiFetch('/api/exports')
      if (response.ok) {
        const data = await response.json()
        setExports(data.exports ?? [])
      } else {
        setLoadFailed(true)
      }
    } catch (error) {
      console.error('Failed to fetch exports:', error)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExports()
  }, [])

  const handleGenerateExport = async () => {
    setGenerating(true)
    try {
      const body: Record<string, unknown> = {
        includeAuditLog: exportOptions.includeAuditLog
      }

      if (exportOptions.convertSmallToPoints) {
        body.convertSmallToPoints = true
      }

      if (exportOptions.commodity !== 'all') {
        body.commodity = exportOptions.commodity
      }

      const response = await apiFetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()

      if (result.success && result.downloadUrl) {
        window.open(result.downloadUrl, '_blank')
        setDialogOpen(false)
        fetchExports()
      } else {
        alert(result.error || t('exp.fail'))
      }
    } catch (error) {
      console.error('Failed to generate export:', error)
      alert(t('exp.fail'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('exp.title')}</h1>
          <p className="text-muted-foreground">{t('exp.subtitle')}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FileArchive className="h-4 w-4 mr-2" />
              {t('exp.generate')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('exp.gen.title')}</DialogTitle>
              <DialogDescription>
                {t('exp.gen.desc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="export-commodity">{t('exp.commodity')}</Label>
                <Select
                  value={exportOptions.commodity}
                  onValueChange={(value) => setExportOptions({ ...exportOptions, commodity: value })}
                >
                  <SelectTrigger id="export-commodity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('exp.allCommodities')}</SelectItem>
                    <SelectItem value="COFFEE">Coffee</SelectItem>
                    <SelectItem value="COCOA">Cocoa</SelectItem>
                    <SelectItem value="WOOD">Wood</SelectItem>
                    <SelectItem value="CATTLE">Cattle</SelectItem>
                    <SelectItem value="PALM_OIL">Palm Oil</SelectItem>
                    <SelectItem value="RUBBER">Rubber</SelectItem>
                    <SelectItem value="SOY">Soy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 pt-2 border-t">
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  {t('exp.options')}
                </Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="optimize"
                    checked={exportOptions.convertSmallToPoints}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, convertSmallToPoints: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="optimize"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('exp.optimize')}
                  </label>
                </div>

                {exportOptions.convertSmallToPoints && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>
                      {t('exp.optimize.warn')}
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="audit"
                    checked={exportOptions.includeAuditLog}
                    onCheckedChange={(checked) =>
                      setExportOptions({ ...exportOptions, includeAuditLog: checked as boolean })
                    }
                  />
                  <label
                    htmlFor="audit"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('exp.audit')}
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleGenerateExport} disabled={generating}>
                {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('exp.gen.button')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('exp.history')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : loadFailed ? (
            <p role="alert" className="text-sm text-red-600 py-8 text-center">
              {t('exp.loadError')}
            </p>
          ) : exports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('exp.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {exports.map((exportItem) => (
                <div
                  key={exportItem.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <FileArchive className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{t('exp.item')}</span>
                      {exportItem.commodity && (
                        <Badge variant="outline">{COMMODITY_LABELS[exportItem.commodity]}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(exportItem.createdAt)} • {t('exp.suppliers', { n: exportItem.supplierIds.length })}
                    </div>
                    {exportItem.validationReport && (
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-green-600">
                          {t('exp.valid', { n: exportItem.validationReport.validFeatures })}
                        </span>
                        {exportItem.validationReport.invalidFeatures > 0 && (
                          <span className="text-red-600">
                            {t('exp.errors', { n: exportItem.validationReport.invalidFeatures })}
                          </span>
                        )}
                        {exportItem.validationReport.optimizations && (
                          <span className="text-emerald-600">
                            {t('exp.optimizations', { n: exportItem.validationReport.optimizations.length })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {formatBytes(exportItem.fileSizeBytes)}
                    </span>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      {t('exp.download')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
