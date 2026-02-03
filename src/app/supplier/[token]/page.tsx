'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductionPlaceForm } from '@/components/forms/ProductionPlaceForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LanguageProvider, useLanguage } from '@/hooks/useLanguage'
import { Loader2, Globe, CheckCircle2 } from 'lucide-react'

interface SupplierData {
  id: string
  name: string
  country: string
  commodity: string
  productionPlaces: Array<{
    id: string
    name: string
    areaHectares: number
    geometryType: string
    createdAt: string
  }>
}

function SupplierPortalContent() {
  const { t, language, setLanguage } = useLanguage()
  const router = useRouter()
  const [supplier, setSupplier] = useState<SupplierData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [submittingPlace, setSubmittingPlace] = useState(false)

  const token = typeof window !== 'undefined' 
    ? window.location.pathname.split('/supplier/')[1]?.split('/')[0] 
    : ''

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/portal/token/${token}`)
        if (response.ok) {
          const data = await response.json()
          setSupplier(data.supplier)
        } else {
          router.push('/')
        }
      } catch (error) {
        console.error('Failed to fetch supplier:', error)
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchSupplier()
    }
  }, [token, router])

  const handlePlaceSubmit = async (placeData: {
    name: string
    areaHectares: number
    country: string
    coordinates: [number, number][] | [number, number]
  }) => {
    if (!supplier) return

    setSubmittingPlace(true)
    try {
      const response = await fetch('/api/portal/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          ...placeData
        })
      })

      if (response.ok) {
        setSubmitted(true)
        const updatedResponse = await fetch(`/api/portal/token/${token}`)
        if (updatedResponse.ok) {
          const data = await updatedResponse.json()
          setSupplier(data.supplier)
        }
      }
    } catch (error) {
      console.error('Failed to submit:', error)
    } finally {
      setSubmittingPlace(false)
    }
  }

  const handleComplete = async () => {
    if (!supplier) return

    try {
      const response = await fetch('/api/portal/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: supplier.id })
      })

      if (response.ok) {
        router.push('/thank-you')
      }
    } catch (error) {
      console.error('Failed to complete:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!supplier) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Invalid or expired link</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLanguage(language === 'en' ? 'de' : 'en')}
          >
            <Globe className="h-4 w-4 mr-2" />
            {language === 'en' ? 'Deutsch' : 'English'}
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t('portal.welcome')}</CardTitle>
            <p className="text-muted-foreground">{t('portal.description')}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Supplier:</span>
                <span className="font-medium ml-2">{supplier.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Commodity:</span>
                <span className="font-medium ml-2">{supplier.commodity}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {submitted && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-5 w-5" />
                <span>{t('portal.success')}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {supplier.productionPlaces.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Submitted Production Places</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {supplier.productionPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{place.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {place.areaHectares} ha • {place.geometryType}
                      </div>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!submitted || supplier.productionPlaces.length === 0 ? (
          <ProductionPlaceForm onSubmit={handlePlaceSubmit} />
        ) : (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-muted-foreground mb-4">{t('portal.completeDescription')}</p>
              <Button onClick={handleComplete} disabled={submittingPlace}>
                {submittingPlace && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('portal.complete')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function SupplierPortalPage() {
  return (
    <LanguageProvider>
      <SupplierPortalContent />
    </LanguageProvider>
  )
}
