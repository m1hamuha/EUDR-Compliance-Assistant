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
  const [exports, setExports] = useState<Export[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [exportOptions, setExportOptions] = useState({
    commodity: 'all' as string,
    convertSmallToPoints: false,
    includeAuditLog: true
  })

  const fetchExports = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/exports')
      if (response.ok) {
        const data = await response.json()
        setExports(data.exports)
      }
    } catch (error) {
      console.error('Failed to fetch exports:', error)
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

      const response = await fetch('/api/exports', {
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
        alert(result.error || 'Export failed')
      }
    } catch (error) {
      console.error('Failed to generate export:', error)
      alert('Export failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exports</h1>
          <p className="text-muted-foreground">Generate and download EUDR-compliant GeoJSON files</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <FileArchive className="h-4 w-4 mr-2" />
              Generate Export
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Generate GeoJSON Export</DialogTitle>
              <DialogDescription>
                Create a compliance-ready export for EU Information System
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Commodity</Label>
                <Select
                  value={exportOptions.commodity}
                  onValueChange={(value) => setExportOptions({ ...exportOptions, commodity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Commodities</SelectItem>
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
                  Export Options
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
                    Convert small plots (≤4 ha) to points to reduce file size
                  </label>
                </div>

                {exportOptions.convertSmallToPoints && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <p>
                      Plots under 4 hectares can use point geometry per EUDR rules. 
                      This will reduce file size but may affect precision requirements.
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
                    Include audit log for traceability
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleGenerateExport} disabled={generating}>
                {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Generate & Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : exports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No exports yet. Generate your first GeoJSON export above.
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
                      <span className="font-medium">GeoJSON Export</span>
                      {exportItem.commodity && (
                        <Badge variant="outline">{COMMODITY_LABELS[exportItem.commodity]}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDate(exportItem.createdAt)} • {exportItem.supplierIds.length} suppliers
                    </div>
                    {exportItem.validationReport && (
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span className="text-green-600">
                          {exportItem.validationReport.validFeatures} valid
                        </span>
                        {exportItem.validationReport.invalidFeatures > 0 && (
                          <span className="text-red-600">
                            {exportItem.validationReport.invalidFeatures} errors
                          </span>
                        )}
                        {exportItem.validationReport.optimizations && (
                          <span className="text-blue-600">
                            {exportItem.validationReport.optimizations.length} optimizations
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
                      Download
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
