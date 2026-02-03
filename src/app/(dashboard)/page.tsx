'use client'

import { useEffect, useState } from 'react'
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
  Loader2
} from 'lucide-react'
import { formatBytes } from '@/lib/utils'

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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/suppliers?status=all')
        if (response.ok) {
          const data = await response.json()
          setStats({
            totalSuppliers: data.suppliers?.length || 0,
            completedSuppliers: data.suppliers?.filter((s: { status: string }) => s.status === 'COMPLETED').length || 0,
            inProgressSuppliers: data.suppliers?.filter((s: { status: string }) => s.status === 'IN_PROGRESS').length || 0,
            totalPlaces: data.suppliers?.reduce((acc: number, s: { _count: { productionPlaces: number } }) => acc + s._count.productionPlaces, 0) || 0,
            validationErrors: 0,
            recentExports: []
          })
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  const completionRate = stats && stats.totalSuppliers > 0
    ? Math.round((stats.completedSuppliers / stats.totalSuppliers) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your EUDR compliance data collection</p>
        </div>
        <Link href="/suppliers">
          <Button>
            Manage Suppliers
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.totalSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">Invited suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.completedSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">Data submitted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.inProgressSuppliers || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Production Places</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '...' : stats?.totalPlaces || 0}</div>
            <p className="text-xs text-muted-foreground">Total plots collected</p>
          </CardContent>
        </Card>
      </div>

      {stats && stats.totalSuppliers > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Collection Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Overall completion</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-medium">{stats.completedSuppliers}</div>
                  <div className="text-muted-foreground">Completed</div>
                </div>
                <div>
                  <div className="font-medium">{stats.inProgressSuppliers}</div>
                  <div className="text-muted-foreground">In Progress</div>
                </div>
                <div>
                  <div className="font-medium">{stats.totalSuppliers - stats.completedSuppliers - stats.inProgressSuppliers}</div>
                  <div className="text-muted-foreground">Not Started</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {stats && stats.recentExports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Exports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentExports.slice(0, 5).map((exportItem) => (
                <div 
                  key={exportItem.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">GeoJSON Export</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(exportItem.createdAt).toLocaleDateString()} • {exportItem.supplierCount} suppliers
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{formatBytes(exportItem.fileSizeBytes)}</Badge>
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/exports">
              <Button variant="outline" className="w-full mt-4">
                View All Exports
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {!stats && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Get started</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first supplier to begin collecting EUDR compliance data
            </p>
            <Link href="/suppliers">
              <Button>Add Supplier</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
