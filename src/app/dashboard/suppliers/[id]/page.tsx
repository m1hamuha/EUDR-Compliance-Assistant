'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, MapPin, Square, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import { COMMODITY_LABELS, formatDate } from '@/lib/utils'

interface ProductionPlace {
  id: string
  name: string
  areaHectares: number
  geometryType: 'POINT' | 'POLYGON'
  country: string
  validationStatus: 'PENDING' | 'VALID' | 'INVALID'
  validationErrors: { errors?: Array<{ code: string; message: string }> } | null
  coordinates: unknown
  createdAt: string
}

interface Supplier {
  id: string
  name: string
  country: string
  commodity: string
  status: string
  contactEmail: string | null
  contactPhone: string | null
  invitationSentAt: string | null
  completedAt: string | null
  productionPlaces: ProductionPlace[]
}

const validationBadge: Record<string, { variant: 'success' | 'destructive' | 'secondary'; labelKey: string }> = {
  VALID: { variant: 'success', labelKey: 'val.VALID' },
  INVALID: { variant: 'destructive', labelKey: 'val.INVALID' },
  PENDING: { variant: 'secondary', labelKey: 'val.PENDING' }
}

export default function SupplierDetailPage() {
  const { t } = useI18n()
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/suppliers/${id}`)
      if (res.ok) {
        setSupplier((await res.json()).supplier)
      } else if (res.status === 404) {
        setSupplier(null)
      }
    } catch (error) {
      console.error('Failed to load supplier:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.push('/dashboard/suppliers')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('sd.back')}
        </Button>
        <Card><CardContent className="py-12 text-center text-muted-foreground">{t('sd.notFound')}</CardContent></Card>
      </div>
    )
  }

  const validCount = supplier.productionPlaces.filter((p) => p.validationStatus === 'VALID').length

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push('/dashboard/suppliers')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        {t('sd.back')}
      </Button>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground">
            {COMMODITY_LABELS[supplier.commodity] ?? supplier.commodity} • {supplier.country}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">{t(`status.${supplier.status}`)}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>{t('sd.details')}</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t('sd.email')}</dt>
              <dd className="font-medium">{supplier.contactEmail ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('sd.phone')}</dt>
              <dd className="font-medium">{supplier.contactPhone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('sd.invited')}</dt>
              <dd className="font-medium">{supplier.invitationSentAt ? formatDate(supplier.invitationSentAt) : '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t('sd.completed')}</dt>
              <dd className="font-medium">{supplier.completedAt ? formatDate(supplier.completedAt) : '—'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('sd.places')}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {t('sd.placesValid', { valid: validCount, total: supplier.productionPlaces.length })}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {supplier.productionPlaces.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Clock className="h-4 w-4" />
              {t('sd.placesEmpty')}
            </div>
          ) : (
            <div className="space-y-3">
              {supplier.productionPlaces.map((place) => {
                const badge = validationBadge[place.validationStatus] ?? validationBadge.PENDING
                const errors = place.validationErrors?.errors ?? []
                return (
                  <div key={place.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {place.geometryType === 'POLYGON' ? (
                          <Square className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <MapPin className="h-4 w-4 text-emerald-600" />
                        )}
                        <span className="font-medium">{place.name}</span>
                      </div>
                      <Badge variant={badge.variant}>
                        {place.validationStatus === 'VALID' ? (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        ) : place.validationStatus === 'INVALID' ? (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        ) : null}
                        {t(badge.labelKey)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t('sd.areaLine', { ha: place.areaHectares, type: place.geometryType, country: place.country })}
                    </div>
                    {errors.length > 0 && (
                      <ul className="mt-2 text-sm text-red-600 list-disc pl-5">
                        {errors.slice(0, 5).map((e, i) => (
                          <li key={i}>{e.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
