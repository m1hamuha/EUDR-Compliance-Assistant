'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, MapPin } from 'lucide-react'
import { apiFetch } from '@/lib/api-client'
import { useI18n } from '@/lib/i18n'
import type { PlacesFeatureCollection } from '@/components/maps/PlacesMap'

// Leaflet touches `window` at import time, so load the map (and leaflet) only on
// the client — never during SSR/prerender.
const PlacesMap = dynamic(() => import('@/components/maps/PlacesMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[32rem]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
})

const STATUS_COLOR = { VALID: '#059669', INVALID: '#dc2626', PENDING: '#d97706' }

export default function MapPage() {
  const { t } = useI18n()
  const [data, setData] = useState<PlacesFeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch('/api/production-places/geojson')
        if (res.ok) setData(await res.json())
      } catch (error) {
        console.error('Failed to load map data:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const counts = data
    ? data.features.reduce(
        (acc, f) => {
          acc[f.properties.validationStatus] = (acc[f.properties.validationStatus] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
    : {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('map.title')}</h1>
        <p className="text-muted-foreground">{t('map.subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-emerald-600" />
              {t('map.count', { n: data?.features.length ?? 0 })}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLOR.VALID }} /> {t('map.valid')} {counts.VALID ?? 0}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLOR.INVALID }} /> {t('map.invalid')} {counts.INVALID ?? 0}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLOR.PENDING }} /> {t('map.pending')} {counts.PENDING ?? 0}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-[32rem]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.features.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[32rem] text-muted-foreground">
              <MapPin className="h-10 w-10 mb-3" />
              {t('map.empty')}
            </div>
          ) : data ? (
            <PlacesMap data={data} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
