'use client'

import { useEffect, useRef, useCallback } from 'react'
import L from 'leaflet'
import { useMapStore } from '@/stores/useMapStore'

interface PointMarkerProps {
  onPosition: (lat: number, lng: number) => void
  existingPosition?: [number, number]
  readOnly?: boolean
}

export function PointMarker({ onPosition, existingPosition, readOnly }: PointMarkerProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const { setSelectedMarker, selectedMarker } = useMapStore()

  const initializeMap = useCallback(() => {
    const mapContainer = document.getElementById('point-map-container')
    if (!mapContainer || mapRef.current) return undefined

    const map = L.map(mapContainer, {
      zoomControl: true
    }).setView(existingPosition || [0, 20], 10)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map)

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (readOnly) return
      setSelectedMarker({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    mapRef.current = map

    return map
  }, [existingPosition, setSelectedMarker, readOnly])

  useEffect(() => {
    const map = initializeMap()

    if (existingPosition && map) {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: #2563eb;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      const marker = L.marker(existingPosition, { icon })
        .addTo(map)
        .bindPopup('Production place location')

      markerRef.current = marker
    }

    return () => {
      if (map) {
        map.remove()
        mapRef.current = null
      }
    }
  }, [initializeMap, existingPosition])

  useEffect(() => {
    if (!mapRef.current || !selectedMarker || readOnly) return

    if (markerRef.current) {
      markerRef.current.setLatLng([selectedMarker.lat, selectedMarker.lng])
    } else {
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: #2563eb;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      })

      markerRef.current = L.marker([selectedMarker.lat, selectedMarker.lng], { icon })
        .addTo(mapRef.current)
        .bindPopup('Production place location')
    }

    mapRef.current.setView([selectedMarker.lat, selectedMarker.lng], 12)
    onPosition(selectedMarker.lat, selectedMarker.lng)
  }, [selectedMarker, onPosition, readOnly])

  if (readOnly && !existingPosition) {
    return (
      <div id="point-map-container" className="h-64 rounded-lg bg-gray-100 flex items-center justify-center">
        <p className="text-muted-foreground">No point data</p>
      </div>
    )
  }

  return (
    <div id="point-map-container" className="h-96 w-full rounded-lg border" />
  )
}

export default PointMarker
