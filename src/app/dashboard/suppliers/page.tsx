'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Plus,
  Search,
  Mail,
  Loader2,
  FileText
} from 'lucide-react'
import Papa from 'papaparse'
import { formatDate, COMMODITY_LABELS } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import type { SupplierStatus, Commodity } from '@prisma/client'

interface Supplier {
  id: string
  name: string
  country: string
  commodity: Commodity
  status: SupplierStatus
  invitationSentAt: string | null
  completedAt: string | null
  _count: { productionPlaces: number }
}

const statusColors: Record<SupplierStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  INVITED: 'secondary',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  VALIDATED: 'default',
  ERROR: 'destructive'
}

const statusKeys: Record<SupplierStatus, string> = {
  INVITED: 'status.INVITED',
  IN_PROGRESS: 'status.IN_PROGRESS',
  COMPLETED: 'status.COMPLETED',
  VALIDATED: 'status.VALIDATED',
  ERROR: 'status.ERROR'
}

export default function SuppliersPage() {
  const { t } = useI18n()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [commodityFilter, setCommodityFilter] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ created: number; errors: Array<{ row: number; error: string }> } | null>(null)
  const [usage, setUsage] = useState<{ used: number; max: number | null } | null>(null)
  const [addError, setAddError] = useState<string | null>(null)

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    country: 'BR',
    commodity: 'COFFEE' as Commodity,
    contactEmail: ''
  })

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (commodityFilter !== 'all') params.set('commodity', commodityFilter)

      const response = await apiFetch(`/api/suppliers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers ?? [])
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, commodityFilter])

  const fetchUsage = useCallback(async () => {
    try {
      const res = await apiFetch('/api/account/usage')
      if (res.ok) {
        const data = await res.json()
        setUsage({ used: data.usage.suppliers, max: data.definition.maxSuppliers })
      }
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  const handleAddSupplier = async () => {
    setAddError(null)
    try {
      const response = await apiFetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      })

      if (response.ok) {
        setAddDialogOpen(false)
        setNewSupplier({ name: '', country: 'BR', commodity: 'COFFEE', contactEmail: '' })
        fetchSuppliers()
        fetchUsage()
      } else {
        const data = await response.json().catch(() => null)
        setAddError(data?.error?.message ?? data?.error ?? t('sup.add.fail'))
      }
    } catch (error) {
      console.error('Failed to add supplier:', error)
      setAddError(t('sup.add.fail'))
    }
  }

  const handleImportCsv = () => {
    if (!csvFile) return
    setImporting(true)
    setImportResult(null)

    Papa.parse<Record<string, string>>(csvFile, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: async (results) => {
        try {
          const suppliers = results.data
            .map((row) => ({
              name: (row.name ?? '').trim(),
              country: (row.country ?? '').trim().toUpperCase(),
              commodity: (row.commodity ?? '').trim().toUpperCase(),
              contactEmail: (row.contactEmail ?? row.email ?? '').trim() || undefined
            }))
            .filter((s) => s.name && s.country)

          const response = await apiFetch('/api/suppliers/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ suppliers })
          })
          const data = await response.json()

          if (response.ok) {
            setImportResult({ created: data.created ?? 0, errors: data.errors ?? [] })
            fetchSuppliers()
          } else {
            setImportResult({ created: 0, errors: [{ row: 0, error: data.error || t('sup.import.fail') }] })
          }
        } catch {
          setImportResult({ created: 0, errors: [{ row: 0, error: t('sup.import.fail') }] })
        } finally {
          setImporting(false)
        }
      },
      error: () => {
        setImportResult({ created: 0, errors: [{ row: 0, error: t('sup.import.parseFail') }] })
        setImporting(false)
      }
    })
  }

  const handleSendReminder = async (supplierId: string) => {
    try {
      const response = await apiFetch(`/api/suppliers/${supplierId}/remind`, {
        method: 'POST'
      })
      if (response.ok) {
        alert(t('sup.reminderSent'))
      }
    } catch (error) {
      console.error('Failed to send reminder:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('sup.title')}</h1>
          <p className="text-muted-foreground">
            {t('sup.subtitle')}
            {usage && (
              <span className="ml-2">
                · <span className="font-medium">{usage.used}{usage.max !== null ? ` / ${usage.max}` : ''}</span> {t('sup.used')}
                {usage.max !== null && usage.used >= usage.max && (
                  <Link href="/dashboard/billing" className="ml-2 text-emerald-700 hover:underline font-medium">{t('common.upgrade')}</Link>
                )}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">{t('sup.importCsv')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('sup.import.title')}</DialogTitle>
                <DialogDescription>
                  {t('sup.import.desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    setCsvFile(e.target.files?.[0] ?? null)
                    setImportResult(null)
                  }}
                />
                {importResult && (
                  <div className="text-sm rounded-lg border p-3 bg-gray-50">
                    <p className="font-medium text-green-700">{t('sup.import.result', { n: importResult.created })}</p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-red-600">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{t('sup.import.row', { row: err.row, error: err.error })}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>{t('common.close')}</Button>
                <Button onClick={handleImportCsv} disabled={!csvFile || importing}>
                  {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t('sup.import.button')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('sup.add')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('sup.add.title')}</DialogTitle>
                <DialogDescription>
                  {t('sup.add.desc')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {addError && (
                  <div className="rounded-lg bg-red-50 text-red-700 text-sm px-3 py-2">
                    {addError}{' '}
                    <Link href="/dashboard/billing" className="underline font-medium">{t('sup.viewPlans')}</Link>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>{t('sup.name')}</Label>
                  <Input
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    placeholder={t('sup.name.placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('sup.country')}</Label>
                  <Select
                    value={newSupplier.country}
                    onValueChange={(value) => setNewSupplier({ ...newSupplier, country: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BR">Brazil</SelectItem>
                      <SelectItem value="ET">Ethiopia</SelectItem>
                      <SelectItem value="ID">Indonesia</SelectItem>
                      <SelectItem value="CO">Colombia</SelectItem>
                      <SelectItem value="VN">Vietnam</SelectItem>
                      <SelectItem value="UG">Uganda</SelectItem>
                      <SelectItem value="PE">Peru</SelectItem>
                      <SelectItem value="GH">Ghana</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('sup.commodity')}</Label>
                  <Select
                    value={newSupplier.commodity}
                    onValueChange={(value) => setNewSupplier({ ...newSupplier, commodity: value as Commodity })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
                <div className="space-y-2">
                  <Label>{t('sup.email')}</Label>
                  <Input
                    type="email"
                    value={newSupplier.contactEmail}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactEmail: e.target.value })}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleAddSupplier} disabled={!newSupplier.name}>{t('sup.add')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('sup.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('sup.filter.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('sup.filter.allStatus')}</SelectItem>
            <SelectItem value="INVITED">{t('status.INVITED')}</SelectItem>
            <SelectItem value="IN_PROGRESS">{t('status.IN_PROGRESS')}</SelectItem>
            <SelectItem value="COMPLETED">{t('status.COMPLETED')}</SelectItem>
            <SelectItem value="VALIDATED">{t('status.VALIDATED')}</SelectItem>
            <SelectItem value="ERROR">{t('status.ERROR')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={commodityFilter} onValueChange={setCommodityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('sup.filter.commodity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('sup.filter.allCommodities')}</SelectItem>
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

      <Card>
        <CardHeader>
          <CardTitle>{t('sup.list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('sup.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {suppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/suppliers/${supplier.id}`} className="font-medium hover:text-emerald-700 hover:underline">
                        {supplier.name}
                      </Link>
                      <Badge variant={statusColors[supplier.status]}>
                        {t(statusKeys[supplier.status])}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {COMMODITY_LABELS[supplier.commodity]} • {supplier.country} • {t('sup.places', { n: supplier._count.productionPlaces })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {supplier.invitationSentAt && (
                      <span className="text-xs text-muted-foreground">
                        {t('sup.invited', { date: formatDate(supplier.invitationSentAt) })}
                      </span>
                    )}
                    {supplier.status === 'INVITED' || supplier.status === 'IN_PROGRESS' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendReminder(supplier.id)}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        {t('sup.remind')}
                      </Button>
                    ) : (
                      <Link href={`/dashboard/suppliers/${supplier.id}`}>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4 mr-1" />
                          {t('sup.view')}
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
    </div>
  )
}
