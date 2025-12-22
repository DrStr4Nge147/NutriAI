export type Locale = 'en' | 'fil'

export type TranslationKey = 'app_title' | 'offline_banner'

type Dictionary = Record<TranslationKey, string>

const en: Dictionary = {
  app_title: 'HimsogAI',
  offline_banner: "You're offline. Previously visited screens should still work, but AI analysis and sync won’t.",
}

const fil: Dictionary = {
  app_title: 'HimsogAI',
  offline_banner: "Offline ka. Dapat gumana pa rin ang mga screen na nabuksan na dati, pero hindi gagana ang AI analysis at sync.",
}

const dictionaries: Record<Locale, Dictionary> = {
  en,
  fil,
}

export function normalizeLocale(input: string | null | undefined): Locale {
  if (!input) return 'en'
  const v = input.trim().toLowerCase()
  if (v === 'fil' || v === 'tl' || v.startsWith('fil-') || v.startsWith('tl-')) return 'fil'
  return 'en'
}

export function getPreferredLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  return normalizeLocale(navigator.language)
}

export function t(key: TranslationKey, options?: { locale?: Locale }): string {
  const locale = options?.locale ?? getPreferredLocale()
  return dictionaries[locale][key] ?? dictionaries.en[key] ?? key
}
