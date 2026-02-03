'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/hooks/useLanguage'
import { MapContainer } from '@/components/maps/MapContainer'
import { PointMarker } from '@/components/maps/PointMarker'
import { PolygonDrawer } from '@/components/maps/PolygonDrawer'
import { GpsButton } from '@/components/maps/GpsButton'
import { Loader2, MapPin, Square } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  areaHectares: z.number().min(0.01, 'Area must be greater than 0'),
  country: z.string().length(2, 'Country is required')
})

type FormData = z.infer<typeof formSchema>

interface ProductionPlaceFormProps {
  onSubmit: (data: FormData & { coordinates: [number, number][] | [number, number] }) => Promise<void>
  initialData?: {
    name: string
    areaHectares: number
    country: string
    geometryType: 'POINT' | 'POLYGON'
    coordinates: [number, number][] | [number, number]
  }
  onComplete?: () => void
}

const countries = [
  { code: 'BR', name: 'Brazil' },
  { code: 'ET', name: 'Ethiopia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'CO', name: 'Colombia' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'UG', name: 'Uganda' },
  { code: 'PE', name: 'Peru' },
  { code: 'GH', name: 'Ghana' },
  { code: 'CI', name: 'Ivory Coast' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'PH', name: 'Philippines' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'IN', name: 'India' },
  { code: 'AR', name: 'Argentina' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'BO', name: 'Bolivia' }
]

export function ProductionPlaceForm({ onSubmit, initialData, onComplete }: ProductionPlaceFormProps) {
  const { t } = useLanguage()
  const [geometryType, setGeometryType] = useState<'POINT' | 'POLYGON'>(initialData?.geometryType || 'POLYGON')
  const [coordinates, setCoordinates] = useState<[number, number][] | [number, number]>(
    initialData?.coordinates || []
  )
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors: formErrors }
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      areaHectares: initialData?.areaHectares || undefined,
      country: initialData?.country || ''
    }
  })

  const area = watch('areaHectares')

  const handleFormSubmit = async (data: FormData) => {
    const newErrors: { field: string; message: string }[] = []

    if (coordinates.length === 0) {
      newErrors.push({ field: 'geometry', message: geometryType === 'POLYGON' 
        ? t('portal.validation.polygonRequired') 
        : t('portal.validation.pointRequired') })
    }

    if (geometryType === 'POLYGON' && coordinates.length < 4) {
      newErrors.push({ field: 'geometry', message: 'Polygon requires at least 4 vertices' })
    }

    if (newErrors.length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    setErrors([])

    try {
      await onSubmit({
        ...data,
        coordinates: coordinates as [number, number][] | [number, number]
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleGpsLocation = (lat: number, lng: number) => {
    setGeometryType('POINT')
    setCoordinates([lat, lng])
    setErrors(prev => prev.filter(e => e.field !== 'geometry'))
  }

  const handlePolygonComplete = (coords: [number, number][]) => {
    setCoordinates(coords)
    setErrors(prev => prev.filter(e => e.field !== 'geometry'))
  }

  const handlePointPosition = (lat: number, lng: number) => {
    setCoordinates([lat, lng])
    setErrors(prev => prev.filter(e => e.field !== 'geometry'))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('portal.productionPlace')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('portal.nameLabel')}</Label>
              <Input
                id="name"
                placeholder={t('portal.namePlaceholder')}
                {...register('name')}
              />
              {formErrors.name && (
                <p className="text-sm text-red-500">{formErrors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">{t('portal.areaLabel')}</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                min="0"
                placeholder={t('portal.areaPlaceholder')}
                {...register('areaHectares', { valueAsNumber: true })}
              />
              {formErrors.areaHectares && (
                <p className="text-sm text-red-500">{formErrors.areaHectares.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('portal.countryLabel')}</Label>
            <Select
              value={watch('country')}
              onValueChange={(value) => setValue('country', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('portal.selectCountry')} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.country && (
              <p className="text-sm text-red-500">{formErrors.country.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Geometry Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={geometryType === 'POLYGON' ? 'default' : 'outline'}
                onClick={() => setGeometryType('POLYGON')}
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                {t('portal.drawPolygon')}
              </Button>
              <Button
                type="button"
                variant={geometryType === 'POINT' ? 'default' : 'outline'}
                onClick={() => setGeometryType('POINT')}
                className="flex-1"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {t('portal.placePoint')}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Location</Label>
              <GpsButton onLocation={handleGpsLocation} disabled={geometryType !== 'POINT'} />
            </div>

            <MapContainer className="h-96 rounded-lg border">
              {geometryType === 'POINT' ? (
                <PointMarker
                  onPosition={handlePointPosition}
                  existingPosition={initialData?.geometryType === 'POINT' ? initialData.coordinates as [number, number] : undefined}
                />
              ) : (
                <PolygonDrawer
                  onComplete={handlePolygonComplete}
                  existingPolygon={initialData?.geometryType === 'POLYGON' ? initialData.coordinates as [number, number][] : undefined}
                />
              )}
            </MapContainer>

            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-500">{error.message}</p>
            ))}

            {area > 4 && geometryType === 'POINT' && (
              <p className="text-sm text-yellow-600">
                Warning: Plots larger than 4 hectares should use polygon geometry according to EUDR requirements.
              </p>
            )}
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('portal.submit')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

export default ProductionPlaceForm
