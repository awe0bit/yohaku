export const locales = ['zh', 'zh-TW', 'en', 'ja', 'ko'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'zh'
export const defaultTimeZone = 'Asia/Shanghai'

export const isSupportedLocale = (code?: string | null): code is Locale =>
  !!code && (locales as readonly string[]).includes(code)

const traditionalChineseLocale = /^zh-(?:hant|hk|mo|tw)(?:-|$)/

export const toAppLocale = (locale?: string | null): Locale | null => {
  if (!locale) return null

  const normalized = locale.toLowerCase()
  const exact = locales.find(
    (candidate) => candidate.toLowerCase() === normalized,
  )
  if (exact) return exact

  if (normalized === 'zh' || normalized.startsWith('zh-')) {
    return traditionalChineseLocale.test(normalized) ? 'zh-TW' : 'zh'
  }

  const base = normalized.split('-')[0]
  return locales.find((candidate) => candidate === base) ?? null
}
