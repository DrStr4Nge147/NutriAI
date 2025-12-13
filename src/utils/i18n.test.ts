import { describe, expect, it } from 'vitest'
import { normalizeLocale, t } from './i18n'

describe('i18n', () => {
  it('normalizes locale strings', () => {
    expect(normalizeLocale('en-US')).toBe('en')
    expect(normalizeLocale('fil-PH')).toBe('fil')
    expect(normalizeLocale('tl-PH')).toBe('fil')
    expect(normalizeLocale('')).toBe('en')
  })

  it('returns translations for a given locale', () => {
    expect(t('app_title', { locale: 'en' })).toBe('AI Nutritionist')
    expect(t('offline_banner', { locale: 'fil' })).toContain('Offline')
  })
})
