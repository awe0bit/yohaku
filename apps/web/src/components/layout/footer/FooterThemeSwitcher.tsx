'use client'

import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { flushSync } from 'react-dom'

import { useIsClient } from '~/hooks/common/use-is-client'
import { transitionViewIfSupported } from '~/lib/dom'

import { FooterOptionGroup } from './FooterKv'

export const FooterThemeSwitcher = () => {
  const t = useTranslations('common')
  const { theme, setTheme } = useTheme()
  const isClient = useIsClient()

  const options = [
    { value: 'light', label: t('theme_light'), aria: t('aria_theme_light') },
    { value: 'system', label: t('theme_system'), aria: t('aria_theme_system') },
    { value: 'dark', label: t('theme_dark'), aria: t('aria_theme_dark') },
  ]
  const current = isClient && theme ? theme : 'system'

  const handleSelect = (value: string) => {
    transitionViewIfSupported(
      () => {
        // eslint-disable-next-line @eslint-react/dom/no-flush-sync
        flushSync(() => setTheme(value))
      },
      { rootAnimation: true },
    )
  }

  return (
    <FooterOptionGroup
      label={t('footer_theme')}
      options={options}
      value={current}
      onSelect={handleSelect}
    />
  )
}
