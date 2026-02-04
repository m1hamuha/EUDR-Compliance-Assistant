'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMapStore } from '@/stores/useMapStore'

interface MapContainerProps {
  children: React.ReactNode
  center?: [number, number]
  zoom?: number
  onClick?: (e: L.LeafletMouseEvent) => void
  className?: string
  onMapReady?: (map: L.Map) => void
}

export function MapContainer({
  children,
  center = [0, 20],
  zoom = 2,
  onClick,
  className = '',
  onMapReady
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const { setCenter } = useMapStore()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    if (onClick) {
      const clickHandler = (e: L.LeafletMouseEvent) => onClick(e)
      map.on('click', clickHandler)
    }

    map.on('moveend', () => {
      const mapCenter = map.getCenter()
      setCenter([mapCenter.lat, mapCenter.lng])
    })

    mapInstanceRef.current = map
    onMapReady?.(map)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isClient, center, zoom, onClick, setCenter, onMapReady])

  if (!isClient) {
    return (
      <div
        className={`bg-gray-100 animate-pulse rounded-lg ${className}`}
        style={{ minHeight: '400px' }}
        role="presentation"
        aria-label="Loading map"
      />
    )
  }

  return (
    <div
      ref={mapRef}
      className={`leaflet-map ${className}`}
      style={{ minHeight: '400px' }}
      role="application"
      aria-label="Interactive map"
    >
      {children}
    </div>
  )
}

export default MapContainer