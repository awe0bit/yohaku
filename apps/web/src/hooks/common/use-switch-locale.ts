'use client'

import { useLocale } from 'next-intl'
import { useCallback } from 'react'

import { swapPaperContentAcrossRoute } from '~/components/layout/container/paper-swap'
import type { Locale } from '~/i18n/config'
import { usePathname, useRouter } from '~/i18n/navigation'

export const useSwitchLocale = () => {
  const currentLocale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  return useCallback(
    (locale: Locale) => {
      if (locale === currentLocale) return
      const swapped = swapPaperContentAcrossRoute(() =>
        router.push(pathname, { locale, scroll: false }),
      )
      if (!swapped) router.push(pathname, { locale })
    },
    [currentLocale, pathname, router],
  )
}
