'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet'
import L from 'leaflet'
import { MapContainer } from './MapContainer'

export type MapColorBy = 'status' | 'risk'

export interface PlacesFeatureCollection {
  type: 'FeatureCollection'
  features: Array<{
    type: 'Feature'
    geometry: { type: string; coordinates: unknown }
    properties: {
      id: string
      name: string
      supplier: string
      commodity: string
      areaHectares: number
      geometryType: string
      validationStatus: 'PENDING' | 'VALID' | 'INVALID'
      riskLevel: 'negligible' | 'standard' | 'high'
    }
  }>
}

const STATUS_COLOR: Record<string, string> = {
  VALID: '#059669',
  INVALID: '#dc2626',
  PENDING: '#d97706'
}

const RISK_COLOR: Record<string, string> = {
  negligible: '#16a34a',
  standard: '#d97706',
  high: '#dc2626'
}

const statusColor = (status: string) => STATUS_COLOR[status] ?? STATUS_COLOR.PENDING
const riskColor = (level: string) => RISK_COLOR[level] ?? RISK_COLOR.standard

export default function PlacesMap({ data, colorBy = 'status' }: { data: PlacesFeatureCollection; colorBy?: MapColorBy }) {
  const mapRef = useRef<LeafletMap | null>(null)
  const layerRef = useRef<LeafletGeoJSON | null>(null)

  const handleMapReady = useCallback((map: LeafletMap) => {
    mapRef.current = map
    renderLayer(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const renderLayer = useCallback((map: LeafletMap) => {
    if (layerRef.current) {
      layerRef.current.remove()
      layerRef.current = null
    }
    if (data.features.length === 0) return

    const colorOf = (props: Record<string, unknown> | undefined): string =>
      colorBy === 'risk'
        ? riskColor(props?.riskLevel as string)
        : statusColor(props?.validationStatus as string)

    const layer = L.geoJSON(data as unknown as GeoJSON.GeoJsonObject, {
      style: (feature) => {
        const c = colorOf(feature?.properties)
        return { color: c, weight: 2, fillColor: c, fillOpacity: 0.3 }
      },
      pointToLayer: (feature, latlng) => {
        const c = colorOf(feature?.properties)
        return L.circleMarker(latlng, { radius: 7, color: c, fillColor: c, fillOpacity: 0.7, weight: 2 })
      },
      onEachFeature: (feature, lyr) => {
        const p = feature.properties
        lyr.bindPopup(
          `<strong>${p.name}</strong><br/>${p.supplier}<br/>${p.areaHectares} ha · ${p.validationStatus} · risk: ${p.riskLevel}`
        )
      }
    }).addTo(map)

    layerRef.current = layer
    try {
      const bounds = layer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    } catch {
      // ignore invalid bounds
    }
  }, [data, colorBy])

  // Re-render the layer when data changes after the map is already ready.
  useEffect(() => {
    if (mapRef.current) renderLayer(mapRef.current)
  }, [renderLayer])

  return <MapContainer className="h-[32rem] rounded-lg border" onMapReady={handleMapReady} />
}
