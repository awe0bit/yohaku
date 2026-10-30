'use client'

import { useLocale, useTranslations } from 'next-intl'
import type { FC } from 'react'
import { useCallback, useMemo } from 'react'

import { LanguageSelector } from '~/components/ui/language-selector'
import { useSwitchLocale } from '~/hooks/common/use-switch-locale'
import { isSupportedLocale } from '~/i18n/config'
import { resolveTranslationLanguages } from '~/lib/content-locale'

function getLanguageLabel(
  code: string,
  tCommon: (
    key:
      | 'language_zh'
      | 'language_zh_tw'
      | 'language_en'
      | 'language_ja'
      | 'language_ko',
  ) => string,
): string {
  if (code === 'zh') return tCommon('language_zh')
  if (code === 'zh-TW') return tCommon('language_zh_tw')
  if (code === 'en') return tCommon('language_en')
  if (code === 'ja') return tCommon('language_ja')
  if (code === 'ko') return tCommon('language_ko')

  return code.toUpperCase()
}

interface TranslationLanguageSwitcherProps {
  availableTranslations?: string[]
  sourceLang?: string
  triggerClassName?: string
}

export const TranslationLanguageSwitcher: FC<
  TranslationLanguageSwitcherProps
> = ({ availableTranslations, sourceLang, triggerClassName }) => {
  const t = useTranslations('translation')
  const tCommon = useTranslations('common')
  const appLocale = useLocale()
  const switchLocale = useSwitchLocale()

  const { languages, displayedLanguage } = useMemo(() => {
    const resolved = resolveTranslationLanguages({
      appLocale,
      sourceLang,
      availableTranslations,
    })
    return {
      displayedLanguage: resolved.displayedLanguage,
      languages: resolved.languages.map(({ code, isOriginal }) => ({
        code,
        label: getLanguageLabel(code, tCommon),
        isOriginal,
      })),
    }
  }, [appLocale, availableTranslations, sourceLang, tCommon])

  const handleLanguageChange = useCallback(
    (lang: string) => {
      if (isSupportedLocale(lang)) switchLocale(lang)
    },
    [switchLocale],
  )

  if (languages.length <= 1) {
    return null
  }

  return (
    <span data-hide-print className="contents">
      <LanguageSelector
        currentLanguage={appLocale}
        displayedLanguage={displayedLanguage}
        languages={languages}
        originalLabel={t('original')}
        triggerClassName={triggerClassName}
        onLanguageChange={handleLanguageChange}
      />
    </span>
  )
}
