import { translate } from '../index'
import { dictionaries } from '../dictionaries'

describe('translate', () => {
  it('returns the value for the active locale', () => {
    expect(translate('en', 'nav.suppliers')).toBe('Suppliers')
    expect(translate('de', 'nav.suppliers')).toBe('Lieferanten')
  })

  it('falls back to English when a key is missing in the locale', () => {
    // Temporarily pretend a German key is absent.
    const original = dictionaries.de['nav.map']
    delete dictionaries.de['nav.map']
    expect(translate('de', 'nav.map')).toBe(dictionaries.en['nav.map'])
    dictionaries.de['nav.map'] = original
  })

  it('falls back to the key itself when missing everywhere', () => {
    expect(translate('en', 'totally.unknown.key')).toBe('totally.unknown.key')
  })

  it('interpolates {vars}', () => {
    expect(translate('en', 'dash.onboarding.steps', { done: 4, total: 5 })).toBe('4 of 5 steps complete')
    expect(translate('de', 'dash.onboarding.steps', { done: 4, total: 5 })).toBe('4 von 5 Schritten abgeschlossen')
  })

  it('leaves unknown placeholders intact', () => {
    expect(translate('en', 'dash.onboarding.steps', { done: 1 })).toContain('{total}')
  })

  it('keeps English and German dictionaries in key parity', () => {
    const enKeys = Object.keys(dictionaries.en).sort()
    const deKeys = Object.keys(dictionaries.de).sort()
    expect(deKeys).toEqual(enKeys)
  })
})
