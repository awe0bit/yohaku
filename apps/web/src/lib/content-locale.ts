import type { ArticleTranslation } from '@mx-space/api-client'

import type { Locale } from '~/i18n/config'
import { locales, toAppLocale } from '~/i18n/config'
import { buildLocalePrefixedPath } from '~/lib/seo/hreflang'

const localeSet = new Set<string>(locales)

export const isAppLocale = (locale?: string | null): locale is Locale =>
  !!locale && localeSet.has(locale)

export const getSourceLocaleSwitch = (
  sourceLang: string | null | undefined,
  appLocale: string,
): Locale | null => {
  const sourceLocale = toAppLocale(sourceLang)
  return sourceLocale && sourceLocale !== appLocale ? sourceLocale : null
}

export const resolveTranslationLanguages = ({
  appLocale,
  sourceLang,
  availableTranslations,
}: {
  appLocale: string
  sourceLang?: string | null
  availableTranslations?: string[] | null
}) => {
  const sourceLocale = toAppLocale(sourceLang)
  const translatedLocales = new Set<Locale>()
  availableTranslations?.forEach((lang) => {
    const locale = toAppLocale(lang)
    if (locale) translatedLocales.add(locale)
  })

  const codes = new Set<Locale>()
  if (sourceLocale) codes.add(sourceLocale)
  translatedLocales.forEach((locale) => codes.add(locale))
  if (isAppLocale(appLocale)) codes.add(appLocale)

  const displayedLanguage =
    appLocale === sourceLocale ||
    (isAppLocale(appLocale) && translatedLocales.has(appLocale))
      ? appLocale
      : (sourceLocale ?? appLocale)

  return {
    displayedLanguage,
    languages: Array.from(codes, (code) => ({
      code,
      isOriginal: code === sourceLocale,
    })),
  }
}

export const getContentLocaleRedirect = (
  requestedLocale: string,
  translation?: ArticleTranslation | null,
): Locale | null => {
  if (!translation || !isAppLocale(requestedLocale)) return null

  const supportedLocales = new Set<Locale>()
  const addSupportedLocale = (locale?: string | null) => {
    const appLocale = toAppLocale(locale)
    if (appLocale) supportedLocales.add(appLocale)
  }

  addSupportedLocale(translation.sourceLang)
  translation.availableTranslations?.forEach(addSupportedLocale)
  if (translation.isTranslated) {
    addSupportedLocale(translation.targetLang)
  }

  const isZhVariantRequest =
    requestedLocale === 'zh' || requestedLocale === 'zh-TW'
  const zhVariantAvailable =
    supportedLocales.has('zh') || supportedLocales.has('zh-TW')

  if (
    supportedLocales.size === 0 ||
    supportedLocales.has(requestedLocale) ||
    (isZhVariantRequest && zhVariantAvailable)
  ) {
    return null
  }

  const sourceLocale = toAppLocale(translation.sourceLang)
  if (sourceLocale) return sourceLocale
  return supportedLocales.values().next().value ?? null
}

export const getContentRedirectPath = ({
  requestedLocale,
  requestedPath,
  canonicalPath,
}: {
  requestedLocale: string
  requestedPath: string
  canonicalPath: string
}): string | null => {
  if (!isAppLocale(requestedLocale)) return null

  const requestedPathname = new URL(requestedPath, 'https://content.invalid')
    .pathname
  const canonicalPathname = new URL(canonicalPath, 'https://content.invalid')
    .pathname
  if (requestedPathname === canonicalPathname) return null

  return buildLocalePrefixedPath(requestedLocale, canonicalPath)
}
