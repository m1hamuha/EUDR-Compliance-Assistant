'use client'

import { useEffect, useState } from 'react'
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
  MoreHorizontal, 
  Loader2,
  FileText,
  RefreshCw
} from 'lucide-react'
import { formatDate, COMMODITY_LABELS } from '@/lib/utils'
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

const statusLabels: Record<SupplierStatus, string> = {
  INVITED: 'Invited',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  VALIDATED: 'Validated',
  ERROR: 'Error'
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [commodityFilter, setCommodityFilter] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const [newSupplier, setNewSupplier] = useState({
    name: '',
    country: 'BR',
    commodity: 'COFFEE' as Commodity,
    contactEmail: ''
  })

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (commodityFilter !== 'all') params.set('commodity', commodityFilter)

      const response = await fetch(`/api/suppliers?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data.suppliers)
      }
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuppliers()
  }, [search, statusFilter, commodityFilter])

  const handleAddSupplier = async () => {
    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier)
      })

      if (response.ok) {
        setAddDialogOpen(false)
        setNewSupplier({ name: '', country: 'BR', commodity: 'COFFEE', contactEmail: '' })
        fetchSuppliers()
      }
    } catch (error) {
      console.error('Failed to add supplier:', error)
    }
  }

  const handleSendReminder = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/remind`, {
        method: 'POST'
      })
      if (response.ok) {
        alert('Reminder sent!')
      }
    } catch (error) {
      console.error('Failed to send reminder:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your supplier data collection</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Import CSV</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Suppliers from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with columns: name, country, commodity, contactEmail (optional)
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input type="file" accept=".csv" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
                <Button>Import</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
                <DialogDescription>
                  Add a supplier to start collecting EUDR compliance data
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Supplier Name</Label>
                  <Input
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    placeholder="e.g., Coffee Farm A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
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
                  <Label>Commodity</Label>
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
                  <Label>Contact Email (optional)</Label>
                  <Input
                    type="email"
                    value={newSupplier.contactEmail}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactEmail: e.target.value })}
                    placeholder="supplier@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddSupplier} disabled={!newSupplier.name}>Add Supplier</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="INVITED">Invited</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="VALIDATED">Validated</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
          </SelectContent>
        </Select>
        <Select value={commodityFilter} onValueChange={setCommodityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Commodity" />
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

      <Card>
        <CardHeader>
          <CardTitle>Supplier List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No suppliers found. Add your first supplier to get started.
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
                      <span className="font-medium">{supplier.name}</span>
                      <Badge variant={statusColors[supplier.status]}>
                        {statusLabels[supplier.status]}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {COMMODITY_LABELS[supplier.commodity]} • {supplier.country} • {supplier._count.productionPlaces} places
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {supplier.invitationSentAt && (
                      <span className="text-xs text-muted-foreground">
                        Invited {formatDate(supplier.invitationSentAt)}
                      </span>
                    )}
                    {supplier.status === 'INVITED' || supplier.status === 'IN_PROGRESS' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendReminder(supplier.id)}
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Remind
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        <FileText className="h-4 w-4 mr-1" />
                        View
                      </Button>
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
