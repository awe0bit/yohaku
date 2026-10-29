export const locales = ['zh', 'zh-TW', 'en', 'ja', 'ko'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'zh'
export const defaultTimeZone = 'Asia/Shanghai'

export const isSupportedLocale = (code?: string | null): code is Locale =>
  !!code && (locales as readonly string[]).includes(code)
