'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Locate, AlertCircle } from 'lucide-react'

interface GpsButtonProps {
  onLocation: (lat: number, lng: number) => void
  onError?: (message: string) => void
  disabled?: boolean
}

interface GeolocationError {
  code: number
  message: string
}

const GEOLOCATION_ERRORS: Record<number, string> = {
  1: 'Location access denied. Please enable location services in your browser settings.',
  2: 'Unable to determine your location. Please check your internet connection.',
  3: 'Location request timed out. Please try again.',
}

export function GpsButton({ onLocation, onError, disabled }: GpsButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    if (!navigator.geolocation) {
      const errorMessage = 'Geolocation is not supported by your browser'
      setError(errorMessage)
      onError?.(errorMessage)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          (error: GeolocationError) => {
            reject(new Error(GEOLOCATION_ERRORS[error.code] || error.message))
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
          }
        )
      })

      onLocation(position.coords.latitude, position.coords.longitude)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location'
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [onLocation, onError])

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled || loading}
        className="flex items-center gap-2"
      >
        <Locate className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        {loading ? 'Getting location...' : 'Use my location'}
      </Button>
      {error && (
        <div className="flex items-center gap-1 text-sm text-red-500">
          <AlertCircle className="h-3 w-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

export default GpsButton
