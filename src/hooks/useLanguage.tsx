'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type Language = 'en' | 'de'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    'portal.welcome': 'EUDR Supplier Data Collection',
    'portal.description': 'Please provide information about your production places for EUDR compliance.',
    'portal.productionPlace': 'Production Place',
    'portal.nameLabel': 'Name',
    'portal.namePlaceholder': 'e.g., Farm A, Plot 1',
    'portal.areaLabel': 'Area (hectares)',
    'portal.areaPlaceholder': '0.00',
    'portal.countryLabel': 'Country',
    'portal.selectCountry': 'Select country',
    'portal.drawPolygon': 'Draw polygon',
    'portal.placePoint': 'Place point',
    'portal.useGps': 'Use my location',
    'portal.submit': 'Submit',
    'portal.submitting': 'Submitting...',
    'portal.success': 'Data submitted successfully!',
    'portal.error': 'An error occurred. Please try again.',
    'portal.addAnother': 'Add another production place',
    'portal.complete': 'Complete',
    'portal.completeDescription': 'You have added all your production places.',
    'portal.validation.required': 'This field is required',
    'portal.validation.polygonRequired': 'Please draw a polygon on the map',
    'portal.validation.pointRequired': 'Please place a point on the map',
    'portal.validation.precision': 'Coordinates must have 6 decimal places',
    'portal.validation.invalidPolygon': 'Invalid polygon. Please redraw.',
    'portal.language': 'Language',
    'portal.english': 'English',
    'portal.german': 'Deutsch',
  },
  de: {
    'portal.welcome': 'EUDR-Lieferantendatenerfassung',
    'portal.description': 'Bitte geben Sie Informationen über Ihre Produktionsstandorte für die EUDR-Compliance an.',
    'portal.productionPlace': 'Produktionsstandort',
    'portal.nameLabel': 'Name',
    'portal.namePlaceholder': 'z.B. Hof A, Flurstück 1',
    'portal.areaLabel': 'Fläche (Hektar)',
    'portal.areaPlaceholder': '0,00',
    'portal.countryLabel': 'Land',
    'portal.selectCountry': 'Land auswählen',
    'portal.drawPolygon': 'Polygon zeichnen',
    'portal.placePoint': 'Punkt setzen',
    'portal.useGps': 'Meinen Standort verwenden',
    'portal.submit': 'Absenden',
    'portal.submitting': 'Wird gesendet...',
    'portal.success': 'Daten erfolgreich übermittelt!',
    'portal.error': 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.',
    'portal.addAnother': 'Weiteren Produktionsstandort hinzufügen',
    'portal.complete': 'Abschließen',
    'portal.completeDescription': 'Sie haben alle Produktionsstandorte hinzugefügt.',
    'portal.validation.required': 'Dieses Feld ist erforderlich',
    'portal.validation.polygonRequired': 'Bitte zeichnen Sie ein Polygon auf der Karte',
    'portal.validation.pointRequired': 'Bitte setzen Sie einen Punkt auf der Karte',
    'portal.validation.precision': 'Koordinaten müssen 6 Dezimalstellen haben',
    'portal.validation.invalidPolygon': 'Ungültiges Polygon. Bitte neu zeichnen.',
    'portal.language': 'Sprache',
    'portal.english': 'English',
    'portal.german': 'Deutsch',
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('supplier-lang') as Language | null
    if (saved && (saved === 'en' || saved === 'de')) {
      setLanguage(saved)
    } else {
      const browserLang = navigator.language?.toLowerCase() || ''
      if (browserLang.startsWith('de')) {
        setLanguage('de')
      }
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('supplier-lang', lang)
  }

  const t = (key: string): string => {
    return translations[language][key] || key
  }

  if (!mounted) {
    return null
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
