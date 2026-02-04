'use client'

import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import { useMapStore } from '@/stores/useMapStore'

interface PolygonDrawerProps {
  onComplete: (coordinates: [number, number][]) => void
  existingPolygon?: [number, number][]
  readOnly?: boolean
}

export function PolygonDrawer({ onComplete, existingPolygon, readOnly }: PolygonDrawerProps) {
  const mapRef = useRef<L.Map | null>(null)
  const polygonRef = useRef<L.Polygon | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])
  const clickHandlerRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null)
  const { currentPolygon, addPolygonVertex, clearPolygon } = useMapStore()

  useEffect(() => {
    if (existingPolygon?.length) {
      clearPolygon()
      existingPolygon.forEach(v => addPolygonVertex(v))
    } else if (!readOnly) {
      clearPolygon()
    }
  }, [existingPolygon, readOnly, addPolygonVertex, clearPolygon])

  const handleMapReady = useCallback((map: L.Map) => {
    if (readOnly) return

    if (clickHandlerRef.current) {
      map.off('click', clickHandlerRef.current)
    }

    const clickHandler = (e: L.LeafletMouseEvent) => {
      const vertex: [number, number] = [e.latlng.lat, e.latlng.lng]
      addPolygonVertex(vertex)
    }
    clickHandlerRef.current = clickHandler

    map.on('click', clickHandler)

    return () => {
      if (clickHandlerRef.current) {
        map.off('click', clickHandlerRef.current)
      }
    }
  }, [readOnly, addPolygonVertex])

  useEffect(() => {
    const mapContainer = document.getElementById('polygon-map-container')
    if (!mapContainer || mapRef.current) return

    const map = L.map(mapContainer, {
      zoomControl: true
    }).setView(existingPolygon?.length ? existingPolygon[0] : [0, 20], 10)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    handleMapReady(map)

    return () => {
      if (clickHandlerRef.current) {
        map.off('click', clickHandlerRef.current)
      }
      map.remove()
      mapRef.current = null
    }
  }, [existingPolygon, handleMapReady])

  useEffect(() => {
    const mapContainer = document.getElementById('polygon-map-container')
    if (!mapContainer) return

    const map = L.map(mapContainer, { zoomControl: false })
    if (existingPolygon?.length) {
      map.setView(existingPolygon[0], 10)
    } else {
      map.setView([0, 20], 10)
    }

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    currentPolygon.forEach((vertex, index) => {
      const marker = L.circleMarker([vertex[0], vertex[1]], {
        radius: 6,
        fillColor: '#2563eb',
        fillOpacity: 1,
        color: '#fff',
        weight: 2
      }).addTo(map)

      if (index === 0) {
        marker.bindPopup('Start point (click again to close)')
      }

      markersRef.current.push(marker)
    })

    if (polygonRef.current) {
      polygonRef.current.remove()
    }

    if (currentPolygon.length >= 3) {
      polygonRef.current = L.polygon(currentPolygon, {
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.3,
        weight: 2
      }).addTo(map)

      onComplete(currentPolygon)
    }

    return () => {
      map.remove()
    }
  }, [currentPolygon, onComplete, existingPolygon])

  if (readOnly && !existingPolygon?.length) {
    return (
      <div className="h-64 rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-muted-foreground">No polygon data</p>
      </div>
    )
  }

  return (
    <div
      id="polygon-map-container"
      className="h-96 w-full rounded-lg border"
      role="application"
      aria-label="Polygon drawing map"
    />
  )
}

export default PolygonDrawer