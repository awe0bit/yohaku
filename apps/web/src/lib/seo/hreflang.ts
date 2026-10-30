import type { Locale } from '~/i18n/config'
import { defaultLocale, locales, toAppLocale } from '~/i18n/config'

/**
 * Map app locale -> SEO hreflang code.
 * - Use BCP 47 where we want region specificity (zh-CN).
 */
export const HREFLANG_BY_LOCALE: Record<Locale, string> = {
  zh: 'zh-CN',
  'zh-TW': 'zh-TW',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
}

export const buildLocalePrefixedPath = (locale: Locale, pathname: string) => {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  if (normalized === '/') {
    return locale === defaultLocale ? '/' : `/${locale}`
  }
  return locale === defaultLocale ? normalized : `/${locale}${normalized}`
}

export const buildLanguageAlternates = (
  pathname: string,
  includeLocales: readonly Locale[] = locales,
) => {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  return Object.fromEntries(
    includeLocales.map((loc) => [
      HREFLANG_BY_LOCALE[loc],
      buildLocalePrefixedPath(loc, normalized),
    ]),
  )
}

export const getSupportedLocalesFromTranslations = (input?: {
  sourceLang?: string | null
  availableTranslations?: string[] | null
}): Locale[] => {
  const set = new Set<Locale>()

  const addIfSupported = (code?: string | null) => {
    const locale = toAppLocale(code)
    if (locale) set.add(locale)
  }

  addIfSupported(input?.sourceLang ?? defaultLocale)
  input?.availableTranslations?.forEach((code) => addIfSupported(code))

  // Keep deterministic order (matching `locales`)
  return locales.filter((l) => set.has(l))
}
