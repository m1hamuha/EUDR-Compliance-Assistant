'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const eventHandlersRef = { click: null as L.LeafletEventHandlerFn | null }
  const moveEndHandlerRef = null as L.LeafletEventHandlerFn | null
  const { setCenter } = useMapStore()
  const [isClient, setIsClient] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsClient(true)
    return () => setIsClient(false)
  }, [])

  const cleanupMap = useCallback(() => {
    if (mapInstanceRef.current) {
      if (eventHandlersRef.click && onClick) {
        mapInstanceRef.current.off('click', eventHandlersRef.click)
      }
      if (moveEndHandlerRef) {
        mapInstanceRef.current.off('moveend', moveEndHandlerRef)
      }
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
    if (tileLayerRef.current) {
      tileLayerRef.current = null
    }
  }, [onClick, moveEndHandlerRef])

  useEffect(() => {
    if (!isClient || !mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true
    })

    tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
      updateWhenIdle: true,
      reuseTiles: true
    }).addTo(map)

    if (onClick) {
      eventHandlersRef.click = (e: L.LeafletMouseEvent) => onClick(e)
      map.on('click', eventHandlersRef.click)
    }

    const handleMoveEnd = () => {
      const mapCenter = map.getCenter()
      setCenter([mapCenter.lat, mapCenter.lng])
    }
    map.on('moveend', handleMoveEnd)

    mapInstanceRef.current = map
    onMapReady?.(map)

    setIsMounted(true)

    return () => {
      cleanupMap()
    }
  }, [isClient, center, zoom, onClick, setCenter, cleanupMap, onMapReady])

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
