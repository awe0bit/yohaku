'use client'

import { useTranslations } from 'next-intl'

import { useBgm } from '~/components/layout/bgm/BgmProvider'

import { FooterOptionGroup } from './FooterKv'

export const FooterBgmSwitcher = () => {
  const t = useTranslations('common')
  const { enabled, pending, setEnabled } = useBgm()

  return (
    <FooterOptionGroup
      busy={pending}
      disabled={pending}
      label={t('footer_bgm')}
      value={enabled ? 'on' : 'off'}
      options={[
        { label: t('footer_off'), value: 'off' },
        { label: t('footer_on'), value: 'on' },
      ]}
      onSelect={(value) => setEnabled(value === 'on')}
    />
  )
}
