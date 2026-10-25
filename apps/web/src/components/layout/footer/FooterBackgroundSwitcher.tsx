'use client'

import { useTranslations } from 'next-intl'

import {
  setIsBackgroundEffectEnabled,
  useIsBackgroundEffectEnabled,
} from '~/atoms/hooks/background'
import { useIsClient } from '~/hooks/common/use-is-client'

import { FooterOptionGroup } from './FooterKv'

export const FooterBackgroundSwitcher = () => {
  const t = useTranslations('common')
  const enabled = useIsBackgroundEffectEnabled()
  const isClient = useIsClient()
  const on = isClient ? enabled : true

  return (
    <FooterOptionGroup
      label={t('footer_background_effect')}
      value={on ? 'on' : 'off'}
      options={[
        { label: t('footer_off'), value: 'off' },
        { label: t('footer_on'), value: 'on' },
      ]}
      onSelect={(value) => setIsBackgroundEffectEnabled(value === 'on')}
    />
  )
}
