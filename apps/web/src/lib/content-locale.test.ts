import { describe, expect, it } from 'vitest'

import { toAppLocale } from '~/i18n/config'

import {
  getContentLocaleRedirect,
  getContentRedirectPath,
  getSourceLocaleSwitch,
  resolveTranslationLanguages,
} from './content-locale'

describe('toAppLocale', () => {
  it('maps canonical server tags onto app locales by language and script', () => {
    expect(toAppLocale('zh-CN')).toBe('zh')
    expect(toAppLocale('zh-TW')).toBe('zh-TW')
    expect(toAppLocale('zh-HK')).toBe('zh-TW')
    expect(toAppLocale('en-US')).toBe('en')
    expect(toAppLocale('ja-JP')).toBe('ja')
    expect(toAppLocale('pt-BR')).toBeNull()
  })
})

describe('getSourceLocaleSwitch', () => {
  it('offers the app locale of a canonical source tag', () => {
    expect(getSourceLocaleSwitch('zh-CN', 'en')).toBe('zh')
    expect(getSourceLocaleSwitch('zh-TW', 'zh')).toBe('zh-TW')
  })

  it('offers nothing when already on the source locale or it is unsupported', () => {
    expect(getSourceLocaleSwitch('zh-CN', 'zh')).toBeNull()
    expect(getSourceLocaleSwitch('en-US', 'en')).toBeNull()
    expect(getSourceLocaleSwitch('pt-BR', 'en')).toBeNull()
    expect(getSourceLocaleSwitch(undefined, 'en')).toBeNull()
  })
})

describe('resolveTranslationLanguages', () => {
  it('lists app locales for canonical source and translation tags', () => {
    expect(
      resolveTranslationLanguages({
        appLocale: 'en',
        sourceLang: 'zh-CN',
        availableTranslations: ['en-US', 'ja-JP', 'pt-BR', 'zh-TW'],
      }),
    ).toEqual({
      displayedLanguage: 'en',
      languages: [
        { code: 'zh', isOriginal: true },
        { code: 'en', isOriginal: false },
        { code: 'ja', isOriginal: false },
        { code: 'zh-TW', isOriginal: false },
      ],
    })
  })

  it('falls back to the source locale when the app locale has no translation', () => {
    expect(
      resolveTranslationLanguages({
        appLocale: 'ko',
        sourceLang: 'zh-CN',
        availableTranslations: ['en-US'],
      }).displayedLanguage,
    ).toBe('zh')
  })
})

describe('getContentLocaleRedirect', () => {
  it('resolves the source fallback for an unsupported requested locale', () => {
    expect(
      getContentLocaleRedirect('ko', {
        isTranslated: false,
        sourceLang: 'zh',
        availableTranslations: ['en'],
      }),
    ).toBe('zh')
  })

  it('keeps source and translated locale variants on their requested URLs', () => {
    const translation = {
      isTranslated: true,
      sourceLang: 'zh',
      targetLang: 'en',
      availableTranslations: ['en'],
    }

    expect(getContentLocaleRedirect('zh', translation)).toBeNull()
    expect(getContentLocaleRedirect('en', translation)).toBeNull()
  })

  it('uses the first reported app locale when the source locale is unsupported', () => {
    expect(
      getContentLocaleRedirect('ja', {
        isTranslated: false,
        sourceLang: 'fr',
        availableTranslations: ['en', 'ko'],
      }),
    ).toBe('en')
  })

  it('does not infer availability when translation metadata is absent', () => {
    expect(getContentLocaleRedirect('ko')).toBeNull()
  })

  it('accepts the current target locale even if an older API omits it from the availability list', () => {
    expect(
      getContentLocaleRedirect('en', {
        isTranslated: true,
        sourceLang: 'zh',
        targetLang: 'en',
        availableTranslations: [],
      }),
    ).toBeNull()
  })

  it('treats zh-TW as satisfied when only zh source is available', () => {
    expect(
      getContentLocaleRedirect('zh-TW', {
        isTranslated: false,
        sourceLang: 'zh',
        availableTranslations: [],
      }),
    ).toBeNull()
  })

  it('treats zh as satisfied when only zh-TW source is available', () => {
    expect(
      getContentLocaleRedirect('zh', {
        isTranslated: false,
        sourceLang: 'zh-TW',
        availableTranslations: [],
      }),
    ).toBeNull()
  })

  it('keeps simplified Chinese source documents on the zh route when the API reports a regional language tag', () => {
    expect(
      getContentLocaleRedirect('zh', {
        isTranslated: false,
        sourceLang: 'zh-CN',
        availableTranslations: ['en', 'ja', 'ko'],
      }),
    ).toBeNull()
  })

  it('normalizes regional source language tags when choosing a fallback', () => {
    expect(
      getContentLocaleRedirect('ja', {
        isTranslated: false,
        sourceLang: 'en-US',
        availableTranslations: [],
      }),
    ).toBe('en')
  })
})

describe('getContentRedirectPath', () => {
  it('preserves a supported non-default locale while normalizing an alias', () => {
    expect(
      getContentRedirectPath({
        requestedLocale: 'en',
        requestedPath: '/posts/programming/legacy-slug',
        canonicalPath: '/posts/tech/canonical-slug',
      }),
    ).toBe('/en/posts/tech/canonical-slug')
  })

  it('keeps an alias-only redirect in the default locale unprefixed', () => {
    expect(
      getContentRedirectPath({
        requestedLocale: 'zh',
        requestedPath: '/posts/programming/legacy-slug',
        canonicalPath: '/posts/tech/canonical-slug',
      }),
    ).toBe('/posts/tech/canonical-slug')
  })

  it('returns no redirect for an already canonical supported variant', () => {
    expect(
      getContentRedirectPath({
        requestedLocale: 'en',
        requestedPath: '/about',
        canonicalPath: '/about',
      }),
    ).toBeNull()
  })

  it('does not loop when a canonical note target preserves a password query', () => {
    expect(
      getContentRedirectPath({
        requestedLocale: 'en',
        requestedPath: '/notes/2026/6/28/stay-in-the-game',
        canonicalPath: '/notes/2026/6/28/stay-in-the-game?password=preserved',
      }),
    ).toBeNull()
  })
})
