'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { Map as LeafletMap, GeoJSON as LeafletGeoJSON } from 'leaflet'
import L from 'leaflet'
import { MapContainer } from './MapContainer'

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
    }
  }>
}

const STATUS_COLOR: Record<string, string> = {
  VALID: '#059669',
  INVALID: '#dc2626',
  PENDING: '#d97706'
}

const colorFor = (status: string) => STATUS_COLOR[status] ?? STATUS_COLOR.PENDING

export default function PlacesMap({ data }: { data: PlacesFeatureCollection }) {
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

    const layer = L.geoJSON(data as unknown as GeoJSON.GeoJsonObject, {
      style: (feature) => {
        const status = feature?.properties?.validationStatus as string
        return { color: colorFor(status), weight: 2, fillColor: colorFor(status), fillOpacity: 0.3 }
      },
      pointToLayer: (feature, latlng) => {
        const status = feature?.properties?.validationStatus as string
        return L.circleMarker(latlng, { radius: 7, color: colorFor(status), fillColor: colorFor(status), fillOpacity: 0.7, weight: 2 })
      },
      onEachFeature: (feature, lyr) => {
        const p = feature.properties
        lyr.bindPopup(`<strong>${p.name}</strong><br/>${p.supplier}<br/>${p.areaHectares} ha · ${p.validationStatus}`)
      }
    }).addTo(map)

    layerRef.current = layer
    try {
      const bounds = layer.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    } catch {
      // ignore invalid bounds
    }
  }, [data])

  // Re-render the layer when data changes after the map is already ready.
  useEffect(() => {
    if (mapRef.current) renderLayer(mapRef.current)
  }, [renderLayer])

  return <MapContainer className="h-[32rem] rounded-lg border" onMapReady={handleMapReady} />
}
