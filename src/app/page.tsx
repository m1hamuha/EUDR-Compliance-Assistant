'use client'

import Link from 'next/link'
import {
  Leaf,
  MapPin,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Upload,
  Send,
  Gauge,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n, LanguageSwitcher } from '@/lib/i18n'

function PreviewGauge() {
  const score = 78
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative flex items-center justify-center">
      <svg width="132" height="132" className="-rotate-90">
        <circle cx="66" cy="66" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="#059669" strokeWidth="11" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-emerald-700">{score}</span>
        <span className="text-[10px] text-slate-400">/ 100</span>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { t } = useI18n()

  const steps = [
    { icon: Send, t: 'landing.how.1.title', d: 'landing.how.1.desc' },
    { icon: MapPin, t: 'landing.how.2.title', d: 'landing.how.2.desc' },
    { icon: FileCheck, t: 'landing.how.3.title', d: 'landing.how.3.desc' }
  ]

  const features = [
    { icon: MapPin, t: 'landing.f.collection.t', d: 'landing.f.collection.d' },
    { icon: ShieldCheck, t: 'landing.f.validation.t', d: 'landing.f.validation.d' },
    { icon: Gauge, t: 'landing.f.analytics.t', d: 'landing.f.analytics.d' },
    { icon: Send, t: 'landing.f.reminders.t', d: 'landing.f.reminders.d' },
    { icon: Upload, t: 'landing.f.exports.t', d: 'landing.f.exports.d' },
    { icon: FileCheck, t: 'landing.f.reports.t', d: 'landing.f.reports.d' }
  ]

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Skip to content — keyboard / screen-reader bypass (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        {t('a11y.skipToContent')}
      </a>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/80 border-b border-slate-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm shadow-emerald-600/20">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">EUDR Assistant</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#how" className="hover:text-slate-900 transition-colors">{t('landing.how.title')}</a>
            <a href="#features" className="hover:text-slate-900 transition-colors">{t('landing.features.title')}</a>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="mr-1" />
            <Link href="/login"><Button variant="ghost">{t('common.signIn')}</Button></Link>
            <Link href="/signup"><Button className="bg-emerald-600 hover:bg-emerald-700">{t('common.getStarted')}</Button></Link>
          </div>
        </div>
      </header>

      <main id="main-content">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-white to-white" />
        <div className="absolute -top-24 -right-24 -z-10 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="container mx-auto px-4 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t('landing.badge')}
            </span>
            <h1 className="mt-6 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              {t('landing.hero.line')}{' '}
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">{t('landing.hero.highlight')}</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-xl">{t('landing.hero.sub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                  {t('landing.cta.trial')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
              <Link href="#how">
                <Button size="lg" variant="outline">{t('landing.cta.how')}</Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> {t('landing.trust.noCard')}</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> {t('landing.trust.validation')}</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-emerald-600" /> {t('landing.trust.audit')}</span>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-emerald-900/5 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <div className="text-sm font-semibold">{t('landing.preview.readiness')}</div>
                  <div className="text-xs text-slate-400">Aurora Coffee Importers</div>
                </div>
                <span className="text-xs font-medium text-emerald-600 inline-flex items-center gap-1">▲ 100% {t('landing.preview.thisWeek')}</span>
              </div>
              <div className="flex items-center gap-5">
                <PreviewGauge />
                <div className="flex-1 space-y-3">
                  {[
                    { label: 'Completion rate', v: '50%', w: '50%' },
                    { label: 'Validation pass', v: '71%', w: '71%' },
                    { label: 'Response rate', v: '63%', w: '63%' }
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">{m.label}</span>
                        <span className="font-semibold">{m.v}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: m.w }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold">{t('landing.how.title')}</h2>
            <p className="mt-3 text-slate-600">{t('landing.how.sub')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.t} className="relative rounded-2xl bg-white border border-slate-200 p-7">
                <div className="absolute -top-3 left-7 h-7 w-7 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center">{i + 1}</div>
                <s.icon className="h-8 w-8 text-emerald-600 mt-2 mb-4" />
                <h3 className="font-semibold text-lg mb-2">{t(s.t)}</h3>
                <p className="text-slate-600 text-sm">{t(s.d)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl font-bold">{t('landing.features.title')}</h2>
            <p className="mt-3 text-slate-600">{t('landing.features.sub')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.t} className="rounded-2xl border border-slate-200 p-7 hover:shadow-lg hover:border-emerald-200 transition-all">
                <div className="h-11 w-11 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t(f.t)}</h3>
                <p className="text-slate-600 text-sm">{t(f.d)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-16 text-center text-white">
            <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <h2 className="text-3xl md:text-4xl font-bold relative">{t('landing.cta2.title')}</h2>
            <p className="mt-4 text-emerald-50 relative max-w-xl mx-auto">{t('landing.cta2.sub')}</p>
            <div className="mt-8 relative">
              <Link href="/signup">
                <Button size="lg" className="bg-white text-emerald-700 hover:bg-emerald-50">
                  {t('landing.cta2.button')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
              <Leaf className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-700">EUDR Compliance Assistant</span>
          </div>
          <p>© 2026 EUDR Compliance Assistant. {t('landing.footer.rights')}</p>
        </div>
      </footer>
    </div>
  )
}
