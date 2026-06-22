'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { dictionaries, LOCALES, LOCALE_LABELS, type Locale } from './dictionaries'

export type { Locale } from './dictionaries'
export { LOCALES, LOCALE_LABELS } from './dictionaries'

const STORAGE_KEY = 'app-lang'

export type TranslateVars = Record<string, string | number>

/**
 * Pure translation lookup with graceful fallback (locale → English → key) and
 * `{var}` interpolation. Exported for direct/unit-testing use.
 */
export function translate(locale: Locale, key: string, vars?: TranslateVars): string {
  const value = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key
  if (!vars) return value
  return value.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`))
}

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: TranslateVars) => string
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY)) as Locale | null
    if (saved && LOCALES.includes(saved)) {
      setLocaleState(saved)
    } else if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('de')) {
      setLocaleState('de')
    }
  }, [])

  // Keep <html lang> in sync with the active locale so assistive technologies
  // announce content with the correct pronunciation (WCAG 3.1.1/3.1.2).
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
    }
  }, [locale])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, l)
      document.cookie = `${STORAGE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`
    }
  }, [])

  const t = useCallback((key: string, vars?: TranslateVars) => translate(locale, key, vars), [locale])

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    // Safe fallback so components don't crash outside a provider (defaults to English).
    return { locale: 'en', setLocale: () => {}, t: (key, vars) => translate('en', key, vars) }
  }
  return ctx
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n()
  return (
    <div className={`inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs ${className}`}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={`px-2.5 py-1 font-medium transition-colors ${
            locale === l ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
          }`}
          aria-pressed={locale === l}
        >
          {l.toUpperCase()}
        </button>
      ))}
      <span className="sr-only">{LOCALE_LABELS[locale]}</span>
    </div>
  )
}
